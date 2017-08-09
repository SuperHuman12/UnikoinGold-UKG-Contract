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
    uint256 public distributionStartBlock;      // Begining of the distribution
    uint256 public lockupDistributionStartTime; // Block time to start the lockup distribution counter
    uint256 public totalTokenSupply;            // Total supply of tokens distributed so far
    uint256 public distributionPhaseOverTime;   // Distribution phase ends 4 months after the completion of the sale

    // Events
    event CreateUKG(address indexed _to, uint256 _value);      // Logs the creation of the token
    event LogClaim(uint phase, address user, uint amount);     // Logs the user claiming their tokens

    // Mapping
    mapping (address => uint256) public ukgAllocation;            // UKG allocation per user
    mapping (address => uint256) public userAllowedAllocation;    // User able to claim tokens
    mapping (address => uint256) public remainingAllowance;       // Amount of tokens user has left to claim
    mapping (uint => mapping (address => bool))  public  claimed; // Sets status of claim

    // Modifiers
    modifier notHeld {
        require(!onHold);
        _;
    }

    modifier distributionOver {
        require(distributionFinalized);
        _;
    }

    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _ukgDepositAddr Address to deposit pre-allocated UKG
    /// @param _distributionStartBlock Starting block for the distribution period
    function TokenDistribution(address _ukgDepositAddr, uint256 _distributionStartBlock, uint256 _lockupDistributionStartTime, uint256 _distributionPhaseOverTime)
    {
        onHold = false;                                    // Shut down if something goes awry
        distributionFinalized = false;                     // Denotes the end of the distribution phase
        ukgDepositAddr = _ukgDepositAddr;                  // Deposit address for UKG for Unikrn
        distributionStartBlock = _distributionStartBlock;  // Distribution start block
        lockupDistributionStartTime = _lockupDistributionStartTime;
        distributionPhaseOverTime = _distributionPhaseOverTime;
        totalTokenSupply = UKG_FUND;                       // Total supply of UKG distributed so far, initialized with total supply amount
        ukgAllocation[ukgDepositAddr] = UKG_FUND;          // Deposit Unikrn funds that are preallocated to the Unikrn team
        CreateUKG(ukgDepositAddr, UKG_FUND);               // Logs Unikrn fund
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedSaleUsers Array of users
    /// @param approvedSaleUsersAllocation Array of users' allocation
    function distrubuteSaleTokens(address[] approvedSaleUsers, uint256[] approvedSaleUsersAllocation)
    onlyOwner
    notHeld
    {
        require(block.number < distributionStartBlock);   // Addresses must be input prior to distribution

        for (uint i = 0; i < approvedSaleUsers.length; i++) {
            ukgAllocation[approvedSaleUsers[i]] = approvedSaleUsersAllocation[i];
        }
    }

    /// @dev Allocates tokens to presale participants
    /// @param approvedPresaleContributors Array of users
    /// @param approvedPresaleContributorsAllocation Array of users' allocation
    function addPresaleContributors(address[] approvedPresaleContributors, uint256[] approvedPresaleContributorsAllocation)
    onlyOwner
    notHeld
    {
        require(block.number < distributionStartBlock);   // Addresses must be input prior to distribution

        for (uint i = 0; i < approvedPresaleContributors.length; i++) {
            userAllowedAllocation[approvedPresaleContributors[i]] = approvedPresaleContributorsAllocation[i];
            remainingAllowance[approvedPresaleContributors[i]] = approvedPresaleContributorsAllocation[i];
        }
    }

    /// @dev Returns block timestamp
    function time() constant returns (uint) {
        return block.timestamp;
    }

    /// @dev Returns phase number of the distrbution
    function currentPhase() constant returns (uint) {
        return whichPhase(time());
    }

    /// @dev Returns the current period the distribution is on. Will be 1-10. UPdates every 9 days
    function whichPhase(uint timestamp) constant returns (uint) {
        // if the time is less than the start time, return 0. or else return the new time.
        return timestamp < lockupDistributionStartTime
        ? 0
        : timestamp.sub(lockupDistributionStartTime) / 9 days + 1;
    }

    /// @dev Presale participants call this to claim their tokens.
    /// @param phase Defines which phase of the sale being collected for
    function claimTokens(uint phase)
    internal
    {
        require(currentPhase() >= phase);

        if (claimed[phase][msg.sender] || remainingAllowance[msg.sender] == 0) {
            return;
        }

        uint256 phaseAllocation = userAllowedAllocation[msg.sender].div(10);    // Calculates how many tokens per phase
        // Minimum contribution allowed will keep this out of float/double
        claimed[phase][msg.sender] = true;                  // User cannot participate in this phase again
        remainingAllowance[msg.sender] -= phaseAllocation;  // Subtract the claimed tokens from the remaining allocation

        totalTokenSupply += phaseAllocation;   // Add to the total number of presale tokens distributed
        ukgAllocation[msg.sender] = phaseAllocation;        // Distribute tokens to user
        LogClaim(phase, msg.sender, phaseAllocation);       // Logs the user claiming their tokens

    }

    /// @dev Called to iterate through phases and distribute tokens
    function claim() {
        for (uint i = 0; i < currentPhase(); i++) {
            claimTokens(i);
        }
    }

    /// @dev Send remaining tokens to Unikrn to be distributed to the appropriate users
    function finishDistribution()
    onlyOwner
    distributionOver
    {
        require(totalTokenSupply < TOKEN_CREATION_CAP);    // If all tokens havent been distributed, throw

        uint256 remainingTokens = TOKEN_CREATION_CAP - totalTokenSupply;    // The remaining tokens are calculated
        ukgAllocation[ukgDepositAddr] = remainingTokens;                    // Deposit remaining funds to Unikrn team
        CreateUKG(ukgDepositAddr, remainingTokens);
    }

    function () {
        revert();
    }


    /*
     * Owner-only functions
     */

    /// @dev Halts sale
    function toggleHold()
    external
    onlyOwner
    {
        onHold = !onHold;
    }

    function endDistribution()
    external
    onlyOwner
    {
        require(block.timestamp > distributionPhaseOverTime);
        distributionFinalized = true;
    }

}
