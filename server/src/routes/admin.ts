import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired, requireRoles, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authRequired, requireRoles("ADMIN"));

const roleSchema = z.object({ role: z.enum(["USER", "MANAGER", "ADMIN"]) });

router.patch("/users/:id/role", async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const uid = String(req.params.id);
  const u = await prisma.user.update({
    where: { id: uid },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });
  res.json(u);
});

const blockSchema = z.object({ blocked: z.boolean() });

router.patch("/users/:id/block", async (req, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const uid = String(req.params.id);
  const u = await prisma.user.update({
    where: { id: uid },
    data: { blocked: parsed.data.blocked },
    select: { id: true, email: true, blocked: true },
  });
  res.json(u);
});

router.post("/campaigns/:id/approve", async (req, res) => {
  const cid = String(req.params.id);
  const c = await prisma.campaign.update({
    where: { id: cid },
    data: { status: "ACTIVE" },
  });
  res.json(c);
});

router.get("/users", async (req, res) => {
  const query = req.query.q ? String(req.query.q).trim() : "";
  const users = await prisma.user.findMany({
    where: query
      ? {
          email: { contains: query, mode: "insensitive" },
        }
      : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, blocked: true, pointBalance: true, createdAt: true },
  });
  res.json(users);
});

router.get("/overview", async (_req, res) => {
  const [users, campaigns, submissions, events] = await Promise.all([
    prisma.user.count(),
    prisma.campaign.count(),
    prisma.submission.count(),
    prisma.analyticsEvent.count(),
  ]);
  res.json({ users, campaigns, submissions, analyticsEvents: events });
});

export default router;
