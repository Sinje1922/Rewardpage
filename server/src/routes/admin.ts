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
  try {
    const [stats, countries, ages, growth] = await Promise.all([
      // 핵심 지표들을 하나의 쿼리로 통합하여 커넥션 풀 절약
      prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*) FROM "User")::int as user_count,
          (SELECT COUNT(*) FROM "Campaign")::int as total_camp_count,
          (SELECT COUNT(*) FROM "Campaign" WHERE status = 'ACTIVE')::int as active_camp_count,
          (SELECT COUNT(*) FROM "Submission")::int as sub_count,
          (SELECT COALESCE(SUM(points), 0) FROM "Winner")::bigint as winner_points_sum,
          (SELECT COALESCE(SUM("pointBalance"), 0) FROM "User")::bigint as user_points_sum
      `,
      (prisma.user as any).groupBy({ by: ["country"], _count: true }),
      (prisma.user as any).groupBy({ by: ["birthYear"], _count: true }),
      prisma.$queryRaw<any[]>`
        SELECT 
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          COUNT(*)::int as count 
        FROM "User" 
        GROUP BY month 
        ORDER BY month ASC 
        LIMIT 12
      `,
    ]);

    const s = stats[0] || {};
    const totalPoints = Number(s.winner_points_sum || 0) + Number(s.user_points_sum || 0);

    const result = {
      summary: {
        users: Number(s.user_count || 0),
        activeCampaigns: Number(s.active_camp_count || 0),
        totalCampaigns: Number(s.total_camp_count || 0),
        submissions: Number(s.sub_count || 0),
        totalPoints,
        avgParticipants: Number(s.total_camp_count) > 0 
          ? (Number(s.sub_count) / Number(s.total_camp_count)) 
          : 0
      },
      countries: (countries as any[]).map(c => ({ name: c.country || 'Unknown', count: Number(c._count) })),
      ages: (ages as any[]).map(a => ({ year: a.birthYear || 0, count: Number(a._count) })),
      history: (growth || []).map(g => ({ month: g.month, count: Number(g.count) }))
    };

    res.json(result);
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;
