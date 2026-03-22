export interface TweetWithId {
  tweet_id?: unknown;
}

export function dedupeTweetsById<T extends TweetWithId>(tweets: T[]): T[] {
  const seen = new Set<string>();

  return tweets.filter((tweet) => {
    if (typeof tweet.tweet_id !== "string" || tweet.tweet_id.length === 0) {
      return true;
    }

    if (seen.has(tweet.tweet_id)) {
      return false;
    }

    seen.add(tweet.tweet_id);
    return true;
  });
}
