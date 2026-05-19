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
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "채널 ID가 필요합니다." });

  const { checkYouTubeSubscription } = await import('../lib/youtube.js');
  const isSubscribed = await checkYouTubeSubscription(req.user!.id, channelId);

  if (isSubscribed) {
    res.json({ success: true, message: "구독이 확인되었습니다!" });
  } else {
    res.status(400).json({ error: "구독 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요." });
  }
});

// 유튜브 좋아요 확인
router.post("/youtube/like", authRequired, async (req: AuthedRequest, res) => {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: "비디오 ID가 필요합니다." });

  const { checkYouTubeLike } = await import('../lib/youtube.js');
  const isLiked = await checkYouTubeLike(req.user!.id, videoId);

  if (isLiked) {
    res.json({ success: true, message: "좋아요가 확인되었습니다!" });
  } else {
    res.status(400).json({ error: "좋아요 정보가 확인되지 않습니다. 잠시 후 다시 시도해 주세요." });
  }
});

// 텔레그램 참여 확인
router.post("/telegram", authRequired, async (req: AuthedRequest, res) => {
  const { missionId } = req.body;
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) return res.status(404).json({ error: "미션을 찾을 수 없습니다." });

  const config = JSON.parse(mission.config || '{}');
  const urlClean = config.linkUrl ? config.linkUrl.replace(/\/+$/, '') : '';
  const chatId = urlClean ? urlClean.split('/').pop() : null;

  if (!chatId) return res.status(400).json({ error: "미션 설정에 텔레그램 채널 정보가 없습니다." });

  const { checkTelegramMembership } = await import('../lib/telegram.js');
  const isMember = await checkTelegramMembership(chatId, req.user!.id);

  if (isMember) {
    res.json({ success: true, message: "텔레그램 참여가 확인되었습니다!" });
  } else {
    res.status(400).json({ error: "채널에서 유저를 찾을 수 없습니다. 입장을 완료했는지 확인해 주세요." });
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
    const guildId = config.discordInvite; // 현재 config에 guild ID가 invite 필드에 저장됨

    if (!guildId) {
      return res.status(400).json({ error: "미션 설정에 디스코드 서버 ID가 없습니다." });
    }

    const { checkGuildMembership } = await import('../lib/discord.js');
    const isMember = await checkGuildMembership(guildId, currentUser.discordId);

    if (isMember) {
      res.json({ success: true, message: "디스코드 서버 참여가 확인되었습니다!" });
    } else {
      res.status(400).json({ error: "서버에서 유저를 찾을 수 없습니다. 입장을 완료했는지 확인해 주세요." });
    }
  } catch (err) {
    console.error("Discord Verify Error:", err);
    res.status(500).json({ error: "검증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
  }
});

export default router;
