// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted controllable mocks (run before vi.mock factories) ---
const { searchParamsGet, checkStatusMock, setViewMock, pushMock, currentView } = vi.hoisted(() => ({
  searchParamsGet: vi.fn<(key: string) => string | null>(() => null),
  checkStatusMock: vi.fn(),
  setViewMock: vi.fn(),
  pushMock: vi.fn(),
  currentView: { value: "twitter" as string },
}));

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

// --- Module mocks ---
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: searchParamsGet }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../contexts/ViewContext", () => ({
  useView: () => ({
    view: currentView.value,
    setView: (nextView: string) => {
      currentView.value = nextView;
      setViewMock(nextView);
    },
  }),
}));

vi.mock("../contexts/XAuthContext", () => ({
  XAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useXAuth: () => ({ checkStatus: checkStatusMock }),
}));

vi.mock("../components/LeftSidebar", () => ({
  default: () => <div>LeftSidebar</div>,
}));

vi.mock("../components/TweetCard", () => ({ default: () => <div>TweetCard</div> }));
vi.mock("../components/FacebookCard", () => ({ default: () => <div>FacebookCard</div> }));
vi.mock("../components/FacebookLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../components/SubstackLayout", () => ({
  default: ({ onOpenDashboard }: { onOpenDashboard?: () => void }) => (
    <div>
      <div>SubstackLayout</div>
      {onOpenDashboard ? (
        <button type="button" onClick={onOpenDashboard}>
          Open dashboard
        </button>
      ) : null}
    </div>
  ),
}));
vi.mock("../components/UpgradeBanner", () => ({ default: () => <div>UpgradeBanner</div> }));
vi.mock("../components/PricingModal", () => ({ default: () => null }));
vi.mock("../components/ArticleReaderView", () => ({ default: () => null }));

// OnboardingModal: expose isOpen so tests can assert visibility
vi.mock("../components/OnboardingModal", () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="onboarding-modal">
        <button data-testid="onboarding-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// SuccessToast: always render something detectable
vi.mock("../components/SuccessToast", () => ({
  SuccessToast: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="success-toast" onClick={onDismiss}>
      SuccessToast
    </div>
  ),
}));

// DataSourceToggle: expose current value and allow triggering onChange
vi.mock("../components/DataSourceToggle", () => ({
  DataSourceToggle: (props: { value: string; onChange: (s: string) => void }) => (
    <div
      data-testid="data-source-toggle"
      data-value={props.value}
      onClick={() => props.onChange(props.value === "stash" ? "bookmarks" : "stash")}
    >
      DataSourceToggle
    </div>
  ),
}));

// TweetFeed: capture props on each render for semantic state assertions
let latestTweetFeedProps: Record<string, unknown> = {};
vi.mock("../components/TweetFeed", () => ({
  default: (props: Record<string, unknown>) => {
    latestTweetFeedProps = props;
    return <div data-testid="tweet-feed">TweetFeed</div>;
  },
}));

// SemanticSearch: capture onResultsChange so tests can simulate search results
let capturedOnResultsChange:
  | ((r: Array<{ id: string; content: string; similarity: number }>) => void)
  | null = null;
vi.mock("../components/SemanticSearch", () => ({
  default: (props: {
    onResultsChange: (
      r: Array<{ id: string; content: string; similarity: number }>
    ) => void;
  }) => {
    capturedOnResultsChange = props.onResultsChange;
    return <div data-testid="semantic-search">SemanticSearch</div>;
  },
}));

import Home from "./page";

// --- Shared helpers ---
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function setupDOM() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
}

function teardownDOM() {
  act(() => root.unmount());
  container.remove();
  searchParamsGet.mockReset();
  searchParamsGet.mockImplementation(() => null);
  checkStatusMock.mockReset();
  setViewMock.mockReset();
  pushMock.mockReset();
  currentView.value = "twitter";
  capturedOnResultsChange = null;
  latestTweetFeedProps = {};
  vi.clearAllMocks();
}

async function renderHome() {
  await act(async () => {
    root.render(<Home />);
  });
}

// ---------------------------------------------------------------------------
// Original test (must keep passing)
// ---------------------------------------------------------------------------
describe("Home semantic search visibility", () => {
  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
    });
    setupDOM();
  });

  afterEach(() => {
    teardownDOM();
    if (typeof localStorage?.clear === "function") {
      localStorage.clear();
    }
  });

  it("shows semantic search by default and does not render a toggle button", async () => {
    await renderHome();

    const semanticSearchNode = container.querySelector('[data-testid="semantic-search"]');
    const toggleButton = Array.from(container.querySelectorAll("button")).find((button) => {
      const text = button.textContent?.trim();
      return text === "Semantic Search" || text === "Close Semantic";
    });

    expect(semanticSearchNode).not.toBeNull();
    expect(toggleButton).toBeUndefined();
  });
});

