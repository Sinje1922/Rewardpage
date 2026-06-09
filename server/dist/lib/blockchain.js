import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const ESCROW_ABI = require("./CampaignEscrowABI.json");
// ─── 설정 상수 ────────────────────────────────────────────────────────────────
/**
 * BSC 네트워크별 설정
 */
const BSC_CONFIG = {
    testnet: {
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainId: 97,
        // BSC Testnet USDT (BEP-20 테스트 토큰)
        USDT_ADDRESS: "0x337610d27c682E347C9cD60BD4b3b107C9d34dEE",
        // METAQ는 메인넷과 동일 컨트랙트로 가정 (실제 배포 후 업데이트 필요)
        METAQ_ADDRESS: "0x19da1f6A5c2aec9315BF16D14ce7F7163082bF82",
    },
    mainnet: {
        rpcUrl: "https://bsc-dataseed1.binance.org/",
        chainId: 56,
        // BSC Mainnet USDT (BEP-20)
        USDT_ADDRESS: "0x55d398326f99059fF775485246999027B3197955",
        // METAQ 메인넷 컨트랙트
        METAQ_ADDRESS: "0x19da1f6A5c2aec9315BF16D14ce7F7163082bF82",
    },
};
// ERC-20 기본 ABI (잔액 조회, approve 확인용)
const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function allowance(address owner, address spender) view returns (uint256)",
];
// ─── 블록체인 서비스 ───────────────────────────────────────────────────────────
function getNetwork() {
    const net = process.env.BSC_NETWORK || "testnet";
    return net === "mainnet" ? "mainnet" : "testnet";
}
function getConfig() {
    return BSC_CONFIG[getNetwork()];
}
/**
 * BSC Provider (읽기 전용)
 */
function getProvider() {
    const config = getConfig();
    return new ethers.JsonRpcProvider(config.rpcUrl);
}
/**
 * 오퍼레이터 서명 지갑 (쓰기 전용 — distributeRewards 호출용)
 */
function getOperatorWallet() {
    const privateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("[Blockchain] OPERATOR_PRIVATE_KEY가 .env에 설정되지 않았습니다.");
    }
    const provider = getProvider();
    return new ethers.Wallet(privateKey, provider);
}
/**
 * 에스크로 컨트랙트 인스턴스 (서명 지갑 사용)
 */
function getEscrowContract() {
    const address = process.env.ESCROW_CONTRACT_ADDRESS;
    if (!address) {
        throw new Error("[Blockchain] ESCROW_CONTRACT_ADDRESS가 .env에 설정되지 않았습니다.");
    }
    const wallet = getOperatorWallet();
    return new ethers.Contract(address, ESCROW_ABI, wallet);
}
/**
 * 특정 토큰의 컨트랙트 주소 반환
 */
export function getTokenAddress(currency) {
    const config = getConfig();
    if (currency === "USDT")
        return config.USDT_ADDRESS;
    if (currency === "METAQ")
        return config.METAQ_ADDRESS;
    throw new Error(`Unknown token currency: ${currency}`);
}
/**
 * campaignId 문자열을 bytes32로 변환 (솔리디티의 keccak256(abi.encodePacked(id)) 동일)
 */
export function campaignIdToBytes32(campaignId) {
    return ethers.keccak256(ethers.toUtf8Bytes(campaignId));
}
/**
 * 토큰 잔액 조회 (wei 단위)
 * @param walletAddress 조회할 지갑 주소
 * @param currency 'USDT' | 'METAQ'
 */
export async function getTokenBalance(walletAddress, currency) {
    const provider = getProvider();
    const tokenAddress = getTokenAddress(currency);
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [raw, decimals, symbol] = await Promise.all([
        token.balanceOf(walletAddress),
        token.decimals(),
        token.symbol(),
    ]);
    const balance = ethers.formatUnits(raw, decimals);
    return { balance, decimals: Number(decimals), symbol };
}
/**
 * 여러 토큰 잔액 일괄 조회
 */
