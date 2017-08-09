var SafeMath = artifacts.require("./SafeMath.sol");
var Ownable = artifacts.require("./Ownable.sol");
var Token = artifacts.require("./Token.sol");
var Distribution = artifacts.require("./Distribution.sol");
var BigNumber = require("bignumber.js");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(SafeMath);
    deployer.deploy(Ownable);
    deployer.deploy(Token);
    var params;
    if (network == "live") {
        // TODO: Add params for live script
    } else {
        // TODO: Add params for test script
    }
    deployer.link(SafeMath, Distribution);
    deployer.deploy(Distribution, accounts[0], new BigNumber(1), new BigNumber(100000));
};
