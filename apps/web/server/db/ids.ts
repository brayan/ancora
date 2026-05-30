import { randomUUID } from "node:crypto";

export function createDatabaseId() {
  return randomUUID();
}
