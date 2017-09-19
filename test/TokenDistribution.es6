var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

const time = require('./helpers/evmChangeTime.es6');
const mine = require('./helpers/evmMine.es6');

contract('TokenDistribution', function(accounts) {
    const EXP_18 = 18;
    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const YEAR = 365 * DAY;

    // Get block timestamp
    beforeEach(async () => {
        now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    });

    const ACCOUNT0 = accounts[0];
    const ACCOUNT1 = accounts[1];
    const ACCOUNT2 = accounts[2];
    const PROXY_ADDRESS = accounts[9];

    // Fast forward time for tests
    const increaseTime= async (by) => {
        await time(by);
        now += by;
    };

    /////////////////////
    // initialization //
    ///////////////////
    /*
    1.✔ukgDepositAddress shouldn't be 0
    2.✔distributionStartTimestamp shouldn't be 0
    3.✔freezeTimestamp shouldn't be 0
    4.✔proxyContractAddress shouldn't be 0
    5.✔UKG_FUND should have 800M UKG
    6.✔this contract should have 200M UKG
     */
    describe("initialization - COMPLETE", () => {

        it("Should not allow ukgDepositAddress to be initialized to 0", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const addr = await token.ukgDepositAddr.call();
            assert.notEqual(addr, 0, "ukgDepositAddr was not initialized.");
        });

        it("Should not allow distributionStartTimestamp to be initialized to 0", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const addr = await token.distributionStartTimestamp.call();
            assert.notEqual(addr, 0, "distributionStartTimestamp was not initialized.");
        });

        it("Should not allow freezeTimestamp to be initialized to 0", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const addr = await token.freezeTimestamp.call();

            assert.notEqual(addr.valueOf(), 0, "freezeTimestamp was not initialized.");
        });

        it("Should not allow proxyContractAddress to be initialized to 0", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const addr = await token.proxyContractAddress.call();
            assert.notEqual(addr, ACCOUNT0, "proxyContractAddress was not initialized.");
        });

        it("Should initiate Unikrn account with 800M UKG", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const balance = await token.balanceOf.call(ACCOUNT0);
            assert.equal(balance.valueOf(), 800 * 10**6 * 10**EXP_18, "800M UKG wasn't in the first account.");
        });

        it("Should initiate the contract with 200M UKG", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
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
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10 , now - 5);

            await proxy.allocateSaleBalances([PROXY_ADDRESS], [1]);
            await token.claimSaleTokens({from:PROXY_ADDRESS});
            const balance = await token.balanceOf.call(PROXY_ADDRESS);
            assert.equal(balance.valueOf(), 1, "DIDN'T WORK.");
        });

        it("Should throw because the user has already collected their funds", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10 , now - 5);

            await proxy.allocateSaleBalances([ACCOUNT1], [1]);
            await token.claimSaleTokens({from:ACCOUNT1});

            try {
                await token.claimSaleTokens({from:ACCOUNT1});
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should throw if all 135M tokens have been distributed", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10 , now - 5);
            const VAL = 1;

            await proxy.allocateSaleBalances([ACCOUNT1], [VAL]);
            await token.claimSaleTokens({from:ACCOUNT1});

            const numSaleTokensDistributed = await token.numSaleTokensDistributed.call();
            assert.equal(numSaleTokensDistributed.valueOf(), VAL, "DIDN'T WORK.");
        });
    });

    ///////////
    // time //
    /////////
    /*
    1.✔Should return current block.timestamp
     */

    describe("time - COMPLETE", () => {

        it("Should return the current timestamp", async () => {
            const token = await TokenDistribution.deployed(); // Used deployed because deoploying a new contact takes too long to deploy and causes this test to fail
            const status = await token.time.call();
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
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
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

            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
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
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 0 on day 9 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 9 * DAY - HOUR);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 1 on day 9 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 9 * DAY + HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 1 on day 18 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 18 * DAY - HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 2 on day 18 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 18 * DAY + HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 2 on day 27 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 27 * DAY - HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 3 on day 27 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 27 * DAY + HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 3 on day 36 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 36 * DAY - HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 4 on day 36 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 36 * DAY + HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 4 on day 45 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 45 * DAY - HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 5 on day 45 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 45 * DAY +  HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 5 on day 54 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 54 * DAY - HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 6 on day 54 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 54 * DAY + HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 6 on day 63 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 63 * DAY - HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 7 on day 63 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 63 * DAY + HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 7 on day 72 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 72 * DAY - HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 8 on day 72 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 72 * DAY + HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 8 on day 81 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 81 * DAY - HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 9 on day 81 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 81 * DAY + HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 9 on day 90 - 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 90 * DAY - HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 10 on day 90 + 1 hour", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + 90 * DAY + HOUR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });

        it("Should return phase 10, as the function returns 10 at any point after 90 days", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            const phase = await token.whichPhase.call(now + YEAR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });
    });

    ////////////////////////////////
    // claimPresaleTokensIterate //
    //////////////////////////////
    /*
    1.✔Should only be callable internally
    2.✔Should pull participant data from proxy contract on 1st iteration
    3.✔Should not work if user didn't participate in the presale
    4.✔Should calculate allocationPerPhase as 10% of their total allocation
    5.✔Should add the modulo to the allocation on the first phase
    6.✔Should not add the modulo to the allocation after the first phase
    7.✔Should subtract the phaseAllocation from the participant's remainingAllownace
    8.✔Should add the phaseAllocation to the numPresaleTokensDistributed
    9.✔Should distribute the entire balance of tokens to a user after the 10th phase
    10.✔Should return to claimPresaleTokens function (and iterate again) if the user has claimed for that phase
     */

    describe("claimPresaleTokensIterate", () => {

        it("Should only be callable internally", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
            try {
                await token.claimPresaleTokensIterate();
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")

        });

        it("Should pull participant data from proxy contract on 1st iteration", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.presaleParticipantAllowedAllocationOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL, "Not the correct value");
        });

        it("Should throw if the usser did not participate in the presale", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);

            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            try {
                await token.claimPresaleTokens({from: ACCOUNT2});
            }
            catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should calculate allocationPerPhase as 10% of their total allocation", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.allocationPerPhaseOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL/10, "Not the correct value");
        });

        it("Should add the modulo to the allocation on the first phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now -5);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should not add the modulo to the allocation after the first phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 2
            await increaseTime(DAY * 20);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should subtract the phaseAllocation from the participant's remainingAllownace", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.remainingAllowance.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL - (Math.floor(VAL/10) + VAL%10), "Not the correct value");
        });

        it("Should add the phaseAllocation to the numPresaleTokensDistributed", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.numPresaleTokensDistributed.call();

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should distribute the entire balance of tokens to a user after the 10th phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 10
            await increaseTime(DAY * 90);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});
            const balance = await token.numPresaleTokensDistributed.call();

            assert.equal(balance.valueOf(), VAL, "Not the correct value");
        });

        it("Should return to claimPresaleTokens function (and iterate again) if the user has claimed for that phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);
            const VAL = 1000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});

            // Need to get into phase 2
            await increaseTime(DAY * 10);
            await mine();

            await token.claimPresaleTokens({from: ACCOUNT1});

            const balance = await token.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), 200, "Not the correct value");
        });
    });

    /////////////////
    // cancelDist //
    ///////////////
    /*
    1.✔Should change cancelDistribution to `true` if executed correctly
     */

    describe("cancelDist - COMPLETE", () => {

        it("Should change cancelDistribution to true if executed correctly", async () => {
            const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 100, now + 1000);
            await token.cancelDist({from:ACCOUNT0});
            const cancel_var = await token.cancelDistribution.call();
            assert.equal(cancel_var.valueOf(), true, "Did not go through.");
        });
    });

    ////////////////
    // modifiers //
    //////////////
    /*
    1.✔notFrozen
    2.✔notCanceled
    3.✔distributionStarted
    4.✔presaleTokensStillAvailable
    5.✔saleTokensStillAvailable
    */

    describe("modifiers", () => {

        context("onlyOwner", async () => {

            it("Should throw if not called by the owner", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 5, now + 10);
                try {
                    await token.cancelDist({from: ACCOUNT1});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notCanceled", async () => {

            it("Should throw claimSaleTokens() with notCanceled modifier", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 100, now + 1000);
                await token.cancelDist({from:ACCOUNT0});
                try {
                    await token.claimSaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with notCanceled modifier", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now + 100, now + 1000);
                await token.cancelDist({from:ACCOUNT0});
                try {
                    await token.claimPresaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notFrozen", async () => {

            it("Should throw cancelDist() with notFrozen modifier", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now - 10, now - 5);
                try {
                    await token.cancelDist({from:ACCOUNT0});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("distributionStarted", async () => {

            it("Should throw claimSaleTokens() with distributionStarted modifier", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now - 10, now + 5);
                try {
                    await token.claimSaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with distributionStarted modifier", async () => {
                const token = await TokenDistribution.new(ACCOUNT0, PROXY_ADDRESS, now - 10, now + 5);
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
                const proxy = await ParticipantAdditionProxy.new();
                const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);

                await proxy.allocateSaleBalances([ACCOUNT1], [135 * (10**6) * 10**EXP_18]);
                await token.claimSaleTokens({from:ACCOUNT1});

                try {
                    await token.claimSaleTokens({from:ACCOUNT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("presaleTokensStillAvailable", async () => {

            it("Should throw claimPresaleTokens() with saleTokensStillAvailable modifier", async () => {
                const proxy = await ParticipantAdditionProxy.new();
                const token = await TokenDistribution.new(ACCOUNT0, proxy.address, now - 10, now - 5);

                // Need to push presale forward a 90+ days in order to get to the last phase
                await increaseTime(YEAR);
                await mine();

                await proxy.allocatePresaleBalances([ACCOUNT1], [65 * (10 ** 6) * 10 ** EXP_18]);
                await token.claimPresaleTokens({from: ACCOUNT1});

                try {
                    await token.claimPresaleTokens({from: ACCOUNT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });
    });
});
