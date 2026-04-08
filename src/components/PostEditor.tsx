"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyAuthor, type Post } from "@/lib/posts";

type SaveState = "saving" | "saved" | "error";
type EditorMode = "write" | "preview" | "publish";

interface PostEditorProps {
  mode: "create" | "edit";
  postId?: string;
}

interface EditorDraftState {
  title: string;
  subtitle: string;
  content: string;
  authors: string[];
  lastSavedAt: string | null;
  isSaving: boolean;
}

const SAVE_INTERVAL_MS = 2500;

function getEmptyDraftState(): EditorDraftState {
  return {
    title: "",
    subtitle: "",
    content: "",
    authors: ["Marko"],
    lastSavedAt: null,
    isSaving: false,
  };
}

function isEditorMarkupEmpty(value: string): boolean {
  const normalized = value
    .replace(/<p><br><\/p>/g, "")
    .replace(/<div><br><\/div>/g, "")
    .replace(/<br>/g, "")
    .replace(/&nbsp;/g, "")
    .trim();

  return normalized.length === 0;
}

function formatSavedLabel(saveState: SaveState) {
  if (saveState === "saving") {
    return "Saving…";
  }

  if (saveState === "error") {
    return "Error saving";
  }

  return "Saved";
}

function formatSavedTime(lastSavedAt: string | null) {
  if (!lastSavedAt) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(lastSavedAt));
  } catch {
    return null;
  }
}

function getDraftSnapshot(state: EditorDraftState) {
  return JSON.stringify({
    title: state.title,
    subtitle: state.subtitle,
    content: state.content,
    authors: state.authors,
  });
}

function renderPreviewContent(content: string) {
  if (!content.trim()) {
    return "<p>Start writing…</p>";
  }

  return content;
}

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-full border border-[#2f2f2f] bg-[#161616] px-3 py-1.5 text-[12px] font-medium text-[#bfbfbf] transition hover:border-[#414141] hover:text-[#f2f2f2]"
    >
      {label}
    </button>
  );
}

