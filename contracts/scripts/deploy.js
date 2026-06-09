const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * CampaignEscrow 배포 스크립트
 *
 * 사용법:
 *   BSC Testnet: npx hardhat run scripts/deploy.js --network bscTestnet
 *   BSC Mainnet: npx hardhat run scripts/deploy.js --network bscMainnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== CampaignEscrow 배포 시작 ===");
  console.log("배포 계정:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("계정 잔액:", ethers.formatEther(balance), "BNB");

  // 오퍼레이터 주소 (서버 지갑)
  const OPERATOR_ADDRESS = "0x87251F72E7603181B0E4D32F3130b34667348c7b";
  console.log("오퍼레이터 주소:", OPERATOR_ADDRESS);

  // 컨트랙트 배포
  const CampaignEscrow = await ethers.getContractFactory("CampaignEscrow");
  const escrow = await CampaignEscrow.deploy(OPERATOR_ADDRESS);
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log("\n✅ CampaignEscrow 배포 완료!");
  console.log("컨트랙트 주소:", contractAddress);

  // 배포 정보 저장
  const deployInfo = {
    network: hre.network.name,
    contractAddress,
    operator: OPERATOR_ADDRESS,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deployDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const deployFile = path.join(deployDir, `${hre.network.name}.json`);
  fs.writeFileSync(deployFile, JSON.stringify(deployInfo, null, 2));
  console.log("배포 정보 저장:", deployFile);

  // 서버 .env 업데이트 안내
  console.log("\n📝 .env에 다음 값을 추가하세요:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`BSC_NETWORK=testnet  # 또는 mainnet`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
