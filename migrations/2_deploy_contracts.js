var SafeMath = artifacts.require("./SafeMath.sol");
var Ownable = artifacts.require("./Ownable.sol");
var BasicToken = artifacts.require("./BasicToken.sol");
var StandardToken = artifacts.require("./StandardToken.sol");
var ParticipantAddition = artifacts.require("./ParticipantAddition.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

var curr_time = Math.floor(new Date().getTime() / 1000);

module.exports = function(deployer, network, accounts) {
    deployer.deploy(SafeMath);
    deployer.deploy(Ownable);
    deployer.deploy(BasicToken);
    deployer.deploy(StandardToken);

    deployer.link(SafeMath, ParticipantAddition);
    deployer.deploy(ParticipantAddition);

    deployer.link(SafeMath, TokenDistribution);
    deployer.deploy(TokenDistribution, accounts[0], accounts[1], curr_time + 60, curr_time + 120);
};
