"use client";

import { useState } from "react";

interface NewsletterDashboardProps {
  onViewSite?: () => void;
  onNewPost?: () => void;
}

type TabKey =
  | "Home"
  | "Posts"
  | "Podcast"
  | "Subscribers"
  | "Stats"
  | "Recommendations"
  | "Settings";

type StatCard = {
  label: string;
  value: string;
  note: string;
  menu: string[];
  tooltip: string;
};

type MetricRow = {
  label: string;
  value: string;
};

const tabs: TabKey[] = [
  "Home",
  "Posts",
  "Podcast",
  "Subscribers",
  "Stats",
  "Recommendations",
  "Settings",
];

const stats: StatCard[] = [
  {
    label: "All subscribers",
    value: "3",
    note: "Total audience across all signup sources.",
    menu: ["View subscribers", "Export CSV", "Segment audience"],
    tooltip: "Includes free and paid subscribers.",
  },
  {
    label: "Subscribers from app",
    value: "0",
    note: "Readers who joined through the mobile app.",
    menu: ["View source", "Compare channels", "Open details"],
    tooltip: "No app-acquired subscribers yet.",
  },
  {
    label: "30 day views",
    value: "36",
    note: "Page views from the last 30 days.",
    menu: ["Open analytics", "Compare period", "Download report"],
    tooltip: "Rolling 30 day total.",
  },
  {
    label: "30 day open rate",
    value: "-",
    note: "Open rate is unavailable for this period.",
    menu: ["View deliverability", "Check recipients", "Open report"],
    tooltip: "No campaign data available.",
  },
];

const latestPostMetrics: MetricRow[] = [
  { label: "Views", value: "7" },
  { label: "Opened", value: "100%" },
  { label: "New Subs", value: "-" },
];

const draftItems = [
  {
    title: "Untitled",
    author: "By Sam Lee",
    updated: "Last updated Oct 17",
  },
];

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6.5 9.25a5.5 5.5 0 1 1 11 0c0 5 1.5 6 1.5 6H5s1.5-1 1.5-6Z" />
      <path d="M9 18.5a3 3 0 0 0 6 0" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6" strokeLinecap="round" />
      <path d="M12 7.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-200 via-amber-100 to-stone-200 shadow-sm">
      <div className="h-3.5 w-3.5 rounded-md bg-[#FF6A00]" />
    </div>
  );
}

