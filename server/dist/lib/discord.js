import { Client, GatewayIntentBits } from 'discord.js';
let client = null;
export function getDiscordClient() {
    if (client)
        return client;
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
export async function checkGuildMembership(guildId, discordId) {
    const bot = getDiscordClient();
    if (!bot)
        return false;
    try {
        // 봇이 해당 서버에 들어와 있는지 확인
        const guild = await bot.guilds.fetch(guildId);
        if (!guild)
            return false;
        // 해당 유저가 멤버인지 확인
        // discordId가 'username#1234' 형태라면 ID(snowflake)로 변환이 필요할 수 있으나,
        // 보통 OAuth에서 받은 유저 고유 ID를 사용하는 것이 가장 정확합니다.
        const member = await guild.members.fetch(discordId);
        return !!member;
    }
    catch (err) {
        // 유저가 서버에 없거나 봇이 접근 권한이 없는 경우 에러 발생
        return false;
    }
}
