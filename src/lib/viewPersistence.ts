export type ViewMode = "digest" | "twitter" | "facebook" | "newsletter";

export const TAB_STORAGE_KEY = "stashy.activeView";

const VALID_VIEWS = new Set<ViewMode>(["digest", "twitter", "facebook", "newsletter"]);

export function getStoredView(storage: Storage | null): ViewMode {
  if (!storage) {
    return "digest";
  }

  const storedView = storage.getItem(TAB_STORAGE_KEY);
  if (!storedView || !VALID_VIEWS.has(storedView as ViewMode)) {
    return "digest";
  }

  return storedView as ViewMode;
}

export function saveStoredView(storage: Storage | null, view: ViewMode): void {
  if (!storage) {
    return;
  }

  storage.setItem(TAB_STORAGE_KEY, view);
}
