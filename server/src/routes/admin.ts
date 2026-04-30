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


router.get("/users", async (req, res) => {
  const query = req.query.q ? String(req.query.q).trim() : "";
  const users = await prisma.user.findMany({
    where: query
      ? {
          email: { contains: query },
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
    prisma.analyticsevent.count(),
  ]);
  res.json({ users, campaigns, submissions, analyticsEvents: events });
});

router.get("/dashboard", async (_req, res) => {
  try {
    const [stats, countries, ages, genders, regions, growth, topCampaigns, topUsers, missionTypes] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*) FROM user) as user_count,
          (SELECT COUNT(*) FROM campaign) as total_camp_count,
          (SELECT COUNT(*) FROM campaign WHERE status = 'ACTIVE') as active_camp_count,
          (SELECT COUNT(*) FROM submission) as sub_count,
          (SELECT IFNULL(SUM(points), 0) FROM winner) as winner_points_sum,
          (SELECT IFNULL(SUM(pointBalance), 0) FROM user) as user_points_sum
      `,
      (prisma.user as any).groupBy({ by: ["country"], _count: true }),
      (prisma.user as any).groupBy({ by: ["birthYear"], _count: true }),
      (prisma.user as any).groupBy({ by: ["gender"], _count: true }),
      (prisma.user as any).groupBy({ by: ["region"], _count: true }),
      prisma.$queryRaw<any[]>`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count 
        FROM user 
        GROUP BY month 
        ORDER BY month ASC 
        LIMIT 12
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          c.id, 
          c.title, 
          COUNT(s.id) as count
        FROM campaign c
        LEFT JOIN mission m ON c.id = m.campaignId
        LEFT JOIN submission s ON m.id = s.missionId
        GROUP BY c.id, c.title
        ORDER BY count DESC
        LIMIT 5
      `,
      prisma.user.findMany({
        take: 5,
        orderBy: { pointBalance: 'desc' },
        select: { id: true, email: true, pointBalance: true }
      }),
      prisma.mission.groupBy({
        by: ['type'],
        _count: true
      })
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
          : 0,
        distributedPoints: Number(s.winner_points_sum || 0),
        heldPoints: Number(s.user_points_sum || 0)
      },
      countries: (countries as any[]).map(c => ({ name: c.country || 'Unknown', count: Number(c._count) })),
      ages: (ages as any[]).map(a => ({ year: a.birthYear || 0, count: Number(a._count) })),
      genders: (genders as any[]).map(g => ({ name: g.gender || 'Unknown', count: Number(g._count) })),
      regions: (regions as any[]).map(r => ({ name: r.region || 'Unknown', count: Number(r._count) })),
      history: (growth || []).map(g => ({ month: g.month, count: Number(g.count) })),
      topCampaigns: (topCampaigns || []).map((c: any) => ({ id: c.id, title: c.title, count: Number(c.count) })),
      topUsers: (topUsers || []).map(u => ({ id: u.id, email: u.email, balance: u.pointBalance })),
      missionTypes: missionTypes.map(m => ({ type: m.type, count: m._count }))
    };

    res.json(result);
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;
