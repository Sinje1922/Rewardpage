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
import verifyRouter from "./routes/verify.js";
import oauthRouter from "./routes/oauth.js";
import { startLotteryWorker } from "./workers/lotteryWorker.js";

// BigInt JSON 직렬화 지원
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

const rawCorsOrigin = process.env.CORS_ORIGIN;
const corsOrigin = rawCorsOrigin
  ? rawCorsOrigin.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "https://authors-coal-beauty-joined.trycloudflare.com",
      "https://foam-insulation-formats-karma.trycloudflare.com",
      "https://rewardpage-5nmq.vercel.app",
      "https://pick-q.vercel.app"
    ];

app.use(cors({
  origin: function(origin, callback) {
    // 1. 요청 원본이 없거나(로컬 서버간 통신 등)
    // 2. 허용 목록에 직접 포함되어 있거나
    // 3. .trycloudflare.com 으로 끝나는 주소라면 허용
    const isCloudflare = origin && /\.trycloudflare\.com$/.test(origin);
    
    if (!origin || corsOrigin.indexOf(origin) !== -1 || isCloudflare) {
      callback(null, true);
    } else {
      console.log("CORS Blocked for origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
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
app.use("/api/verify", verifyRouter);
app.use("/api/oauth", oauthRouter);

const port = Number(process.env.PORT ?? 4000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
  startLotteryWorker();
});