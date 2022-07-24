const localNetworks=["hardhat","localhost"]

const networks = {
    hardhat:{
        contributionEnd:30,
        voteEnd:30,
        quorum:60
    },
    rinkeby:{
        contributionEnd:30,
        voteEnd:30,
        quorum:60
    }
}

module.exports={localNetworks,networks}