"use client";

import { Suspense, useMemo, useState } from "react";
import TweetFeed from "../components/TweetFeed";
import LeftSidebar from "../components/LeftSidebar";
import TweetCard from "../components/TweetCard";
import FacebookCard from "../components/FacebookCard";
import FacebookLayout from "../components/FacebookLayout";
import SubstackLayout from "../components/SubstackLayout";
import UpgradeBanner from "../components/UpgradeBanner";
import PricingModal from "../components/PricingModal";
import OnboardingModal from "../components/OnboardingModal";
import ArticleReaderView from "../components/ArticleReaderView";
import SemanticSearch from "../components/SemanticSearch";
import type { Tweet } from "../lib/supabase";
import { useView } from "../contexts/ViewContext";
import { XAuthProvider } from "../contexts/XAuthContext";
import { SuccessToast } from "../components/SuccessToast";
import { DataSourceToggle, type DataSource } from "../components/DataSourceToggle";
import { useSemanticSearch } from "../hooks/useSemanticSearch";
import { usePageModals } from "../hooks/usePageModals";

export const dynamic = "force-dynamic";

function HomeContent() {
  const { view } = useView();
  const [dataSource, setDataSource] = useState<DataSource>("stash");
  const [articleUrl, setArticleUrl] = useState<string | null>(null);
  const [articleTweet, setArticleTweet] = useState<Tweet | null>(null);

  const semantic = useSemanticSearch();
  const modals = usePageModals({ onXConnected: () => setDataSource("bookmarks") });

  const isDigest = view === "digest";
  const isFacebook = view === "facebook";

  const twitterTitle = useMemo(
    () => (dataSource === "bookmarks" ? "X Bookmarks" : "Saved Tweets"),
    [dataSource]
  );

  const handleArticleClick = (url: string, tweet: Tweet) => {
    setArticleUrl(url);
    setArticleTweet(tweet);
  };

  const closeArticleReader = () => {
    setArticleUrl(null);
    setArticleTweet(null);
  };

  const handleSourceChange = (nextSource: DataSource) => {
    setDataSource(nextSource);
    closeArticleReader();
    semantic.resetSemantic();
  };

  return (
    <>
      {modals.showSuccess && <SuccessToast onDismiss={() => modals.setShowSuccess(false)} />}
      <PricingModal isOpen={modals.showPricing} onClose={() => modals.setShowPricing(false)} />
      <OnboardingModal isOpen={modals.showOnboarding} onClose={modals.handleOnboardingClose} />

      <main className="min-h-screen">
        <LeftSidebar onShowOnboarding={() => modals.setShowOnboarding(true)} />

        {isDigest ? (
          <div className="pb-16 transition-all duration-200 md:ml-[68px] md:pb-0 lg:ml-[240px]">
            <SubstackLayout />
          </div>
        ) : isFacebook ? (
          <div className="pb-16 transition-all duration-200 md:ml-[68px] md:pb-0 lg:ml-[240px]">
            <FacebookLayout>
              <TweetFeed cardComponent={FacebookCard} dataSource="stash" />
              <UpgradeBanner onLearnMore={() => modals.setShowPricing(true)} />
            </FacebookLayout>
          </div>
        ) : (
          <div className="pb-16 transition-all duration-200 md:ml-[68px] md:pb-0 lg:ml-[240px]">
            <div className="mx-auto max-w-[1040px] xl:grid xl:grid-cols-[600px_440px]">
              <div className="min-h-screen border-x border-[rgb(47,51,54)]">
                <header className="sticky top-0 z-10 border-b border-[rgb(47,51,54)] bg-black/80 px-4 py-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <h1 className="text-xl font-bold text-white">{twitterTitle}</h1>
                  </div>
                </header>

                <DataSourceToggle value={dataSource} onChange={handleSourceChange} />

                <TweetFeed
                  cardComponent={TweetCard}
                  dataSource={dataSource}
                  onArticleClick={handleArticleClick}
                  semanticFilterIds={semantic.semanticFilterIds}
                  semanticSelectedIds={semantic.effectiveSemanticSelectedIds}
                  onToggleSemanticSelect={semantic.toggleSemanticSelection}
                  semanticSimilarityById={semantic.semanticSimilarityById}
                  onSelectAllSemantic={semantic.selectAllSemantic}
                  onDeselectAllSemantic={semantic.deselectAllSemantic}
                  onSemanticCorpusIdsChange={semantic.setSemanticCorpusIds}
                  semanticAutoSelectAll={semantic.semanticAutoSelectAll}
                />

                <UpgradeBanner onLearnMore={() => modals.setShowPricing(true)} />

                <div className="border-t border-[rgb(47,51,54)] xl:hidden">
                  <SemanticSearch
                    results={semantic.semanticResults}
                    selectedIds={semantic.effectiveSemanticSelectedIds}
                    onResultsChange={semantic.setSemanticResults}
                    onSelectedIdsChange={(ids) => {
                      semantic.setSemanticAutoSelectAll(false);
                      semantic.setSemanticSelectedIds(ids);
                    }}
                  />
                </div>
              </div>

              <aside className="hidden xl:block">
                <SemanticSearch
                  results={semantic.semanticResults}
                  selectedIds={semantic.effectiveSemanticSelectedIds}
                  onResultsChange={semantic.setSemanticResults}
                  onSelectedIdsChange={(ids) => {
                    semantic.setSemanticAutoSelectAll(false);
                    semantic.setSemanticSelectedIds(ids);
                  }}
                />
              </aside>
            </div>
          </div>
        )}
      </main>

      {articleUrl && (
        <ArticleReaderView
          articleUrl={articleUrl}
          tweet={articleTweet}
          onClose={closeArticleReader}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense>
      <XAuthProvider>
        <HomeContent />
      </XAuthProvider>
    </Suspense>
  );
}
