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
    function balanceOfPresaleParticipants(address) constant returns (uint256) {}
    function balanceOfSaleParticipants(address) constant returns (uint256) {}
}

contract TokenDistribution is Ownable, StandardToken {
    using SafeMath for uint;

    // Constants
    uint256 public constant EXP_18 = 18;                                               // Used to convert Wei to ETH
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 65 * (10**6) * 10**EXP_18;  // 65M tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 135 * (10**6) * 10**EXP_18;    // 135M tokens distributed after sale distribution
    uint256 public constant UKG_FUND = 800 * (10**6) * 10**EXP_18;                     // 800M UKG reserved for Unikrn use
    uint256 public constant TOKEN_CREATION_CAP =  1 * (10**9) * 10**EXP_18;            // 1B tokens created


    // Secure wallets
    address public ukgDepositAddr;                   // Deposit address for UKG for Unikrn

    // Parameters
    bool    public onHold;                           // Place on hold if something goes awry
    bool    public distributionFinalized;            // Denotes state of distribution
    uint256 public numPresaleTokensDistributed;      // Number of presale tokens that have been distributed
    uint256 public numSaleTokensDistributed;         // Number of sale tokens that have been distributed
    uint256 public totalTokenSupply;                 // Total supply of tokens distributed so far
    address public proxyContractAddress;             // Address of contract holding participant data

    // Timing
    uint256 public distributionStartTimestamp;       // Time to begin distribution
    uint256 public lockupDistributionStartTimestamp; // Block timestamp to start the lockup distribution counter
    uint256 public distributionOverTimestamp;        // Distribution phase ends 4 months after the completion of the sale

    // Events
    event CreateUKGEvent(address indexed _to, uint256 _value);    // Logs the creation of the token
    event LogClaimEvent(uint phase, address user, uint amount);   // Logs the user claiming their tokens

    // Mapping
    mapping (address => uint256) public presaleParticipantAllowedAllocation;    // Presale participant able to claim tokens
    mapping (address => uint256) public allocationPerPhase;                     // Presale participant allocation per phase
    mapping (address => uint256) public remainingAllowance;                     // Amount of tokens presale participant has left to claim
    mapping (address => bool) public saleParticipantCollected;                  // Sale user has collected all funds bool
    mapping (uint => mapping (address => bool))  public  claimed;               // Sets status of claim for presale participant

    // Modifiers
    modifier notHeld {
        require(!onHold);
        _;
    }

    modifier distributionStarted {
        require(distributionStartTimestamp < block.timestamp);
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
    /// @param _ukgDepositAddr Address to deposit pre-allocated UKG
    /// @param _distributionStartTimestamp Timestamp to begin the distribution phase
    /// @param _lockupDistributionStartTimestamp Start time of the lockup phases
    /// @param _distributionOverTimestamp End time of the distribution
    /// @param _proxyContractAddress Address of contract holding participant data
    function TokenDistribution(address _ukgDepositAddr, uint256 _distributionStartTimestamp, uint256 _lockupDistributionStartTimestamp, uint256 _distributionOverTimestamp, address _proxyContractAddress)
    {
        require(_ukgDepositAddr != 0);                     // Force this value not to be initialized to 0
        require(_lockupDistributionStartTimestamp != 0);   // Force this value not to be initialized to 0
        require(_distributionOverTimestamp != 0);          //    i.e. - bad deploy
        require(_proxyContractAddress != 0);               // Proxy contract must be defined

        onHold = false;                                    // Shut down if something goes awry
        distributionFinalized = false;                     // Denotes the end of the distribution phase
        numPresaleTokensDistributed = 0;                   // No presale tokens distributed initially
        numSaleTokensDistributed = 0;                      // No sale tokens distributed initially
        proxyContractAddress = _proxyContractAddress;      // Address of contract holding participant data
        ukgDepositAddr = _ukgDepositAddr;                  // Deposit address for UKG for Unikrn
        distributionStartTimestamp = _distributionStartTimestamp;
        lockupDistributionStartTimestamp = _lockupDistributionStartTimestamp;
        distributionOverTimestamp = _distributionOverTimestamp;
        totalTokenSupply = UKG_FUND;                       // Total supply of UKG distributed so far, initialized with total supply amount
        balances[ukgDepositAddr] = UKG_FUND;               // Deposit Unikrn funds that are preallocated to the Unikrn team
        CreateUKGEvent(ukgDepositAddr, UKG_FUND);          // Logs Unikrn fund
    }

    /// @dev allows user to collect their sale funds.
    function distrubuteSaleTokens()
    notHeld
    distributionStarted
    saleTokensStillAvailable
    totalTokensStillAvailable
    {
        require(!saleParticipantCollected[msg.sender]); // Participant's funds cannot have been collected already

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.balanceOfSaleParticipants(msg.sender);  // Number of tokens to receive
        uint256 tempSaleTotalSupply  = numSaleTokensDistributed.add(currentParticipantAmt);     // Temp number of sale tokens distributed
        uint256 tempTotalTokenSupply = totalTokenSupply.add(currentParticipantAmt);             // Temp number of total tokens distributed

        require(tempSaleTotalSupply <= SALE_TOKEN_ALLOCATION_CAP); // Cannot allocate > 135M tokens for sale
        require(tempTotalTokenSupply <= TOKEN_CREATION_CAP);       // Cannot allocate > 1B tokens total

        numSaleTokensDistributed += currentParticipantAmt;  // Add to sale total token collection
        totalTokenSupply += currentParticipantAmt;          // Add to total token collection
        saleParticipantCollected[msg.sender] = true;        // User cannot collect tokens again

        balances[msg.sender] += currentParticipantAmt;      // Distributes tokens to participant
        CreateUKGEvent(msg.sender, currentParticipantAmt);  // Logs Unikrn fund
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
    /// @param finishingAddress Address used to finish distribution of presale tokens
    /// @param finalizeDistribution Variable is true if called by contract creator
    function claimTokens(uint phase, address finishingAddress, bool finalizeDistribution) internal {
        require(currentPhase() >= phase);

        address participantAddress;    // Address to use throughout the claimTokens function

        // If the function is called by the participant, use msg.sender
        // If the function is called by the owner, use the passed in address
        if (!finalizeDistribution) {
            participantAddress = msg.sender;
        } else {
            participantAddress = finishingAddress;
        }

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        // If a participant has never called the function before, assign their allocations accordingly
        if (!claimed[1][participantAddress]) {
            presaleParticipantAllowedAllocation[participantAddress] = participantData.balanceOfPresaleParticipants(participantAddress); // Total allowed tokens. Used for division
            allocationPerPhase[participantAddress] = presaleParticipantAllowedAllocation[participantAddress].div(10);      // Calculates how many tokens collectible per phase
            remainingAllowance[participantAddress] = presaleParticipantAllowedAllocation[participantAddress];  // Number of tokens to receive
        }

        // If the participant has claimed for this phase, return
        if (claimed[phase][participantAddress] || remainingAllowance[participantAddress] == 0) {
            return;
        }

        claimed[phase][participantAddress] = true;                                         // User cannot participate in this phase again
        remainingAllowance[participantAddress] -= allocationPerPhase[participantAddress];  // Subtract the claimed tokens from the remaining allocation

        numPresaleTokensDistributed += allocationPerPhase[participantAddress];             // Add to the total number of presale tokens distributed
        totalTokenSupply += allocationPerPhase[participantAddress];                        // Add to the total number of tokens distributed
        balances[participantAddress] += allocationPerPhase[participantAddress];            // Distribute tokens to user
        LogClaimEvent(phase, participantAddress, allocationPerPhase[participantAddress]);  // Logs the user claiming their tokens
    }

    /// @dev Called to iterate through phases and distribute tokens
    /// @notice Phase 1 begins when the distribution phase ends. Users receive their first funds at the start of phase 2
    /// @notice and their last at the start of phase 11
    function claim() external
    notHeld
    distributionStarted
    presaleTokensStillAvailable
    totalTokensStillAvailable
    {
        for (uint i = 2; i <= currentPhase(); i++) {
            require(i <= 11);   // Max of 11 phases. Used to stop from infinitely looping through
            claimTokens(i, msg.sender, false);     // Calls claim function
        }
    }

    /// @dev Send all remaining tokens to Unikrn to be distributed to the appropriate users
    /// @param presaleParticipantAddress The address of the presale participants who has not collected funds
    function finishPreDistribution(address presaleParticipantAddress)
    onlyOwner
    notHeld
    presaleTokensStillAvailable
    totalTokensStillAvailable
    distributionOver
    {
        for (uint j = 2; j <= currentPhase(); j++) {
            require(j <= 11); // Max of 11 phases. Used to stop from infinitely looping through
            claimTokens(j, presaleParticipantAddress, true);    // Calls claim function
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

        balances[saleParticipantAddress] += currentParticipantAmt;     // Send funds to the participant
        CreateUKGEvent(saleParticipantAddress, currentParticipantAmt); // Logs Unikrn fund
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
    function changeDistributionStartTimestamp(uint _newTime)
    onlyOwner
    notHeld
    {
        require(_newTime != 0);

        distributionStartTimestamp = _newTime;
    }

    /// @dev Changes distribution end timestamp
    /// @param _newTime Timestamp to change the distribution phase end
    function changeDistributionEndTimestamp(uint _newTime)
    onlyOwner
    notHeld
    {
        require(_newTime != 0);

        distributionOverTimestamp = _newTime;
    }

    /// @dev Changes lockup distribution start timestamp
    /// @param _newTime Timestamp to change the lockup distribution start time
    function changelockupDistributionStartTimestamp(uint _newTime)
    onlyOwner
    notHeld
    {
        require(_newTime != 0);

        lockupDistributionStartTimestamp = _newTime;
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

