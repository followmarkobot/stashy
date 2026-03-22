// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted controllable mocks (run before vi.mock factories) ---
const { searchParamsGet, checkStatusMock } = vi.hoisted(() => ({
  searchParamsGet: vi.fn(() => null as string | null),
  checkStatusMock: vi.fn(),
}));

// --- Module mocks ---
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("../contexts/ViewContext", () => ({
  useView: () => ({ view: "twitter" }),
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
vi.mock("../components/SubstackLayout", () => ({ default: () => <div>SubstackLayout</div> }));
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
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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

// ---------------------------------------------------------------------------
// Onboarding modal (usePageModals)
// ---------------------------------------------------------------------------
describe("Onboarding modal", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
});

// ---------------------------------------------------------------------------
// Semantic state reset on source change (useSemanticSearch)
// ---------------------------------------------------------------------------
describe("Semantic state reset on source change", () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
