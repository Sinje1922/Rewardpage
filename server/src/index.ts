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
import { startLotteryWorker } from "./workers/lotteryWorker.js";

const app = express();

const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const rawCorsOrigin = process.env.CORS_ORIGIN;
const corsOrigin = rawCorsOrigin
  ? rawCorsOrigin.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "https://rewardpage-5nmq.vercel.app"];

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