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
  instagramHandle: z.string().max(100).optional().nullable(),
  telegramHandle: z.string().max(100).optional().nullable(),
  discordHandle: z.string().max(100).optional().nullable(),
  youtubeHandle: z.string().max(100).optional().nullable(),
});

router.get("/", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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

router.patch("/profile", async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = { ...parsed.data } as any;
  if (data.birthDate) {
    data.birthDate = new Date(data.birthDate) as any;
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
    where: { id: req.user!.id },
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

router.put("/profile", async (req: AuthedRequest, res) => {
  try {
    const data = req.body;
    
    const updateData: any = {};
    if (data.birthYear !== undefined) updateData.birthYear = data.birthYear;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.locale !== undefined) updateData.locale = data.locale;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.region !== undefined) updateData.region = data.region;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });
    
    res.json(user);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/recharge", async (req: AuthedRequest, res) => {
  const role = req.user!.role;
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
  if (currency === "POINT") balanceField = "pointBalance";
  else if (currency === "USDT") balanceField = "usdtBalance";
  else if (currency === "BRL") balanceField = "brlBalance";
  else if (currency === "METAQ") balanceField = "metaqBalance";
  else if (currency === "COUPON") balanceField = "couponBalance";

  try {
    const updateData: any = {};
    if (currency === "POINT" || currency === "COUPON") {
      updateData[balanceField] = { increment: Math.floor(amount) };
    } else {
      updateData[balanceField] = { increment: amount };
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
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
  } catch (error) {
    console.error("Recharge error:", error);
    res.status(500).json({ error: "재화 충전에 실패했습니다." });
  }
});

router.post("/gacha", async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { couponBalance: true }
    });

    if (!user) {
      res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      return;
    }

    const count = Math.floor(Number(req.body.count || 1));
    if (count !== 1 && count !== 10) {
      res.status(400).json({ error: "뽑기 횟수는 1회 또는 10회만 가능합니다." });
      return;
    }

    const cost = count;
    if (user.couponBalance < cost) {
      res.status(400).json({ error: `쿠폰이 부족합니다. (필요: ${cost}장 / 보유: ${user.couponBalance}장)` });
      return;
    }

    // Define prizes with weights
    const prizes = [
      { name: "50 포인트", type: "POINT", amount: 50, weight: 35, icon: "🪙" },
      { name: "100 포인트", type: "POINT", amount: 100, weight: 25, icon: "🪙" },
      { name: "500 포인트", type: "POINT", amount: 500, weight: 5, icon: "🪙" },
      { name: "0.1 USDT", type: "USDT", amount: 0.1, weight: 15, icon: "💵" },
      { name: "0.5 USDT", type: "USDT", amount: 0.5, weight: 3, icon: "💵" },
      { name: "1 METAQ", type: "METAQ", amount: 1.0, weight: 10, icon: "💎" },
      { name: "5 METAQ", type: "METAQ", amount: 5.0, weight: 2, icon: "💎" },
      { name: "아쉽게도 다음 기회에!", type: "NONE", amount: 0, weight: 5, icon: "💨" },
    ];

    const totalWeight = prizes.reduce((acc, p) => acc + p.weight, 0);

    const drawnResults = [];
    let totalPoints = 0;
    let totalUsdt = 0;
    let totalMetaq = 0;

    for (let i = 0; i < count; i++) {
      let random = Math.random() * totalWeight;
      let selectedPrize = prizes[prizes.length - 1];

      for (const prize of prizes) {
        if (random < prize.weight) {
          selectedPrize = prize;
          break;
        }
        random -= prize.weight;
      }

      drawnResults.push(selectedPrize);

      if (selectedPrize.type === "POINT") {
        totalPoints += selectedPrize.amount;
      } else if (selectedPrize.type === "USDT") {
        totalUsdt += selectedPrize.amount;
      } else if (selectedPrize.type === "METAQ") {
        totalMetaq += selectedPrize.amount;
      }
    }

    // Perform database updates in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Deduct coupons
      await tx.user.update({
        where: { id: req.user!.id },
        data: { couponBalance: { decrement: cost } }
      });

      const updateData: any = {};
      if (totalPoints > 0) {
        updateData.pointBalance = { increment: totalPoints };
      }
      if (totalUsdt > 0) {
        updateData.usdtBalance = { increment: totalUsdt };
      }
      if (totalMetaq > 0) {
        updateData.metaqBalance = { increment: totalMetaq };
      }

      if (Object.keys(updateData).length > 0) {
        return await tx.user.update({
          where: { id: req.user!.id },
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
      }

      return await tx.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          pointBalance: true,
          usdtBalance: true,
          brlBalance: true,
          metaqBalance: true,
          couponBalance: true,
        }
      });
    });

    res.json({
      results: drawnResults,
      user: updatedUser
    });
  } catch (error) {
    console.error("Gacha error:", error);
    res.status(500).json({ error: "뽑기 진행 중 오류가 발생했습니다." });
  }
});

export default router;
