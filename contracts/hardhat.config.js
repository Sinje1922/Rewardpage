/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // BSC Testnet (ChainID: 97)
    bscTestnet: {
      type: "http",
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
    },
    // BSC Mainnet (ChainID: 56)
    bscMainnet: {
      type: "http",
      url: "https://bsc-dataseed1.binance.org/",
      chainId: 56,
    },
  },
};
