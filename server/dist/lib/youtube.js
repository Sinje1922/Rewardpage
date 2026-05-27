import axios from 'axios';
import { prisma } from './prisma.js';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
async function refreshAccessToken(userId, refreshToken) {
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
    }
    catch (err) {
        console.error('Failed to refresh YouTube token:', err.response?.data || err.message);
        throw new Error('YouTube token refresh failed');
    }
}
async function getValidToken(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.youtubeAccessToken)
        throw new Error('YouTube not linked');
    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpiredOrSoon = user.youtubeTokenExpiry && user.youtubeTokenExpiry < now + BigInt(60);
    if (isExpiredOrSoon) {
        if (user.youtubeRefreshToken) {
            return await refreshAccessToken(userId, user.youtubeRefreshToken);
        }
        // 토큰 만료 + 리프레시 토큰 없음 → 재연동 필요
        throw new Error('YouTube token expired. Please re-link your YouTube account.');
    }
    return user.youtubeAccessToken;
}
export function extractYoutubeVideoId(urlOrId) {
    if (!urlOrId)
        return '';
    const clean = urlOrId.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = clean.match(regExp);
    return (match && match[2].length === 11) ? match[2] : clean;
}
export async function resolveYoutubeChannelId(urlOrId, accessToken) {
    const clean = urlOrId.trim();
    if (clean.startsWith('UC') && clean.length === 24) {
        return clean;
    }
    // Extract handle or UC id from URL
    let handle = '';
    if (clean.includes('youtube.com/') || clean.includes('youtu.be/')) {
        if (clean.includes('/channel/')) {
            const match = clean.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (match)
                return match[1];
        }
        const handleMatch = clean.match(/\/(@[a-zA-Z0-9._-]+)/);
        if (handleMatch) {
            handle = handleMatch[1];
        }
    }
    else if (clean.startsWith('@')) {
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
            if (channelId)
                return channelId;
        }
        catch (err) {
            console.error('Failed to resolve YouTube handle to Channel ID:', err.response?.data || err.message);
        }
    }
    return clean; // Fallback
}
export async function checkYouTubeSubscription(userId, targetChannelId) {
    let token;
    try {
        token = await getValidToken(userId);
    }
    catch (err) {
        if (err.message === 'YouTube not linked') {
            return { success: false, error: 'YouTube 계정 연동이 필요합니다. 마이페이지에서 연동해 주세요.' };
        }
        if (err.message?.includes('token expired')) {
            return { success: false, error: 'YouTube 토큰이 만료되었습니다. 마이페이지에서 재연동해 주세요.' };
        }
        return { success: false, error: `YouTube 인증 오류: ${err.message}` };
    }
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
        const found = response.data.items && response.data.items.length > 0;
        if (found)
            return { success: true };
        return { success: false, error: '구독 정보가 확인되지 않습니다. 구독 후 잠시 기다렸다가 다시 시도해 주세요.' };
    }
    catch (err) {
        const apiErr = err.response?.data?.error;
        console.error('YouTube Subscription Check Error:', apiErr || err.message);
        if (apiErr?.status === 'UNAUTHENTICATED' || err.response?.status === 401) {
            return { success: false, error: 'YouTube 인증이 만료되었습니다. 마이페이지에서 재연동해 주세요.' };
        }
        return { success: false, error: '구독 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
    }
}
export async function checkYouTubeLike(userId, rawVideoId) {
    let token;
    try {
        token = await getValidToken(userId);
    }
    catch (err) {
        if (err.message === 'YouTube not linked') {
            return { success: false, error: 'YouTube 계정 연동이 필요합니다. 마이페이지에서 연동해 주세요.' };
        }
        if (err.message?.includes('token expired')) {
            return { success: false, error: 'YouTube 토큰이 만료되었습니다. 마이페이지에서 재연동해 주세요.' };
        }
        return { success: false, error: `YouTube 인증 오류: ${err.message}` };
    }
    try {
        const videoId = extractYoutubeVideoId(rawVideoId);
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos/getRating', {
            params: { id: videoId },
            headers: { Authorization: `Bearer ${token}` },
        });
        const rating = response.data.items?.[0]?.rating;
        if (rating === 'like')
            return { success: true };
        return { success: false, error: '좋아요 정보가 확인되지 않습니다. 좋아요를 누른 후 다시 시도해 주세요.' };
    }
    catch (err) {
        const apiErr = err.response?.data?.error;
        console.error('YouTube Like Check Error:', apiErr || err.message);
        if (apiErr?.status === 'UNAUTHENTICATED' || err.response?.status === 401) {
            return { success: false, error: 'YouTube 인증이 만료되었습니다. 마이페이지에서 재연동해 주세요.' };
        }
        return { success: false, error: '좋아요 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
    }
}
