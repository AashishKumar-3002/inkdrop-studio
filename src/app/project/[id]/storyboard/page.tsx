"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eraser,
  Hand,
  Info,
  MessageSquareText,
  Pencil,
  Plus,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ClientProject, StoryboardChatMessage, StoryboardNote, StoryboardStroke } from "@/lib/types";
import {
  Button,
  CardHeader,
  EmptyState,
  ErrorState,
  Kicker,
  Lbl,
  PageHeader,
  Segmented,
  Skeleton,
  cn,
} from "@/components/ui";

const NOTE_COLORS = ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#E5E7EB"];
/** Near-black — sticky notes keep a fixed pastel background in both themes,
 * so their text needs a fixed dark ink rather than a token that would flip
 * to a light color (and vanish) in dark mode. */
const NOTE_TEXT_COLOR = "#1f2937";
/** A mid-blue reads on both the light and dark board backgrounds; a pure
 * black default pen would disappear against the dark-mode board. */
const DEFAULT_PEN_COLOR = "#2563eb";

const MAX_NOTES = 500;
const MAX_NOTE_TEXT = 5000;
const MAX_STROKES = 2000;
const MAX_POINTS_PER_STROKE = 10000;

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Kept outside the component so the linter doesn't (mis)treat these
 * Math.random() calls as happening during render — this only ever runs
 * from the "add note" click handler. */
function makeNewNote(): StoryboardNote {
  return {
    id: makeId(),
    x: 40 + Math.random() * 60,
    y: 40 + Math.random() * 60,
    w: 200,
    h: 140,
    text: "",
    color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
  };
}

