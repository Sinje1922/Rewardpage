// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CampaignEscrow
 * @dev 캠페인 보상 토큰(USDT, METAQ)을 에스크로로 관리하는 컨트랙트
 *
 * 흐름:
 *   1. 캠페인 생성자가 토큰을 approve() 후 lockFunds() 호출 → 토큰 잠금
 *   2. 추첨 완료 후 서버 오퍼레이터가 distributeRewards() 호출 → 당첨자들에게 자동 분배
 *   3. 참가자 부족 시 오퍼레이터가 refundCreator() 호출 → 잔액 환불
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract CampaignEscrow {
    // ─── 상태 ───────────────────────────────────────────────────
    address public owner;        // 컨트랙트 소유자 (배포자)
    address public operator;     // 서버 오퍼레이터 지갑 (distributeRewards 호출 권한)

    enum CampaignState { NONE, LOCKED, DISTRIBUTED, REFUNDED }

    struct Campaign {
        address creator;         // 캠페인 생성자 지갑
        address token;           // 보상 토큰 컨트랙트 주소
        uint256 totalAmount;     // 총 잠금 금액
        uint256 lockedAt;        // 잠금 시각 (block.timestamp)
        CampaignState state;
    }

    // campaignId (bytes32) → Campaign
    mapping(bytes32 => Campaign) public campaigns;

    // ─── 이벤트 ────────────────────────────────────────────────
    event FundsLocked(bytes32 indexed campaignId, address indexed creator, address token, uint256 amount);
    event RewardsDistributed(bytes32 indexed campaignId, uint256 winnerCount, uint256 totalDistributed);
    event CreatorRefunded(bytes32 indexed campaignId, address indexed creator, uint256 amount);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    // ─── 수정자 ────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Not operator");
        _;
    }

    modifier campaignExists(bytes32 campaignId) {
        require(campaigns[campaignId].state != CampaignState.NONE, "Campaign not found");
        _;
    }

    // ─── 생성자 ────────────────────────────────────────────────
    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
    }

    // ─── 오퍼레이터 관리 ────────────────────────────────────────
    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    // ─── 핵심 함수 ──────────────────────────────────────────────

    /**
     * @notice 캠페인 생성자가 토큰을 에스크로에 잠금
     * @dev 사전에 token.approve(escrowAddress, amount) 호출 필요
     * @param campaignId 플랫폼 내부 캠페인 ID (bytes32)
     * @param token BEP-20 토큰 컨트랙트 주소 (USDT or METAQ)
     * @param amount 잠글 총 토큰 양 (소수점 포함, e.g. USDT 18 decimals)
     */
    function lockFunds(
        bytes32 campaignId,
        address token,
        uint256 amount
    ) external {
        require(campaigns[campaignId].state == CampaignState.NONE, "Campaign already exists");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be > 0");

        // transferFrom으로 토큰을 컨트랙트로 이전
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            token: token,
            totalAmount: amount,
            lockedAt: block.timestamp,
            state: CampaignState.LOCKED
        });

        emit FundsLocked(campaignId, msg.sender, token, amount);
    }

    /**
     * @notice 추첨 완료 후 당첨자들에게 토큰 분배 (오퍼레이터 전용)
     * @param campaignId 캠페인 ID
     * @param winners 당첨자 지갑 주소 배열
     * @param amounts 각 당첨자에게 지급할 토큰 양 배열
     */
    function distributeRewards(
        bytes32 campaignId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOperator campaignExists(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(c.state == CampaignState.LOCKED, "Not in LOCKED state");
        require(winners.length == amounts.length, "Length mismatch");
        require(winners.length > 0, "No winners");

        // 총 분배량 검증 (잠금 금액을 초과할 수 없음)
        uint256 totalToDistribute = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalToDistribute += amounts[i];
        }
        require(totalToDistribute <= c.totalAmount, "Exceeds locked amount");

        // 각 당첨자에게 전송
        IERC20 token = IERC20(c.token);
        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0 && winners[i] != address(0)) {
                bool success = token.transfer(winners[i], amounts[i]);
                require(success, "Transfer to winner failed");
            }
        }

        // 잔액이 남아있으면 창작자에게 환불
        uint256 remaining = c.totalAmount - totalToDistribute;
        if (remaining > 0) {
            bool refundSuccess = token.transfer(c.creator, remaining);
            require(refundSuccess, "Refund transfer failed");
        }

        c.state = CampaignState.DISTRIBUTED;
        emit RewardsDistributed(campaignId, winners.length, totalToDistribute);
    }

    /**
     * @notice 참가자 전무 또는 취소 시 창작자에게 전액 환불 (오퍼레이터 전용)
     * @param campaignId 캠페인 ID
     */
    function refundCreator(bytes32 campaignId) external onlyOperator campaignExists(campaignId) {
        Campaign storage c = campaigns[campaignId];
        require(c.state == CampaignState.LOCKED, "Not in LOCKED state");

        uint256 amount = c.totalAmount;
        c.state = CampaignState.REFUNDED;

        bool success = IERC20(c.token).transfer(c.creator, amount);
        require(success, "Refund transfer failed");

        emit CreatorRefunded(campaignId, c.creator, amount);
    }

    /**
     * @notice 캠페인 상태 조회
     */
    function getCampaign(bytes32 campaignId) external view returns (
        address creator,
        address token,
        uint256 totalAmount,
        uint256 lockedAt,
        CampaignState state
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.creator, c.token, c.totalAmount, c.lockedAt, c.state);
    }

    /**
     * @notice campaignId 문자열을 bytes32로 변환하는 헬퍼
     */
    function stringToBytes32(string memory source) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(source));
    }
}
