import { Router } from "express";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// 유튜브 시청 완료 처리 (간이 검증)
router.post("/youtube", authRequired, async (req: AuthedRequest, res) => {
  const { missionId, watched } = req.body;
  if (!watched) return res.status(400).json({ error: "영상 시청이 완료되지 않았습니다." });
  
  // 실제 서비스에서는 여기서 시청 시간 등을 재검증하는 로직이 들어갈 수 있음
  res.json({ success: true });
});

// 텔레그램 참여 확인 (봇 연동 전 가상 검증 또는 핸들 확인)
router.post("/telegram", authRequired, async (req: AuthedRequest, res) => {
  const { missionId, handle } = req.body;
  if (!handle || !handle.startsWith("@")) {
    return res.status(400).json({ error: "올바른 텔레그램 핸들을 입력해주세요 (@username)." });
  }

  // 봇 API 연동 시 예시:
  // const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${userId}`);
  
  res.json({ success: true, message: "참여가 확인되었습니다. 제출 버튼을 눌러주세요." });
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
