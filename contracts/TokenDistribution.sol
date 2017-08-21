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

contract ParticipantAdditionProxy {
    function balanceOfPresaleParticipants(address _owner) constant returns (uint256 balance) {}
    function balanceOfSaleParticipants(address _owner) constant returns (uint256 balance) {}
}

contract TokenDistribution is Ownable, StandardToken {
    using SafeMath for uint;

    // Constants
    uint256 public constant EXP_18 = 18;                                               // Used to convert Wei to ETH
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 65 * (10**6) * 10**EXP_18;  // 65M tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 135 * (10**6) * 10**EXP_18;    // 135M tokens distributed after sale distribution
    uint256 public constant ZYZ_FUND = 800 * (10**6) * 10**EXP_18;                     // 800M ZYZ reserved for Zyzz use
    uint256 public constant TOKEN_CREATION_CAP =  1 * (10**9) * 10**EXP_18;            // 1B tokens created


    // Secure wallets
    address public zyzDepositAddr;                   // Deposit address for ZYZ for Zyzz

    // Parameters
    bool    public onHold;                           // Place on hold if something goes awry
    bool    public distributionFinalized;            // Denotes state of distribution

    uint256 public numPresaleTokensDistributed;      // Number of presale tokens that have been distributed
    uint256 public numSaleTokensDistributed;         // Number of sale tokens that have been distributed
    uint256 public totalTokenSupply;                 // Total supply of tokens distributed so far
    uint256 public saleUserAdditionIterator;         // Used to iterate through the addition of sale users
    uint256 public presaleUserAdditionIterator;      // Used to iterate through the addition of presale users
    uint256 public presaleAllocationTokenCount;      // Token count after presale allocation. Used to avoid assigning >1BN tokens
    address public proxyContractAddress;             // Address of contract holding participant data

    // Timing
    uint256 public lockupDistributionStartTimestamp; // Block timestamp to start the lockup distribution counter
    uint256 public distributionOverTimestamp;        // Distribution phase ends 4 months after the completion of the sale

    // Events
    event CreateZYZEvent(address indexed _to, uint256 _value);    // Logs the creation of the token
    event LogClaimEvent(uint phase, address user, uint amount);   // Logs the user claiming their tokens

    // Mapping
    mapping (address => uint256) public presaleParticipantAllowedAllocation;    // Presale participant able to claim tokens
    mapping (address => uint256) public allocationPerPhase;                     // Presale participant allocation per phase
    mapping (address => uint256) public remainingAllowance;                     // Amount of tokens presale participant has left to claim
    mapping (address => bool) public saleParticipantCollected;                  // Sale user has collected all funds bool
    mapping (uint => mapping (address => bool))  public  claimed;               // Sets status of claim for presale participant


    address[] public approvedSaleUsers;
    uint256[] public approvedSaleUsersAllocation;

    // Modifiers
    modifier notHeld {
        require(!onHold);
        _;
    }

    modifier presaleTokensStillAvailable {
        require(numPresaleTokensDistributed < PRESALE_TOKEN_ALLOCATION_CAP);
        _;
    }

    modifier saleTokensStillAvailable {
        require(numSaleTokensDistributed < SALE_TOKEN_ALLOCATION_CAP);
        _;
    }

    modifier totalTokensStillAvailable {
        require(totalTokenSupply < TOKEN_CREATION_CAP);
        _;
    }

    modifier distributionOver {
        require(distributionFinalized);
        _;
    }
    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _zyzDepositAddr Address to deposit pre-allocated ZYZ
    /// @param _lockupDistributionStartTimestamp Start time of the lockup phases
    /// @param _distributionOverTimestamp End time of the distribution
    /// @param _proxyContractAddress Address of contract holding participant data
    function TokenDistribution(address _zyzDepositAddr, uint256 _lockupDistributionStartTimestamp, uint256 _distributionOverTimestamp, address _proxyContractAddress)
    {
        require(_zyzDepositAddr != 0);                     // Force this value not to be initialized to 0
        require(_lockupDistributionStartTimestamp != 0);   // Force this value not to be initialized to 0
        require(_distributionOverTimestamp != 0);          //    i.e. - bad deploy
        require(_proxyContractAddress != 0);               // Proxy contract must be defined

        onHold = false;                                    // Shut down if something goes awry
        distributionFinalized = false;                     // Denotes the end of the distribution phase
        numPresaleTokensDistributed = 0;                    // No presale tokens distributed initially
        numSaleTokensDistributed = 0;                       // No sale tokens distributed initially
        saleUserAdditionIterator = 0;                      // Sale user iterator initialized at 0
        presaleUserAdditionIterator = 0;                   // Presale user iterator initialized at 0
        proxyContractAddress = _proxyContractAddress;      // Address of contract holding participant data
        presaleAllocationTokenCount = 0;                   // No presale tokens accounted for upon contract creation
        zyzDepositAddr = _zyzDepositAddr;                  // Deposit address for ZYZ for Zyzz
        lockupDistributionStartTimestamp = _lockupDistributionStartTimestamp;
        distributionOverTimestamp = _distributionOverTimestamp;
        totalTokenSupply = ZYZ_FUND;                       // Total supply of ZYZ distributed so far, initialized with total supply amount
        balances[zyzDepositAddr] = ZYZ_FUND;               // Deposit Zyzz funds that are preallocated to the Zyzz team
        CreateZYZEvent(zyzDepositAddr, ZYZ_FUND);          // Logs Zyzz fund
    }

    /// @dev allows user to collect their sale funds.
    function distrubuteSaleTokensProxy()
    notHeld
    saleTokensStillAvailable
    totalTokensStillAvailable
    {
        require(saleParticipantCollected[msg.sender]); // Participant's funds cannot have been collected already

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.balanceOfSaleParticipants(msg.sender);  // Number of tokens to receive
        uint256 tempSaleTotalSupply  = numSaleTokensDistributed.add(currentParticipantAmt);     // Temp number of sale tokens distributed
        uint256 tempTotalTokenSupply = totalTokenSupply.add(currentParticipantAmt);             // Temp number of total tokens distributed

        require(tempSaleTotalSupply <= SALE_TOKEN_ALLOCATION_CAP); // Cannot allocate > 135M tokens for sale
        require(tempTotalTokenSupply <= TOKEN_CREATION_CAP);       // Cannot allocate > 1B tokens total

        numSaleTokensDistributed += currentParticipantAmt;  // Add to sale total token collection
        totalTokenSupply += currentParticipantAmt;          // Add to total token collection
        saleParticipantCollected[msg.sender] = true;        // User cannot collect tokens again

        balances[msg.sender] = currentParticipantAmt;      // Distributes tokens to participant
        CreateZYZEvent(msg.sender, currentParticipantAmt); // Logs Unikrn fund
    }

    /// @dev Returns block timestamp. Function needed for testing.
    function time() constant returns (uint) {
        return block.timestamp;
    }

    /// @dev Returns phase number of the distrbution
    function currentPhase() constant returns (uint) {
        return whichPhase(time());
    }

    /// @dev Returns the current period the distribution is on. Will be 1-10. Updates every 9 days
    function whichPhase(uint timestamp) constant returns (uint) {
        // if the time is less than the start time, return 0. or else return the new time.
        return timestamp < lockupDistributionStartTimestamp
        ? 0
        : timestamp.sub(lockupDistributionStartTimestamp) / 9 days + 1;
    }

    /// @dev Presale participants call this to claim their tokens.
    /// @param phase Defines which phase of the sale being collected for
    function claimTokens(uint phase) internal {
        require(currentPhase() >= phase);

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        // If a participant has never called the function before, assign their allocations accordingly
        if (!claimed[1][msg.sender]) {
            presaleParticipantAllowedAllocation[msg.sender] = participantData.balanceOfPresaleParticipants(msg.sender); // Total allowed tokens. Used for division
            allocationPerPhase[msg.sender] = presaleParticipantAllowedAllocation[msg.sender].div(10);      // Calculates how many tokens collectible per phase
            remainingAllowance[msg.sender] = presaleParticipantAllowedAllocation[msg.sender];  // Number of tokens to receive
        }

        if (claimed[phase][msg.sender] || remainingAllowance[msg.sender] == 0) {
            return;
        }

        // Minimum contribution allowed will keep this out of float/double
        claimed[phase][msg.sender] = true;                  // User cannot participate in this phase again
        remainingAllowance[msg.sender] -= allocationPerPhase[msg.sender];  // Subtract the claimed tokens from the remaining allocation

        totalTokenSupply += allocationPerPhase[msg.sender];                // Add to the total number of presale tokens distributed
        balances[msg.sender] += allocationPerPhase[msg.sender];             // Distribute tokens to user
        LogClaimEvent(phase, msg.sender, allocationPerPhase[msg.sender]);  // Logs the user claiming their tokens
    }

    /// @dev Called to iterate through phases and distribute tokens
    /// @notice Phase 1 begins when the distribution phase ends. Users receive their first funds at the start of phase 2
    /// @notice and their last at the start of phase 11
    function claim() external
    notHeld
    presaleTokensStillAvailable
    totalTokensStillAvailable
    {
        for (uint i = 2; i <= currentPhase(); i++) {
            require(i <= 11);   // Max of 10 phases. Used to stop from infinitely looping through
            claimTokens(i);     // Calls claim function
        }
    }

    /// @dev Send out remaining sale tokens that have not been collected
    /// @param saleParticipantAddress The address of the sale participant who has not collected funds
    function finishSaleDistribution(address saleParticipantAddress)
    onlyOwner
    notHeld
    saleTokensStillAvailable
    totalTokensStillAvailable
    distributionOver
    {
        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);
        uint256 currentParticipantAmt = participantData.balanceOfSaleParticipants(msg.sender);      // Number of tokens available for the participant

        require(currentParticipantAmt != 0);    // User cannot have collected nor have not participated in sale

        // ***NEED += in the event they got some tokens outside the contract. Need to check if += works w/ balance.
        balances[saleParticipantAddress] += currentParticipantAmt;  // Send funds to the participant
        CreateZYZEvent(saleParticipantAddress, currentParticipantAmt); // Logs Unikrn fund
    }

    /// @dev Send all remaining tokens to Zyzz to be distributed to the appropriate users
    function finishPreDistribution()
    onlyOwner
    notHeld
    presaleTokensStillAvailable
    totalTokensStillAvailable
    distributionOver
    {
        uint256 remainingTokens = TOKEN_CREATION_CAP.sub(totalTokenSupply);   // The remaining tokens are calculated
        // ***NEED += in the event they got some tokens outside the contract. Need to check if += works w/ balance.
        balances[zyzDepositAddr] += remainingTokens;                         // Deposit remaining funds to Zyzz team
        CreateZYZEvent(zyzDepositAddr, remainingTokens);
    }

    function () {
        revert();
    }

    /*
     * Owner-only functions
     */

    /// @dev Halts sale
    function toggleHold() external
    onlyOwner
    {
        onHold = !onHold;
    }

    /// @dev Changes distribution end timestamp
    /// @param _newTime Timestamp to change the distribution phase end
    function changeDistributionEndBlock(uint _newTime)
    onlyOwner
    notHeld
    {
        require(_newTime != 0);

        distributionOverTimestamp = _newTime;
    }

    /*
     * The following function(s) define the states of the contract
     */

    function distributionComplete() external
    onlyOwner
    {
        require(block.timestamp > distributionOverTimestamp);
        distributionFinalized = true;
    }
}
