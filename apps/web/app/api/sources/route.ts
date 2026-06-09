import { requireCurrentAccountScope } from "@/server/accounts/current";
import { createSourcesRouteHandlers } from "@/server/sources/http";
import { createPastedSource, listPastedSources } from "@/server/sources/service";

const handlers = createSourcesRouteHandlers({
  requireAccountScope: requireCurrentAccountScope,
  createPastedSource,
  listPastedSources,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
