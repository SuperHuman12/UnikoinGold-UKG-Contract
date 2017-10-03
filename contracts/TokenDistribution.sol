pragma solidity ^0.4.11;

import {SafeMath} from './SafeMath.sol';
import {Math} from './Math.sol';
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

contract ProxyContract {
    function balanceOfPresaleParticipants(address) constant returns (uint256) {}
    function balanceOfSaleParticipants(address) constant returns (uint256) {}
    function balanceOfLockedParticipants(address) constant returns (uint256) {}
}

contract TokenDistribution is Ownable, StandardToken {
    using SafeMath for uint;
    using Math for uint;

    // Constants
    uint256 public constant EXP_18 = 18;                                               // Used to convert Wei to ETH
    uint256 public constant PHASE_LENGTH = 9 days;                                     // Length of the phase
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 65 * (10**6) * 10**EXP_18;  // 65M tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 135 * (10**6) * 10**EXP_18;    // 135M tokens distributed after sale distribution
    uint256 public constant TOTAL_COMMUNITY_ALLOCATION = 200 * (10**6) * 10**EXP_18;   // 200M tokens to be distributed to community
    uint256 public constant LOCKED_TOKEN_ALLOCATION_CAP = 200 * (10**6) * 10**EXP_18;  // 200M tokens distributed after sale distribution
    uint256 public constant UKG_FUND = 600 * (10**6) * 10**EXP_18;                     // 600M UKG reserved for Unikrn use

    // Secure wallets
    address public ukgDepositAddr;                   // Deposit address for UKG for Unikrn

    // Parameters
    bool    public cancelDistribution;               // Call off distribution if something goes wrong prior to token distribution
    uint256 public numPresaleTokensDistributed;      // Number of presale tokens that have been distributed
    uint256 public numSaleTokensDistributed;         // Number of sale tokens that have been distributed
    uint256 public numLockedTokensDistributed;         // Number of sale tokens that have been distributed
    address public proxyContractAddress;             // Address of contract holding participant data

    // Timing
    uint256 public freezeTimestamp;                  // Time where owner can no longer destroy the contract
    uint256 public distributionStartTimestamp;       // Time to begin distribution
    uint256 public lockupTimestamp;       // Time to begin distribution

    // Events
    event CreateUKGEvent(address indexed _to, uint256 _value);                  // Logs the creation of the token
    event DistributeSaleUKGEvent(address indexed _to, uint256 _value);          // Logs the distribution of the token
    event DistributePresaleUKGEvent(uint phase, address user, uint amount);     // Logs the user claiming their tokens
    event DistributeLockedUKGEvent(address indexed _to, uint256 _value);        // Logs the distribution of the token

    // Mapping
    mapping (address => uint256) public presaleParticipantAllowedAllocation;    // Presale participant able to claim tokens
    mapping (address => uint256) public allocationPerPhase;                     // Presale participant allocation per phase
    mapping (address => uint256) public remainingAllowance;                     // Amount of tokens presale participant has left to claim
    mapping (address => bool) public saleParticipantCollected;                  // Sale user has collected all funds bool
    mapping (address => bool) public lockedParticipantCollected;                  // Locked user has collected all funds bool
    mapping (address => uint256) public isVesting;                              // 0 if the user is currently vesting. 1 if they are finished.
    mapping (address => uint256) public phasesClaimed;                          // Number of claimed phases
    mapping (address => uint256) public phasesClaimable;                        // Number of phases the user can claim
    mapping (uint => mapping (address => bool))  public  claimed;               // Sets status of claim for presale participant

    mapping (uint256 => uint256) public endOfPhaseTimestamp;    // Presale participant able to claim tokens

    // Modifiers
    modifier notFrozen {
        require(block.timestamp < freezeTimestamp);
        _;
    }

    modifier notCanceled {
        require(!cancelDistribution);
        _;
    }

    modifier distributionStarted {
        require(distributionStartTimestamp < block.timestamp);
        _;
    }

    modifier lockupOver {
        require(lockupTimestamp < block.timestamp);
        _;
    }

    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _ukgDepositAddr Address to deposit pre-allocated UKG
    /// @param _proxyContractAddress Address of contract holding participant data
    /// @param _freezeTimestamp Time where owner can no longer destroy the contract
    /// @param _distributionStartTimestamp Timestamp to begin the distribution phase
    /// @param _lockupTimestamp Timestamp to end the lockup
    function TokenDistribution(address _ukgDepositAddr, address _proxyContractAddress, uint256 _freezeTimestamp, uint256 _distributionStartTimestamp, uint256 _lockupTimestamp)
    {
        require(_ukgDepositAddr != 0);                     // Force this value not to be initialized to 0
        require(_distributionStartTimestamp != 0);         // Start timestamp must be defined
        require(_freezeTimestamp != 0);                    // Freeze timestamp must be defined
        require(_lockupTimestamp != 0);                    // Freeze timestamp must be defined
        require(_proxyContractAddress != 0);               // Proxy contract must be defined
        require(_freezeTimestamp < _distributionStartTimestamp);  // Freeze timestamp must occur before the distributionStartTimestamp


        cancelDistribution = false;                        // Shut down if something goes awry
        numPresaleTokensDistributed = 0;                   // No presale tokens distributed initially
        numSaleTokensDistributed = 0;                      // No sale tokens distributed initially
        ukgDepositAddr = _ukgDepositAddr;                  // Deposit address for UKG for Unikrn
        proxyContractAddress = _proxyContractAddress;      // Address of contract holding participant data
        freezeTimestamp = _freezeTimestamp;                // Time where owner can no longer destroy the contract
        distributionStartTimestamp = _distributionStartTimestamp;
        lockupTimestamp = _lockupTimestamp;
        balances[this] = TOTAL_COMMUNITY_ALLOCATION + LOCKED_TOKEN_ALLOCATION_CAP;       // Deposit community funds and locked funds into the contract to be collected
        CreateUKGEvent(this, TOTAL_COMMUNITY_ALLOCATION + LOCKED_TOKEN_ALLOCATION_CAP);  // Logs token creation
        balances[ukgDepositAddr] = UKG_FUND;               // Deposit Unikrn funds that are preallocated to the Unikrn team
        CreateUKGEvent(ukgDepositAddr, UKG_FUND);          // Logs Unikrn fund
        endOfPhaseTimestamp[0] = _distributionStartTimestamp + PHASE_LENGTH;    // Defines the ending timestamp of phase 0
        // Defines the ending timestamp of the rest of the phases
        for (uint i = 1; i <= 10; i++) {
            endOfPhaseTimestamp[i] = ((i + 1) * PHASE_LENGTH) + _distributionStartTimestamp;
        }
    }

    /// @dev allows user to collect their sale funds.
    function claimSaleTokens()
    notCanceled
    distributionStarted
    {
        require(numSaleTokensDistributed < SALE_TOKEN_ALLOCATION_CAP);  // Cannot distribute more tokens than available
        require(!saleParticipantCollected[msg.sender]); // Participant's funds cannot have been collected already

        ProxyContract participantData = ProxyContract(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.balanceOfSaleParticipants(msg.sender);  // Number of tokens to receive
        numSaleTokensDistributed  = numSaleTokensDistributed.add(currentParticipantAmt);        // Number of sale tokens distributed

        require(numSaleTokensDistributed <= SALE_TOKEN_ALLOCATION_CAP);  // Cannot allocate > 135M tokens for sale

        saleParticipantCollected[msg.sender] = true;        // User cannot collect tokens again

        assert(StandardToken(this).transfer(msg.sender, currentParticipantAmt));  // Distributes tokens to participant
        DistributeSaleUKGEvent(msg.sender, currentParticipantAmt);                // Logs token creation
    }

    /// @dev Returns block timestamp. Function needed for testing.
    function time() constant returns (uint) {
        return block.timestamp;
    }

    /// @dev Returns phase number of the distrbution
    function currentPhase() constant returns (uint) {
        return whichPhase(time());
    }

    /// @dev Returns the current phase the distribution is on. Will be 1-10. Updates every 9 days
    function whichPhase(uint timestamp) constant returns (uint) {
        // if the time is less than the start time, return 0. or else return the new time.
        return timestamp < distributionStartTimestamp
        ? 0
        : (timestamp.sub(distributionStartTimestamp) / PHASE_LENGTH).min256(10);  // Returns phase 1-10. If it is past phase 10, return 10
    }

    /// @dev Returns the time remaining in the current phase
    function timeRemainingInPhase() constant returns (uint) {
        return endOfPhaseTimestamp[currentPhase()] - time();
    }

    /// @dev Returns the number of phases a participant has available to claim
    function phasesClaimable(address participant) constant returns (uint) {
        return currentPhase().sub(phasesClaimed[participant]);
    }

    /// @dev Presale participants call this to claim their tokens.
    /// @param phase Defines which phase of the sale being collected for
    function claimPresaleTokensIterate(uint phase) internal {
        require(phase > 0);
        require(currentPhase() >= phase);

        // If a participant has never called the function before, assign their allocations accordingly
        if (!claimed[1][msg.sender]) {
            ProxyContract participantData = ProxyContract(proxyContractAddress);
            presaleParticipantAllowedAllocation[msg.sender] = participantData.balanceOfPresaleParticipants(msg.sender); // Total allowed tokens. Used for division

            require(presaleParticipantAllowedAllocation[msg.sender] != 0);                              // User must have participated in the presale

            uint256 modBal = presaleParticipantAllowedAllocation[msg.sender] % 10;                      // Calculates how many extra tokens to distribute for first phase
            allocationPerPhase[msg.sender] = presaleParticipantAllowedAllocation[msg.sender].div(10);   // Calculates how many tokens collectible per phase
            remainingAllowance[msg.sender] = presaleParticipantAllowedAllocation[msg.sender];           // Number of tokens to receive
        }

        // If the participant has claimed for this phase, return
        if (claimed[phase][msg.sender] || remainingAllowance[msg.sender] == 0) {
            return;
        }

        claimed[phase][msg.sender] = true;                                      // User cannot participate in this phase again

        // The first distribution phase will have the modulus added to it
        uint256 phaseAllocation;  // Amount to distribute this phase

        if (phase != 1) {
            phaseAllocation = allocationPerPhase[msg.sender];               // Allocation
        } else {
            phaseAllocation = allocationPerPhase[msg.sender].add(modBal);  // Allocation plus mod for first phase
        }

        remainingAllowance[msg.sender] = remainingAllowance[msg.sender].sub(phaseAllocation);                               // Subtract the claimed tokens from the remaining allocation
        numPresaleTokensDistributed = numPresaleTokensDistributed.add(phaseAllocation);  // Add to the total number of presale tokens distributed

        // If this is the last phase, isVesting flag turns to 1 (aka false)
        if (phase == 10) {
            isVesting[msg.sender] = 1;
        }

        // Define user statistics for web3 use
        phasesClaimed[msg.sender] = phase;

        assert(StandardToken(this).transfer(msg.sender, phaseAllocation));      // Distribute tokens to user
        DistributePresaleUKGEvent(phase, msg.sender, phaseAllocation);          // Logs the user claiming their tokens
    }


    /// @dev Called to iterate through phases and distribute tokens
    function claimPresaleTokens()
    notCanceled
    distributionStarted
    {
        require(numPresaleTokensDistributed < PRESALE_TOKEN_ALLOCATION_CAP);  // Cannot distribute more tokens than available
        for (uint i = 1; i <= currentPhase(); i++) {
            claimPresaleTokensIterate(i);  // Calls claim function
        }
    }

    function () {
        revert();
    }

    /// @dev Function to call that allows user to claim both sale and presale tokens available at the current time
    function claimAllAvailableTokens()
    notCanceled
    distributionStarted
    {
        // Participant must not have already collected tokens from sale allocation
        if (!saleParticipantCollected[msg.sender]) {
            claimSaleTokens();
        }
        claimPresaleTokens();
    }

    /// @dev allows locked users to collect their funds.
    function claimLockedTokens()
    notCanceled
    distributionStarted
    lockupOver
    {
        require(numLockedTokensDistributed < LOCKED_TOKEN_ALLOCATION_CAP);  // Cannot distribute more tokens than available
        require(!lockedParticipantCollected[msg.sender]); // Participant's funds cannot have been collected already

        ProxyContract participantData = ProxyContract(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.balanceOfLockedParticipants(msg.sender);    // Number of tokens to receive
        numLockedTokensDistributed  = numLockedTokensDistributed.add(currentParticipantAmt);      // Number of locked tokens distributed

        require(numLockedTokensDistributed <= LOCKED_TOKEN_ALLOCATION_CAP); // Cannot allocate > 200M tokens for locked

        lockedParticipantCollected[msg.sender] = true;        // User cannot collect tokens again

        assert(StandardToken(this).transfer(msg.sender, currentParticipantAmt));   // Distributes tokens to participant
        DistributeLockedUKGEvent(msg.sender, currentParticipantAmt);               // Logs token creation
    }

    /// @dev Cancels contract if something is wrong prior to distribution
    function cancelDist() external
    onlyOwner
    notFrozen
    {
        cancelDistribution = true;
    }

    // FOR TESTING ONLY
    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    function presaleParticipantAllowedAllocationTest(address _participant) constant returns (uint256 allocation) {
        return presaleParticipantAllowedAllocation[_participant];
    }

    function allocationPerPhaseTest(address _participant) constant returns (uint256 allocation) {
        return allocationPerPhase[_participant];
    }

    function remainingAllowanceTest(address _participant) constant returns (uint256 allowance) {
        return remainingAllowance[_participant];
    }

    function saleParticipantCollectedTest(address _participant) constant returns (bool collected) {
        return saleParticipantCollected[_participant];
    }

    function isVestingTest(address _participant) constant returns (uint256 vesting) {
        return isVesting[_participant];
    }
}