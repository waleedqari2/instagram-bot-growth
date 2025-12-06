import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import path from "path";
import fs from "fs"; // 👈 للتحقق من الملفات

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ===== debug: نتحقق من المسار ونوجد الملف =====
  app.get("/debug", (_req, res) => {
    const publicPath = path.join(process.cwd(), 'public');
    try {
      const files = fs.readdirSync(publicPath);
      const hasLogin = fs.existsSync(path.join(publicPath, 'login.html'));
      res.json({ publicPath, files, hasLogin });
    } catch (e: any) {
      res.json({ error: e.message, publicPath });
    }
  });

  // ===== نخدم الـ login مباشرة =====
  app.use("/login", express.static(path.join(process.cwd(), 'public')));
  app.get("/", (_req, res) => res.redirect("/login"));

  // ===== نضيف endpoint بسيط للتأكد =====
  app.get("/health", (_req, res) => res.send("Backend is alive"));

  // OAuth
  registerOAuthRoutes(app);

  // tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[Railway] Backend listening on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
