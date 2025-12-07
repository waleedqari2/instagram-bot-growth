import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // نخلي الـ user ثابت مؤقتاً لتجاوز مشكلة الـ cookie
  const user: User = {
    id: 1,
    openId: 'bot-user-001',
    name: 'Bot User',
    email: 'bot@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
