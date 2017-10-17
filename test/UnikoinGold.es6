var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");
var UnikoinGold = artifacts.require("./UnikoinGold.sol");

contract('UnikoinGold', function(accounts) {
    const MINUTE = 60;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    // Get block timestamp
    beforeEach(async () => {
        now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    });

    const ACCOUNT0 = accounts[0];
    const PROXY_ADDRESS = accounts[9];

    describe("initialization", () => {

        it("Should throw if either address is initalized incorrectly", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY));

            try {
                await UnikoinGold.new(0x0, ACCOUNT0);
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.");

            try {
                await UnikoinGold.new(distribution.address, 0x0);
            } catch (e) {
                return true;
            }
            assert.fail("The function executed when it should not have.");
        });


        it("Should send Unikrn 800M UKG", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY));
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);

            const myBal = await ukg.balanceOf(ACCOUNT0);

            assert.equal(myBal.valueOf(), 800 * (10**6) * 10**18, "800M UKG did not get initialized to Unikrn")
        });

        it("Should send the distribution contract 200M UKG", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY));
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);

            const myBal = await ukg.balanceOf(distribution.address);

            assert.equal(myBal.valueOf(), 200 * (10**6) * 10**18, "200M UKG did not get initialized to the distribution contract")
        });

        it("Should create 1 Billion total tokens", async () => {
            const distribution = await TokenDistribution.new(PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY));
            const ukg = await UnikoinGold.new(distribution.address, ACCOUNT0);

            const total_bal = await ukg.totalSupply.call();

            assert.equal(total_bal.valueOf(), 1000 * (10**6) * 10**18, "Nope")
        });
    });
});
