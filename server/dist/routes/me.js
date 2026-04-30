import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authRequired } from "../middleware/auth.js";
const router = Router();
router.use(authRequired);
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
        if (data.telegramId !== undefined)
            updateData.telegramId = data.telegramId;
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
