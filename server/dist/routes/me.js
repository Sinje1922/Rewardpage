import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
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
    telegramHandle: z.string().max(100).optional().nullable(),
    discordHandle: z.string().max(100).optional().nullable(),
    youtubeHandle: z.string().max(100).optional().nullable(),
    instagramHandle: z.string().max(100).optional().nullable(),
});
router.get("/", async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
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
            walletAddress: true,
            telegramHandle: true,
            discordId: true,
            discordHandle: true,
            youtubeHandle: true,
            instagramHandle: true
        },
    });
    res.json(user);
});
router.patch("/profile", async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = { ...parsed.data };
    if (data.birthDate) {
        data.birthDate = new Date(data.birthDate);
    }
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: {
            id: true, email: true, role: true, birthYear: true, birthDate: true, walletAddress: true, pointBalance: true,
            nickname: true, avatarUrl: true, gender: true, region: true, country: true,
            telegramHandle: true, discordId: true, discordHandle: true, youtubeHandle: true, instagramHandle: true
        },
    });
    res.json(user);
});
router.delete("/profile", async (req, res) => {
    await prisma.user.delete({
        where: { id: req.user.id },
    });
    res.json({ ok: true });
});
router.get("/submissions", async (req, res) => {
    const list = await prisma.submission.findMany({
        where: { userId: req.user.id },
        include: {
            mission: {
                include: { campaign: { select: { id: true, title: true, status: true } } },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json(list);
});
router.get("/wins", async (req, res) => {
    const wins = await prisma.winner.findMany({
        where: { userId: req.user.id },
        include: { campaign: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
    });
    res.json(wins);
});
router.put("/profile", async (req, res) => {
    try {
        const data = req.body;
        // 필터링: 스키마에 없는 필드가 들어오면 에러가 날 수 있으므로 주의
        const updateData = {};
        if (data.birthYear !== undefined)
            updateData.birthYear = data.birthYear;
        if (data.country !== undefined)
            updateData.country = data.country;
        if (data.locale !== undefined)
            updateData.locale = data.locale;
        if (data.discordId !== undefined)
            updateData.discordId = data.discordId;
        if (data.telegramHandle !== undefined)
            updateData.telegramHandle = data.telegramHandle;
        if (data.telegramId !== undefined)
            updateData.telegramHandle = data.telegramId; // Compatibility
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
        });
        res.json(user);
    }
    catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});
export default router;