export default function StoryboardPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<StoryboardNote[]>([]);
  const [strokes, setStrokes] = useState<StoryboardStroke[]>([]);
  const [chat, setChat] = useState<StoryboardChatMessage[]>([]);
  const [mode, setMode] = useState<"move" | "draw">("move");
  const [drawColor, setDrawColor] = useState(DEFAULT_PEN_COLOR);
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 900 });

  const load = useCallback(() => {
    api
      .getProject(id)
      .then((p: ClientProject) => {
        setNotes(p.storyboard.notes);
        setStrokes(p.storyboard.strokes);
        setChat(p.storyboard.chat);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Couldn't load the storyboard.");
      })
      .finally(() => setLoading(false));
  }, [id]);

    // The effect only kicks off the request; every setState lands in a
  // promise callback, satisfying React's no-sync-setState-in-effect rule.
  useEffect(() => {
    load();
  }, [load]);

  /** Retry from the error state — a click handler, so setState is fine. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    load();
  }, [load]);

  // Keep the canvas's internal pixel grid matching its displayed CSS size
  // 1:1, so pointer coordinates (measured in CSS pixels) line up exactly
  // with what gets drawn — otherwise a stretched canvas draws in the wrong
  // place.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setCanvasSize({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const pt of stroke.points.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }, [strokes]);

  // canvasSize is intentionally a dependency: resizing the canvas clears its
  // pixel buffer, so every resize needs a repaint from the stroke data.
  useEffect(() => {
    redraw();
  }, [redraw, canvasSize]);

  function scheduleSave(nextNotes: StoryboardNote[], nextStrokes: StoryboardStroke[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveStoryboard(id, { notes: nextNotes, strokes: nextStrokes });
        setSaveState("saved");
      } catch (e) {
        setSaveState("idle");
        toast.error(e instanceof ApiError ? e.message : "Couldn't save the storyboard.");
      }
    }, 600);
  }

  function addNote() {
    if (notes.length >= MAX_NOTES) {
      toast.error(`You've reached the limit of ${MAX_NOTES} notes.`);
      return;
    }
    const next = [...notes, makeNewNote()];
    setNotes(next);
    scheduleSave(next, strokes);
  }

  function updateNote(noteId: string, patch: Partial<StoryboardNote>) {
    if (typeof patch.text === "string" && patch.text.length > MAX_NOTE_TEXT) {
      toast.error(`Notes are limited to ${MAX_NOTE_TEXT} characters.`);
      patch = { ...patch, text: patch.text.slice(0, MAX_NOTE_TEXT) };
    }
    const next = notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n));
    setNotes(next);
    scheduleSave(next, strokes);
  }

  function removeNote(noteId: string) {
    const next = notes.filter((n) => n.id !== noteId);
    setNotes(next);
    scheduleSave(next, strokes);
  }

  function boardPoint(e: React.PointerEvent) {
    const rect = boardRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onNotePointerDown(e: React.PointerEvent, note: StoryboardNote) {
    if (mode !== "move") return;
    const rect = boardRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      offsetX: e.clientX - rect.left - note.x,
      offsetY: e.clientY - rect.top - note.y,
    };
  }

  function onBoardPointerMove(e: React.PointerEvent) {
    if (mode === "move" && dragRef.current) {
      const rect = boardRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - dragRef.current.offsetX;
      const y = e.clientY - rect.top - dragRef.current.offsetY;
      setNotes((prev) =>
        prev.map((n) => (n.id === dragRef.current!.id ? { ...n, x, y } : n))
      );
    } else if (mode === "draw" && drawingRef.current) {
      if (currentStrokeRef.current.length >= MAX_POINTS_PER_STROKE) return;
      const pt = boardPoint(e);
      currentStrokeRef.current.push(pt);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && currentStrokeRef.current.length > 1) {
        const points = currentStrokeRef.current;
        const prev = points[points.length - 2];
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
    }
  }

  function onBoardPointerUp() {
    if (mode === "move" && dragRef.current) {
      dragRef.current = null;
      scheduleSave(notes, strokes);
    } else if (mode === "draw" && drawingRef.current) {
      drawingRef.current = false;
      if (currentStrokeRef.current.length > 1) {
        if (strokes.length >= MAX_STROKES) {
          toast.error(`You've reached the limit of ${MAX_STROKES} strokes. Try clearing the drawing.`);
          currentStrokeRef.current = [];
          redraw();
          return;
        }
        const stroke: StoryboardStroke = {
          id: makeId(),
          points: currentStrokeRef.current,
          color: drawColor,
          width: 3,
        };
        const next = [...strokes, stroke];
        setStrokes(next);
        scheduleSave(notes, next);
      }
      currentStrokeRef.current = [];
    }
  }

  function onBoardPointerDown(e: React.PointerEvent) {
    if (mode !== "draw") return;
    if ((e.target as HTMLElement).closest("[data-note]")) return;
    drawingRef.current = true;
    currentStrokeRef.current = [boardPoint(e)];
  }

  function undoStroke() {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    setStrokes(next);
    scheduleSave(notes, next);
  }

  function clearDrawing() {
    if (strokes.length === 0) return;
    if (!confirm("Clear the entire sketch? This can't be undone.")) return;
    setStrokes([]);
    scheduleSave(notes, []);
  }

  async function askAgent() {
    if (!question.trim()) return;
    setAsking(true);
    const canvasImageDataUrl =
      strokes.length > 0 ? canvasRef.current?.toDataURL("image/png") : undefined;
    const q = question.trim();
    setChat((prev) => [...prev, { role: "user", content: q, createdAt: new Date().toISOString() }]);
    setQuestion("");
    try {
      const { chat: updated } = await api.askStoryboardAgent(id, q, canvasImageDataUrl);
      setChat(updated);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "The agent couldn't respond.");
    } finally {
      setAsking(false);
    }
  }

  useEffect(() => {
    const log = chatLogRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [chat]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-[65vh] w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-10">
        <ErrorState message={loadError} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col overflow-x-hidden px-4 py-10 sm:px-10">
      <PageHeader
        kicker={`${notes.length} note${notes.length === 1 ? "" : "s"} · ${strokes.length} stroke${strokes.length === 1 ? "" : "s"} · canvas ${canvasSize.w} × ${canvasSize.h}`}
        title="Storyboard"
        description="Scribble ideas, drag sticky notes around, and ask the agent what it thinks."
        size={48}
        actions={
          <span className="mono text-ink-subtle" role="status" aria-live="polite">
            {saveState === "saving" ? "SAVING…" : saveState === "saved" ? "SAVED" : ""}
          </span>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 border-y-2 border-line py-3">
        <Lbl>Tool</Lbl>
        <Segmented
          name="tool"
          ariaLabel="Board tool"
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "move",
              label: (
                <>
                  <Hand className="h-3.5 w-3.5" aria-hidden />
                  Move
                </>
              ),
            },
            {
              value: "draw",
              label: (
                <>
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Draw
                </>
              ),
            },
          ]}
        />
        {mode === "draw" && (
          <>
            <label className="sr-only" htmlFor="pen-color">
              Pen color
            </label>
            <input
              id="pen-color"
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="h-9 w-9 border border-line-strong bg-surface"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={undoStroke}
              disabled={strokes.length === 0}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Undo stroke
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearDrawing}
              disabled={strokes.length === 0}
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden />
              Clear drawing
            </Button>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={addNote} className="ml-auto">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Sticky note
        </Button>
      </div>

      <p className="sr-only">
        The board below is a freehand sketch area. Switch to Draw mode and use a mouse,
        touchscreen, or stylus to sketch; switch to Move mode to drag sticky notes. Sticky
        note text is editable directly in each note&rsquo;s text box.
      </p>

      <div
        className={cn(
          "mt-6 grid",
          chatOpen ? "sm:grid-cols-[minmax(0,1fr)_330px]" : "sm:grid-cols-1"
        )}
      >
        <div
          ref={boardRef}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerDown={onBoardPointerDown}
          className="relative h-[65vh] w-full overflow-hidden border-2 border-line bg-surface-2 [background-image:radial-gradient(circle,_var(--color-line-strong)_1px,_transparent_1px)] [background-size:16px_16px]"
          style={{ touchAction: "none", cursor: mode === "draw" ? "crosshair" : "default" }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            className="pointer-events-none absolute inset-0"
            style={{ touchAction: "none" }}
          />
          {notes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <EmptyState
                kicker="Empty board"
                title="Add your first note"
                description="Drop a sticky note on the board to start mapping out scenes and ideas."
              />
            </div>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              data-note
              onPointerDown={(e) => onNotePointerDown(e, note)}
              className="absolute flex flex-col border border-[rgba(0,0,0,0.15)] p-2 shadow-card"
              style={{
                left: note.x,
                top: note.y,
                width: note.w,
                height: note.h,
                backgroundColor: note.color,
                cursor: mode === "move" ? "grab" : "default",
              }}
            >
              <div className="mb-1 flex justify-end gap-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateNote(note.id, { color: c })}
                    aria-label={`Set note color to ${c}`}
                    aria-pressed={note.color === c}
                    className="h-3 w-3 border border-[rgba(0,0,0,0.15)]"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  aria-label="Delete note"
                  className="ml-1 text-xs hover:opacity-70"
                  style={{ color: NOTE_TEXT_COLOR, opacity: 0.5 }}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
              <textarea
                className="flex-1 resize-none border-none bg-transparent text-sm focus:outline-none"
                style={{ color: NOTE_TEXT_COLOR }}
                placeholder="..."
                aria-label="Sticky note text"
                value={note.text}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => updateNote(note.id, { text: e.target.value })}
              />
            </div>
          ))}
        </div>

        {chatOpen && (
          <>
            {/* Mobile scrim so the sheet reads as an overlay, not a floating box */}
            <div
              className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--color-ink)_20%,transparent)] sm:hidden"
              onClick={() => setChatOpen(false)}
              aria-hidden
            />
            <div
              className={cn(
                "flex flex-col overflow-hidden border-2 border-line bg-surface",
                "fixed inset-x-3 bottom-3 top-auto z-50 h-[70vh]",
                "sm:static sm:inset-auto sm:z-auto sm:h-auto sm:border-l-2 sm:border-y-0 sm:border-r-0"
              )}
            >
              <CardHeader
                title="Storyboard agent"
                action={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setChatOpen(false)}
                    aria-label="Close storyboard agent"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                }
              />
              <div className="flex items-start gap-2 border-b border-hair bg-surface-2 px-4 py-2 text-xs text-ink-subtle">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Your sketch is only visible to vision-capable models. Check your{" "}
                  <Link href={`/project/${id}/settings`} className="underline underline-offset-2 hover:text-ink">
                    model settings
                  </Link>
                  .
                </span>
              </div>
              <div
                ref={chatLogRef}
                role="log"
                aria-live="polite"
                className="flex-1 overflow-y-auto px-4 py-3 text-sm"
              >
                {chat.length === 0 && (
                  <p className="text-ink-subtle">
                    Ask things like &ldquo;what do you think of the story so far?&rdquo; or
                    &ldquo;any changes you&rsquo;d suggest?&rdquo; — it reads your sticky notes,
                    any sketch on the board, and your story bible.
                  </p>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={i > 0 ? "mt-4 border-t border-hair pt-4" : undefined}>
                    {m.role === "user" ? (
                      <Lbl className="mb-1.5 block">You</Lbl>
                    ) : (
                      <Kicker className="mb-1.5">Agent</Kicker>
                    )}
                    <p className="leading-relaxed text-ink">{m.content}</p>
                  </div>
                ))}
                {asking && <p className="mt-4 text-ink-subtle">Thinking…</p>}
              </div>
              <div className="flex items-center gap-2 border-t-2 border-line p-3">
                <label className="sr-only" htmlFor="agent-question">
                  Ask about the story
                </label>
                <input
                  id="agent-question"
                  className="h-9 flex-1 border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                  placeholder="Ask about the story…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !asking && askAgent()}
                  disabled={asking}
                />
                <Button
                  variant="primary"
                  size="icon"
                  onClick={askAgent}
                  disabled={asking || !question.trim()}
                  loading={asking}
                  aria-label="Send question"
                >
                  {!asking && <Send className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {!chatOpen && (
        <Button
          variant="primary"
          size="icon"
          onClick={() => setChatOpen(true)}
          aria-label="Open storyboard agent"
          aria-expanded={chatOpen}
          className="fixed bottom-6 right-6 h-14 w-14 shadow-float"
        >
          <MessageSquareText className="h-6 w-6" aria-hidden />
        </Button>
      )}
    </div>
  );
}
