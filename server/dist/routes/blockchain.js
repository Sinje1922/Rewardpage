import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { getTokenBalance, getWalletTokenBalances, getEscrowCampaignState, getNetworkInfo, isBlockchainConfigured, } from "../lib/blockchain.js";
const router = Router();
/**
 * GET /api/blockchain/info
 * 현재 블록체인 네트워크 설정 정보 조회 (공개)
 */
router.get("/info", (_req, res) => {
    res.json({
        configured: isBlockchainConfigured(),
        ...getNetworkInfo(),
    });
});
/**
 * GET /api/blockchain/balance/:address
 * 특정 지갑의 USDT, METAQ 잔액 조회
 * 캠페인 생성 전 보유 토큰 확인용
 */
router.get("/balance/:address", authRequired, async (req, res) => {
    const address = req.params.address;
    // 지갑 주소 형식 검증
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        res.status(400).json({ error: "유효하지 않은 지갑 주소입니다." });
        return;
    }
    try {
        const balances = await getWalletTokenBalances(address);
        res.json({
            address,
            balances: {
                USDT: balances.USDT,
                METAQ: balances.METAQ,
            },
        });
    }
    catch (err) {
        console.error("[Blockchain API] 잔액 조회 오류:", err);
        res.status(500).json({ error: "잔액 조회에 실패했습니다." });
    }
});
/**
 * GET /api/blockchain/balance/:address/:currency
 * 특정 토큰 잔액만 조회
 */
router.get("/balance/:address/:currency", authRequired, async (req, res) => {
    const address = req.params.address;
    const currency = req.params.currency;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        res.status(400).json({ error: "유효하지 않은 지갑 주소입니다." });
        return;
    }
    if (!["USDT", "METAQ"].includes(currency.toUpperCase())) {
        res.status(400).json({ error: "지원하는 토큰: USDT, METAQ" });
        return;
    }
    try {
        const result = await getTokenBalance(address, currency.toUpperCase());
        res.json({
            address,
            currency: currency.toUpperCase(),
            balance: result.balance,
            decimals: result.decimals,
            symbol: result.symbol,
        });
    }
    catch (err) {
        console.error("[Blockchain API] 개별 잔액 조회 오류:", err);
        res.status(500).json({ error: "잔액 조회에 실패했습니다." });
    }
});
/**
 * GET /api/blockchain/escrow/:campaignId
 * 캠페인의 에스크로 상태 조회
 * 0=NONE(미등록), 1=LOCKED(잠금), 2=DISTRIBUTED(분배완료), 3=REFUNDED(환불)
 */
router.get("/escrow/:campaignId", authRequired, async (req, res) => {
    const campaignId = req.params.campaignId;
    try {
        const state = await getEscrowCampaignState(campaignId);
        if (!state) {
            res.json({ registered: false, state: 0 });
            return;
        }
        res.json({ registered: true, ...state });
    }
    catch (err) {
        console.error("[Blockchain API] 에스크로 상태 조회 오류:", err);
        res.status(500).json({ error: "에스크로 상태 조회에 실패했습니다." });
    }
});
export default router;
