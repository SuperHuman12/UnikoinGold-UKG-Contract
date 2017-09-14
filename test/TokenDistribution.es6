var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

var BigNumber = require("bignumber.js");

const HttpProvider = require(`ethjs-provider-http`);
const EthRPC = require(`ethjs-rpc`);
const EthQuery = require(`ethjs-query`);

const ethRPC = new EthRPC(new HttpProvider(`http://localhost:8545`));
const ethQuery = new EthQuery(new HttpProvider(`http://localhost:8545`));

// TODO: Get rid of balanceOf function from main contract
// TODO: ParticipantAdditionProx

contract('TokenDistribution', function(accounts) {
    const EXP_18 = 18;
    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const YEAR = 365 * DAY;

    now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

    const OWNER = accounts[0];
    const PROXY_ADDR = accounts[1];
    const FREEZE_TIMESTAMP = now;
    const DISTRIBUTION_START_TIMESTAMP = now;

    const evmTimeChange = (time) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [time], // Time increase param.
                id: new Date().getTime()
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    };

    const takeSnapshot = () => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_snapshot',
                params: [],
                id: new Date().getTime()
            }, (err, result) => {
                if (err) {
                    return reject(err);
                }

                resolve(result.result);
            });
        });
    };

    const revertToSnapshot = (snapShotId) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_revert',
                params: [snapShotId],
                id: new Date().getTime()
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    };

    const mine = () => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_mine',
                params: [],
                id: new Date().getTime()
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    };
    // Fast forward time for tests
    const increaseTime= async (by) => {
        await evmTimeChange(by);
        now += by;
    };

    // Rewind time after tests
    const decreaseTime = async (by) => {
        await evmTimeChange(by);
        now -= by;
    };

    // Get block timestamp
    beforeEach(async () => {
        now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    });

    /////////////////////
    // initialization //
    ///////////////////
    /*
    1.ukgDepositAddress shouldn't be 0
    2.✔distributionStartTimestamp shouldn't be 0
    3.✔freezeTimestamp shouldn't be 0
    4.✔proxyContractAddress shouldn't be 0
    5.✔UKG_FUND should have 800M UKG
    6.✔this contract should have 200M UKG
     */
    describe("initialization - COMPLETE", () => {
        it("Should not allow ukgDepositAddress to be initialized to 0", async () => {
            let token = await TokenDistribution.deployed();
            const addr = await token.ukgDepositAddr.call();
            assert.notEqual(addr, 0, "ukgDepositAddr was not initialized.");
        });

        it("Should not allow distributionStartTimestamp to be initialized to 0", async () => {
            let token = await TokenDistribution.deployed();
            const addr = await token.distributionStartTimestamp.call();
            assert.notEqual(addr, 0, "distributionStartTimestamp was not initialized.");
        });

        it("Should not allow freezeTimestamp to be initialized to 0", async () => {
            let token = await TokenDistribution.deployed();
            const addr = await token.freezeTimestamp.call();

            assert.notEqual(addr.valueOf(), 0, "freezeTimestamp was not initialized.");
        });

        it("Should not allow proxyContractAddress to be initialized to 0", async () => {
            let token = await TokenDistribution.deployed();
            const addr = await token.proxyContractAddress.call();
            assert.notEqual(addr, accounts[0], "proxyContractAddress was not initialized.");
        });

        it("Should initiate Unikrn account with 800M UKG", async () => {
            let token = await TokenDistribution.deployed();
            const balance = await token.balanceOf.call(accounts[0]);
            assert.equal(balance.valueOf(), 800 * 10**6 * 10**EXP_18, "800M UKG wasn't in the first account.");
        });

        it("Should initiate the contract with 200M UKG", async () => {
            let token = await TokenDistribution.deployed();
            const balance = await token.balanceOf.call(token.address);
            assert.equal(balance.valueOf(), 200 * 10**6 * 10**EXP_18, "800M UKG wasn't in the first account.");
        });
    });

    /////////////////////
    // claimSaleToken //
    ///////////////////
    /*
    1.✔Should allow user to collect their funds
    2.✔Should throw if a user has already collected their funds
    3.✔numSaleTokensDistributed should update with user's allocation
     */

    describe("claimSaleToken", () => {
        it("Should allow users to claim their funds from the sale", async () => {
            let proxy = await ParticipantAdditionProxy.new();
            let token = await TokenDistribution.new(OWNER, proxy.address, now-10, now-5);
            const ACCT1 = accounts[1];

            await proxy.allocateSaleBalances([ACCT1], [1]);
            await token.claimSaleTokens({from:ACCT1});

            const balance = await token.balanceOf.call(ACCT1);
            assert.equal(balance.valueOf(), 1, "DIDN'T WORK.");
        });

        it("Should throw because the user has already collected their funds", async () => {
            let proxy = await ParticipantAdditionProxy.new();
            let token = await TokenDistribution.new(OWNER, proxy.address, now-10, now-5);
            const ACCT1 = accounts[1];

            await proxy.allocateSaleBalances([ACCT1], [1]);
            await token.claimSaleTokens({from:ACCT1});

            try {
                await token.claimSaleTokens({from:ACCT1});
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should throw if all 135M tokens have been distributed", async () => {
            let proxy = await ParticipantAdditionProxy.new();
            let token = await TokenDistribution.new(OWNER, proxy.address, now-10, now-5);
            const ACCT1 = accounts[1];
            const VAL = 1;

            await proxy.allocateSaleBalances([ACCT1], [VAL]);
            await token.claimSaleTokens({from:ACCT1});

            let numSaleTokensDistributed = await token.numSaleTokensDistributed.call();
            assert.equal(numSaleTokensDistributed.valueOf(), VAL, "DIDN'T WORK.");
        });
    });

    // it("should fail because function does not exist on contract", async function () {
    //     let token = await TokenDistribution.deployed();
    //
    //     let result = await token.cancelDist({from: accounts[0]});
    //     // console.log(result);
    //
    //     let distributionStartTimestamp = await token.distributionStartTimestamp.call(function(err, res) {
    //                                            document.getElementById('amt').innerText = res;});
    //
    //     console.log(distributionStartTimestamp)
    //
    //     try {
    //         await token.claimSaleToken.call();
    //     } catch (e) {
    //         return true;
    //     }
    //     throw new Error("I should never see this!")
    // });
    //
    // it("Should not allow distributionStartTimestamp to be initialized to 0", async () => {
    //     return TokenDistribution.deployed().then(function(instance) {
    //         distributionStartTimestamp = instance.distributionStartTimestamp.call(function(err, res){
    //             document.getElementById('amt').innerText = res;
    //         });
    //         return distributionStartTimestamp
    //     }).then(function(num) {
    //         assert.notEqual(num.valueOf(), 0, "distributionStartTimestamp was not initialized");
    //     });
    // });

    ///////////
    // time //
    /////////
    /*
    1.✔Should return current block.timestamp
     */

    describe("time - COMPLETE", () => {
        it("Should return the current timestamp", async () => {
            let token = await TokenDistribution.deployed();
            let status = await token.time.call();
            assert.equal(status.valueOf(), now, "Not the right time.");
        });
    });

    ///////////////////
    // currentPhase //
    /////////////////
    /*
    1.✔Should return which phase the contract is in
     */

    describe("currentPhase - COMPLETE", () => {
        it("Should return phase 0 upon contract deployment", async () => {
            let token = await TokenDistribution.deployed();
            const phase = await token.currentPhase.call();
            assert.equal(phase.valueOf(), 0, "Not the right phase.");
        });
    });

    //////////
    // min //
    ////////
    /*
    1.✔Should return the minimum of two inputs
     */

    describe("min - COMPLETE", () => {
        it("Should return minimum of two inputs", async () => {
            const small_num=50;
            const large_num=100;

            let token = await TokenDistribution.deployed();
            const result = await token.min.call(small_num, large_num);
            assert.equal(result.valueOf(), small_num, 'Did not return minimum.');
        });
    });

    /////////////////
    // whichPhase //
    ///////////////
    /*
    1.✔Should return 0 upon contract creation
    2.✔Should return phase 0 on day 9 - 1 hour
    3.✔Should return phase 1 on day 9 + 1 hour
    4.✔Should return phase 1 on day 18 - 1 hour
    5.✔Should return phase 2 on day 18 + 1 hour
    6.✔Should return phase 2 on day 27 - 1 hour
    7.✔Should return phase 3 on day 27 + 1 hour
    8.✔Should return phase 3 on day 36 - 1 hour
    9.✔Should return phase 4 on day 36 + 1 hour
    10.✔Should return phase 4 on day 45 - 1 hour
    11.✔Should return phase 5 on day 45 + 1 hour
    12.✔Should return phase 5 on day 54 - 1 hour
    13.✔Should return phase 6 on day 54 + 1 hour
    14.✔Should return phase 6 on day 63 - 1 hour
    15.✔Should return phase 7 on day 63 + 1 hour
    16.✔Should return phase 7 on day 72 - 1 hour
    17.✔Should return phase 8 on day 72 + 1 hour
    18.✔Should return phase 8 on day 81 - 1 hour
    19.✔Should return phase 9 on day 81 + 1 hour
    20.✔Should return phase 9 on day 90 - 1 hour
    21.✔Should return phase 10 on day 90 + 1 hour
    22.✔Should return 10 on any point past phase 10
     */

    describe("whichPhase - COMPLETE", () => {
        it("Should return phase 0, as this is upon contract creation", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 0 on day 9 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 9 * DAY - HOUR);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 1 on day 9 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 9 * DAY + HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 1 on day 18 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 18 * DAY - HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 2 on day 18 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 18 * DAY + HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 2 on day 27 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 27 * DAY - HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 3 on day 27 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 27 * DAY + HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 3 on day 36 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 36 * DAY - HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 4 on day 36 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 36 * DAY + HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 4 on day 45 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 45 * DAY - HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 5 on day 45 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 45 * DAY +  HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 5 on day 54 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 54 * DAY - HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 6 on day 54 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 54 * DAY + HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 6 on day 63 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 63 * DAY - HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 7 on day 63 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 63 * DAY + HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 7 on day 72 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 72 * DAY - HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 8 on day 72 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 72 * DAY + HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 8 on day 81 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 81 * DAY - HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 9 on day 81 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 81 * DAY + HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 9 on day 90 - 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 90 * DAY - HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 10 on day 90 + 1 hour", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + 90 * DAY + HOUR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });

        it("Should return phase 10, as the function returns 10 at any point after 90 days", async () => {
            let token = await TokenDistribution.deployed();
            let phase = await token.whichPhase.call(now + YEAR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });
    });

    ////////////////////////////////
    // claimPresaleTokensIterate //
    //////////////////////////////
    /*
    1. Should only be callable internally
    2. Should only loop if the current phase is greater than the phase passed into the function by claimPresaleTokens
    3. Should pull participant data from proxy contract on 1st iteration
    4. Should not pull participant data from proxy contract after 1st iteration
    5. Should not work if user didn't participate in the presale
    6. Should calculate allocationPerPhase as 10% of their total allocation
    7. Should set remainingAllocation to their entire presale contribution
    8. Should return to claimPresaleTokens function (and iterate again) if the user has claimed for that phase
    9. Should return to claimPresaleTokens function if the user has no additional funds allocated
    10. Should add the modulo to the allocation on the first phase
    11. Should not allocate the modulo balance to the remainder of phases
    12. Should subtract the phaseAllocation from the participant's remainingAllownace
    13. Should add the phaseAllocation to the numPresaleTokensDistributed
    14. Should distribute tokens to the user
     */

    /////////////////////////
    // claimPresaleTokens //
    ///////////////////////
    /*
    1. Should not work if there are no more presale tokens available
    2. Should never loop more than 10 times
    3. i should never be > 10
    */

    /////////////////
    // cancelDist //
    ///////////////
    /*
    1.✔Should change cancelDistribution to `true` if executed correctly (reverts back after test)
     */
    describe("cancelDist - COMPLETE", () => {
        it("Should change cancelDistribution to true if executed correctly", async () => {
            let token = await TokenDistribution.deployed();
            let snapshot_val = await takeSnapshot();
            await token.cancelDist({from:accounts[0]});
            let cancel_var = await token.cancelDistribution.call();
            assert.equal(cancel_var.valueOf(), true, "Did not go through.");
            await revertToSnapshot(snapshot_val); // Return to false
        });
    });

    ////////////////
    // modifiers //
    //////////////
    // 1. notFrozen
    // 2. notCanceled
    // 3. distributionStarted
    // 4. presaleTokensStillAvailable
    // 5. saleTokensStillAvailable

    describe("modifiers", () => {

        context("onlyOwner", async () => {

            it("Should throw if not called by the owner", async () => {
                let token = await TokenDistribution.deployed();
                try {
                    await token.cancelDist({from: accounts[1]});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notCanceled", async () => {

            it("Should throw claimSaleTokens() with notCanceled modifier", async () => {
                let token = await TokenDistribution.deployed();
                let snapshot_val = await takeSnapshot();
                await token.cancelDist({from:accounts[0]});
                try {
                    await token.claimSaleTokens.call();
                } catch (e) {
                    await revertToSnapshot(snapshot_val); // Return to false
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with notCanceled modifier", async () => {
                let token = await TokenDistribution.deployed();
                let snapshot_val = await takeSnapshot();
                await token.cancelDist({from:accounts[0]});
                try {
                    await token.claimPresaleTokens.call();
                } catch (e) {
                    await revertToSnapshot(snapshot_val); // Return to false
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notFrozen", async () => {

            it("Should throw cancelDist() with notFrozen modifier", async () => {
                const newFreeze = now - 10;
                const newDist = now + 100;

                let token = await TokenDistribution.new(OWNER, PROXY_ADDR, newFreeze, newDist);
                let snapshot_val = await takeSnapshot();
                try {
                    await token.cancelDist({from:accounts[0]});
                } catch (e) {
                    await revertToSnapshot(snapshot_val); // Return to false
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("distributionStarted", async () => {

            it("Should throw claimSaleTokens() with distributionStarted modifier", async () => {
                const newFreeze = now - 10;
                const newDist = now + 5;

                let token = await TokenDistribution.new(OWNER, PROXY_ADDR, newFreeze, newDist);
                try {
                    await token.claimSaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with distributionStarted modifier", async () => {
                const newFreeze = now - 10;
                const newDist = now + 5;

                let token = await TokenDistribution.new(OWNER, PROXY_ADDR, newFreeze, newDist);
                try {
                    await token.claimPresaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("saleTokensStillAvailable", async () => {

            it("Should throw claimSaleTokens() with saleTokensStillAvailable modifier", async () => {
                let proxy = await ParticipantAdditionProxy.new();
                let token = await TokenDistribution.new(OWNER, proxy.address, now-10, now-5);
                const ACCT1 = accounts[1];
                const ACCT2 = accounts[2];

                await proxy.allocateSaleBalances([ACCT1], [135 * (10**6) * 10**EXP_18]);
                await token.claimSaleTokens({from:ACCT1});

                try {
                    await token.claimSaleTokens({from:ACCT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("presaleTokensStillAvailable", async () => {

            it("Should throw claimPresaleTokens() with saleTokensStillAvailable modifier", async () => {
                let proxy = await ParticipantAdditionProxy.new();
                let token = await TokenDistribution.new(OWNER, proxy.address, now - 10, now - 5);
                const ACCT1 = accounts[1];
                const ACCT2 = accounts[2];

                // Need to push presale forward a 90+ days in order to get to the last phase
                await increaseTime(YEAR);
                await mine();

                await proxy.allocatePresaleBalances([ACCT1], [65 * (10 ** 6) * 10 ** EXP_18]);
                await token.claimPresaleTokens({from: ACCT1});

                try {
                    await token.claimPresaleTokens({from: ACCT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });
    });
});