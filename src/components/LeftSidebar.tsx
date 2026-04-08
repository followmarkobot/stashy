"use client";

import { useState } from "react";
import { useView, ViewMode } from "../contexts/ViewContext";
import PricingModal from "./PricingModal";

interface LeftSidebarProps {
  onShowOnboarding?: () => void;
}

const navItems: { id: ViewMode; label: string }[] = [
  { id: "digest", label: "Digest" },
  { id: "twitter", label: "Twitter" },
  { id: "facebook", label: "Facebook" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function DigestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" />
    </svg>
  );
}

export default function LeftSidebar({ onShowOnboarding }: LeftSidebarProps) {
  const { view, setView } = useView();
  const [showPricing, setShowPricing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleDirectCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        // Fall back to pricing modal on error
        setShowPricing(true);
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setShowPricing(true);
      setCheckoutLoading(false);
    }
  };

  const renderNavIcon = (itemId: ViewMode, isActive: boolean) => {
    const className = `w-6 h-6 ${isActive ? "text-[rgb(29,155,240)]" : "text-current"}`;

    if (itemId === "digest") {
      return <DigestIcon className={className} />;
    }

    if (itemId === "twitter") {
      return <XIcon className={className} />;
    }

    if (itemId === "facebook") {
      return <FacebookIcon className={className} />;
    }

    return <FacebookIcon className={className} />;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen z-30 flex-col border-r border-[rgb(47,51,54)] bg-black group w-[68px] hover:w-[240px] lg:w-[240px] transition-all duration-200 overflow-hidden">
        {/* Logo area */}
        <div className="px-4 py-5 flex items-center gap-3 shrink-0">
          <svg
            className="w-8 h-8 text-white shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-white font-bold text-lg whitespace-nowrap opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity duration-200">
            Saved Tweets
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === "digest" ? view === "digest" || view === "newsletter" : view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-full transition-colors ${
                  isActive
                    ? "text-white font-bold"
                    : "text-[rgb(231,233,234)] hover:bg-[rgb(22,24,28)]"
                }`}
              >
                <div className="relative shrink-0 w-7 h-7 flex items-center justify-center">
                  {renderNavIcon(item.id, isActive)}
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-[rgb(29,155,240)] rounded-full" />
                  )}
                </div>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity duration-200 text-[15px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* How it works button */}
        {onShowOnboarding && (
          <div className="px-2 py-1 shrink-0">
            <button
              onClick={onShowOnboarding}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-full text-[rgb(231,233,234)] hover:bg-[rgb(22,24,28)] transition-colors"
            >
              <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity duration-200 text-[15px]">
                How it works
              </span>
            </button>
          </div>
        )}

        {/* Go Pro button */}
        <div className="px-2 py-2 shrink-0">
          <button
            onClick={handleDirectCheckout}
            disabled={checkoutLoading}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-full bg-gradient-to-r from-[rgb(29,155,240)] to-[rgb(120,86,255)] hover:opacity-90 transition-opacity text-white font-bold disabled:opacity-50"
          >
            <div className="shrink-0 w-7 h-7 flex items-center justify-center">
              {checkoutLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              )}
            </div>
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity duration-200 text-[15px]">
              Go Pro
            </span>
          </button>
        </div>

        {/* Bottom branding */}
        <div className="px-4 py-4 border-t border-[rgb(47,51,54)] shrink-0">
          <p className="text-[rgb(113,118,123)] text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity duration-200">
            Saved Tweets Viewer
          </p>
        </div>
      </aside>

      {/* Pricing Modal */}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-black border-t border-[rgb(47,51,54)] flex">
        {navItems.map((item) => {
          const isActive = item.id === "digest" ? view === "digest" || view === "newsletter" : view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-[rgb(29,155,240)]"
                  : "text-[rgb(113,118,123)]"
              }`}
            >
              {renderNavIcon(item.id, isActive)}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        {/* Mobile Go Pro button */}
        <button
          onClick={handleDirectCheckout}
          disabled={checkoutLoading}
          className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-white disabled:opacity-50"
        >
          {checkoutLoading ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-[rgb(29,155,240)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          )}
          <span className="text-[10px] font-medium bg-gradient-to-r from-[rgb(29,155,240)] to-[rgb(120,86,255)] bg-clip-text text-transparent">Pro</span>
        </button>
      </nav>
    </>
  );
}
