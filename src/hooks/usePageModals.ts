"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useXAuth } from "../contexts/XAuthContext";

interface UsePageModalsOptions {
  onXConnected?: () => void;
}

export interface UsePageModalsReturn {
  showPricing: boolean;
  setShowPricing: (v: boolean) => void;
  showSuccess: boolean;
  setShowSuccess: (v: boolean) => void;
  xConnectionError: string | null;
  setXConnectionError: (value: string | null) => void;
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  handleOnboardingClose: () => void;
}

export function usePageModals({ onXConnected }: UsePageModalsOptions = {}): UsePageModalsReturn {
  const { checkStatus } = useXAuth();
  const searchParams = useSearchParams();
  const [showPricing, setShowPricing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [xConnectionError, setXConnectionError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const upgraded = searchParams.get("upgraded") === "true";
    const xConnected = searchParams.get("xConnected");
    const xError = searchParams.get("xError");

    if (upgraded) {
      setShowSuccess(true);
    }

    if (xConnected === "1") {
      setXConnectionError(null);
      onXConnected?.();
      checkStatus();
    }

    if (xConnected === "0") {
      setXConnectionError(xError);
    }

    if (
      upgraded ||
      searchParams.get("cancelled") === "true" ||
      xConnected === "1" ||
      xConnected === "0"
    ) {
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, checkStatus, onXConnected]);

  const handleOnboardingClose = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  return {
    showPricing,
    setShowPricing,
    showSuccess,
    setShowSuccess,
    xConnectionError,
    setXConnectionError,
    showOnboarding,
    setShowOnboarding,
    handleOnboardingClose,
  };
}
