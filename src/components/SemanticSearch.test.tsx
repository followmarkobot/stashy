// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import SemanticSearch from "./SemanticSearch";

function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("SemanticSearch chat flow", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("adds a user message to chat history when sending input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: { role: "assistant", content: "Here is a sourced answer [1]." },
        }),
      })
    );

    await act(async () => {
      root.render(
        <SemanticSearch
          results={[{ id: "a", content: "Source A", similarity: 1 }]}
          selectedIds={["a"]}
          onResultsChange={vi.fn()}
          onSelectedIdsChange={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    const chatInput = container.querySelector(
      'input[placeholder="ask a question or request a draft..."]'
    ) as HTMLInputElement;
    expect(chatInput).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      valueSetter?.call(chatInput, "What does source [1] claim?");
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const sendButton = (
      container.querySelector('button[type="submit"][aria-label="Send message"]') ||
      Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.match(/refine|send/i)
      )
    ) as HTMLButtonElement;
    expect(sendButton).not.toBeNull();
    expect(sendButton.disabled).toBe(false);

    await act(async () => {
      sendButton.click();
      await flushPromises();
    });

    expect(container.textContent).toContain("What does source [1] claim?");
    expect(container.textContent).toContain("Here is a sourced answer [1].");
  });

  it("shows an error when sending input with no retrieved items", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "retrievedItems is required and cannot be empty" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(
        <SemanticSearch
          results={[]}
          selectedIds={[]}
          onResultsChange={vi.fn()}
          onSelectedIdsChange={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    const chatInput = container.querySelector(
      'input[placeholder="ask a question or request a draft..."]'
    ) as HTMLInputElement;
    expect(chatInput).not.toBeNull();

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      valueSetter?.call(chatInput, "Hello");
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const sendButton = (
      container.querySelector('button[type="submit"][aria-label="Send message"]') ||
      Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.match(/refine|send/i)
      )
    ) as HTMLButtonElement;

    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton.click();
      await flushPromises();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("retrievedItems is required and cannot be empty");
  });
});
