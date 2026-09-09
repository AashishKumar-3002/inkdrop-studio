/**
 * Shared plumbing for every API route: authentication, project ownership,
 * body validation and a single consistent error shape.
 *
 * The client only ever has to look at `{ error: string }`, and routes never
 * repeat the auth/ownership dance by hand (which is exactly where a
 * multi-tenant app leaks other people's data).
 */
import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";
import { auth } from "@/lib/auth";
import { isSingleUserMode, localUserId } from "@/lib/localUser";
import { getProject, getProjectMeta } from "@/lib/repo/projects";
import type { Project } from "@/lib/types";

export type ApiError = { error: string; details?: Record<string, string[]> };

export function errorResponse(
  message: string,
  status: number,
  details?: Record<string, string[]>
) {
  return NextResponse.json<ApiError>(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export const unauthorized = () => errorResponse("You need to sign in.", 401);
export const notFound = (what = "Not found.") => errorResponse(what, 404);
export const locked = (what: string) => errorResponse(what, 409);

/** Resolves the signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  // On a single-user install there is nobody to authenticate against, so the
  // local owner stands in. A real session still wins if one exists, which is
  // what makes signing in to add credits an upgrade rather than a switch.
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return isSingleUserMode() ? localUserId() : null;
}

/** Parses and validates a JSON body, throwing an ApiProblem on failure. */
export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, string[]>
  ) {
    super(message);
  }
}

/** Turns a Zod failure into a 400 with per-field messages. */
function toApiProblem(err: ZodError): ApiProblem {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }
  return new ApiProblem(400, err.issues[0]?.message ?? "Invalid request.", details);
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiProblem(400, "Expected a JSON body.");
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) throw toApiProblem(err);
    throw err;
  }
}

/**
 * Wraps a route handler so thrown ApiProblems become clean JSON responses
 * and anything unexpected becomes a 500 without leaking a stack trace to
 * the browser.
 */
export async function handle<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiProblem) {
      return errorResponse(err.message, err.status, err.details);
    }
    // A route that calls `schema.parse()` directly (rather than parseBody)
    // still gets a proper 400 instead of falling through to a 500.
    if (err instanceof ZodError) {
      const problem = toApiProblem(err);
      return errorResponse(problem.message, problem.status, problem.details);
    }
    console.error("[api] unhandled error", err);
    return errorResponse("Something went wrong on our end.", 500);
  }
}

type ProjectContext = { params: Promise<{ id: string }> };
type ChapterContext = { params: Promise<{ id: string; chapterId: string }> };

/**
 * Loads a project the signed-in user owns, or throws 401/404. A project
 * belonging to someone else is reported as "not found" — never "forbidden",
 * which would confirm the id exists.
 */
export async function requireProject(
  ctx: ProjectContext,
  opts: { withChapters?: boolean } = {}
): Promise<{ userId: string; project: Project }> {
  const userId = await currentUserId();
  if (!userId) throw new ApiProblem(401, "You need to sign in.");
  const { id } = await ctx.params;
  const project = opts.withChapters
    ? await getProject(id, userId)
    : await getProjectMeta(id, userId);
  if (!project) throw new ApiProblem(404, "Project not found.");
  return { userId, project };
}

export async function requireChapterContext(
  ctx: ChapterContext,
  opts: { withChapters?: boolean } = {}
): Promise<{ userId: string; project: Project; chapterId: string }> {
  const userId = await currentUserId();
  if (!userId) throw new ApiProblem(401, "You need to sign in.");
  const { id, chapterId } = await ctx.params;
  const project = opts.withChapters
    ? await getProject(id, userId)
    : await getProjectMeta(id, userId);
  if (!project) throw new ApiProblem(404, "Project not found.");
  return { userId, project, chapterId };
}

export async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new ApiProblem(401, "You need to sign in.");
  return userId;
}
