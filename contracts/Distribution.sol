pragma solidity ^0.4.11;

import {SafeMath} from './SafeMath.sol';
import {Ownable} from './Ownable.sol';
import {StandardToken} from './Token.sol';

/**
  * - Contracts
  *     - Create tokens
  *     - Distribute Tokens
  * - Functions
  *     - (Sale) Distribute tokens to users
  *     - (Presale) Load whitelist with allocations for each user and their sale period
  *     - (Presale) Distribute to presale/Unikrn
  *
  * Token Distribution
  *
  * Token Sale: 20%
  *
  * Team Pool: 10%
  *
  * Unikrn Betting Reserve: 15%
  * Marketing & Partnerships: 15%
  * Development & Contractors: 20%
  * Company Cold Storage: 20%
  *
  */

contract TokenDistribution is Ownable {
    using SafeMath for uint;

    // Metadata
    string  public constant name = "UnikoinGold";
    string  public constant symbol = "UKG";

    // Constants
    uint256 public constant EXP_18 = 18;                                          // Used to convert Wei to ETH
    uint256 public constant UKG_FUND = 700 * (10**6) * 10**EXP_18;                // 800M UKG reserved for Unikrn use
    uint256 public constant TOKEN_DIST_AMOUNT_SALE = 1 * (10**8) * 18**EXP_18;    // 100M tokens available from sale
    uint256 public constant TOKEN_DIST_AMOUNT_PRESALE = 1 * (10**8) * 18**EXP_18; // 100M tokens available from pressale
    uint256 public constant TOKEN_CREATION_CAP =  1 * (10**9);                    // 1B tokens created

    // Secure wallets
    address public ukgDepositAddr;              // Deposit address for UKG for Unikrn

    // Parameters
    bool    public onHold;                      // Place on hold if something goes awry
    bool    public distributionFinalized;       // Denotes state of distribution
    uint256 public distributionStartBlock;     // Begining of the distribution
    uint256 public totalTokenSupply;            // Total supply of tokens sold so far

    // events
    event CreateUKG(address indexed _to, uint256 _value);      // Logs the creation of the token

    // mapping
    mapping (address => uint256) public ukgAllocation;          // UKG allocation per user
    mapping (address => uint256) public userAllowedAllocation;  // User able to claim tokens
    mapping (address => bool)    public userClaimedFlag;        // Status of user claim. True if already claimed

    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _ukgDepositAddr Address to deposit pre-allocated UKG
    /// @param _distributionStartBlock Starting block for the distribution period
    function TokenDistribution(address _ukgDepositAddr, uint256 _distributionStartBlock)
    {
        onHold = false;                                    // Shut down if something goes awry
        ukgDepositAddr = _ukgDepositAddr;                  // Deposit address for UKG for Unikrn
        distributionStartBlock = _distributionStartBlock;  // Distribution start block
        totalTokenSupply = UKG_FUND;                       // Total supply of UKG distributed so far, initialized with total supply amount
        ukgAllocation[ukgDepositAddr] = UKG_FUND;          // Deposit Unikrn funds that are preallocated to the Unikrn team
        CreateUKG(ukgDepositAddr, UKG_FUND);               // Logs Unikrn fund
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedSaleUsers Array of users
    /// @param approvedSaleUsersAllocation Array of users' allocation
    function distrubuteSaleTokens(address[] approvedSaleUsers, uint256[] approvedSaleUsersAllocation) onlyOwner {
        require(!onHold);                                 // Contract must not be on hold
        require(block.number < distributionStartBlock);   // Addresses must be input prior to distribution

        for (uint i = 0; i < approvedSaleUsers.length; i++) {
            ukgAllocation[approvedSaleUsers[i]] = approvedSaleUsersAllocation[i];
        }
    }

    /// @dev Allocates tokens to presale participants
    /// @param approvedPresaleContributors Array of users
    /// @param approvedPresaleContributorsAllocation Array of users' allocation
    function addPresaleContributors(address[] approvedPresaleContributors, uint256[] approvedPresaleContributorsAllocation) onlyOwner {
        require(!onHold);                                 // Contract must not be on hold
        require(block.number < distributionStartBlock);   // Addresses must be input prior to distribution

        for (uint i = 0; i < approvedPresaleContributors.length; i++) {
            ukgAllocation[approvedPresaleContributors[i]] = approvedPresaleContributorsAllocation[i];
        }
    }

    /// @dev Presale participants call this to claim their tokens.
    function claimTokens() {}

    function () {
        revert();
    }

    /*
     * Owner-only, not-frozen functions
     */

    /// @dev Halts sale
    function toggleHold() external
    onlyOwner
    {
        onHold = !onHold;
    }

}
