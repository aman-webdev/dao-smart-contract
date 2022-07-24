const {ethers, network}=require("hardhat")
const {networks,localNetworks}=require("../helper-hardhat.config");
const verify = require("./verify");

const main=async()=>{
  const contractFactory = await ethers.getContractFactory("DAO");
  const [deployer] = await ethers.getSigners()
  const {contributionEnd,voteEnd,quorum} = networks[network.name]
  const contract = await contractFactory.deploy(contributionEnd,voteEnd,quorum);
  console.log(contract.address)
 await contract.deployTransaction.wait(6)
 if(!localNetworks.includes(network.name))
 await verify(contract.address,[contributionEnd,voteEnd,quorum])
}

main()