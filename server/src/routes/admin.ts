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
    prisma.analyticsEvent.count(),
  ]);
  res.json({ users, campaigns, submissions, analyticsEvents: events });
});

router.get("/dashboard", async (_req, res) => {
  try {
    const [stats, countries, ages, genders, regions, growth] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*) FROM User) as user_count,
          (SELECT COUNT(*) FROM Campaign) as total_camp_count,
          (SELECT COUNT(*) FROM Campaign WHERE status = 'ACTIVE') as active_camp_count,
          (SELECT COUNT(*) FROM Submission) as sub_count,
          (SELECT IFNULL(SUM(points), 0) FROM Winner) as winner_points_sum,
          (SELECT IFNULL(SUM(pointBalance), 0) FROM User) as user_points_sum
      `,
      (prisma.user as any).groupBy({ by: ["country"], _count: true }),
      (prisma.user as any).groupBy({ by: ["birthYear"], _count: true }),
      (prisma.user as any).groupBy({ by: ["gender"], _count: true }),
      (prisma.user as any).groupBy({ by: ["region"], _count: true }),
      prisma.$queryRaw<any[]>`
        SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') as month,
          COUNT(*) as count 
        FROM User 
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
      genders: (genders as any[]).map(g => ({ name: g.gender || 'Unknown', count: Number(g._count) })),
      regions: (regions as any[]).map(r => ({ name: r.region || 'Unknown', count: Number(r._count) })),
      history: (growth || []).map(g => ({ month: g.month, count: Number(g.count) }))
    };

    res.json(result);
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

router.get("/campaigns/:id/export", async (req, res) => {
  const cid = String(req.params.id);
  
  try {
    const list = await prisma.submission.findMany({
      where: { mission: { campaignId: cid } },
      include: {
        user: true,
        mission: true
      },
      orderBy: { createdAt: "desc" }
    });

    // CSV Header
    let csv = "SubmissionID,CreatedAt,UserEmail,UserNickname,Gender,Age,Region,MissionType,MissionTitle,Payload\n";
    
    for (const s of list) {
      const age = s.user.birthYear ? (new Date().getFullYear() - s.user.birthYear) : "Unknown";
      const row = [
        s.id,
        s.createdAt.toISOString(),
        s.user.email,
        `"${(s.user.nickname || "").replace(/"/g, '""')}"`,
        s.user.gender || "Unknown",
        age,
        s.user.region || "Unknown",
        s.mission.type,
        `"${s.mission.title.replace(/"/g, '""')}"`,
        `"${s.payload.replace(/"/g, '""')}"`
      ];
      csv += row.join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="campaign_${cid}_data.csv"`);
    res.status(200).send("\uFEFF" + csv); // BOM for Excel UTF-8 support
  } catch (err) {
    console.error("Export Error:", err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
