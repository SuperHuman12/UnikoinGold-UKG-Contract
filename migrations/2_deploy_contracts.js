var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");
var UnikoinGold = artifacts.require("./UnikoinGold.sol");

now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const PROXY_ADDRESS = web3.eth.coinbase;
const UKG_FUND =  web3.eth.coinbase;

module.exports = function(deployer, network, accounts) {

    if (network == 'mainproxy') {
        deployer.deploy(ParticipantAdditionProxy);
    }

    if (network == 'maindistribution') {
        deployer.deploy(TokenDistribution, PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY)).then(function() {
            return deployer.deploy(UnikoinGold, TokenDistribution.address, UKG_FUND);
        });
    }
};
