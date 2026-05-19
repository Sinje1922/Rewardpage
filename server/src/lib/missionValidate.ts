type MissionConfig = {
  linkUrl?: string;
  correctCode?: string;
  surveyNote?: string;
  surveyQuestion?: string;
  surveyQuestions?: {
    id: string;
    type: "SUBJECTIVE" | "OBJECTIVE";
    question: string;
    options?: string[];
  }[];
  quizQuestion?: string;
  quizOptions?: string[];
  correctIndex?: number;
  minDwellSeconds?: number;
  youtubeChannelId?: string;
  youtubeVideoId?: string;
  discordInvite?: string; // Guild ID
};

export function parseConfig(raw: string): MissionConfig {
  try {
    return JSON.parse(raw || "{}") as MissionConfig;
  } catch {
    return {};
  }
}

export async function evaluateMission(
  userId: string,
  missionId: string,
  type: string,
  config: MissionConfig,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; reason?: string }> {
  switch (type) {
    case "LINK_VISIT": {
      const { prisma } = await import("./prisma.js");
      const events = await prisma.analyticsevent.findMany({
        where: {
          userId,
          name: "link_click",
        },
        select: {
          meta: true,
        },
      });
      const hasClicked = events.some((evt) => {
        try {
          const parsed = JSON.parse(evt.meta);
          return String(parsed.missionId) === missionId;
        } catch {
          return false;
        }
      });
      if (!hasClicked) {
        return { ok: false, reason: "링크를 먼저 방문해 주셔야 완료할 수 있습니다." };
      }

      const dwell = Number(payload.dwellSeconds ?? 0);
      const min = config.minDwellSeconds ?? 0;
      if (min > 0 && dwell < min) {
        return { ok: false, reason: `체류 ${min}초 이상 필요합니다.` };
      }
      return { ok: true };
    }
    case "SURVEY": {
      const qs = config.surveyQuestions || [];
      if (qs.length === 0) {
        const code = String(payload.code ?? "").trim();
        const expected = String(config.correctCode ?? "").trim();
        const question = String(config.surveyQuestion ?? "").trim();
        if (question && !expected) {
          if (!code) return { ok: false, reason: "답변을 입력해 주세요." };
          return { ok: true };
        }
        if (expected) {
          if (!code || code.toLowerCase() !== expected.toLowerCase()) {
            return { ok: false, reason: "제출 코드가 일치하지 않습니다." };
          }
        }
        return { ok: true };
      }

      const answers = (payload.answers as Record<string, any>) || {};
      for (const q of qs) {
        const ans = answers[q.id];
        if (ans === undefined || ans === null || String(ans).trim() === "") {
          return { ok: false, reason: `[${q.question}] 질문에 답해 주세요.` };
        }
      }
      return { ok: true };
    }
    case "CODE": {
      const code = String(payload.code ?? "").trim();
      const expected = String(config.correctCode ?? "").trim();
      if (!code || code.toLowerCase() !== expected.toLowerCase()) {
        return { ok: false, reason: "코드가 올바르지 않습니다." };
      }
      return { ok: true };
    }
    case "QUIZ": {
      const idx = Number(payload.selectedIndex);
      if (Number.isNaN(idx) || idx !== config.correctIndex) {
        return { ok: false, reason: "정답이 아닙니다." };
      }
      return { ok: true };
    }
    case "CHECKIN":
      return { ok: true };
    case "FILE_UPLOAD": {
      const url = String(payload.fileUrl ?? "").trim();
      if (!url) return { ok: false, reason: "파일 URL이 필요합니다." };
      return { ok: true };
    }
    case "YOUTUBE_WATCH": {
      if (!payload.watched) return { ok: false, reason: "시청 완료 정보가 없습니다." };
      return { ok: true };
    }
    case "YOUTUBE_SUBSCRIBE": {
      const channelId = config.youtubeChannelId;
      if (!channelId) return { ok: true }; // Skip if not configured
      const { checkYouTubeSubscription } = await import("./youtube.js");
      const ok = await checkYouTubeSubscription(userId, channelId);
      return ok ? { ok: true } : { ok: false, reason: "유튜브 구독이 확인되지 않습니다." };
    }
    case "YOUTUBE_LIKE": {
      const videoId = config.youtubeVideoId;
      if (!videoId) return { ok: true };
      const { checkYouTubeLike } = await import("./youtube.js");
      const ok = await checkYouTubeLike(userId, videoId);
      return ok ? { ok: true } : { ok: false, reason: "유튜브 좋아요가 확인되지 않습니다." };
    }
    case "TELEGRAM_JOIN":
    case "TELEGRAM_CHANNEL":
    case "TELEGRAM_GROUP": {
      const chatId = config.linkUrl ? config.linkUrl.split('/').pop() : null;
      if (!chatId) return { ok: true };
      const { checkTelegramMembership } = await import("./telegram.js");
      const ok = await checkTelegramMembership(chatId, userId);
      return ok ? { ok: true } : { ok: false, reason: "텔레그램 참여가 확인되지 않습니다." };
    }
    case "DISCORD_JOIN": {
      const guildId = config.discordInvite;
      if (!guildId) return { ok: true };
      const { prisma } = await import("./prisma.js");
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.discordId) return { ok: false, reason: "디스코드 연동이 필요합니다." };
      const { checkGuildMembership } = await import("./discord.js");
      const ok = await checkGuildMembership(guildId, user.discordId);
      return ok ? { ok: true } : { ok: false, reason: "디스코드 참여가 확인되지 않습니다." };
    }
    case "INSTAGRAM_FOLLOW":
    case "INSTAGRAM_LIKE":
      return { ok: true }; // Instagram is manual link-visit
    default:
      return { ok: false, reason: "알 수 없는 미션 유형입니다." };
  }
}
