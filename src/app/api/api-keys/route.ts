import { NextResponse } from "next/server";
import { mockApiKeys } from "@/mock-data/api-keys";

type ApiKeyAction = "create" | "rotate" | "revoke";

const DESTRUCTIVE_ACTIONS: ApiKeyAction[] = ["rotate", "revoke"];

const ERROR_CODES = {
  CONFIRMATION_REQUIRED: "API_KEY_CONFIRMATION_REQUIRED",
  INVALID_ACTION: "API_KEY_INVALID_ACTION",
  INVALID_BODY: "API_KEY_INVALID_BODY",
  NOT_FOUND: "API_KEY_NOT_FOUND",
  UPSTREAM_UNAVAILABLE: "API_KEY_UPSTREAM_UNAVAILABLE",
} as const;

function errorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string,
) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status },
  );
}

function newCorrelationId(): string {
  return `apikey_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// Never echo raw key material, JWTs, or secrets back to clients or logs.
function redact(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "[redacted]";
  return `[redacted:${value.length}]`;
}

export async function GET() {
  // In real integration, replace with DB or upstream service call.
  return NextResponse.json({ data: mockApiKeys });
}

export async function POST(request: Request) {
  const correlationId = newCorrelationId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_BODY,
      "Request body must be valid JSON.",
      correlationId,
    );
  }

  const { action, id, confirmed } = (body ?? {}) as {
    action?: unknown;
    id?: unknown;
    confirmed?: unknown;
  };

  if (action !== "create" && action !== "rotate" && action !== "revoke") {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_ACTION,
      "action must be one of: create, rotate, revoke.",
      correlationId,
    );
  }

  // Deny-by-default: privileged/destructive actions require explicit confirmation.
  if (DESTRUCTIVE_ACTIONS.includes(action) && confirmed !== true) {
    return errorResponse(
      409,
      ERROR_CODES.CONFIRMATION_REQUIRED,
      `Confirmation is required before ${action} can proceed.`,
      correlationId,
    );
  }

  if (action !== "create" && typeof id !== "string") {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_BODY,
      "id is required for rotate and revoke.",
      correlationId,
    );
  }

  if (action !== "create") {
    const exists = mockApiKeys.some((key) => key.id === id);
    if (!exists) {
      return errorResponse(
        404,
        ERROR_CODES.NOT_FOUND,
        "API key not found.",
        correlationId,
      );
    }
  }

  // Fail-closed on writes: surface a stable code instead of leaking upstream detail.
  return errorResponse(
    503,
    ERROR_CODES.UPSTREAM_UNAVAILABLE,
    `Unable to ${action} API key right now. Please retry.`,
    correlationId,
  );
}
