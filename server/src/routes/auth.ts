import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import geoip from "geoip-lite";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const FULL_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  pointBalance: true,
  nickname: true,
  avatarUrl: true,
  birthYear: true,
  birthDate: true,
  gender: true,
  region: true,
  country: true,
  walletAddress: true,
  telegramHandle: true,
  discordId: true,
  discordHandle: true,
  youtubeHandle: true,
  instagramHandle: true,
};

async function recordUserEntry(userId: string, req: any, locale?: string) {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const cleanIp = String(ip).split(",")[0].trim();
    
    // 현재 유저의 정보를 먼저 조회
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true }
    });

    const geo = geoip.lookup(cleanIp);
    const geoCountry = geo?.country || null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastIp: cleanIp,
        // 현재 설정된 국가가 없을 때만 GeoIP 정보로 업데이트
        ...((geoCountry && !currentUser?.country) && { country: geoCountry }),
        ...(locale && { locale }),
      },
    });
  } catch (err) {
    console.error("Failed to record user entry:", err);
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: "USER" },
    select: FULL_USER_SELECT,
  });
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  
  // 비동기로 정보 기록
  recordUserEntry(user.id, req);

  res.json({ user, token });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.blocked || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ sub: user.id, email: user.email, role: user.role });

  recordUserEntry(user.id, req);

  // Re-fetch or pick fields for consistent response
  const responseUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: FULL_USER_SELECT
  });

  res.json({
    user: responseUser,
    token,
  });
});

const googleLoginSchema = z.object({
  credential: z.string(),
});

router.post("/google", async (req, res) => {
  const parsed = googleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const email = payload.email;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: "USER",
        },
      });
    }

    if (user.blocked) {
      res.status(403).json({ error: "Your account is blocked" });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });

    const locale = (payload as any).locale;
    recordUserEntry(user.id, req, locale);

    const responseUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: FULL_USER_SELECT
    });

    res.json({
      user: responseUser,
      token,
    });
  } catch (err: any) {
    console.error("Google Auth Error Detail:", err?.message || err);
    import("fs").then(fs => fs.writeFileSync("google_error.log", err?.message || String(err)));
    res.status(401).json({ error: "Google authentication failed", details: err?.message });
  }
});


router.put("/me/profile", authRequired, async (req: AuthedRequest, res) => {
  try {
    const data = req.body;
    
    const updateData: any = {};
    if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.locale !== undefined) updateData.locale = data.locale;
    if (data.discordId !== undefined) updateData.discordId = data.discordId;
    if (data.telegramHandle !== undefined) updateData.telegramHandle = data.telegramHandle;
    if (data.telegramId !== undefined) updateData.telegramHandle = data.telegramId; // Compatibility

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });
    
    res.json(user);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
