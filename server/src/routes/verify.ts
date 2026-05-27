import { Router } from "express";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// 유튜브 시청 완료 처리 (간이 검증)
router.post("/youtube", authRequired, async (req: AuthedRequest, res) => {
  const { watched } = req.body;
  if (!watched) return res.status(400).json({ error: "영상 시청이 완료되지 않았습니다." });
  res.json({ success: true });
});

// 유튜브 구독 확인
router.post("/youtube/subscribe", authRequired, async (req: AuthedRequest, res) => {
  console.log("verify youtube subscribe body:", req.body);
  console.log("user:", req.user);
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "채널 ID가 필요합니다." });

  try {
    const { checkYouTubeSubscription } = await import('../lib/youtube.js');
    const result = await checkYouTubeSubscription(req.user!.id, channelId);

    if (result.success) {
      console.log(`[Verify Success] User ${req.user!.id} verified YouTube Subscribe for channel ${channelId}`);
      res.json({ success: true, message: "구독이 확인되었습니다!" });
    } else {
      console.error(`[Verify Error] User ${req.user!.id} failed YouTube Subscribe for channel ${channelId}. Reason: ${result.error}`);
      res.status(400).json({ error: result.error || "구독 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요." });
    }
  } catch (err: any) {
    console.error("YouTube Subscribe Verify Error:", err);
    res.status(500).json({ error: "구독 확인 중 서버 오류가 발생했습니다." });
  }
});

// 유튜브 좋아요 확인
router.post("/youtube/like", authRequired, async (req: AuthedRequest, res) => {
  console.log("verify youtube like body:", req.body);
  console.log("user:", req.user);
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: "비디오 ID가 필요합니다." });

  try {
    const { checkYouTubeLike } = await import('../lib/youtube.js');
    const result = await checkYouTubeLike(req.user!.id, videoId);

    if (result.success) {
      console.log(`[Verify Success] User ${req.user!.id} verified YouTube Like for video ${videoId}`);
      res.json({ success: true, message: "좋아요가 확인되었습니다!" });
    } else {
      console.error(`[Verify Error] User ${req.user!.id} failed YouTube Like for video ${videoId}. Reason: ${result.error}`);
      res.status(400).json({ error: result.error || "좋아요 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요." });
    }
  } catch (err: any) {
    console.error("YouTube Like Verify Error:", err);
    res.status(500).json({ error: "좋아요 확인 중 서버 오류가 발생했습니다." });
  }
});

// 텔레그램 참여 확인
router.post("/telegram", authRequired, async (req: AuthedRequest, res) => {
  const { missionId } = req.body;
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return res.status(404).json({ error: "미션을 찾을 수 없습니다." });

  const config = JSON.parse(mission.config || '{}');
  
  // Use explicitly provided telegramChannel ID/username first, fallback to parsing linkUrl
  let chatId = config.telegramChannel ? String(config.telegramChannel).trim() : null;
  if (!chatId) {
    const urlClean = config.linkUrl ? config.linkUrl.replace(/\/+$/, '') : '';
    chatId = urlClean ? urlClean.split('/').pop() : null;
  }

  if (!chatId) return res.status(400).json({ error: "미션 설정에 텔레그램 채널/그룹 정보가 없습니다." });

  const { checkTelegramMembership } = await import('../lib/telegram.js');
  const result = await checkTelegramMembership(chatId, req.user!.id);

  if (result.success) {
    console.log(`[Verify Success] User ${req.user!.id} verified Telegram join for chatId ${chatId}`);
    res.json({ success: true, message: "텔레그램 참여가 확인되었습니다!" });
  } else {
    console.error(`[Verify Error] User ${req.user!.id} failed Telegram join for chatId ${chatId}. Reason: ${result.error}`);
    res.status(400).json({ error: result.error || "채널에서 유저를 찾을 수 없습니다. 입장을 완료했는지 확인해 주세요." });
  }
});

// 디스코드 참여 확인
router.post("/discord", authRequired, async (req: AuthedRequest, res) => {
  const { missionId } = req.body;
  const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!currentUser?.discordId) {
    return res.status(400).json({ error: "디스코드 계정 연동이 필요합니다. 마이페이지에서 연동해 주세요." });
  }

  try {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId }
    });

    if (!mission || mission.type !== 'DISCORD_JOIN') {
      return res.status(404).json({ error: "미션을 찾을 수 없습니다." });
    }

    const config = JSON.parse(mission.config || '{}');
    // discordInvite 필드에 Guild ID(숫자 문자열)가 저장됨
    const guildId = config.discordInvite ? String(config.discordInvite).trim() : null;

    if (!guildId) {
      return res.status(400).json({ error: "미션 설정에 디스코드 서버 ID가 없습니다. 캠페인 운영자에게 문의하세요." });
    }

    // 초대 URL이 잘못 입력된 경우 안내
    if (guildId.startsWith('http') || guildId.includes('discord.gg')) {
      return res.status(400).json({ error: "미션 설정 오류: 초대 URL이 아닌 서버 ID(숫자)가 필요합니다. 캠페인 운영자에게 문의하세요." });
    }

    const { checkGuildMembership } = await import('../lib/discord.js');
    const result = await checkGuildMembership(guildId, currentUser.discordId);

    if (result.success) {
      console.log(`[Verify Success] User ${req.user!.id} verified Discord join for guildId ${guildId}`);
      res.json({ success: true, message: "디스코드 서버 참여가 확인되었습니다!" });
    } else {
      console.error(`[Verify Error] User ${req.user!.id} failed Discord join for guildId ${guildId}. Reason: ${result.error}`);
      res.status(400).json({ error: result.error || "서버에서 유저를 찾을 수 없습니다. 입장을 완료했는지 확인해 주세요." });
    }
  } catch (err) {
    console.error("Discord Verify Error:", err);
    res.status(500).json({ error: "검증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
  }
});

export default router;
