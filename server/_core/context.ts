import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // Since we bypassed the login page, we create a dummy user for protected procedures to function.
    user = {
      id: 1, // Use a fixed ID for the dummy user
      openId: "dummy-user-id-1",
      name: "Guest User",
      email: "guest@example.com",
      loginMethod: "bypassed",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    console.warn("[Auth Bypass] Created dummy user for protected procedures.");
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
