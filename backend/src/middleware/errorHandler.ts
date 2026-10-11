import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface BodyParserError {
  status: number;
  expose: boolean;
  type?: string;
  message: string;
}

// body-parser rejects bad payloads with http-errors (expose: true, 4xx).
function asBodyParserError(err: unknown): BodyParserError | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }

  const { status, expose } = err as Partial<BodyParserError>;
  const isClientError =
    typeof status === "number" && status >= 400 && status < 500;

  return isClientError && expose === true ? (err as BodyParserError) : null;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join(".") || undefined,
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const bodyError = asBodyParserError(err);
  if (bodyError) {
    const message =
      bodyError.type === "entity.parse.failed"
        ? "Malformed JSON body"
        : bodyError.message;
    res.status(bodyError.status).json({ error: message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
