import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import campaignsRouter from "./routes/campaigns.js";
import missionsRouter from "./routes/missions.js";
import adminRouter from "./routes/admin.js";
import meRouter from "./routes/me.js";
import submissionsRouter from "./routes/submissions.js";
import uploadRouter from "./routes/upload.js";

const app = express();

const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const corsOrigin =
  process.env.CORS_ORIGIN === "true"
    ? true
    : process.env.CORS_ORIGIN || true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.use("/uploads", express.static(uploadsRoot));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/missions", missionsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/me", meRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/upload", uploadRouter);

const port = Number(process.env.PORT ?? 4000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
  startLotteryWorker();
});