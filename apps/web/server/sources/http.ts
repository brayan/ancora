import type { SourceErrorCode, SourceDetail, SourceSummary } from "@ancora/shared-types";
import { NextResponse } from "next/server";
import { AccountAuthorizationError, type AccountScope } from "@/server/accounts/access";
import { DuplicateSourceError, SourceInputError } from "@/server/sources/errors";

export type SourcesRouteDependencies = Readonly<{
  requireAccountScope(): Promise<AccountScope>;
  createPastedSource(
    scope: AccountScope,
    input: { title?: unknown; text?: unknown },
  ): Promise<SourceSummary>;
  listPastedSources(scope: AccountScope): Promise<readonly SourceSummary[]>;
}>;

export type SourceDetailRouteDependencies = Readonly<{
  requireAccountScope(): Promise<AccountScope>;
  readPastedSource(scope: AccountScope, sourceId: string): Promise<SourceDetail | null>;
}>;

export type SourceRouteContext = Readonly<{
  params: Promise<{
    sourceId: string;
  }>;
}>;

export function createSourcesRouteHandlers(dependencies: SourcesRouteDependencies) {
  return {
    async GET() {
      try {
        const scope = await dependencies.requireAccountScope();
        const sources = await dependencies.listPastedSources(scope);

        return NextResponse.json({ sources });
      } catch (error) {
        return sourceErrorResponse(error);
      }
    },

    async POST(request: Request) {
      try {
        const scope = await dependencies.requireAccountScope();
        const body = await request.json().catch(() => null);

        if (!body || typeof body !== "object") {
          return sourceError("invalid_request", 400);
        }

        const source = await dependencies.createPastedSource(scope, {
          title: "title" in body ? body.title : undefined,
          text: "text" in body ? body.text : undefined,
        });

        return NextResponse.json({ source }, { status: 201 });
      } catch (error) {
        return sourceErrorResponse(error);
      }
    },
  };
}

export function createSourceDetailRouteHandlers(
  dependencies: SourceDetailRouteDependencies,
) {
  return {
    async GET(_request: Request, context: SourceRouteContext) {
      try {
        const scope = await dependencies.requireAccountScope();
        const { sourceId } = await context.params;
        const source = await dependencies.readPastedSource(scope, sourceId);

        if (!source) {
          return sourceError("not_found", 404);
        }

        return NextResponse.json({ source });
      } catch (error) {
        if (error instanceof AccountAuthorizationError) {
          return sourceError(
            error.status === 401 ? "unauthorized" : "forbidden",
            error.status,
          );
        }

        throw error;
      }
    },
  };
}

function sourceErrorResponse(error: unknown) {
  if (error instanceof AccountAuthorizationError) {
    return sourceError(error.status === 401 ? "unauthorized" : "forbidden", error.status);
  }

  if (error instanceof SourceInputError) {
    return sourceError(error.code, 400);
  }

  if (error instanceof DuplicateSourceError) {
    return sourceError(error.code, 409);
  }

  throw error;
}

function sourceError(error: SourceErrorCode, status: number) {
  return NextResponse.json({ error }, { status });
}
