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

export function extractYoutubeVideoId(urlOrId: string): string {
  if (!urlOrId) return '';
  const clean = urlOrId.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = clean.match(regExp);
  return (match && match[2].length === 11) ? match[2] : clean;
}

export async function resolveYoutubeChannelId(urlOrId: string, accessToken: string): Promise<string> {
  const clean = urlOrId.trim();
  if (clean.startsWith('UC') && clean.length === 24) {
    return clean;
  }

  // Extract handle or UC id from URL
  let handle = '';
  if (clean.includes('youtube.com/') || clean.includes('youtu.be/')) {
    if (clean.includes('/channel/')) {
      const match = clean.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
      if (match) return match[1];
    }
    const handleMatch = clean.match(/\/(@[a-zA-Z0-9._-]+)/);
    if (handleMatch) {
      handle = handleMatch[1];
    }
  } else if (clean.startsWith('@')) {
    handle = clean;
  }

  if (handle) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id',
          forHandle: handle,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const channelId = response.data.items?.[0]?.id;
      if (channelId) return channelId;
    } catch (err: any) {
      console.error('Failed to resolve YouTube handle to Channel ID:', err.response?.data || err.message);
    }
  }

  return clean; // Fallback
}

export async function checkYouTubeSubscription(userId: string, targetChannelId: string) {
  const token = await getValidToken(userId);
  try {
    const channelId = await resolveYoutubeChannelId(targetChannelId, token);
    const response = await axios.get('https://www.googleapis.com/youtube/v3/subscriptions', {
      params: {
        part: 'snippet',
        mine: true,
        forChannelId: channelId,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data.items && response.data.items.length > 0;
  } catch (err: any) {
    console.error('YouTube Subscription Check Error:', err.response?.data || err.message);
    return false;
  }
}

export async function checkYouTubeLike(userId: string, rawVideoId: string) {
  const token = await getValidToken(userId);
  try {
    const videoId = extractYoutubeVideoId(rawVideoId);
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
