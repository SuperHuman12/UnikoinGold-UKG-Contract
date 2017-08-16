var SafeMath = artifacts.require("./SafeMath.sol");
var Ownable = artifacts.require("./Ownable.sol");

var BasicToken = artifacts.require("./BasicToken.sol");

var StandardToken = artifacts.require("./StandardToken.sol");
var TokenDistribution = artifacts.require("./TokenDistribution.sol");

var BigNumber = require("bignumber.js");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(SafeMath);
    deployer.deploy(Ownable);

    deployer.deploy(BasicToken);
    deployer.deploy(StandardToken);
    var params;
    if (network == "live") {
        // TODO: Add params for live script
    } else {
        // TODO: Add params for test script
    }
    deployer.link(SafeMath, TokenDistribution);
    deployer.deploy(TokenDistribution, accounts[0], new BigNumber(1), new BigNumber(100000));
};
