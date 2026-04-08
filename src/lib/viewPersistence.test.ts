import { describe, expect, it } from "vitest";
import {
  TAB_STORAGE_KEY,
  getStoredView,
  saveStoredView,
  type ViewMode,
} from "./viewPersistence";

function createStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };

  return {
    getItem(key: string) {
      return key in store ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("viewPersistence", () => {
  it("returns digest when storage is empty", () => {
    const storage = createStorage();
    expect(getStoredView(storage)).toBe("digest");
  });

  it("returns saved valid tab", () => {
    const storage = createStorage({ [TAB_STORAGE_KEY]: "facebook" });
    expect(getStoredView(storage)).toBe("facebook");
  });

  it("accepts newsletter as a saved valid tab", () => {
    const storage = createStorage({ [TAB_STORAGE_KEY]: "newsletter" });
    expect(getStoredView(storage)).toBe("newsletter");
  });

  it("falls back to digest for invalid saved value", () => {
    const storage = createStorage({ [TAB_STORAGE_KEY]: "unknown" });
    expect(getStoredView(storage)).toBe("digest");
  });

  it("writes selected tab to storage", () => {
    const storage = createStorage();
    saveStoredView(storage, "twitter");
    expect(storage.getItem(TAB_STORAGE_KEY)).toBe("twitter");
  });

  it("ignores save when storage is unavailable", () => {
    const view: ViewMode = "facebook";
    expect(() => saveStoredView(null, view)).not.toThrow();
  });
});
