var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");
var UnikoinGold = artifacts.require("./UnikoinGold.sol");

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
    const UKG_FUND = accounts[8];
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
    1. Should not allow distributionStartTimestamp to be initialized to 0
    2. Should not allow freezeTimestamp to be initialized to 0
    3. Should not allow proxyContractAddress to be initialized to 0
    4. Should not allow freezeTimstamp to be initialized after distributionTimestamp
    5. Should be initiated with 200M UKG
     */

    describe("initialization", () => {

        it("Should not allow distributionStartTimestamp to be initialized to 0", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            const addr = await distribution.distributionStartTimestamp.call();
            assert.notEqual(addr, 0, "distributionStartTimestamp was not initialized.");
        });

        it("Should not allow freezeTimestamp to be initialized to 0", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            const addr = await distribution.freezeTimestamp.call();

            assert.notEqual(addr.valueOf(), 0, "freezeTimestamp was not initialized.");
        });

        it("Should not allow proxyContractAddress to be initialized to 0", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            const addr = await distribution.proxyContractAddress.call();
            assert.notEqual(addr, ACCOUNT0, "proxyContractAddress was not initialized.");
        });

        it("Should not allow freezeTimstamp to be initialized after distributionTimestamp", async () => {
            try {
                await TokenDistribution.new(PROXY_ADDRESS, now + 5, now - 5);
            }
            catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should be initiated with 200M UKG", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);

            const balance = await ukg.balanceOf.call(distribution.address);
            assert.equal(balance.valueOf(), 200 * 10**6 * 10**EXP_18, "600M UKG wasn't in the first account.");
        });
    });

    //////////////////////
    // setTokenAddress //
    ////////////////////
    /*
    1. Should set the proper tokenAddress
    2. Should throw if token address is not defined
    3. Should throw if tokenAddress has already been set
     */

    describe("setTokenAddress", () => {

        it("Should throw if tokenAddress has already been set", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            await distribution.setTokenAddress(ACCOUNT1);

            const tokenAddr = await distribution.tokenAddress.call();

            assert.equal(tokenAddr.valueOf(), ACCOUNT1, "freezeTimestamp was not initialized.");
        });

        it("Should throw if token address is not defined", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);

            try {
                await distribution.setTokenAddress(0x0);
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should throw if tokenAddress has already been set", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            await distribution.setTokenAddress(ACCOUNT1);
            try {
                await distribution.setTokenAddress(ACCOUNT2);
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });
    });

    /////////////////////
    // claimSaleToken //
    ///////////////////
    /*
    1. Should allow users to claim their funds from the sale
    2. Should throw because the user has already collected their funds
    3. Should update numSaleTokensDistributed with user's allocation
    4. Should throw if all 135M tokens have been distributed
     */

    describe("claimSaleToken", () => {

        it("Should allow users to claim their funds from the sale", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);

            await proxy.allocateSaleBalances([PROXY_ADDRESS], [1]);
            await distribution.claimSaleTokens({from:PROXY_ADDRESS});
            const balance = await ukg.balanceOf.call(PROXY_ADDRESS);

            assert.equal(balance.valueOf(), 1, "DIDN'T WORK.");
        });

        it("Should throw because the user has already collected their funds", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);

            await proxy.allocateSaleBalances([ACCOUNT1], [1]);
            await distribution.claimSaleTokens({from:ACCOUNT1});

            try {
                await distribution.claimSaleTokens({from:ACCOUNT1});
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should update numSaleTokensDistributed with user's allocation", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1;

            await proxy.allocateSaleBalances([ACCOUNT1], [VAL]);
            await distribution.claimSaleTokens({from:ACCOUNT1});

            const numSaleTokensDistributed = await distribution.numSaleTokensDistributed.call();
            assert.equal(numSaleTokensDistributed.valueOf(), VAL, "DIDN'T WORK.");
        });

        it("Should throw if all 135M tokens have been distributed", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 135 * (10**6) * 10**EXP_18;

            await proxy.allocateSaleBalances([ACCOUNT1], [VAL]);
            await distribution.claimSaleTokens({from:ACCOUNT1});

            try {
                await distribution.claimSaleTokens({from:ACCOUNT1});
            } catch (e) {
                return true;
            }

            assert.fail("The function executed when it should not have.")
        });
    });

    ///////////
    // time //
    /////////
    /*
    1. Should return the current timestamp
     */

    describe("time", () => {

        it("Should return the current timestamp", async () => {
            const distribution = await TokenDistribution.deployed();

            const status = await distribution.time.call();
            assert.equal(status.valueOf(), now, "Not the right time.");
        });
    });

    ///////////////////
    // currentPhase //
    /////////////////
    /*
    1. Should return phase 0 upon contract deployment
     */

    describe("currentPhase", () => {

        it("Should return phase 0 upon contract deployment", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.currentPhase.call();
            assert.equal(phase.valueOf(), 0, "Not the right phase.");
        });
    });

    /////////////////
    // whichPhase //
    ///////////////
    /*
    1. Should return 0 upon contract creation
    2. Should return phase 0 on day 9 - 1 hour
    3. Should return phase 1 on day 9 + 1 hour
    4. Should return phase 1 on day 18 - 1 hour
    5. Should return phase 2 on day 18 + 1 hour
    6. Should return phase 2 on day 27 - 1 hour
    7. Should return phase 3 on day 27 + 1 hour
    8. Should return phase 3 on day 36 - 1 hour
    9. Should return phase 4 on day 36 + 1 hour
    10. Should return phase 4 on day 45 - 1 hour
    11. Should return phase 5 on day 45 + 1 hour
    12. Should return phase 5 on day 54 - 1 hour
    13. Should return phase 6 on day 54 + 1 hour
    14. Should return phase 6 on day 63 - 1 hour
    15. Should return phase 7 on day 63 + 1 hour
    16. Should return phase 7 on day 72 - 1 hour
    17. Should return phase 8 on day 72 + 1 hour
    18. Should return phase 8 on day 81 - 1 hour
    19. Should return phase 9 on day 81 + 1 hour
    20. Should return phase 9 on day 90 - 1 hour
    21. Should return phase 10 on day 90 + 1 hour
    22. Should return 10 on any point past phase 10
     */

    describe("whichPhase", () => {

        it("Should return phase 0, as this is upon contract creation", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 0 on day 9 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 9 * DAY - HOUR);
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });

        it("Should return phase 1 on day 9 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 9 * DAY + HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 1 on day 18 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 18 * DAY - HOUR);
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });

        it("Should return phase 2 on day 18 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 18 * DAY + HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 2 on day 27 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 27 * DAY - HOUR);
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });

        it("Should return phase 3 on day 27 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 27 * DAY + HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 3 on day 36 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 36 * DAY - HOUR);
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });

        it("Should return phase 4 on day 36 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 36 * DAY + HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 4 on day 45 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 45 * DAY - HOUR);
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });

        it("Should return phase 5 on day 45 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 45 * DAY +  HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 5 on day 54 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 54 * DAY - HOUR);
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });

        it("Should return phase 6 on day 54 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 54 * DAY + HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 6 on day 63 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 63 * DAY - HOUR);
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });

        it("Should return phase 7 on day 63 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 63 * DAY + HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 7 on day 72 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 72 * DAY - HOUR);
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });

        it("Should return phase 8 on day 72 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 72 * DAY + HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 8 on day 81 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 81 * DAY - HOUR);
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });

        it("Should return phase 9 on day 81 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 81 * DAY + HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 9 on day 90 - 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 90 * DAY - HOUR);
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });

        it("Should return phase 10 on day 90 + 1 hour", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + 90 * DAY + HOUR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });

        it("Should return phase 10, as the function returns 10 at any point after 90 days", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
            const phase = await distribution.whichPhase.call(now + YEAR);
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });
    });

    ////////////////
    // nextPhase //
    //////////////
    /*
    1. Should return the remaining time in phase 0
    2. Should return the remaining time in other phases
     */
    describe("nextPhase", () => {


        it("Should return the remaining time in phase 0", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            var shouldBe1 = 9 * DAY;

            let remainingTime1 = await distribution.timeRemainingInPhase.call();

            assert.closeTo(Number(remainingTime1.valueOf()), shouldBe1, 10, "Not the correct value");
            // Fast Forward 5 minutes
            await increaseTime(5 * MINUTE);
            await mine();
            let remainingTime2 = await distribution.timeRemainingInPhase.call();

            assert.closeTo(Number(remainingTime2.valueOf()), shouldBe1 - (5 * MINUTE), 10, "Not the correct value");
        });

        it("Should return the remaining time in other phases", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const shouldBe1 = (27 * DAY) - (20 * DAY);
            const shouldBe2 = (45 * DAY) - (40 * DAY);

            //Fast Forward to Phase 2
            await increaseTime(20 * DAY);
            await mine();

            let remainingTime1 = await distribution.timeRemainingInPhase.call();

            assert.closeTo(Number(remainingTime1).valueOf(), shouldBe1, 5, "Not the correct value");

            //Fast Forward to Phase 4
            await increaseTime(20 * DAY);
            await mine();

            let remainingTime2 = await distribution.timeRemainingInPhase.call();

            assert.closeTo(Number(remainingTime2.valueOf()), shouldBe2, 10, "Not the correct value");
        });
    });
    //////////////////////
    // phasesClaimable //
    ////////////////////
    /*
    1. Should return the number of phases a user still has to claim
     */
    describe("phasesClaimable", () => {

        it("Should return the number of phases a user still has to claim", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            let phasesRemaining1 = await distribution.phasesClaimable.call(ACCOUNT1);
            assert.equal(phasesRemaining1.valueOf(), 0, "Not the correct value");

            // Need to get into phase 3
            await increaseTime(DAY * 30);
            await mine();

            let phasesRemaining2 = await distribution.phasesClaimable.call(ACCOUNT1);
            assert.equal(phasesRemaining2.valueOf(), 3, "Not the correct value");

            // Claim tokens. Should reset phasesClaimable to 0
            await distribution.claimPresaleTokens({from: ACCOUNT1});
            let phasesRemaining3 = await distribution.phasesClaimable.call(ACCOUNT1);
            assert.equal(phasesRemaining3.valueOf(), 0, "Not the correct value");

        });
    });

    ////////////////////////////////
    // claimPresaleTokensIterate //
    //////////////////////////////
    /*
    1. Should only be callable internally
    2. Should pull participant data from proxy contract on 1st iteration
    3. Should not work if user didn't participate in the presale
    4. Should calculate allocationPerPhase as 10% of their total allocation
    5. Should add the modulo to the allocation on the first phase
    6. Should not add the modulo to the allocation after the first phase
    7. Should subtract the phaseAllocation from the participant's remainingAllownace
    8. Should add the phaseAllocation to the numPresaleTokensDistributed
    9. Should distribute the entire balance of tokens to a user after the 10th phase
    10. Should return to claimPresaleTokens function (and iterate again) if the user has claimed for that phase
    11. Should return the number of phases that have been collected by the user
     */

    describe("claimPresaleTokensIterate", () => {

        it("Should only be callable internally", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 5, now + 10);
            try {
                await distribution.claimPresaleTokensIterate();
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")

        });

        it("Should pull participant data from proxy contract on 1st iteration", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await distribution.presaleParticipantAllowedAllocation.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL, "Not the correct value");
        });

        it("Should throw if the usser did not participate in the presale", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            try {
                await distribution.claimPresaleTokens({from: ACCOUNT2});
            }
            catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.")
        });

        it("Should calculate allocationPerPhase as 10% of their total allocation", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await distribution.allocationPerPhase.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL/10, "Not the correct value");
        });

        it("Should add the modulo to the allocation on the first phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await ukg.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should not add the modulo to the allocation after the first phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 2
            await increaseTime(DAY * 20);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await ukg.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should subtract the phaseAllocation from the participant's remainingAllownace", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await distribution.remainingAllowance.call(ACCOUNT1);

            assert.equal(balance.valueOf(), VAL - (Math.floor(VAL/10) + VAL%10), "Not the correct value");
        });

        it("Should add the phaseAllocation to the numPresaleTokensDistributed", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await distribution.numPresaleTokensDistributed.call();

            assert.equal(balance.valueOf(), Math.floor(VAL/10) + VAL%10, "Not the correct value");
        });

        it("Should distribute the entire balance of tokens to a user after the 10th phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000001;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 10
            await increaseTime(DAY * 90);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const balance = await distribution.numPresaleTokensDistributed.call();

            assert.equal(balance.valueOf(), VAL, "Not the correct value");
        });

        it("Should return to claimPresaleTokens function (and iterate again) if the user has claimed for that phase", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});

            // Need to get into phase 2
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});

            const balance = await ukg.balanceOf.call(ACCOUNT1);

            assert.equal(balance.valueOf(), 200, "Not the correct value");
        });

        it("Should return the number of phases that have been collected by the user", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 1000000;

            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const phasesClaimed1 = await distribution.phasesClaimed.call(ACCOUNT1);

            assert.equal(phasesClaimed1.valueOf(), 0, "Not the correct value");

            // Need to get into phase 1
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const phasesClaimed2 = await distribution.phasesClaimed.call(ACCOUNT1);

            assert.equal(phasesClaimed2.valueOf(), 1, "Not the correct value");

            // Need to get into phase 10
            await increaseTime(DAY * 90);
            await mine();

            await distribution.claimPresaleTokens({from: ACCOUNT1});
            const phasesClaimed3 = await distribution.phasesClaimed.call(ACCOUNT1);

            assert.equal(phasesClaimed3.valueOf(), 10, "Not the correct value");
        });
    });

    //////////////////////////////
    // claimAllAvailableTokens //
    ////////////////////////////
    /*
    1. Should execute claimSaleTokens and claimPresaleTokens successfully
     */
    describe("claimAllTokens", () => {

        it("Should execute claimSaleTokens and claimPresaleTokens successfully", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);
            const VAL = 100;

            await proxy.allocateSaleBalances([ACCOUNT1], [VAL]);
            await proxy.allocatePresaleBalances([ACCOUNT1], [VAL]);

            // Need to get into phase 10
            await increaseTime(DAY * 10);
            await mine();

            await distribution.claimAllAvailableTokens({from: ACCOUNT1});
            const balance1 = await ukg.balanceOf.call(ACCOUNT1);

            assert.equal(balance1.valueOf(), VAL + (Math.floor(VAL/10) + (VAL%10)), "Not the correct value");

            await distribution.claimAllAvailableTokens({from: ACCOUNT1});

            assert.equal(balance1.valueOf(), VAL + (Math.floor(VAL/10) + (VAL%10)), "Not the correct value");

            // Need to get into phase 10
            await increaseTime(DAY * 90);
            await mine();

            await distribution.claimAllAvailableTokens({from: ACCOUNT1});
            const balance2 = await ukg.balanceOf.call(ACCOUNT1);

            assert.equal(balance2.valueOf(), VAL * 2, "Not the correct value");

        });
    });

    /////////////////
    // cancelDist //
    ///////////////
    /*
    1. Should change cancelDistribution to `true` if executed correctly
     */

    describe("cancelDist", () => {

        it("Should change cancelDistribution to true if executed correctly", async () => {
            const proxy = await ParticipantAdditionProxy.new();
            const distribution = await TokenDistribution.new(proxy.address, now + 100 , now + 1000);
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
            await distribution.setTokenAddress(ukg.address);

            await distribution.cancelDist({from:ACCOUNT0});
            const cancel_var = await distribution.cancelDistribution.call();
            assert.equal(cancel_var.valueOf(), true, "Did not go through.");
        });
    });

    ////////////////
    // modifiers //
    //////////////
    /*
    1. notFrozen
    2. notCanceled
    3. distributionStarted
    4. presaleTokensStillAvailable
    5. saleTokensStillAvailable
    */

    describe("modifiers", () => {

        context("onlyOwner", async () => {

            it("Should throw if not called by the owner", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 100 , now + 1000);
                try {
                    await distribution.cancelDist({from: ACCOUNT1});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notCanceled", async () => {

            it("Should throw claimSaleTokens() with notCanceled modifier", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 100 , now + 1000);
                await distribution.cancelDist({from:ACCOUNT0});
                try {
                    await distribution.claimSaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with notCanceled modifier", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + 100 , now + 1000);
                await distribution.cancelDist({from:ACCOUNT0});
                try {
                    await distribution.claimPresaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("notFrozen", async () => {

            it("Should throw cancelDist() with notFrozen modifier", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
                try {
                    await distribution.cancelDist({from:ACCOUNT0});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("distributionStarted", async () => {

            it("Should throw claimSaleTokens() with distributionStarted modifier", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now - 5);
                try {
                    await distribution.claimSaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });

            it("Should throw claimPresaleTokens() with distributionStarted modifier", async () => {
                const distribution = await TokenDistribution.new(PROXY_ADDRESS, now - 10 , now + 5);
                try {
                    await distribution.claimPresaleTokens.call();
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("saleTokensStillAvailable", async () => {

            it("Should throw claimSaleTokens() with saleTokensStillAvailable modifier", async () => {
                const proxy = await ParticipantAdditionProxy.new();
                const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
                const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
                await distribution.setTokenAddress(ukg.address);

                await proxy.allocateSaleBalances([ACCOUNT1], [135 * (10**6) * 10**EXP_18]);
                await distribution.claimSaleTokens({from:ACCOUNT1});

                try {
                    await distribution.claimSaleTokens({from:ACCOUNT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });

        context("presaleTokensStillAvailable", async () => {

            it("Should throw claimPresaleTokens() with saleTokensStillAvailable modifier", async () => {
                const proxy = await ParticipantAdditionProxy.new();
                const distribution = await TokenDistribution.new(proxy.address, now - 10 , now - 5);
                const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);
                await distribution.setTokenAddress(ukg.address);

                // Need to push presale forward a 90+ days in order to get to the last phase
                await increaseTime(YEAR);
                await mine();
                await proxy.allocatePresaleBalances([ACCOUNT1], [65 * (10 ** 6) * 10 ** EXP_18]);
                await distribution.claimPresaleTokens({from: ACCOUNT1});

                try {
                    await distribution.claimPresaleTokens({from: ACCOUNT2});
                } catch (e) {
                    return true;
                }
                assert.fail("The function executed when it should not have.")
            });
        });
    });
});
