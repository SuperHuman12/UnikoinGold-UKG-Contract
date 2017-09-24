var SafeMath = artifacts.require("./SafeMath.sol");
var Ownable = artifacts.require("./Ownable.sol");
var BasicToken = artifacts.require("./BasicToken.sol");
var StandardToken = artifacts.require("./StandardToken.sol");
var ParticipantAdditionProxy = artifacts.require("./ParticipantAdditionProxy.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

now = web3.eth.getBlock(web3.eth.blockNumber).timestamp;

const OWNER = '0x00d6B2cC8B0963AF7eDA3815b4E798bC1B69B527';
const PROXY_ADDRESS = '0x57dd47E82548E535A60eb14EfC6611f64A80b899';

module.exports = function(deployer, network, accounts) {
    deployer.deploy(SafeMath);
    deployer.deploy(Ownable);
    deployer.deploy(BasicToken);
    deployer.deploy(StandardToken);

    deployer.link(SafeMath, ParticipantAdditionProxy);
    deployer.deploy(ParticipantAdditionProxy);

    deployer.link(SafeMath, TokenDistribution);
    deployer.deploy(TokenDistribution, OWNER, PROXY_ADDRESS, now, now+300, now + 500);
};