function RichTextEditor({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  onBlur: () => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const syncContent = () => {
    const nextValue = editorRef.current?.innerHTML ?? "";
    onChange(isEditorMarkupEmpty(nextValue) ? "" : nextValue);
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncContent();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <ToolbarButton label="B" onClick={() => runCommand("bold")} />
        <ToolbarButton label="I" onClick={() => runCommand("italic")} />
        <ToolbarButton label="H2" onClick={() => runCommand("formatBlock", "h2")} />
        <ToolbarButton label="Quote" onClick={() => runCommand("formatBlock", "blockquote")} />
        <ToolbarButton label="List" onClick={() => runCommand("insertUnorderedList")} />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Start writing…"
        className="editor-body min-h-[420px] text-[18px] leading-[1.7] text-[#e6e6e6] outline-none"
        onInput={syncContent}
        onBlur={onBlur}
      />
    </div>
  );
}

export default function PostEditor({ mode, postId }: PostEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorDraftState>(getEmptyDraftState);
  const [draftId, setDraftId] = useState(postId ?? "");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saving");
  const [editorMode, setEditorMode] = useState<EditorMode>("write");

  const hasCreatedDraftRef = useRef(false);
  const draftRef = useRef(draft);
  const lastSavedSnapshotRef = useRef("");

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const persistDraft = useCallback(async (options?: { keepalive?: boolean }) => {
    if (!draftId) {
      return false;
    }

    const currentDraft = draftRef.current;
    const snapshot = getDraftSnapshot(currentDraft);
    const authorId = slugifyAuthor(currentDraft.authors[0] ?? "Marko");

    if (snapshot === lastSavedSnapshotRef.current) {
      return true;
    }

    setSaveState("saving");
    setDraft((current) => ({ ...current, isSaving: true }));

    try {
      const response = await fetch(`/api/posts/${draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: currentDraft.title,
          subtitle: currentDraft.subtitle,
          content: currentDraft.content,
          authorId,
          authors: currentDraft.authors,
        }),
        cache: "no-store",
        keepalive: options?.keepalive,
      });

      if (!response.ok) {
        throw new Error("Save request failed.");
      }

      const payload = (await response.json()) as { post: Post };
      lastSavedSnapshotRef.current = snapshot;
      setDraft((current) => ({
        ...current,
        isSaving: false,
        lastSavedAt: payload.post.updated_at,
      }));
      setSaveState("saved");
      return true;
    } catch (error) {
      console.error("Failed to save draft:", error);
      setDraft((current) => ({ ...current, isSaving: false }));
      setSaveState("error");
      return false;
    }
  }, [draftId]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (hasCreatedDraftRef.current) {
      return;
    }

    hasCreatedDraftRef.current = true;

    async function createDraft() {
      setIsBootstrapping(true);
      setLoadError(null);

      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Create request failed.");
        }

        const payload = (await response.json()) as { post: Post };
        router.replace(`/editor/${payload.post.id}`);
      } catch (error) {
        console.error("Failed to create draft:", error);
        setLoadError("Could not create a new draft.");
        setIsBootstrapping(false);
        setSaveState("error");
      }
    }

    void createDraft();
  }, [mode, router]);

  useEffect(() => {
    if (mode !== "edit" || !postId) {
      return;
    }

    async function loadDraft() {
      setIsBootstrapping(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/posts/${postId}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          setLoadError("Draft not found.");
          setIsBootstrapping(false);
          setSaveState("error");
          return;
        }

        if (!response.ok) {
          throw new Error("Load request failed.");
        }

        const payload = (await response.json()) as { post: Post };
        const nextState = {
          title: payload.post.title,
          subtitle: payload.post.subtitle,
          content: payload.post.content,
          authors: payload.post.authors.length > 0 ? payload.post.authors : ["Marko"],
          lastSavedAt: payload.post.updated_at,
          isSaving: false,
        };

        lastSavedSnapshotRef.current = getDraftSnapshot(nextState);
        setDraftId(payload.post.id);
        setDraft(nextState);
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to load draft:", error);
        setLoadError("Could not load this draft.");
        setSaveState("error");
      } finally {
        setIsBootstrapping(false);
      }
    }

    void loadDraft();
  }, [mode, postId]);

  useEffect(() => {
    if (!draftId || isBootstrapping) {
      return;
    }

    const snapshot = getDraftSnapshot(draft);

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, SAVE_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, draftId, isBootstrapping, persistDraft]);

  useEffect(() => {
    if (!draftId || isBootstrapping) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const snapshot = getDraftSnapshot(draft);

      if (snapshot === lastSavedSnapshotRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
      void persistDraft({ keepalive: true });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [draft, draftId, isBootstrapping, persistDraft]);

  const addAuthor = () => {
    const name = window.prompt("Add an author");

    if (!name || !name.trim()) {
      return;
    }

    setDraft((current) => ({
      ...current,
      authors: current.authors.some((author) => author.toLowerCase() === name.trim().toLowerCase())
        ? current.authors
        : [...current.authors, name.trim()],
    }));
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-[#a0a0a0]">
        Creating draft…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="rounded-[28px] border border-[#242424] bg-[#101010] px-8 py-7 text-center">
          <p className="text-[18px] text-[#f3f3f3]">{loadError}</p>
        </div>
      </div>
    );
  }

  const savedTime = formatSavedTime(draft.lastSavedAt);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <header className="sticky top-0 z-20 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-[#262626] px-3 py-1.5 text-[12px] font-medium text-[#b8b8b8] transition hover:border-[#3a3a3a] hover:text-white"
            >
              Dashboard
            </button>
            <div className="rounded-full border border-[#262626] bg-[#111111] px-3 py-1.5 text-[12px] font-medium text-[#b8b8b8]">
              {formatSavedLabel(saveState)}
              {savedTime ? <span className="ml-2 text-[#777777]">{savedTime}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorMode("preview")}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
                editorMode === "preview"
                  ? "bg-[#f3f3f3] text-[#111111]"
                  : "border border-[#2b2b2b] text-[#c7c7c7] hover:border-[#434343] hover:text-white"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("publish")}
              className="rounded-full bg-[#f3f3f3] px-4 py-2 text-[13px] font-medium text-[#111111] transition hover:bg-white"
            >
              Continue
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-5 py-8 md:px-8 xl:flex-row">
        <section className="flex-1 rounded-[32px] border border-[#1c1c1c] bg-[#101010] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:px-10 md:py-9">
          <div className="mx-auto max-w-[760px]">
            <input
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              onBlur={() => {
                void persistDraft();
              }}
              placeholder="Title"
              className="w-full border-none bg-transparent pb-4 text-[44px] font-semibold tracking-[-0.04em] text-[#f7f7f7] outline-none placeholder:text-[#3f3f3f]"
              style={{
                fontFamily:
                  '"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif',
              }}
            />

            <input
              type="text"
              value={draft.subtitle}
              onChange={(event) =>
                setDraft((current) => ({ ...current, subtitle: event.target.value }))
              }
              onBlur={() => {
                void persistDraft();
              }}
              placeholder="Add a subtitle…"
              className="w-full border-none bg-transparent pb-6 text-[22px] leading-[1.6] text-[#cfcfcf] outline-none placeholder:text-[#525252]"
              style={{
                fontFamily:
                  '"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif',
              }}
            />

            <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1 text-[13px] text-[#bdbdbd]">
              {draft.authors.map((author) => (
                <span
                  key={author}
                  className="rounded-full bg-[#2a2a2a] px-[10px] py-[4px] text-[13px] text-[#f1f1f1]"
                >
                  {author}
                </span>
              ))}
              <button
                type="button"
                onClick={addAuthor}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2f2f2f] text-[18px] text-[#d6d6d6] transition hover:border-[#4a4a4a] hover:text-white"
                aria-label="Add author"
              >
                +
              </button>
            </div>

            {editorMode === "write" ? (
              <RichTextEditor
                value={draft.content}
                onChange={(content) =>
                  setDraft((current) => ({
                    ...current,
                    content,
                  }))
                }
                onBlur={() => {
                  void persistDraft();
                }}
              />
            ) : (
              <article
                className="prose prose-invert max-w-none"
                style={{
                  fontFamily:
                    '"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif',
                }}
              >
                {draft.title ? (
                  <h1 className="mb-4 text-[44px] font-semibold tracking-[-0.04em] text-[#f7f7f7]">
                    {draft.title}
                  </h1>
                ) : null}
                {draft.subtitle ? (
                  <p className="mb-6 text-[22px] leading-[1.6] text-[#cdcdcd]">{draft.subtitle}</p>
                ) : null}
                <div
                  className="editor-body text-[18px] leading-[1.7] text-[#e6e6e6]"
                  dangerouslySetInnerHTML={{ __html: renderPreviewContent(draft.content) }}
                />
              </article>
            )}
          </div>
        </section>

        <aside className="w-full shrink-0 xl:w-[320px]">
          <div className="rounded-[28px] border border-[#1c1c1c] bg-[#101010] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6f6f6f]">
              {editorMode === "publish" ? "Publishing Flow" : "Draft Status"}
            </p>
            <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[#f5f5f5]">
              {editorMode === "publish" ? "Ready for the next step" : "Writing canvas"}
            </h2>
            <p className="mt-3 text-[14px] leading-7 text-[#aaaaaa]">
              {editorMode === "publish"
                ? "Review the preview, confirm the byline, then keep this draft in progress until you are ready to publish."
                : "Autosave keeps this draft current every few seconds, on blur, and before the page unloads."}
            </p>

            <div className="mt-6 space-y-4 rounded-[24px] border border-[#1f1f1f] bg-[#0c0c0c] p-4">
              <div className="flex items-center justify-between text-[13px] text-[#8d8d8d]">
                <span>Status</span>
                <span className="rounded-full border border-[#2a2a2a] px-2.5 py-1 text-[#dedede]">
                  {saveState === "error" ? "Needs attention" : "Draft"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-[#8d8d8d]">
                <span>Authors</span>
                <span className="text-[#dedede]">{draft.authors.length}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-[#8d8d8d]">
                <span>Saved</span>
                <span className="text-[#dedede]">{formatSavedLabel(saveState)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setEditorMode("preview")}
                className="rounded-full border border-[#2d2d2d] px-4 py-3 text-[13px] font-medium text-[#d8d8d8] transition hover:border-[#454545] hover:text-white"
              >
                Open preview
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("publish")}
                className="rounded-full bg-[#f3f3f3] px-4 py-3 text-[13px] font-medium text-[#111111] transition hover:bg-white"
              >
                Continue
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
