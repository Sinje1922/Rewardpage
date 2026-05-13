import axios from 'axios';
import { prisma } from './prisma.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function refreshAccessToken(userId: string, refreshToken: string) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + expires_in);

    await prisma.user.update({
      where: { id: userId },
      data: {
        youtubeAccessToken: access_token,
        youtubeTokenExpiry: expiry,
      },
    });

    return access_token;
  } catch (err: any) {
    console.error('Failed to refresh YouTube token:', err.response?.data || err.message);
    throw new Error('YouTube token refresh failed');
  }
}

async function getValidToken(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.youtubeAccessToken) throw new Error('YouTube not linked');

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (user.youtubeTokenExpiry && user.youtubeTokenExpiry < now + BigInt(60)) {
    if (user.youtubeRefreshToken) {
      return await refreshAccessToken(userId, user.youtubeRefreshToken);
    }
  }
  return user.youtubeAccessToken;
}

export async function checkYouTubeSubscription(userId: string, targetChannelId: string) {
  const token = await getValidToken(userId);
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/subscriptions', {
      params: {
        part: 'snippet',
        mine: true,
        forChannelId: targetChannelId,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.items && response.data.items.length > 0;
  } catch (err: any) {
    console.error('YouTube Subscription Check Error:', err.response?.data || err.message);
    return false;
  }
}

export async function checkYouTubeLike(userId: string, videoId: string) {
  const token = await getValidToken(userId);
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos/getRating', {
      params: { id: videoId },
      headers: { Authorization: `Bearer ${token}` },
    });

    const rating = response.data.items?.[0]?.rating;
    return rating === 'like';
  } catch (err: any) {
    console.error('YouTube Like Check Error:', err.response?.data || err.message);
    return false;
  }
}
