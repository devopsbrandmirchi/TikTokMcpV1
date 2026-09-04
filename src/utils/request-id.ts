import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function createRequestId(req?: Request): string {
  const header = req?.headers.get("x-request-id") ?? req?.headers.get("x-cloud-trace-context");
  if (header?.trim()) {
    return header.split("/")[0]?.trim() || randomUUID();
  }
  return randomUUID();
}

export function runWithRequest<T>(context: RequestContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(context, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
