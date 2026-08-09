import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Curated (extension-saved) tweets never had public_metrics — the DOM scraper
// that feeds them doesn't parse engagement counts, only the official X API
// bookmarks sync does. This route batch-backfills public_metrics for any
// tweet_id missing it, via X's tweet-lookup endpoint (up to 100 ids/call).
const X_TWEET_LOOKUP_BATCH_SIZE = 100;

interface XPublicMetrics {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  bookmark_count?: number;
  impression_count?: number;
}

interface XTweetLookupResponse {
  data?: Array<{ id: string; public_metrics?: XPublicMetrics }>;
  errors?: Array<{ value?: string; detail?: string; title?: string }>;
}

let _serviceSupabase: SupabaseClient | null = null;

function getServiceSupabase(): SupabaseClient | null {
  if (_serviceSupabase) return _serviceSupabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  _serviceSupabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceSupabase;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchPublicMetricsBatch(
  accessToken: string,
  tweetIds: string[]
): Promise<XTweetLookupResponse> {
  const url = new URL("https://api.x.com/2/tweets");
  url.searchParams.set("ids", tweetIds.join(","));
  url.searchParams.set("tweet.fields", "public_metrics");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Tweet lookup failed (${response.status}): ${details}`);
  }

  return (await response.json()) as XTweetLookupResponse;
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("x_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to X." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service client is not configured" }, { status: 500 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 0;

  const { data: rows, error: selectError } = await supabase
    .from("tweets")
    .select("tweet_id")
    .is("public_metrics", null)
    .order("id", { ascending: true })
    .limit(limit && limit > 0 ? limit : 100000);

  if (selectError) {
    return NextResponse.json(
      { error: "Failed to read tweets missing public_metrics.", details: selectError.message },
      { status: 500 }
    );
  }

  const tweetIds = (rows ?? []).map((r) => r.tweet_id as string).filter(Boolean);
  const batches = chunk(tweetIds, X_TWEET_LOOKUP_BATCH_SIZE);

  let updated = 0;
  let notFound = 0;
  const batchErrors: string[] = [];

  for (const batch of batches) {
    let payload: XTweetLookupResponse;
    try {
      payload = await fetchPublicMetricsBatch(accessToken, batch);
    } catch (err) {
      batchErrors.push(err instanceof Error ? err.message : "Unknown batch error");
      continue;
    }

    const foundIds = new Set((payload.data ?? []).map((t) => t.id));
    notFound += batch.filter((id) => !foundIds.has(id)).length;

    for (const tweet of payload.data ?? []) {
      if (!tweet.public_metrics) continue;
      const { error: updateError } = await supabase
        .from("tweets")
        .update({ public_metrics: tweet.public_metrics })
        .eq("tweet_id", tweet.id);
      if (updateError) {
        batchErrors.push(`Update failed for tweet_id ${tweet.id}: ${updateError.message}`);
        continue;
      }
      updated += 1;
    }
  }

  return NextResponse.json({
    status: "ok",
    candidates: tweetIds.length,
    updated,
    not_found: notFound,
    batch_errors: batchErrors,
  });
}