export default function NewsletterDashboard({
  onViewSite,
  onNewPost,
}: NewsletterDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("Home");
  const [openStatTooltip, setOpenStatTooltip] = useState<number | null>(null);
  const [openStatMenu, setOpenStatMenu] = useState<number | null>(null);
  const [openLatestPostMenu, setOpenLatestPostMenu] = useState(false);
  const [openDraftMenu, setOpenDraftMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111]">
      <header className="border-b border-[#E5E5E5] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LogoMark />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 text-[15px] font-medium tracking-tight text-[#111111]">
            Sam&apos;s Substack
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#666666] transition hover:border-[#E5E5E5] hover:bg-[#FAFAFA] hover:text-[#111111]"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#666666] transition hover:border-[#E5E5E5] hover:bg-[#FAFAFA] hover:text-[#111111]"
            >
              <BellIcon />
            </button>
            <button
              type="button"
              aria-label="Profile"
              className="h-8 w-8 rounded-full bg-gradient-to-br from-stone-300 to-stone-100 ring-1 ring-[#E5E5E5]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <nav aria-label="Primary" className="flex flex-wrap gap-6 border-b border-[#E5E5E5] pb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative pb-3 text-[14px] transition ${
                  isActive ? "font-medium text-[#111111]" : "text-[#999999] hover:text-[#666666]"
                }`}
              >
                {tab}
                {isActive && <span className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-[#111111]" />}
              </button>
            );
          })}
        </nav>

        <section className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[32px] font-semibold tracking-tight text-[#111111]">Home</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onViewSite}
              className="rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2 text-[14px] font-medium text-[#111111] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:bg-[#EEEEEE] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              View site
            </button>
            <button
              type="button"
              onClick={onNewPost}
              className="rounded-lg bg-[#FF6A00] px-4 py-2 text-[14px] font-medium text-white shadow-[0_4px_14px_rgba(255,106,0,0.18)] transition hover:bg-[#E65C00] hover:shadow-[0_6px_18px_rgba(255,106,0,0.22)]"
            >
              New post
            </button>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[19px] font-medium tracking-tight text-[#111111]">Overview</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {stats.map((stat, index) => {
              const showTooltip = openStatTooltip === index;
              const showMenu = openStatMenu === index;

              return (
                <article
                  key={stat.label}
                  className="relative rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#666666]">{stat.label}</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Info for ${stat.label}`}
                        onClick={() => {
                          setOpenStatTooltip(showTooltip ? null : index);
                          setOpenStatMenu(null);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#999999] transition hover:bg-[#FAFAFA] hover:text-[#666666]"
                      >
                        <InfoIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Menu for ${stat.label}`}
                        onClick={() => {
                          setOpenStatMenu(showMenu ? null : index);
                          setOpenStatTooltip(null);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#999999] transition hover:bg-[#FAFAFA] hover:text-[#666666]"
                      >
                        <DotsIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-[32px] font-semibold tracking-tight text-[#111111]">{stat.value}</div>

                  {showTooltip && (
                    <div className="absolute right-4 top-10 z-20 w-52 rounded-lg border border-[#E5E5E5] bg-white p-3 text-[12px] text-[#666666] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      {stat.tooltip}
                    </div>
                  )}

                  {showMenu && (
                    <div className="absolute right-4 top-10 z-20 w-48 rounded-lg border border-[#E5E5E5] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      {stat.menu.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#111111] transition hover:bg-[#FAFAFA]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-[12px] leading-5 text-[#999999]">{stat.note}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[19px] font-medium tracking-tight text-[#111111]">Latest post</h2>
              <button
                type="button"
                className="text-[13px] font-medium text-[#666666] transition hover:text-[#111111] hover:underline"
              >
                View post stats -&gt;
              </button>
            </div>

            <article className="mt-4 rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-[#999999]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="4" y="5" width="16" height="14" rx="2.5" />
                    <path d="M8 13l2.5-2.5 3 3L16 11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-medium tracking-tight text-[#111111]">
                        Hi! Welcome to my Substack
                      </h3>
                      <p className="mt-1 text-[13px] text-[#999999]">
                        By Sam Lee <span className="mx-1">-</span> Oct 17
                      </p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Latest post actions"
                        onClick={() => setOpenLatestPostMenu((value) => !value)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#999999] transition hover:bg-[#FAFAFA] hover:text-[#111111]"
                      >
                        <DotsIcon />
                      </button>

                      {openLatestPostMenu && (
                        <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-[#E5E5E5] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                          {["Edit post", "Duplicate", "Delete"].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#111111] transition hover:bg-[#FAFAFA]"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-4 h-px bg-[#E5E5E5]" />

                  <div className="space-y-3">
                    {latestPostMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between text-[14px] text-[#111111]"
                      >
                        <span className="text-[#666666]">{metric.label}</span>
                        <span className="font-medium">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[19px] font-medium tracking-tight text-[#111111]">Drafts</h2>
              <button
                type="button"
                className="text-[13px] font-medium text-[#666666] transition hover:text-[#111111] hover:underline"
              >
                View all -&gt;
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {draftItems.map((draft) => (
                <article
                  key={draft.title}
                  className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[15px] font-medium tracking-tight text-[#111111]">{draft.title}</h3>
                      <p className="mt-1 text-[13px] text-[#999999]">{draft.author}</p>
                      <p className="mt-1 text-[13px] text-[#999999]">{draft.updated}</p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Draft actions"
                        onClick={() => setOpenDraftMenu((value) => !value)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#999999] transition hover:bg-[#FAFAFA] hover:text-[#111111]"
                      >
                        <DotsIcon />
                      </button>

                      {openDraftMenu && (
                        <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-[#E5E5E5] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                          {["Edit", "Preview", "Delete"].map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#111111] transition hover:bg-[#FAFAFA]"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <button
        type="button"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#FF6A00] px-5 py-3 text-[14px] font-medium text-white shadow-[0_12px_28px_rgba(255,106,0,0.24)] transition hover:bg-[#E65C00] hover:shadow-[0_14px_32px_rgba(255,106,0,0.28)]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-[12px] leading-none">
          ?
        </span>
        Ask a question
      </button>
    </div>
  );
}
