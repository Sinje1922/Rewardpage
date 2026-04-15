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
};

export function parseConfig(raw: string): MissionConfig {
  try {
    return JSON.parse(raw || "{}") as MissionConfig;
  } catch {
    return {};
  }
}

export function evaluateMission(
  type: string,
  config: MissionConfig,
  payload: Record<string, unknown>
): { ok: boolean; reason?: string } {
  switch (type) {
    case "LINK_VISIT": {
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
        // Fallback to legacy single question or code check
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

      // New multi-question validation
      const answers = (payload.answers as Record<string, any>) || {};
      for (const q of qs) {
        const ans = answers[q.id];
        if (ans === undefined || ans === null || String(ans).trim() === "") {
          return { ok: false, reason: `[${q.question}] 질문에 답해 주세요.` };
        }
        if (q.type === "OBJECTIVE") {
          const optIdx = Number(ans);
          if (isNaN(optIdx) || !q.options || optIdx < 0 || optIdx >= q.options.length) {
            return { ok: false, reason: `[${q.question}] 올바른 보기를 선택해 주세요.` };
          }
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
    default:
      return { ok: false, reason: "알 수 없는 미션 유형입니다." };
  }
}
