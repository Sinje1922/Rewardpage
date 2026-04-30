import { prisma } from "../lib/prisma.js";
import { runCampaignDraw } from "../services/lotteryService.js";
/**
 * 종료된 캠페인을 찾아 자동으로 추첨을 진행하는 워커
 * 1분마다 실행됩니다.
 */
export async function startLotteryWorker() {
    console.log("Lottery Worker started.");
    // 최초 즉시 실행 후 1분마다 반복
    runWorkerTask();
    setInterval(runWorkerTask, 60 * 1000);
}
async function runWorkerTask() {
    try {
        const now = new Date();
        // 종료 시간이 지났고, 상태가 ACTIVE인 캠페인 조회
        const endedCampaigns = await prisma.campaign.findMany({
            where: {
                status: "ACTIVE",
                endsAt: {
                    lte: now,
                    not: null,
                },
            },
            select: { id: true, title: true }
        });
        if (endedCampaigns.length > 0) {
            console.log(`[LotteryWorker] Found ${endedCampaigns.length} ended campaigns. Starting draw...`);
            for (const camp of endedCampaigns) {
                try {
                    console.log(`[LotteryWorker] Processing draw for: ${camp.title} (${camp.id})`);
                    await runCampaignDraw(camp.id);
                    console.log(`[LotteryWorker] Successfully drawn for: ${camp.title}`);
                }
                catch (drawError) {
                    console.error(`[LotteryWorker] Failed to draw for ${camp.id}:`, drawError.message);
                }
            }
        }
    }
    catch (error) {
        console.error("[LotteryWorker] Error in worker task:", error);
    }
}