export async function getWalletTokenBalances(walletAddress) {
    try {
        const [usdt, metaq] = await Promise.all([
            getTokenBalance(walletAddress, "USDT"),
            getTokenBalance(walletAddress, "METAQ"),
        ]);
        return {
            USDT: usdt.balance,
            METAQ: metaq.balance,
        };
    }
    catch (err) {
        console.error("[Blockchain] 잔액 조회 실패:", err);
        return { USDT: "0", METAQ: "0" };
    }
}
/**
 * 에스크로 컨트랙트에서 캠페인 상태 조회
 */
export async function getEscrowCampaignState(campaignId) {
    try {
        const address = process.env.ESCROW_CONTRACT_ADDRESS;
        if (!address)
            return null;
        const provider = getProvider();
        const escrow = new ethers.Contract(address, ESCROW_ABI, provider);
        const campaignKey = campaignIdToBytes32(campaignId);
        const result = await escrow.getCampaign(campaignKey);
        if (result.state === 0n)
            return null; // NONE = 미등록
        return {
            creator: result.creator,
            token: result.token,
            totalAmount: result.totalAmount.toString(),
            lockedAt: Number(result.lockedAt),
            state: Number(result.state),
        };
    }
    catch (err) {
        console.error("[Blockchain] 에스크로 상태 조회 실패:", err);
        return null;
    }
}
/**
 * 추첨 완료 후 당첨자들에게 온체인 토큰 분배
 * @param campaignId 캠페인 ID (서버 내부 ID)
 * @param currency 'USDT' | 'METAQ'
 * @param winners 당첨자별 {walletAddress, amount(소수점 단위)} 배열
 */
export async function distributeOnChainRewards(campaignId, currency, winners) {
    console.log(`[Blockchain] 온체인 분배 시작 - Campaign: ${campaignId}, Token: ${currency}, Winners: ${winners.length}`);
    const escrow = getEscrowContract();
    const campaignKey = campaignIdToBytes32(campaignId);
    // 소수점 amount → wei 변환 (BEP-20 기본 18 decimals, USDT BSC는 18 decimals)
    const DECIMALS = 18;
    const winnerAddresses = winners.map((w) => w.walletAddress);
    const winnerAmounts = winners.map((w) => ethers.parseUnits(w.amount.toFixed(18), DECIMALS));
    try {
        const tx = await escrow.distributeRewards(campaignKey, winnerAddresses, winnerAmounts, { gasLimit: 500000 });
        console.log(`[Blockchain] 트랜잭션 전송됨: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[Blockchain] 트랜잭션 확인됨! Block: ${receipt.blockNumber}`);
        return { txHash: tx.hash, success: true };
    }
    catch (err) {
        console.error("[Blockchain] 온체인 분배 실패:", err?.message || err);
        throw new Error(`온체인 토큰 분배 실패: ${err?.message || "Unknown error"}`);
    }
}
/**
 * 참가자 없거나 캠페인 취소 시 창작자에게 전액 환불
 */
export async function refundCreatorOnChain(campaignId) {
    console.log(`[Blockchain] 창작자 환불 시작 - Campaign: ${campaignId}`);
    const escrow = getEscrowContract();
    const campaignKey = campaignIdToBytes32(campaignId);
    const tx = await escrow.refundCreator(campaignKey, { gasLimit: 200000 });
    console.log(`[Blockchain] 환불 트랜잭션: ${tx.hash}`);
    await tx.wait();
    return { txHash: tx.hash };
}
/**
 * 블록체인 서비스 설정 상태 확인
 */
export function isBlockchainConfigured() {
    return !!(process.env.OPERATOR_PRIVATE_KEY &&
        process.env.ESCROW_CONTRACT_ADDRESS);
}
/**
 * 현재 활성 네트워크 정보 반환
 */
export function getNetworkInfo() {
    const network = getNetwork();
    const config = getConfig();
    return {
        network,
        chainId: config.chainId,
        rpcUrl: config.rpcUrl,
        usdtAddress: config.USDT_ADDRESS,
        metaqAddress: config.METAQ_ADDRESS,
        escrowAddress: process.env.ESCROW_CONTRACT_ADDRESS || null,
        operatorAddress: "0x87251F72E7603181B0E4D32F3130b34667348c7b",
    };
}
