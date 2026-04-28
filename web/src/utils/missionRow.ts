export interface SurveyQuestion {
  id: string
  type: 'SUBJECTIVE' | 'OBJECTIVE'
  question: string
  options: string[]
}

export type MissionRowState = {
  key: string
  type: string
  title: string
  description: string
  sortOrder: number
  linkUrl: string
  minDwellSeconds: number
  correctCode: string
  surveyNote: string
  surveyQuestion: string
  surveyQuestions: SurveyQuestion[]
  quizQuestion: string
  quizOptions: string[]
  quizCorrectIndex: number
  fileNote: string
  telegramChannel: string
  discordInvite: string
  youtubeVideoId: string
  youtubeTargetSeconds: number
  youtubeChannelId: string
  instagramHandle: string
  instagramPostId: string
}

export type MissionPayload = {
  type: string
  title: string
  description: string
  sortOrder: number
  config: Record<string, unknown>
}

export function emptyMissionRow(order = 0): MissionRowState {
  return {
    key: crypto.randomUUID(),
    type: 'LINK_VISIT',
    title: '',
    description: '',
    sortOrder: order,
    linkUrl: '',
    minDwellSeconds: 0,
    correctCode: '',
    surveyNote: '',
    surveyQuestion: '',
    surveyQuestions: [],
    quizQuestion: '',
    quizOptions: ['', ''],
    quizCorrectIndex: 0,
    fileNote: '',
    telegramChannel: '',
    discordInvite: '',
    youtubeVideoId: '',
    youtubeTargetSeconds: 10,
    youtubeChannelId: '',
    instagramHandle: '',
    instagramPostId: '',
  }
}

function buildConfig(row: MissionRowState): Record<string, unknown> {
  switch (row.type) {
    case 'LINK_VISIT':
      return { linkUrl: row.linkUrl, minDwellSeconds: row.minDwellSeconds }
    case 'CODE':
      return { correctCode: row.correctCode }
    case 'SURVEY':
      return {
        linkUrl: row.linkUrl,
        correctCode: row.correctCode,
        surveyNote: row.surveyNote,
        surveyQuestion: row.surveyQuestion,
        surveyQuestions: row.surveyQuestions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question.trim(),
          options: q.type === 'OBJECTIVE' ? q.options.map(o => o.trim()).filter(Boolean) : []
        }))
      }
    case 'QUIZ': {
      const pairs = row.quizOptions
        .map((text, origIdx) => ({ text: text.trim(), origIdx }))
        .filter((p) => p.text)
      const opts = pairs.map((p) => p.text)
      const ci = pairs.findIndex((p) => p.origIdx === row.quizCorrectIndex)
      return {
        quizQuestion: row.quizQuestion,
        quizOptions: opts,
        correctIndex: ci >= 0 ? ci : 0,
      }
    }
    case 'FILE_UPLOAD':
      return { fileNote: row.fileNote }
    case 'INSTAGRAM_FOLLOW':
      return { instagramHandle: row.instagramHandle, linkUrl: row.linkUrl }
    case 'INSTAGRAM_LIKE':
      return { postId: row.instagramPostId, linkUrl: row.linkUrl }
    case 'TELEGRAM_JOIN':
    case 'TELEGRAM_CHANNEL':
    case 'TELEGRAM_GROUP':
      return { telegramChannel: row.telegramChannel, linkUrl: row.linkUrl }
    case 'DISCORD_JOIN':
      return { discordInvite: row.discordInvite, linkUrl: row.linkUrl }
    case 'YOUTUBE_WATCH':
      return { videoId: row.youtubeVideoId, targetSeconds: row.youtubeTargetSeconds }
    case 'YOUTUBE_SUBSCRIBE':
      return { channelId: row.youtubeChannelId, linkUrl: row.linkUrl }
    case 'YOUTUBE_LIKE':
      return { videoId: row.youtubeVideoId, linkUrl: row.linkUrl }
    case 'INSTAGRAM_FOLLOW':
      return { instagramHandle: row.instagramHandle, linkUrl: row.linkUrl }
    case 'CHECKIN':
    default:
      return {}
  }
}

export function rowToPayload(row: MissionRowState, index: number): MissionPayload {
  return {
    type: row.type,
    title: row.title.trim(),
    description: row.description.trim(),
    sortOrder: row.sortOrder ?? index,
    config: buildConfig(row),
  }
}

export function apiMissionToRow(m: {
  type: string
  title: string
  description: string
  sortOrder: number
  config: string
}): MissionRowState {
  let cfg: Record<string, unknown> = {}
  try {
    cfg = JSON.parse(m.config || '{}') as Record<string, unknown>
  } catch {
    /* ignore */
  }
  const opts = Array.isArray(cfg.quizOptions) ? (cfg.quizOptions as string[]) : ['', '']
  return {
    key: crypto.randomUUID(),
    type: m.type,
    title: m.title,
    description: m.description ?? '',
    sortOrder: m.sortOrder,
    linkUrl: String(cfg.linkUrl ?? ''),
    minDwellSeconds: Number(cfg.minDwellSeconds ?? 0),
    correctCode: String(cfg.correctCode ?? ''),
    surveyNote: String(cfg.surveyNote ?? ''),
    surveyQuestion: String(cfg.surveyQuestion ?? ''),
    surveyQuestions: Array.isArray(cfg.surveyQuestions) ? (cfg.surveyQuestions as SurveyQuestion[]) : [],
    quizQuestion: String(cfg.quizQuestion ?? ''),
    quizOptions: opts.length >= 2 ? opts : [...opts, '', ''].slice(0, Math.max(2, opts.length)),
    quizCorrectIndex: Number(cfg.correctIndex ?? 0),
    fileNote: String(cfg.fileNote ?? ''),
    telegramChannel: String(cfg.telegramChannel ?? ''),
    discordInvite: String(cfg.discordInvite ?? ''),
    youtubeVideoId: String(cfg.videoId ?? ''),
    youtubeTargetSeconds: Number(cfg.targetSeconds ?? 10),
    youtubeChannelId: String(cfg.channelId ?? ''),
    instagramHandle: String(cfg.instagramHandle ?? ''),
    instagramPostId: String(cfg.postId ?? ''),
  }
}

export function validateRows(rows: MissionRowState[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.title.trim()) return `미션 ${i + 1}: 제목을 입력해 주세요.`
    if (r.type === 'QUIZ') {
      const opts = r.quizOptions.map((s) => s.trim()).filter(Boolean)
      if (opts.length < 2) return `미션 ${i + 1}: 퀴즈 보기를 2개 이상 입력해 주세요.`
      if (r.quizCorrectIndex < 0 || r.quizCorrectIndex >= opts.length)
        return `미션 ${i + 1}: 정답 보기를 선택해 주세요.`
    }
    if (r.type === 'LINK_VISIT' && !r.linkUrl.trim()) return `미션 ${i + 1}: 링크 URL을 입력해 주세요.`
  }
  return null
}
