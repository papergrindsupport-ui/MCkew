// Tiny validation helper. We avoid pulling Zod into the edge runtime to
// keep cold starts fast — these handlers all have small, fixed shapes.
import { HttpError } from "./http.ts";

export type Issue = { field: string; message: string };
export type Rule<T> = (value: unknown, field: string, issues: Issue[]) => T | undefined;

export const v = {
  optional<T>(rule: Rule<T>): Rule<T | undefined> {
    return (value, field, issues) => {
      if (value === undefined || value === null) return undefined;
      return rule(value, field, issues);
    };
  },
  string(opts: { min?: number; max?: number; pattern?: RegExp } = {}): Rule<string> {
    return (value, field, issues) => {
      if (typeof value !== "string") {
        issues.push({ field, message: "Must be a string" });
        return;
      }
      if (opts.min !== undefined && value.length < opts.min) {
        issues.push({ field, message: `Min length ${opts.min}` });
      }
      if (opts.max !== undefined && value.length > opts.max) {
        issues.push({ field, message: `Max length ${opts.max}` });
      }
      if (opts.pattern && !opts.pattern.test(value)) {
        issues.push({ field, message: "Invalid format" });
      }
      return value;
    };
  },
  bool(): Rule<boolean> {
    return (value, field, issues) => {
      if (typeof value !== "boolean") {
        issues.push({ field, message: "Must be boolean" });
        return;
      }
      return value;
    };
  },
  int(opts: { min?: number; max?: number } = {}): Rule<number> {
    return (value, field, issues) => {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        issues.push({ field, message: "Must be integer" });
        return;
      }
      if (opts.min !== undefined && value < opts.min)
        issues.push({ field, message: `Min ${opts.min}` });
      if (opts.max !== undefined && value > opts.max)
        issues.push({ field, message: `Max ${opts.max}` });
      return value;
    };
  },
  jsonObject(): Rule<Record<string, unknown>> {
    return (value, field, issues) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        issues.push({ field, message: "Must be an object" });
        return;
      }
      return value as Record<string, unknown>;
    };
  },
  jsonArray(): Rule<unknown[]> {
    return (value, field, issues) => {
      if (!Array.isArray(value)) {
        issues.push({ field, message: "Must be an array" });
        return;
      }
      return value;
    };
  },
  oneOf<T extends string>(values: readonly T[]): Rule<T> {
    return (value, field, issues) => {
      if (typeof value !== "string" || !values.includes(value as T)) {
        issues.push({ field, message: `Must be one of: ${values.join(", ")}` });
        return;
      }
      return value as T;
    };
  },
};

export function parse<S extends Record<string, Rule<unknown>>>(
  body: unknown,
  schema: S,
): { [K in keyof S]: ReturnType<S[K]> } {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(422, "Body must be an object");
  }
  const issues: Issue[] = [];
  const out: Record<string, unknown> = {};
  const b = body as Record<string, unknown>;
  for (const [key, rule] of Object.entries(schema)) {
    out[key] = rule(b[key], key, issues);
  }
  // Reject unknown fields explicitly — keeps writes auditable.
  for (const k of Object.keys(b)) {
    if (!(k in schema)) issues.push({ field: k, message: "Unknown field" });
  }
  if (issues.length) throw new HttpError(422, "Validation failed", issues);
  return out as { [K in keyof S]: ReturnType<S[K]> };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
