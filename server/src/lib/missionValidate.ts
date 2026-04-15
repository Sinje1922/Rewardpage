type MissionConfig = {
  linkUrl?: string;
  correctCode?: string;
  surveyNote?: string;
  surveyQuestion?: string;
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
      const code = String(payload.code ?? "").trim();
      const expected = String(config.correctCode ?? "").trim();
      const question = String(config.surveyQuestion ?? "").trim();

      // 질문이 있고 정답 코드가 지정되어 있지 않은 경우 -> 답변 유무만 체크
      if (question && !expected) {
        if (!code) return { ok: false, reason: "답변을 입력해 주세요." };
        return { ok: true };
      }

      // 정답 코드가 지정되어 있는 경우 (기존 방식 하위 호환 포함)
      if (expected) {
        if (!code || code.toLowerCase() !== expected.toLowerCase()) {
          return { ok: false, reason: "제출 코드가 일치하지 않습니다." };
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
