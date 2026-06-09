/**
 * CampaignEscrow 배포 스크립트 (ethers.js 직접 사용)
 *
 * 사용법 (contracts/ 디렉터리에서):
 *   BSC Testnet:  node scripts/deploy.mjs testnet
 *   BSC Mainnet:  node scripts/deploy.mjs mainnet
 *
 * 사전 조건:
 *   - server/.env의 OPERATOR_PRIVATE_KEY 설정 필요
 *   - Testnet의 경우 오퍼레이터 지갑에 BNB Testnet 필요
 *     faucet: https://testnet.bnbchain.org/faucet-smart
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 서버 .env 로드
const envPath = path.join(__dirname, "../../server/.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
  envVars[key] = val;
}

const OPERATOR_PRIVATE_KEY = envVars.OPERATOR_PRIVATE_KEY;
if (!OPERATOR_PRIVATE_KEY || OPERATOR_PRIVATE_KEY === "your-operator-wallet-private-key-here") {
  console.error("❌ OPERATOR_PRIVATE_KEY가 server/.env에 설정되지 않았습니다.");
  process.exit(1);
}

const NETWORK = process.argv[2] || "testnet";
const RPC_URLS = {
  testnet: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  mainnet: "https://bsc-dataseed1.binance.org/",
};

const RPC_URL = RPC_URLS[NETWORK];
if (!RPC_URL) {
  console.error("❌ 유효한 네트워크를 지정하세요: testnet 또는 mainnet");
  process.exit(1);
}

// 컴파일된 ABI + bytecode 로드
const artifactPath = path.join(__dirname, "../artifacts/contracts/CampaignEscrow.sol/CampaignEscrow.json");
if (!fs.existsSync(artifactPath)) {
  console.error("❌ 컴파일된 아티팩트를 찾을 수 없습니다. 먼저 'npx hardhat compile'을 실행하세요.");
  process.exit(1);
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

// 오퍼레이터 지갑 주소
const OPERATOR_ADDRESS = "0x87251F72E7603181B0E4D32F3130b34667348c7b";

async function main() {
  console.log(`\n=== CampaignEscrow 배포 (${NETWORK}) ===`);
  console.log("RPC URL:", RPC_URL);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(OPERATOR_PRIVATE_KEY, provider);

  console.log("배포 계정:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("잔액:", ethers.formatEther(balance), "BNB");

  if (balance === 0n) {
    console.error(`❌ BNB 잔액이 없습니다.`);
    if (NETWORK === "testnet") {
      console.log("Faucet: https://testnet.bnbchain.org/faucet-smart");
    }
    process.exit(1);
  }

  console.log("오퍼레이터:", OPERATOR_ADDRESS);
  console.log("\n배포 중...");

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(OPERATOR_ADDRESS);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ CampaignEscrow 배포 완료!");
  console.log("컨트랙트 주소:", contractAddress);

  if (NETWORK === "testnet") {
    console.log(`BSCScan: https://testnet.bscscan.com/address/${contractAddress}`);
  } else {
    console.log(`BSCScan: https://bscscan.com/address/${contractAddress}`);
  }

  // 배포 정보 저장
  const deployDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(deployDir, { recursive: true });
  const deployInfo = {
    network: NETWORK,
    contractAddress,
    operator: OPERATOR_ADDRESS,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
  };
  const deployFile = path.join(deployDir, `${NETWORK}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(deployInfo, null, 2));
  console.log("\n💾 배포 정보 저장:", deployFile);

  // server/.env 업데이트 안내
  console.log("\n📝 server/.env에 다음 값을 업데이트하세요:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`BSC_NETWORK=${NETWORK}`);

  // server/.env 자동 업데이트 시도
  try {
    let envText = fs.readFileSync(envPath, "utf-8");
    if (envText.includes("ESCROW_CONTRACT_ADDRESS=")) {
      envText = envText.replace(/ESCROW_CONTRACT_ADDRESS="[^"]*"/, `ESCROW_CONTRACT_ADDRESS="${contractAddress}"`);
    } else {
      envText += `\nESCROW_CONTRACT_ADDRESS="${contractAddress}"\n`;
    }
    if (envText.includes("BSC_NETWORK=")) {
      envText = envText.replace(/BSC_NETWORK="[^"]*"/, `BSC_NETWORK="${NETWORK}"`);
    }
    fs.writeFileSync(envPath, envText);
    console.log("✅ server/.env 자동 업데이트 완료!");
  } catch (err) {
    console.warn("⚠️  server/.env 자동 업데이트 실패 — 수동으로 업데이트하세요.");
  }
}

main().catch((err) => {
  console.error("❌ 배포 실패:", err.message);
  process.exit(1);
});
