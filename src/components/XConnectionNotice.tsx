"use client";

const X_CONNECTION_ERROR_MESSAGES: Record<string, string> = {
  missing_oauth_params:
    "We couldn't finish connecting your X account because the callback came back without the expected OAuth parameters. Try again.",
  missing_oauth_cookies:
    "We couldn't finish connecting your X account because the login session expired before the callback completed. Try again.",
  state_mismatch:
    "We couldn't finish connecting your X account because the callback state did not match the original sign-in request. Try again.",
  oauth_env_missing:
    "We couldn't finish connecting your X account because the server OAuth configuration is incomplete.",
  token_exchange_failed:
    "We couldn't finish connecting your X account because X rejected the token exchange. Try again, and if it keeps failing, verify the production OAuth credentials.",
  current_user_fetch_failed:
    "We couldn't finish connecting your X account because we couldn't fetch your X profile after sign-in.",
  missing_user_id:
    "We couldn't finish connecting your X account because X returned an incomplete user profile.",
  unexpected_callback_error:
    "We couldn't finish connecting your X account because the callback failed unexpectedly. Try again.",
};

export function getXConnectionErrorMessage(errorCode: string | null): string {
  if (!errorCode) {
    return "We couldn't finish connecting your X account. Try again.";
  }

  return X_CONNECTION_ERROR_MESSAGES[errorCode] ?? X_CONNECTION_ERROR_MESSAGES.unexpected_callback_error;
}

export function XConnectionNotice({
  errorCode,
  onDismiss,
}: {
  errorCode: string | null;
  onDismiss: () => void;
}) {
  return (
    <div
      data-testid="x-connection-notice"
      className="fixed left-1/2 top-4 z-50 w-[min(92vw,680px)] -translate-x-1/2"
    >
      <div className="rounded-2xl border border-red-500/30 bg-red-950/90 px-5 py-4 text-red-50 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-500/20 p-1">
            <svg className="h-4 w-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">X connection failed</p>
            <p className="mt-1 text-sm text-red-100/90">{getXConnectionErrorMessage(errorCode)}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 text-red-100/70 transition-colors hover:bg-red-500/10 hover:text-white"
            aria-label="Dismiss X connection error"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
