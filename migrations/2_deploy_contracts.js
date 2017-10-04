var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

const OWNER = '0x00d6B2cC8B0963AF7eDA3815b4E798bC1B69B527';
const PROXY_ADDRESS = '0x57dd47E82548E535A60eb14EfC6611f64A80b899';

module.exports = function(deployer, network, accounts) {
    deployer.deploy(ParticipantAdditionProxy);
    deployer.deploy(TokenDistribution, OWNER, PROXY_ADDRESS, now, now + 300, now + 500);
};
