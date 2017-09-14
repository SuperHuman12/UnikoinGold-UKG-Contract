var TokenDistribution = artifacts.require("./TokenDistribution.sol");

var BigNumber = require("bignumber.js");
var curr_time = Math.floor(new Date().getTime() / 1000);


// TODO: Get rid of balanceOf function from main contract
// TODO: ParticipantAdditionProx

contract('TokenDistribution', function(accounts) {
    const EXP18 = 18;
    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const YEAR = 365 * DAY;

    const increaseTime = (time) => {
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

    const mineBlock = function () {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: "2.0",
                method: "evm_mine"
            }, (err, result) => {
                if(err){ return reject(err) }
                return resolve(result)
            });
        });
    };

    /////////////////////
    // Initialization //
    ///////////////////
    /*
    1.✔ukgDepositAddress shouldn't be 0
    2.✔distributionStartTimestamp shouldn't be 0
    3.✔freezeTimestamp shouldn't be 0
    4.✔proxyContractAddress shouldn't be 0
    5.✔UKG_FUND should have 800M UKG
    6.✔this contract should have 200M UKG
     */

    it("Should not allow ukgDepositAddress to be initialized to 0", async function () {
        console.log('initialization - COMPLETE');
        let token = await TokenDistribution.deployed();
        const addr = await token.ukgDepositAddr.call();
        assert.notEqual(addr, 0, "ukgDepositAddr was not initialized.");
    });

    it("Should not allow distributionStartTimestamp to be initialized to 0", async function () {
        let token = await TokenDistribution.deployed();
        const addr = await token.distributionStartTimestamp.call();
        assert.notEqual(addr, 0, "distributionStartTimestamp was not initialized.");
    });

    it("Should not allow freezeTimestamp to be initialized to 0", async function () {
        let token = await TokenDistribution.deployed();
        const addr = await token.freezeTimestamp.call();

        assert.notEqual(addr.valueOf(), 0, "freezeTimestamp was not initialized.");
    });

    it("Should not allow proxyContractAddress to be initialized to 0", async function () {
        let token = await TokenDistribution.deployed();
        const addr = await token.proxyContractAddress.call();
        assert.notEqual(addr, accounts[0], "proxyContractAddress was not initialized.");
    });

    it("Should initiate Unikrn account with 800M UKG", async function() {
        let token = await TokenDistribution.deployed();
        const balance = await token.balanceOf.call(accounts[0]);
        assert.equal(balance.valueOf(), 800 * 10**6 * 10**EXP18, "800M UKG wasn't in the first account.");
    });

    it("Should initiate the contract with 200M UKG", async function() {
        let token = await TokenDistribution.deployed();
        const balance = await token.balanceOf.call(token.address);
        assert.equal(balance.valueOf(), 200 * 10**6 * 10**EXP18, "800M UKG wasn't in the first account.");
    });

    /////////////////////
    // claimSaleToken //
    ///////////////////
    /*
    1. Should not work if sale is cancelled
    2. Should not work if distribution hasn't started
    3. Should not work if tokens are all distributed
    4. Should not work if user has already collected funds
    5. Should not work if all 135M tokens have been distributed
    6. numSaleTokensDistributed should update with user's allocation
    6. Should distribute tokens to the user
     */

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
    // it("Should not allow distributionStartTimestamp to be initialized to 0", function() {
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
    1. Should return current block.timestamp
     */
    it("Should return the current timestamp", async function() {
        console.log('time - COMPLETE');
        let token = await TokenDistribution.deployed();
        const time = await token.time.call();
        assert.equal(time.valueOf(), curr_time, "Not the right time.");
    });

    ///////////////////
    // currentPhase //
    /////////////////
    /*
    1.✔Should return which phase the contract is in
     */

    it("Should return phase 0 upon contract deployment", async function() {
        console.log('currentPhase - COMPLETE');
        let token = await TokenDistribution.deployed();
        const phase = await token.currentPhase.call();
        assert.equal(phase.valueOf(), 0, "Not the right phase.");
    });

    //////////
    // min //
    ////////
    /*
    1.✔Should return the minimum of two inputs
     */
    describe("minimums", () => {
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
    1. Should not work if distirbution is canceled
    2. Should not work if the distribution has not started
    3. Should not work if there are no more presale tokens available
    4. Should never loop more than 10 times
    5. i should never be > 10
     */


    ///////////////
    // fallback //
    /////////////
    /*
    1. Should throw upon call
     */

    /////////////////
    // cancelDist //
    ///////////////
    /*
    1.✔Should only be called by the owner
    2.✔Should not be callable if the contract is frozen
    3.✔Should change cancelDistribution to `true` if executed correctly
     */

    it("Should throw if not called by the owner", async function() {
        console.log('cancelDist');
        let token = await TokenDistribution.deployed();
        await token;
        try {
            await token.cancelDist({from:accounts[1]});
        } catch (e) {
            return true;
        }
        assert.fail("The function executed when it should not have.")
    });


    it("Should change cancelDistribution to true if executed correctly", async function() {
        let token = await TokenDistribution.deployed();
        await token.cancelDist({from:accounts[0]});
        let cancel_var = await token.cancelDistribution.call();
        assert.equal(cancel_var.valueOf(), true, "Did not go through.");
    });


    // describe('change time', async function() {
    //     beforeEach(async () => {
    //         let unix_time = await (timeTravel(86400 * 3)); //3 days later
    //         let short_time = await Math.floor(unix_time.id / 1000);
    //     });
    //     it("Should not be callable if the contract is frozen", async function() {
    //         let token = await TokenDistribution.deployed();
    //         try {
    //             await token.cancelDist.call({from:accounts[0]});
    //         } catch (e) {
    //             return true;
    //         }
    //         throw new Error("The function executed when it should not have.")
    //     });
    // });


    it("Should not be callable if the contract is frozen", async function() {
        let token = await TokenDistribution.deployed();
        await increaseTime(YEAR); // 1 year later
        await mineBlock();
        try {
            await token.cancelDist.call({from:accounts[0]});
        } catch (e) {
            return true;
        }
        throw new Error("The function executed when it should not have.")
    });


});


