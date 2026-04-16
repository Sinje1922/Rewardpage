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

router.get("/dashboard", async (_req, res) => {
  const [
    userCount,
    campStats,
    subCount,
    winnerStats,
    userPointStats,
    countries,
    ages,
    growth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.campaign.groupBy({ by: ["status"], _count: true }),
    prisma.submission.count(),
    prisma.winner.aggregate({ _sum: { points: true } }),
    prisma.user.aggregate({ _sum: { pointBalance: true } }),
    prisma.user.groupBy({ by: ["country"], _count: true }),
    prisma.user.groupBy({ by: ["birthYear"], _count: true }),
    prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*)::int as count 
      FROM "User" 
      GROUP BY month 
      ORDER BY month ASC 
      LIMIT 12
    `,
  ]);

  const activeCamps = campStats.find((s) => s.status === "ACTIVE")?._count ?? 0;
  const totalPoints = (winnerStats._sum.points ?? 0) + (userPointStats._sum.pointBalance ?? 0);

  res.json({
    summary: {
      users: userCount,
      activeCampaigns: activeCamps,
      totalCampaigns: campStats.reduce((acc, curr) => acc + curr._count, 0),
      submissions: subCount,
      totalPoints,
      avgParticipants: campStats.length > 0 ? (subCount / campStats.reduce((acc, curr) => acc + curr._count, 0)) : 0
    },
    countries: countries.map(c => ({ name: c.country || 'Unknown', count: c._count })),
    ages: ages.map(a => ({ year: a.birthYear || 0, count: a._count })),
    history: growth
  });
});

export default router;
