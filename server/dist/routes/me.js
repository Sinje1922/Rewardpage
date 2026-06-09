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
    instagramHandle: z.string().max(100).optional().nullable(),
    telegramHandle: z.string().max(100).optional().nullable(),
    discordHandle: z.string().max(100).optional().nullable(),
    youtubeHandle: z.string().max(100).optional().nullable(),
});
router.get("/", async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            role: true,
            pointBalance: true,
            usdtBalance: true,
            brlBalance: true,
            metaqBalance: true,
            couponBalance: true,
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
    // SNS 연동 해제 시 관련 고유 ID 및 액세스 토큰도 함께 안전하게 제거
    if (req.body.telegramHandle === null) {
        data.telegramId = null;
    }
    if (req.body.discordHandle === null) {
        data.discordId = null;
    }
    if (req.body.youtubeHandle === null) {
        data.youtubeAccessToken = null;
        data.youtubeRefreshToken = null;
        data.youtubeTokenExpiry = null;
    }
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
        select: {
            id: true, email: true, role: true, birthYear: true, birthDate: true, walletAddress: true, pointBalance: true,
            usdtBalance: true, brlBalance: true, metaqBalance: true, couponBalance: true,
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
        select: {
            id: true,
            rank: true,
            points: true,
            currency: true,
            createdAt: true,
            campaign: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json(wins);
});
router.put("/profile", async (req, res) => {
    try {
        const data = req.body;
        const updateData = {};
        if (data.birthYear !== undefined)
            updateData.birthYear = data.birthYear;
        if (data.country !== undefined)
            updateData.country = data.country;
        if (data.locale !== undefined)
            updateData.locale = data.locale;
        if (data.nickname !== undefined)
            updateData.nickname = data.nickname;
        if (data.gender !== undefined)
            updateData.gender = data.gender;
        if (data.region !== undefined)
            updateData.region = data.region;
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
router.post("/recharge", async (req, res) => {
    const role = req.user.role;
    if (role !== "ADMIN" && role !== "MANAGER") {
        res.status(403).json({ error: "매니저 혹은 관리자만 재화를 충전할 수 있습니다." });
        return;
    }
    const rechargeSchema = z.object({
        currency: z.enum(["POINT", "USDT", "BRL", "METAQ", "COUPON"]),
        amount: z.number().positive("충전 금액은 0보다 커야 합니다."),
    });
    const parsed = rechargeSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { currency, amount } = parsed.data;
    let balanceField = "";
    if (currency === "POINT")
        balanceField = "pointBalance";
    else if (currency === "USDT")
        balanceField = "usdtBalance";
    else if (currency === "BRL")
        balanceField = "brlBalance";
    else if (currency === "METAQ")
        balanceField = "metaqBalance";
    else if (currency === "COUPON")
        balanceField = "couponBalance";
    try {
        const updateData = {};
        if (currency === "POINT" || currency === "COUPON") {
            updateData[balanceField] = { increment: Math.floor(amount) };
        }
        else {
            updateData[balanceField] = { increment: amount };
        }
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                pointBalance: true,
                usdtBalance: true,
                brlBalance: true,
                metaqBalance: true,
                couponBalance: true,
            }
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error("Recharge error:", error);
        res.status(500).json({ error: "재화 충전에 실패했습니다." });
    }
});
export default router;
