import { NextResponse } from "next/server";
import {
  CredentialsRegistrationError,
  registerCredentialsUserWithDatabase,
} from "@/server/auth/credentials";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const user = await registerCredentialsUserWithDatabase({
      email: "email" in body ? body.email : undefined,
      name: "name" in body ? body.name : undefined,
      password: "password" in body ? body.password : undefined,
    });

    return NextResponse.json(
      {
        accountId: user.activeAccountId,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CredentialsRegistrationError) {
      return NextResponse.json({ error: error.code }, { status: errorStatus(error.code) });
    }

    throw error;
  }
}

function errorStatus(code: CredentialsRegistrationError["code"]) {
  return code === "duplicate_email" ? 409 : 400;
}
