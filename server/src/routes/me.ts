import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authRequired);

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
