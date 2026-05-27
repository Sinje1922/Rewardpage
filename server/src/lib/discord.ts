import { Client, GatewayIntentBits } from 'discord.js';

let client: Client | null = null;

export function getDiscordClient() {
  if (client) return client;

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('DISCORD_BOT_TOKEN is not set. Discord verification will be skipped.');
    return null;
  }

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.login(token).catch(err => {
    console.error('Discord Bot Login Failed:', err);
    client = null;
  });

  return client;
}

/**
 * 특정 유저가 특정 서버(Guild)의 멤버인지 확인합니다.
 * @param guildId 디스코드 서버 ID
 * @param discordId 유저의 디스코드 ID (숫자형 문자열)
 */
export async function checkGuildMembership(guildId: string, discordId: string): Promise<{ success: boolean; error?: string }> {
  const bot = getDiscordClient();
  if (!bot) return { success: false, error: "서버의 디스코드 봇 설정이 누락되었습니다." };

  console.log(`[Discord] 서버 참여 확인 — 대상 Guild ID: "${guildId}", 유저 Discord ID: "${discordId}"`);

  try {
    // 봇이 해당 서버에 들어와 있는지 확인
    const guild = await bot.guilds.fetch(guildId);
    if (!guild) {
      console.log(`[Discord] 서버를 찾을 수 없음 — Guild ID: "${guildId}"`);
      return { success: false, error: "디스코드 서버(Guild)를 찾을 수 없습니다. 서버 ID를 확인해 주세요." };
    }

    // 해당 유저가 멤버인지 확인
    const member = await guild.members.fetch(discordId);
    console.log(`[Discord] API 응답 — 멤버 닉네임: "${member?.displayName || 'Unknown'}", 가입여부: ${!!member}`);
    if (member) {
      return { success: true };
    } else {
      return { success: false, error: "서버에 입장하지 않았습니다. 입장을 완료해 주세요." };
    }
  } catch (err: any) {
    console.error('[Discord] 가입 확인 API 오류:', err.message);
    return { 
      success: false, 
      error: "디스코드 서버를 찾을 수 없거나 봇이 해당 서버에 초대되지 않았습니다. 봇 초대 상태 및 서버 ID를 확인해 주세요." 
    };
  }
}
