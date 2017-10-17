pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';

contract UnikoinGold is StandardToken {

    // ERC20 Standard
    string public constant name = "UnikoinGold";
    string public constant symbol = "UKG";
    uint8 public constant decimals = 18;
    string public version = "0.9";

    uint256 public constant EXP_18 = 18;
    uint256 public constant TOTAL_COMMUNITY_ALLOCATION = 200 * (10**6) * 10**EXP_18;  // 200M tokens to be distributed to community
    uint256 public constant UKG_FUND = 800 * (10**6) * 10**EXP_18;                    // 800M UKG reserved for Unikrn use
    uint256 public constant TOTAL_TOKENS = 1000 * (10**6) * 10**EXP_18;               // 1 Billion total UKG created

    event CreateUKGEvent(address indexed _to, uint256 _value);  // Logs the creation of the token

    function UnikoinGold(address _tokenDistributionContract, address _ukgFund){
        require(_tokenDistributionContract != 0);  // Force this value not to be initialized to 0
        require(_ukgFund != 0);                    // Force this value not to be initialized to 0
        require(TOTAL_TOKENS == TOTAL_COMMUNITY_ALLOCATION.add(UKG_FUND));  // Check that there are 1 Billion tokens total

        totalSupply = TOTAL_COMMUNITY_ALLOCATION.add(UKG_FUND);  // Add to totalSupply for ERC20 compliance

        balances[_tokenDistributionContract] = TOTAL_COMMUNITY_ALLOCATION;       // Transfer tokens to the distribution contract
        Transfer(0x0, _tokenDistributionContract, TOTAL_COMMUNITY_ALLOCATION);   // Log the transfer
        CreateUKGEvent(_tokenDistributionContract, TOTAL_COMMUNITY_ALLOCATION);  // Log the event

        balances[_ukgFund] = UKG_FUND;       // Transfer tokens to the Unikrn Wallet
        Transfer(0x0, _ukgFund, UKG_FUND);   // Log the transfer
        CreateUKGEvent(_ukgFund, UKG_FUND);  // Log the event
    }
}
