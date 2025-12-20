import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // مستخدم وهمي ثابت (نفس الموجود في جدول users id=1)
  const dummy: User = {
    id: 1,
    openId: "dummy-user",
    name: "Default User",
    email: null,
    loginMethod: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    req: opts.req,
    res: opts.res,
    user: dummy, // دائماً نعيده بدون أي محاولة مصادقة
  };
}