describe("Newsletter dashboard view", () => {
  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    currentView.value = "newsletter";
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "true"), setItem: vi.fn() });
    setupDOM();
  });

  afterEach(teardownDOM);

  it("renders the newsletter dashboard shell with overview, latest post, drafts, and help CTA", async () => {
    await renderHome();

    expect(container.textContent).toContain("Sam's Substack");
    expect(container.textContent).toContain("Overview");
    expect(container.textContent).toContain("Latest post");
    expect(container.textContent).toContain("Drafts");
    expect(container.textContent).toContain("Ask a question");
  });

  it("opens the dashboard from the digest view", async () => {
    currentView.value = "digest";

    await renderHome();

    const openDashboardButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Open dashboard")
    ) as HTMLButtonElement | undefined;

    expect(openDashboardButton).toBeDefined();

    await act(async () => {
      openDashboardButton?.click();
    });

    expect(setViewMock).toHaveBeenCalledWith("newsletter");
    await renderHome();
    expect(container.textContent).toContain("Sam's Substack");
  });

  it("navigates to the new editor route from the dashboard", async () => {
    await renderHome();

    const newPostButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("New post")
    ) as HTMLButtonElement | undefined;

    expect(newPostButton).toBeDefined();

    await act(async () => {
      newPostButton?.click();
    });

    expect(pushMock).toHaveBeenCalledWith("/editor/new");
  });
});

// ---------------------------------------------------------------------------
// Onboarding modal (usePageModals)
// ---------------------------------------------------------------------------
describe("Onboarding modal", () => {
  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    setupDOM();
  });

  afterEach(teardownDOM);

  it("shows onboarding modal when hasSeenOnboarding is not set", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem: vi.fn() });

    await renderHome();

    expect(container.querySelector('[data-testid="onboarding-modal"]')).not.toBeNull();
  });

  it("hides onboarding modal when hasSeenOnboarding is already set", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "true"), setItem: vi.fn() });

    await renderHome();

    expect(container.querySelector('[data-testid="onboarding-modal"]')).toBeNull();
  });

  it("writes hasSeenOnboarding to localStorage and closes modal on onClose", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem });

    await renderHome();

    const closeBtn = container.querySelector(
      '[data-testid="onboarding-close"]'
    ) as HTMLElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(setItem).toHaveBeenCalledWith("hasSeenOnboarding", "true");
    expect(container.querySelector('[data-testid="onboarding-modal"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// URL param effects (usePageModals)
// ---------------------------------------------------------------------------
describe("URL param effects", () => {
  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    // Treat onboarding as already seen so it doesn't interfere
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "true"), setItem: vi.fn() });
    setupDOM();
  });

  afterEach(teardownDOM);

  it("upgraded=true shows the success toast", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "upgraded" ? "true" : null
    );

    await renderHome();

    expect(container.querySelector('[data-testid="success-toast"]')).not.toBeNull();
  });

  it("cancelled=true does not show the success toast", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "cancelled" ? "true" : null
    );

    await renderHome();

    expect(container.querySelector('[data-testid="success-toast"]')).toBeNull();
  });

  it("xConnected=1 calls checkStatus", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "xConnected" ? "1" : null
    );

    await renderHome();

    expect(checkStatusMock).toHaveBeenCalled();
  });

  it("xConnected=1 switches data source toggle to bookmarks", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "xConnected" ? "1" : null
    );

    await renderHome();

    const toggle = container.querySelector('[data-testid="data-source-toggle"]');
    expect(toggle?.getAttribute("data-value")).toBe("bookmarks");
  });

  it("xConnected=0 shows a visible X connection failure message", async () => {
    searchParamsGet.mockImplementation((key: string) => {
      if (key === "xConnected") return "0";
      if (key === "xError") return "token_exchange_failed";
      return null;
    });

    await renderHome();

    expect(container.textContent).toContain("We couldn't finish connecting your X account");
  });

  it("xConnected=0 still shows a generic X connection failure message when xError is missing", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "xConnected" ? "0" : null
    );

    await renderHome();

    expect(container.textContent).toContain("We couldn't finish connecting your X account");
  });
});

// ---------------------------------------------------------------------------
// Semantic state reset on source change (useSemanticSearch)
// ---------------------------------------------------------------------------
describe("Semantic state reset on source change", () => {
  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "true"), setItem: vi.fn() });
    setupDOM();
  });

  afterEach(teardownDOM);

  it("clears semanticFilterIds when data source changes", async () => {
    await renderHome();

    // Simulate SemanticSearch producing search results
    await act(async () => {
      capturedOnResultsChange?.([{ id: "tweet-1", content: "foo", similarity: 0.9 }]);
    });

    expect((latestTweetFeedProps.semanticFilterIds as string[])).toEqual(["tweet-1"]);

    // Switch data source via the toggle
    const toggle = container.querySelector(
      '[data-testid="data-source-toggle"]'
    ) as HTMLElement;
    await act(async () => {
      toggle.click();
    });

    expect((latestTweetFeedProps.semanticFilterIds as string[])).toEqual([]);
  });

  it("resets semanticAutoSelectAll to true when data source changes", async () => {
    await renderHome();

    // Initial state: autoSelectAll=true
    expect(latestTweetFeedProps.semanticAutoSelectAll).toBe(true);

    // Switch source
    const toggle = container.querySelector(
      '[data-testid="data-source-toggle"]'
    ) as HTMLElement;
    await act(async () => {
      toggle.click();
    });

    expect(latestTweetFeedProps.semanticAutoSelectAll).toBe(true);
  });
});
