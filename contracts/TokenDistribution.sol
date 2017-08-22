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
    uint256 public constant TOTAL_COMMUNITY_ALLOCATION = 200 * (10**6) * 10**EXP_18;   // 200M tokens to be distributed to community
    uint256 public constant UKG_FUND = 800 * (10**6) * 10**EXP_18;                     // 800M UKG reserved for Unikrn use

    // Secure wallets
    address public ukgDepositAddr;                   // Deposit address for UKG for Unikrn

    // Parameters
    bool    public distributionFinalized;            // Denotes state of distribution
    bool    public cancelDistribution;               // Call off distribution if something goes wrong prior to token distribution
    uint256 public numPresaleTokensDistributed;      // Number of presale tokens that have been distributed
    uint256 public numSaleTokensDistributed;         // Number of sale tokens that have been distributed
    address public proxyContractAddress;             // Address of contract holding participant data

    // Timing
    uint256 public freezeTimestamp;                  // Time where owner can no longer destroy the contract
    uint256 public distributionStartTimestamp;       // Time to begin distribution

    // Events
    event CreateUKGEvent(address indexed _to, uint256 _value);                  // Logs the creation of the token
    event DistributeSaleUKGEvent(address indexed _to, uint256 _value);          // Logs the distribution of the token
    event DistributePresaleUKGEvent(uint phase, address user, uint amount);     // Logs the user claiming their tokens

    // Mapping
    mapping (address => uint256) public presaleParticipantAllowedAllocation;    // Presale participant able to claim tokens
    mapping (address => uint256) public allocationPerPhase;                     // Presale participant allocation per phase
    mapping (address => uint256) public remainingAllowance;                     // Amount of tokens presale participant has left to claim
    mapping (address => uint256) public modBal;                                 // Modulo balance to add to first phase collection
    mapping (address => bool) public saleParticipantCollected;                  // Sale user has collected all funds bool
    mapping (uint => mapping (address => bool))  public  claimed;               // Sets status of claim for presale participant

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

    modifier presaleTokensStillAvailable {
        require(numPresaleTokensDistributed < PRESALE_TOKEN_ALLOCATION_CAP);
        _;
    }

    modifier saleTokensStillAvailable {
        require(numSaleTokensDistributed < SALE_TOKEN_ALLOCATION_CAP);
        _;
    }

    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _ukgDepositAddr Address to deposit pre-allocated UKG
    /// @param _proxyContractAddress Address of contract holding participant data
    /// @param _freezeTimestamp Time where owner can no longer destroy the contract
    /// @param _distributionStartTimestamp Timestamp to begin the distribution phase
    function TokenDistribution(address _ukgDepositAddr, address _proxyContractAddress, uint256 _freezeTimestamp, uint256 _distributionStartTimestamp)
    {
        require(_ukgDepositAddr != 0);                     // Force this value not to be initialized to 0
        require(_distributionStartTimestamp != 0);         // Start timestamp must be defined
        require(_freezeTimestamp != 0);                    // Freeze timestamp must be defined
        require(_proxyContractAddress != 0);               // Proxy contract must be defined

        cancelDistribution = false;                        // Shut down if something goes awry
        distributionFinalized = false;                     // Denotes the end of the distribution phase
        numPresaleTokensDistributed = 0;                   // No presale tokens distributed initially
        numSaleTokensDistributed = 0;                      // No sale tokens distributed initially
        ukgDepositAddr = _ukgDepositAddr;                  // Deposit address for UKG for Unikrn
        proxyContractAddress = _proxyContractAddress;      // Address of contract holding participant data
        freezeTimestamp = _freezeTimestamp;                // Time where owner can no longer destroy the contract
        distributionStartTimestamp = _distributionStartTimestamp;
        balances[this] = TOTAL_COMMUNITY_ALLOCATION;       // Deposit community funds into the contract to be collected
        CreateUKGEvent(this, TOTAL_COMMUNITY_ALLOCATION);  // Logs token creation
        balances[ukgDepositAddr] = UKG_FUND;               // Deposit Unikrn funds that are preallocated to the Unikrn team
        CreateUKGEvent(ukgDepositAddr, UKG_FUND);          // Logs Unikrn fund
    }

    /// @dev allows user to collect their sale funds.
    function claimSaleTokens()
    notCanceled
    distributionStarted
    saleTokensStillAvailable
    {
        require(!saleParticipantCollected[msg.sender]); // Participant's funds cannot have been collected already

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.balanceOfSaleParticipants(msg.sender);  // Number of tokens to receive
        uint256 tempSaleTotalSupply  = numSaleTokensDistributed.add(currentParticipantAmt);     // Temp number of sale tokens distributed

        require(tempSaleTotalSupply <= SALE_TOKEN_ALLOCATION_CAP); // Cannot allocate > 135M tokens for sale

        numSaleTokensDistributed += currentParticipantAmt;  // Add to sale total token collection
        saleParticipantCollected[msg.sender] = true;        // User cannot collect tokens again

        assert(StandardToken(this).transfer(msg.sender, currentParticipantAmt)); // Distributes tokens to participant
        DistributeSaleUKGEvent(msg.sender, currentParticipantAmt);               // Logs token creation
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
        return timestamp < distributionStartTimestamp
        ? 0
        : timestamp.sub(distributionStartTimestamp) / 9 days;
    }

    /// @dev Presale participants call this to claim their tokens.
    /// @param phase Defines which phase of the sale being collected for
    function claimPresaleTokensIterate(uint phase) internal {
        require(currentPhase() >= phase);

        ParticipantAdditionProxy participantData = ParticipantAdditionProxy(proxyContractAddress);

        // If a participant has never called the function before, assign their allocations accordingly
        if (!claimed[1][msg.sender]) {
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

        if (phase == 1) {
            phaseAllocation = allocationPerPhase[msg.sender].add(modBal);       // Allocation plus mod for first phase
        } else {
            phaseAllocation = allocationPerPhase[msg.sender];                   // Allocation
        }

        remainingAllowance[msg.sender] -= phaseAllocation;                  // Subtract the claimed tokens from the remaining allocation

        numPresaleTokensDistributed += phaseAllocation;                     // Add to the total number of presale tokens distributed
        assert(StandardToken(this).transfer(msg.sender, phaseAllocation));  // Distribute tokens to user
        DistributePresaleUKGEvent(phase, msg.sender, phaseAllocation);      // Logs the user claiming their tokens
    }


    /// @dev Called to iterate through phases and distribute tokens
    function claimPresaleTokens() external
    notCanceled
    distributionStarted
    presaleTokensStillAvailable
    {
        for (uint i = 1; i <= currentPhase(); i++) {
            i > 10 ? i=10 : i;             // Max of 10 phases. Used to stop from infinitely looping through
            claimPresaleTokensIterate(i);  // Calls claim function
        }
    }

    function () {
        revert();
    }

    /// @dev Cancels contract if something is wrong prior to distribution
    function cancelDistribution() external
    onlyOwner
    notFrozen
    {
        cancelDistribution = true;
    }
}

