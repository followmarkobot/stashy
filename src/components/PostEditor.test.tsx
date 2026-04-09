// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostEditor from "./PostEditor";
import NewEditorPage from "@/app/editor/new/page";
import EditorPage from "@/app/editor/[postId]/page";

const { pushMock, replaceMock, routerState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  routerState: {
    onReplace: null as ((href: string) => void) | null,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: (href: string) => {
      replaceMock(href);
      routerState.onReplace?.(href);
    },
  }),
}));

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
  fetch?: typeof fetch;
};

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label
  ) as HTMLButtonElement | undefined;
}

function EditorFlowHarness() {
  const [path, setPath] = React.useState("/editor/new");

  React.useEffect(() => {
    routerState.onReplace = setPath;

    return () => {
      routerState.onReplace = null;
    };
  }, []);

  if (path === "/editor/new") {
    return <NewEditorPage />;
  }

  const postId = path.replace("/editor/", "");
  return <EditorPage params={{ postId }} />;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("PostEditor mode switching", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        post: {
          id: "post-123",
          title: "Loaded draft",
          subtitle: "A subtitle",
          content: "<p>Draft body</p>",
          authors: ["Marko"],
          updated_at: "2026-04-08T16:00:00.000Z",
        },
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    pushMock.mockReset();
    replaceMock.mockReset();
    routerState.onReplace = null;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("returns to write mode after entering preview or publish", async () => {
    await act(async () => {
      root.render(<PostEditor mode="edit" postId="post-123" />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("[contenteditable]")).not.toBeNull();

    await act(async () => {
      findButton(container, "Preview")?.click();
    });

    expect(container.querySelector("[contenteditable]")).toBeNull();

    await act(async () => {
      findButton(container, "Write")?.click();
    });

    expect(container.querySelector("[contenteditable]")).not.toBeNull();

    await act(async () => {
      findButton(container, "Continue")?.click();
    });

    expect(container.querySelector("[contenteditable]")).toBeNull();

    await act(async () => {
      findButton(container, "Write")?.click();
    });

    expect(container.querySelector("[contenteditable]")).not.toBeNull();
  });
});

describe("PostEditor draft flow", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/posts" && init?.method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            post: {
              id: "post-123",
              title: "",
              subtitle: "",
              content: "",
              author_id: "marko",
              user_id: "user-1",
              authors: ["Marko"],
              status: "draft",
              created_at: "2026-04-08T16:00:00.000Z",
              updated_at: "2026-04-08T16:00:00.000Z",
            },
          }),
        } as Response;
      }

      if (url === "/api/posts/post-123" && !init?.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            post: {
              id: "post-123",
              title: "Loaded draft",
              subtitle: "Loaded subtitle",
              content: "<p>Loaded body</p>",
              author_id: "marko",
              user_id: "user-1",
              authors: ["Marko"],
              status: "draft",
              created_at: "2026-04-08T16:00:00.000Z",
              updated_at: "2026-04-08T16:01:00.000Z",
            },
          }),
        } as Response;
      }

      if (url === "/api/posts/post-123" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body ?? "{}")) as {
          title: string;
          subtitle: string;
          content: string;
          authorId: string;
          authors: string[];
        };

        return {
          ok: true,
          status: 200,
          json: async () => ({
            post: {
              id: "post-123",
              title: body.title,
              subtitle: body.subtitle,
              content: body.content,
              author_id: body.authorId,
              user_id: "user-1",
              authors: body.authors,
              status: "draft",
              created_at: "2026-04-08T16:00:00.000Z",
              updated_at: "2026-04-08T16:02:00.000Z",
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    pushMock.mockReset();
    replaceMock.mockReset();
    routerState.onReplace = null;
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("creates a draft, loads it on the edit route, and autosaves later changes", async () => {
    await act(async () => {
      root.render(<EditorFlowHarness />);
    });

    await act(async () => {
      await flushMicrotasks();
    });

    expect(replaceMock).toHaveBeenCalledWith("/editor/post-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/post-123", {
      cache: "no-store",
    });

    const titleInput = container.querySelector('input[placeholder="Title"]') as HTMLInputElement;
    expect(titleInput.value).toBe("Loaded draft");

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;

      valueSetter?.call(titleInput, "Updated draft title");
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      await flushMicrotasks();
    });

    await act(async () => {
      vi.advanceTimersByTime(2500);
      await flushMicrotasks();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === "/api/posts/post-123" && init?.method === "PATCH"
    );

    expect(patchCall).toBeDefined();
    expect(patchCall?.[1]).toMatchObject({
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(String(patchCall?.[1]?.body ?? "{}"))).toEqual({
      title: "Updated draft title",
      subtitle: "Loaded subtitle",
      content: "<p>Loaded body</p>",
      authorId: "marko",
      authors: ["Marko"],
    });
  });
});
