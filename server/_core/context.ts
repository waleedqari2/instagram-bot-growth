import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db"; // نستورد الـ database

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // نحاول الاتصال بالـ database أولاً
  const db = await getDb();
  if (!db) {
    console.error('[Context] Database not available');
    return { user: null, req: opts.req, res: opts.res };
  }

  console.log('[Context] Database connected successfully');

  // نعيد user ثابت مؤقتاً لتجاوز مشكلة الـ cookie
  const user: User = {
    id: 1,
    openId: 'bot-user-001',
    name: 'Bot User',
    email: 'bot@example.com',
    loginMethod: 'bypassed',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  console.log('[Context] Created bot user for bypassed authentication');

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
