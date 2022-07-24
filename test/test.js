const { ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { localNetworks, networks } = require("../helper-hardhat.config");

!localNetworks.includes(network.name)
  ? describe.skip
  : describe("DAO", () => {
      let contract;
      let deployer, investorOne, investorTwo, investorThree, receiver;
      const { contributionEnd, voteEnd, quorum } = networks[network.name];
      beforeEach(async () => {
        const contractFactory = await ethers.getContractFactory("DAO");
        [deployer, investorOne, investorTwo, investorThree, receiver] =
          await ethers.getSigners();
        contract = await contractFactory.deploy(
          contributionEnd,
          voteEnd,
          quorum
        );
      });

      describe("Invest", () => {
        it("Should invest in the contract", async () => {
          const contractOne = contract.connect(investorOne);
          const contractInitFunds = await contract.availableFunds();
          await contractOne.invest({ value: ethers.utils.parseEther("1") });
          const contractAfterFunds = await contract.availableFunds();
          const isInvestor = await contract.investors(investorOne.address);
          const isInvvestorTwo = await contract.investors(investorTwo.address);
          const shares = await contract.shares(investorOne.address);
          assert.equal(contractInitFunds.toString(), "0");
          assert.equal(
            contractAfterFunds.toString(),
            ethers.utils.parseEther("1")
          );
          assert(isInvestor);
          assert.equal(shares.toString(), ethers.utils.parseEther("1"));
          assert(!isInvvestorTwo);
        });

        it("Should not invest after contribution end time", async () => {
          await network.provider.send("evm_increaseTime", [
            contributionEnd + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await expect(contract.invest({ value: ethers.utils.parseEther("1") }))
            .to.be.reverted;
        });
      });

      describe("Redeem shares", () => {
        beforeEach(async () => {
          investorOneConnected = contract.connect(investorOne);
          await investorOneConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
        });

        it("Should not redeem if there arent enough shares bought", async () => {
          await expect(
            investorOneConnected.redeemShare(ethers.utils.parseEther("2"))
          ).to.be.revertedWith("Dont have enough shares");
          const shares = await contract.shares(investorOne.address);
          assert.equal(shares.toString(), ethers.utils.parseEther("1"));
        });

        it("Should redeem the shares", async () => {
          const initShares = await contract.shares(investorOne.address);
          const initBalance = await investorOne.provider.getBalance(
            investorOne.address
          );
          const tx = await investorOneConnected.redeemShare(
            ethers.utils.parseEther("1")
          );
          const txResponse = await tx.wait(1);

          const afterShares = await contract.shares(investorOne.address);
          const afterBalance = await investorOne.provider.getBalance(
            investorOne.address
          );

          assert.equal(afterShares.toString(), "0");
          assert.equal(initShares.toString(), ethers.utils.parseEther("1"));
        });

        it("Should transfer shares", async () => {
          const initInvestorOneShares = await contract.shares(
            investorOne.address
          );
          const initInvestorTwoShares = await contract.shares(
            investorTwo.address
          );
          await investorOneConnected.transferShares(
            ethers.utils.parseEther("0.5"),
            investorTwo.address
          );
          const afterInvestorOneShares = await contract.shares(
            investorOne.address
          );
          const afterInvestorTwoShares = await contract.shares(
            investorTwo.address
          );
          const totalShares = await contract.totalShares();
          const availableFunds = await contract.availableFunds();
          assert.equal(availableFunds.toString(), ethers.utils.parseEther("1"));
          assert.equal(totalShares.toString(), ethers.utils.parseEther("1"));
          assert.equal(
            initInvestorOneShares.toString(),
            ethers.utils.parseEther("1")
          );
          assert.equal(initInvestorTwoShares.toString(), "0");
          assert.equal(
            afterInvestorOneShares.toString(),
            ethers.utils.parseEther("0.5")
          );
          assert.equal(
            afterInvestorTwoShares.toString(),
            ethers.utils.parseEther("0.5")
          );
        });

        it("Should not transfer shares if there arent enough shares", async () => {
          await expect(
            investorOneConnected.transferShares(
              ethers.utils.parseEther("2"),
              investorTwo.address
            )
          ).to.be.reverted;
        });
      });

      describe("Create Proposal", () => {
        let investorOneConnected, investorTwoConnected, investorThreeConnected;
        beforeEach(async () => {
          investorOneConnected = contract.connect(investorOne);
          investorTwoConnected = contract.connect(investorTwo);
          investorThreeConnected = contract.connect(investorThree);
          await investorOneConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
          await investorTwoConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
        });

        it("Should not create proposal if called by investor", async () => {
          await expect(
            investorThreeConnected.createProposal(
              "DAI",
              ethers.utils.parseEther("0.5"),
              investorTwo.address
            )
          ).to.be.revertedWith("Can only called by investor");
        });

        it("Should not create proposal if there are not enough funds available", async () => {
          await expect(
            investorOneConnected.createProposal(
              "DAI",
              ethers.utils.parseEther("4"),
              investorTwo.address
            )
          ).to.be.revertedWith("Amount too big");
        });

        it("Should create proposal", async () => {
          await investorOneConnected.createProposal(
            "DAI",
            ethers.utils.parseEther("0.5"),
            investorTwo.address
          );
          const totalFunds = await contract.availableFunds();

          const { id, name, votes, to, amount, end, executed } =
            await contract.proposals(0);
          assert.equal(id.toString(), "0");
          assert.equal(name, "DAI");
          assert.equal(votes.toString(), "0");
          assert.equal(to, investorTwo.address);
          assert.equal(amount.toString(), ethers.utils.parseEther("0.5"));
          assert.equal(executed, false);
          assert.equal(totalFunds.toString(), ethers.utils.parseEther("1.5"));
        });
      });

      describe("Vote", () => {
        let investorOneConnected, investorTwoConnected, investorThreeConnected;
        beforeEach(async () => {
          investorOneConnected = contract.connect(investorOne);
          investorTwoConnected = contract.connect(investorTwo);
          investorThreeConnected = contract.connect(investorThree);
          await investorOneConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
          await investorTwoConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
          await investorOneConnected.createProposal(
            "DAI",
            ethers.utils.parseEther("0.5"),
            investorTwo.address
          );
        });

        it("Should not allow to vote if its not the investor", async () => {
          await expect(investorThreeConnected.vote(0)).to.be.reverted;
          const hasInvestorVoted = await contract.votes(
            investorThree.address,
            0
          );
          assert(!hasInvestorVoted);
        });

        it("Should not allow to vote if the voting time ends", async () => {
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await expect(investorOneConnected.vote(0)).to.be.reverted;
          const hasInvestorOneVoted = await contract.votes(
            investorOne.address,
            0
          );
          assert(!hasInvestorOneVoted);
        });

        it("Should not allow to vote twice", async () => {
          await investorOneConnected.vote(0);
          await expect(investorOneConnected.vote(0)).to.be.reverted;
          const { id, name, votes, to, amount, end, executed } =
            await contract.proposals(0);
          assert.equal(votes.toString(), ethers.utils.parseEther("1"));
        });

        it("Should not allow to vote if the propsal has been executed", async () => {
          await investorOneConnected.invest({
            value: ethers.utils.parseEther("3"),
          });
          // await investorThreeConnected.invest({value: ethers.utils.parseEther("1")});
          await investorOneConnected.vote(0);
          // await investorThreeConnected.vote(0)
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await contract.executeProposal(0);

          const { id, name, votes, to, amount, end, executed } =
            await contract.proposals(0);
          assert(executed);
          await expect(investorTwoConnected.vote(0)).to.be.reverted;
          const hasInvestorTwoVoted = await contract.votes(
            investorTwo.address,
            0
          );
          assert(!hasInvestorTwoVoted);
        });

        it("Should allow to vote", async () => {
          await investorOneConnected.vote(0);
          await investorTwoConnected.vote(0);
          const hasInvestorOneVoted = await contract.votes(
            investorOne.address,
            0
          );
          const hasInvestorTwoVoted = await contract.votes(
            investorTwo.address,
            0
          );
          const { id, name, votes, to, amount, end, executed } =
            await contract.proposals(0);

          assert(hasInvestorOneVoted);
          assert(hasInvestorTwoVoted);
          assert(votes.toString(), ethers.utils.parseEther("2"));
        }); 

        
      });

      describe("Execute Proposal",()=>{
        let investorOneConnected, investorTwoConnected, investorThreeConnected;
        beforeEach(async () => {
          investorOneConnected = contract.connect(investorOne);
          investorTwoConnected = contract.connect(investorTwo);
          investorThreeConnected = contract.connect(investorThree);
          await investorOneConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
          await investorTwoConnected.invest({
            value: ethers.utils.parseEther("1"),
          });
          await investorOneConnected.createProposal(
            "DAI",
            ethers.utils.parseEther("0.5"),
            receiver.address
          );

          await investorOneConnected.vote(0)
          await investorTwoConnected.vote(0)
        });

        it("Should not execute proposal if the caller is not admin",async()=>{
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await expect(investorOneConnected.executeProposal(0)).to.be.revertedWith("Only admin allowed")
        })

        it("Should not execute the proposal before voting ends",async()=>{
          await expect(contract.executeProposal(0)).to.be.revertedWith("Can only execute after a proposal ends");
        })


        it("Should not execute the proposal if there are not enough votes",async()=>{
          await investorThreeConnected.invest({value: ethers.utils.parseEther("5")})
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await expect(contract.executeProposal(0)).to.be.revertedWith("Not enough votes")
        })

        it("Should not execute an already executed proposal",async()=>{
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await contract.executeProposal(0);
          const { id, name, votes, to, amount, end, executed } =
            await contract.proposals(0);
            await expect(contract.executeProposal(0)).to.be.reverted
            assert.equal(executed,true);
        })

        it("Should execute the proposal",async()=>{
          const receiverInitBalance = await receiver.provider.getBalance(receiver.address);
          await network.provider.send("evm_increaseTime", [voteEnd + 1]);
          await network.provider.send("evm_mine", []);
          await contract.executeProposal(0);
          const { id, name, votes, to, amount, end, executed } =
          await contract.proposals(0);
          const receiverAfterBalance = await receiver.provider.getBalance(receiver.address);
          assert(executed)
          assert(receiverInitBalance.add(ethers.utils.parseEther(amount.toString())).toString(),receiverAfterBalance.toString())

        })

      })
    });
