"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { StoryboardChatMessage, StoryboardNote, StoryboardStroke } from "@/lib/types";

const NOTE_COLORS = ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#E5E7EB"];

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
  const [notes, setNotes] = useState<StoryboardNote[]>([]);
  const [strokes, setStrokes] = useState<StoryboardStroke[]>([]);
  const [chat, setChat] = useState<StoryboardChatMessage[]>([]);
  const [mode, setMode] = useState<"move" | "draw">("move");
  const [drawColor, setDrawColor] = useState("#111827");
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 900 });

  useEffect(() => {
    api.getProject(id).then((p) => {
      setNotes(p.storyboard.notes);
      setStrokes(p.storyboard.strokes);
      setChat(p.storyboard.chat);
      setLoading(false);
    });
  }, [id]);

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

  useEffect(() => {
    redraw();
  }, [redraw, canvasSize]);

  function scheduleSave(nextNotes: StoryboardNote[], nextStrokes: StoryboardStroke[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveStoryboard(id, { notes: nextNotes, strokes: nextStrokes });
    }, 600);
  }

  function addNote() {
    const next = [...notes, makeNewNote()];
    setNotes(next);
    scheduleSave(next, strokes);
  }

  function updateNote(noteId: string, patch: Partial<StoryboardNote>) {
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

  function clearDrawing() {
    setStrokes([]);
    scheduleSave(notes, []);
  }

  async function askAgent() {
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    const canvasImageDataUrl =
      strokes.length > 0 ? canvasRef.current?.toDataURL("image/png") : undefined;
    const q = question.trim();
    setChat((prev) => [...prev, { role: "user", content: q, createdAt: new Date().toISOString() }]);
    setQuestion("");
    try {
      const { chat: updated } = await api.askStoryboardAgent(id, q, canvasImageDataUrl);
      setChat(updated);
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "The agent couldn't respond.");
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return <div className="p-16 text-center text-neutral-400">Loading...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Storyboard</h1>
          <p className="text-sm text-neutral-500">
            Scribble ideas, drag sticky notes around, and ask the agent what it thinks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-300 p-0.5">
            <button
              onClick={() => setMode("move")}
              className={`rounded-md px-3 py-1 text-xs ${
                mode === "move" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              Move
            </button>
            <button
              onClick={() => setMode("draw")}
              className={`rounded-md px-3 py-1 text-xs ${
                mode === "draw" ? "bg-neutral-900 text-white" : "text-neutral-500"
              }`}
            >
              Draw
            </button>
          </div>
          {mode === "draw" && (
            <>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="h-8 w-8 rounded border border-neutral-300"
              />
              <button
                onClick={clearDrawing}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-500"
              >
                Clear drawing
              </button>
            </>
          )}
          <button
            onClick={addNote}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
          >
            + Sticky note
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerDown={onBoardPointerDown}
        className="relative h-[65vh] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[radial-gradient(circle,_#e5e5e5_1px,_transparent_1px)] [background-size:16px_16px]"
        style={{ touchAction: "none", cursor: mode === "draw" ? "crosshair" : "default" }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="pointer-events-none absolute inset-0"
        />
        {notes.map((note) => (
          <div
            key={note.id}
            data-note
            onPointerDown={(e) => onNotePointerDown(e, note)}
            className="absolute flex flex-col rounded-lg p-2 shadow-md"
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
                  onClick={() => updateNote(note.id, { color: c })}
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={() => removeNote(note.id)}
                className="ml-1 text-xs text-black/40 hover:text-red-600"
              >
                ✕
              </button>
            </div>
            <textarea
              className="flex-1 resize-none border-none bg-transparent text-sm text-neutral-800 focus:outline-none"
              placeholder="..."
              value={note.text}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => updateNote(note.id, { text: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* Floating agent button + drawer */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-2xl text-white shadow-lg hover:bg-neutral-700"
        title="Ask the agent"
      >
        ✨
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 flex h-[28rem] w-96 flex-col rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <span className="text-sm font-medium text-neutral-800">Storyboard agent</span>
            <button onClick={() => setChatOpen(false)} className="text-neutral-400">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {chat.length === 0 && (
              <p className="text-neutral-400">
                Ask things like &ldquo;what do you think of the story so far?&rdquo; or
                &ldquo;any changes you&rsquo;d suggest?&rdquo; — it reads your sticky notes,
                any sketch on the board, and your story bible.
              </p>
            )}
            {chat.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 ${
                  m.role === "user"
                    ? "ml-6 bg-neutral-900 text-white"
                    : "mr-6 bg-neutral-100 text-neutral-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {askError && <p className="text-red-500">{askError}</p>}
          </div>
          <div className="flex items-center gap-2 border-t border-neutral-100 p-3">
            <input
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              placeholder="Ask about the story..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAgent()}
              disabled={asking}
            />
            <button
              onClick={askAgent}
              disabled={asking || !question.trim()}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {asking ? "..." : "Ask"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
