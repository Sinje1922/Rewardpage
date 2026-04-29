import { Router } from "express";
import axios from "axios";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authRequired, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

// 디스코드 OAuth 리다이렉트 URL 생성 및 리다이렉트
router.get("/discord/login", authRequired, (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || "");
  const scope = encodeURIComponent("identify guilds.join");
  
  // 유저 ID를 state로 전달하여 보안 강화 및 콜백 시 유저 식별
  const state = req.user!.id;
  
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  res.redirect(url);
});

// 디스코드 콜백 처리
router.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) return res.status(400).send("Invalid callback data.");

  try {
    // 1. Access Token 교환
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2. 유저 정보 가져오기
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 신규 사용자(태그 0)와 기존 사용자 처리
    const handle = discordUser.discriminator === "0" || !discordUser.discriminator
      ? discordUser.username 
      : `${discordUser.username}#${discordUser.discriminator}`;

    // 3. DB 업데이트 (state에 담긴 userId 사용)
    await prisma.user.update({
      where: { id: state as string },
      data: { 
        discordId: discordUser.id, // Snowflake ID 저장
        discordHandle: handle      // 사용자 이름 저장
      },
    });

    // 4. 완료 후 마이페이지로 리다이렉트
    res.send(`
      <html>
        <body style="background: #f8f9ff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h2 style="color: #4f46e5;">연동 완료!</h2>
            <p>잠시 후 마이페이지로 이동합니다...</p>
            <script>
              alert("디스코드 연동이 완료되었습니다.");
              window.location.href = "${process.env.FRONTEND_URL}/my-page?t=" + Date.now();
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Discord OAuth Error:", err);
    res.status(500).send("디스코드 연동 중 오류가 발생했습니다.");
  }
});

// 텔레그램 인증 데이터 검증 및 연동
router.post("/telegram/verify", authRequired, async (req: AuthedRequest, res) => {
  const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: "Telegram Bot Token is not configured." });
  }

  // 1. 데이터 검증을 위한 문자열 구성 (알파벳 순서로 정렬)
  const dataCheckArr = [];
  for (const key in req.body) {
    if (key !== "hash") {
      dataCheckArr.push(`${key}=${req.body[key]}`);
    }
  }
  const dataCheckString = dataCheckArr.sort().join("\n");

  // 2. 해시 검증
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hmac !== hash) {
    return res.status(401).json({ error: "Data is not from Telegram or modified." });
  }

  // 3. 시간 검증 (24시간 이내의 데이터인지)
  const now = Math.floor(Date.now() / 1000);
  if (now - Number(auth_date) > 86400) {
    return res.status(401).json({ error: "Authentication data is outdated." });
  }

  // 4. 유저 정보 업데이트 (@username 또는 id 저장)
  const tgHandle = username ? `@${username}` : `ID:${id}`;
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { telegramHandle: tgHandle },
  });

  res.json({ success: true, handle: tgHandle });
});

// 유튜브 OAuth 로그인 (구글 사용)
router.get("/youtube/login", authRequired, (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(`https://api.pickku.com/api/oauth/youtube/callback`);
  const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly profile email");
  const state = req.user!.id;
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

// 유튜브 콜백 처리
router.get("/youtube/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send("Invalid callback data.");

  try {
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `https://api.pickku.com/api/oauth/youtube/callback`,
      grant_type: "authorization_code",
    });

    const accessToken = tokenResponse.data.access_token;

    // 유튜브 채널 정보 가져오기
    const youtubeResponse = await axios.get("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const channels = youtubeResponse.data.items;
    const channelName = channels && channels.length > 0 ? channels[0].snippet.title : "Linked Account";

    await prisma.user.update({
      where: { id: state as string },
      data: { youtubeHandle: channelName },
    });

    res.send(`
      <html>
        <body style="background: #f8f9ff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h2 style="color: #ef4444;">유튜브 연동 완료!</h2>
            <p>잠시 후 마이페이지로 이동합니다...</p>
            <script>
              alert("유튜브 채널(${channelName}) 연동이 완료되었습니다.");
              window.location.href = "${process.env.FRONTEND_URL}/my-page?t=" + Date.now();
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("YouTube OAuth Error:", err);
    res.status(500).send("유튜브 연동 중 오류가 발생했습니다.");
  }
});

export default router;

