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
    it("Should not allow ukgDepositAddress to be initialized to 0", function() {
        console.log('initialization');
        return TokenDistribution.deployed().then(function(instance) {
           ukgDepositAddr = instance.ukgDepositAddr.call(function(err, res){
               document.getElementById('amt').innerText = res;
           });
           return ukgDepositAddr
       }).then(function(num) {
               assert.notEqual(num.valueOf(), 0, "ukgDepositAddress was not initialized");
       });
    });

    it("Should not allow distributionStartTimestamp to be initialized to 0", function() {
        return TokenDistribution.deployed().then(function(instance) {
            distributionStartTimestamp = instance.distributionStartTimestamp.call(function(err, res){
                document.getElementById('amt').innerText = res;
            });
            return distributionStartTimestamp
        }).then(function(num) {
            assert.notEqual(num.valueOf(), 0, "distributionStartTimestamp was not initialized");
        });
    });

    it("Should not allow freezeTimestamp to be initialized to 0", function() {
        return TokenDistribution.deployed().then(function(instance) {
            freezeTimestamp = instance.freezeTimestamp.call(function(err, res){
                document.getElementById('amt').innerText = res;
            });
            return freezeTimestamp
        }).then(function(num) {
            assert.notEqual(num.valueOf(), 0, "freezeTimestamp was not initialized");
        });
    });

    it("Should not allow proxyContractAddress to be initialized to 0", function() {
        return TokenDistribution.deployed().then(function(instance) {
            proxyContractAddress = instance.proxyContractAddress.call(function(err, res){
                document.getElementById('amt').innerText = res;
            });
            return proxyContractAddress
        }).then(function(num) {
            assert.notEqual(num.valueOf(), 0, "proxyContractAddress was not initialized");
        });
    });

    it("Should initiate Unikrn account with 800M UKG", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.balanceOf.call(accounts[0]);
        }).then(function(balance) {
            assert.equal(balance.valueOf(), 800 * 10**6 * 10**EXP18, "10000 wasn't in the first account");
        });
    });

    // TODO: Figure out how to get current contract address
    it("Should initiate current contract with 200M UKG", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.address;
        }).then(function(addr) {
            assert.notEqual(addr, 0, "10000 wasn't in the first account");
        });
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

    ///////////
    // time //
    /////////
    /*
    1.✔Should return current block.timestamp
     */
    it("Should return the current timestamp", function() {
        console.log('time');
        return TokenDistribution.deployed().then(function(instance) {
            return instance.time.call();
        }).then(function(time) {
            assert.equal(time.valueOf(), curr_time, "Not the right time.");
        });
    });

    ///////////////////
    // currentPhase //
    /////////////////
    /*
    1.✔Should return which phase the contract is in
     */
    it("Should return phase 0 upon contract deployment", function() {
        console.log('currentPhase');
        return TokenDistribution.deployed().then(function(instance) {
            return instance.currentPhase.call();
        }).then(function(curr_phase) {
            assert.equal(curr_phase.valueOf(), 0, "Not the right phase.");
        });
    });

    //////////
    // min //
    ////////
    /*
    1.✔Should return the minimum of two inputs
     */
    it("Should return minimum of two inputs", function() {
        console.log('min');
        const small_num = 50;
        const large_num = 100;
        return TokenDistribution.deployed().then(function(instance) {
            return instance.min.call(small_num, large_num);
        }).then(function(minimum) {
            assert.equal(minimum.valueOf(), small_num, "Not the minimum.");
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
    it("Should return phase 0, as this is upon contract creation", function() {
        console.log('whichPhase');
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });
    });

    it("Should return phase 0 on day 9 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 9 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 0, "Not the right phase");
        });
    });

    it("Should return phase 1 on day 9 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 9 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });
    });

    it("Should return phase 1 on day 18 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 18 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 1, "Not the right phase");
        });
    });

    it("Should return phase 2 on day 18 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 18 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });
    });

    it("Should return phase 2 on day 27 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 27 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 2, "Not the right phase");
        });
    });

    it("Should return phase 3 on day 27 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 27 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });
    });

    it("Should return phase 3 on day 36 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 36 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 3, "Not the right phase");
        });
    });

    it("Should return phase 4 on day 36 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 36 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });
    });

    it("Should return phase 4 on day 45 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 45 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 4, "Not the right phase");
        });
    });

    it("Should return phase 5 on day 45 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 45 * DAY +  HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });
    });

    it("Should return phase 5 on day 54 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 54 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 5, "Not the right phase");
        });
    });

    it("Should return phase 6 on day 54 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 54 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });
    });

    it("Should return phase 6 on day 63 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 63 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 6, "Not the right phase");
        });
    });

    it("Should return phase 7 on day 63 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 63 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });
    });

    it("Should return phase 7 on day 72 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 72 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 7, "Not the right phase");
        });
    });

    it("Should return phase 8 on day 72 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 72 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });
    });

    it("Should return phase 8 on day 81 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 81 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 8, "Not the right phase");
        });
    });

    it("Should return phase 9 on day 81 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 81 * DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });
    });

    it("Should return phase 9 on day 90 - 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 90 * DAY - HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 9, "Not the right phase");
        });
    });

    it("Should return phase 10 on day 90 + 1 hour", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + 90* DAY + HOUR);
        }).then(function(phase) {
            assert.equal(phase.valueOf(), 10, "Not the right phase");
        });
    });

    it("Should return phase 10, as the function returns 10 at any point after 90 days", function() {
        return TokenDistribution.deployed().then(function(instance) {
            return instance.whichPhase.call(curr_time + YEAR);
        }).then(function(phase) {
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
    10.Should add the modulo to the allocation on the first phase
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

    /////////////////////////
    // cancelDistribution //
    ///////////////////////
    /*
    1. Should only be called by the owner
    2. Should not be called if the contract is frozen
     */

    ///////////////
    // fallback //
    /////////////
    /*
    1. Should throw upon call
     */

});

