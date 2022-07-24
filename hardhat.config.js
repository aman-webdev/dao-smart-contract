require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan");


/** @type import('hardhat/config').HardhatUserConfig */
const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
module.exports = {
  solidity: "0.8.9",
  defaultNetwork:"hardhat",
  networks:{
    rinkeby:{
      url:RINKEBY_RPC_URL,
      accounts:[PRIVATE_KEY],
      
    }
  },
  etherscan:{
    apiKey:ETHERSCAN_API_KEY
  }
};
