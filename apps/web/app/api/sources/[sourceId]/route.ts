import { requireCurrentAccountScope } from "@/server/accounts/current";
import { createSourceDetailRouteHandlers } from "@/server/sources/http";
import { readPastedSource } from "@/server/sources/service";

const handlers = createSourceDetailRouteHandlers({
  requireAccountScope: requireCurrentAccountScope,
  readPastedSource,
});

export const GET = handlers.GET;
