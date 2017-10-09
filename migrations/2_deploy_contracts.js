var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;

const OWNER = web3.eth.coinbase;
const PROXY_ADDRESS = '0x988eE09bdd9b110C08103159610ef1f01319eAFF';

module.exports = function(deployer, network, accounts) {
    if (network == 'kovanproxy') {
        deployer.deploy(ParticipantAdditionProxy);
    }

    if (network == 'kovandistribution') {
        deployer.deploy(TokenDistribution, OWNER, PROXY_ADDRESS, now + (2 * DAY), now + (5 * DAY), now + (3 * YEAR));
    }
};
