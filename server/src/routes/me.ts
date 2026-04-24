import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

const profileSchema = z.object({
  walletAddress: z.string().max(100).optional().nullable(),
  birthYear: z.number().int().min(1900).max(2100).optional().nullable(),
  birthDate: z.string().optional().nullable(), // ISO string from frontend
  nickname: z.string().max(50).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
  gender: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { 
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
      walletAddress: true 
    },
  });
  res.json(user);
});

router.patch("/profile", async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = { ...parsed.data };
  if (data.birthDate) {
    data.birthDate = new Date(data.birthDate) as any;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { id: true, email: true, role: true, birthYear: true, birthDate: true, walletAddress: true, pointBalance: true, nickname: true, avatarUrl: true, gender: true, region: true, country: true },
  });

  res.json(user);
});

router.delete("/profile", async (req: AuthedRequest, res) => {
  await prisma.user.delete({
    where: { id: req.user!.id },
  });
  res.json({ ok: true });
});

router.get("/submissions", async (req: AuthedRequest, res) => {
  const list = await prisma.submission.findMany({
    where: { userId: req.user!.id },
    include: {
      mission: {
        include: { campaign: { select: { id: true, title: true, status: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(list);
});

router.get("/wins", async (req: AuthedRequest, res) => {
  const wins = await prisma.winner.findMany({
    where: { userId: req.user!.id },
    include: { campaign: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(wins);
});

export default router;
