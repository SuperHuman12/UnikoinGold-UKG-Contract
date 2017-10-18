pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/math/Math.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/StandardToken.sol';
import './UnikoinGold.sol';

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

    mapping(address => uint256) public presaleBalances;
    mapping(address => uint256) public saleBalances;
}

contract TokenDistribution is Ownable {
    using SafeMath for uint;
    using Math for uint;

    // Constants
    uint256 public constant EXP_18 = 18;
    uint256 public constant PHASE_LENGTH = 9 days;                                     // Length of the phase
    uint256 public constant MAX_PHASES = 10;                                           // Maximum number of phases
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 65 * (10**6) * 10**EXP_18;  // 65M tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 135 * (10**6) * 10**EXP_18;    // 135M tokens distributed after sale distribution

    // Parameters
    bool    public cancelDistribution;          // Call off distribution if something goes wrong prior to token distribution
    uint256 public numPresaleTokensDistributed; // Number of presale tokens that have been distributed
    uint256 public numSaleTokensDistributed;    // Number of sale tokens that have been distributed
    address public tokenAddress;                // Address of the ERC20 UKG token
    address public proxyContractAddress;        // Address of contract holding participant data

    // Timing
    uint256 public freezeTimestamp;             // Time where owner can no longer destroy the contract
    uint256 public distributionStartTimestamp;  // Time to begin distribution

    // Events
    event DistributeSaleUKGEvent(address indexed _to, uint256 _value);        // Logs the distribution of the token
    event DistributePresaleUKGEvent(uint phase, address user, uint amount);   // Logs the user claiming their tokens

    // Mapping
    mapping (address => uint256) public presaleParticipantAllowedAllocation;  // Presale participant able to claim tokens
    mapping (address => uint256) public allocationPerPhase;                   // Presale participant allocation per phase
    mapping (address => uint256) public remainingAllowance;                   // Amount of tokens presale participant has left to claim
    mapping (address => bool) public saleParticipantCollected;                // Sale user has collected all funds bool
    mapping (address => uint256) public phasesClaimed;                        // Number of claimed phases
    mapping (uint => mapping (address => bool)) public claimed;               // Sets status of claim for presale participant. Mapping is indexed by the presale phase.

    mapping (uint256 => uint256) public endOfPhaseTimestamp;  // Presale participant able to claim tokens

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

    modifier isTokenAddressSet {
        require(tokenAddress != 0x0);
        _;
    }

    /// @dev TokenDistribution(): Constructor for the sale contract
    /// @param _proxyContractAddress Address of contract holding participant data
    /// @param _freezeTimestamp Time where owner can no longer destroy the contract
    /// @param _distributionStartTimestamp Timestamp to begin the distribution phase
    function TokenDistribution(address _proxyContractAddress, uint256 _freezeTimestamp, uint256 _distributionStartTimestamp)
    {
        require(_proxyContractAddress != 0);               // Proxy contract must be defined
        require(_freezeTimestamp != 0);                    // Freeze timestamp must be defined
        require(_distributionStartTimestamp != 0);         // Start timestamp must be defined
        require(_freezeTimestamp < _distributionStartTimestamp);  // Freeze timestamp must occur before the distributionStartTimestamp

        cancelDistribution = false;                        // Shut down if something goes awry
        numPresaleTokensDistributed = 0;                   // No presale tokens distributed initially
        numSaleTokensDistributed = 0;                      // No sale tokens distributed initially
        proxyContractAddress = _proxyContractAddress;      // Address of contract holding participant data
        freezeTimestamp = _freezeTimestamp;                // Time where owner can no longer destroy the contract
        distributionStartTimestamp = _distributionStartTimestamp;
        // Defines the ending timestamp of the rest of the phases
        for (uint i = 0; i <= 10; i++) {
            endOfPhaseTimestamp[i] = ((i + 1) * PHASE_LENGTH) + _distributionStartTimestamp;
        }
    }

    /// @dev Allows owner to set the address of the token contract
    /// @param _tokenAddress Address of the ERC20 UKG token
    function setTokenAddress(address _tokenAddress)
    onlyOwner
    {
        require(_tokenAddress != 0);   // Token address must be defined
        require(tokenAddress == 0x0);  // The token address must not have been initialized

        tokenAddress = _tokenAddress;  // Set the address of the token
    }

    /// @dev Allows user to collect their sale funds.
    function claimSaleTokens()
    notCanceled
    isTokenAddressSet
    distributionStarted
    {
        require(numSaleTokensDistributed < SALE_TOKEN_ALLOCATION_CAP);  // Cannot distribute more tokens than available
        require(!saleParticipantCollected[msg.sender]);                 // Participant's funds cannot have been collected already

        ProxyContract participantData = ProxyContract(proxyContractAddress);

        uint256 currentParticipantAmt = participantData.saleBalances(msg.sender);                // Number of tokens to receive
        numSaleTokensDistributed  = numSaleTokensDistributed.add(currentParticipantAmt);         // Number of sale tokens distributed

        require(numSaleTokensDistributed <= SALE_TOKEN_ALLOCATION_CAP);  // Cannot allocate > 135M tokens for sale

        saleParticipantCollected[msg.sender] = true;  // User cannot collect tokens again

        assert(StandardToken(tokenAddress).transfer(msg.sender, currentParticipantAmt));  // Distributes tokens to participant
        DistributeSaleUKGEvent(msg.sender, currentParticipantAmt);                        // Logs token creation
    }

    /// @dev Returns block timestamp. Function needed for testing.
    function time() constant returns (uint) {
        return block.timestamp;
    }

    /// @dev Returns phase number of the distribution
    function currentPhase() constant returns (uint) {
        return whichPhase(time());
    }

    /// @dev Returns the current phase the distribution is on. Will be 1-10. Updates every 9 days
    /// @param timestamp Timestamp of current time
    function whichPhase(uint timestamp) constant returns (uint) {
        // if the time is less than the start time, return 0. or else return the new time.
        return timestamp < distributionStartTimestamp
        ? 0
        : (timestamp.sub(distributionStartTimestamp) / PHASE_LENGTH).min256(MAX_PHASES);  // Returns phase 1-10. If it is past phase 10, return 10
    }

    /// @dev Returns the time remaining in the current phase
    function timeRemainingInPhase() constant returns (uint) {
        return endOfPhaseTimestamp[currentPhase()] - time();
    }

    /// @dev Returns the number of phases a participant has available to claim
    /// @param participant Participant that is being checked
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
            presaleParticipantAllowedAllocation[msg.sender] = participantData.presaleBalances(msg.sender); // Total allowed tokens. Used for division

            require(presaleParticipantAllowedAllocation[msg.sender] != 0);                                     // User must have participated in the presale

            uint256 modBal = presaleParticipantAllowedAllocation[msg.sender] % MAX_PHASES;                     // Calculates how many extra tokens to distribute for first phase. Mod 10 for max of 10 phases
            allocationPerPhase[msg.sender] = presaleParticipantAllowedAllocation[msg.sender].div(MAX_PHASES);  // Calculates how many tokens collectible per phase. Divide by 10 for max of 10 phases.
            remainingAllowance[msg.sender] = presaleParticipantAllowedAllocation[msg.sender];                  // Number of tokens to receive
        }

        // If the participant has claimed for this phase, return
        if (claimed[phase][msg.sender] || remainingAllowance[msg.sender] == 0) {
            return;
        }

        claimed[phase][msg.sender] = true;  // User cannot participate in this phase again

        // The first distribution phase will have the modulus added to it
        uint256 phaseAllocation;  // Amount to distribute this phase

        if (phase != 1) {
            phaseAllocation = allocationPerPhase[msg.sender];  // Allocation
        } else {
            phaseAllocation = allocationPerPhase[msg.sender].add(modBal);  // Allocation plus mod for first phase
        }

        remainingAllowance[msg.sender] = remainingAllowance[msg.sender].sub(phaseAllocation);  // Subtract the claimed tokens from the remaining allocation
        numPresaleTokensDistributed = numPresaleTokensDistributed.add(phaseAllocation);        // Add to the total number of presale tokens distributed

        phasesClaimed[msg.sender] = phase;  // Define which phases have been claimed

        assert(StandardToken(tokenAddress).transfer(msg.sender, phaseAllocation));  // Distribute tokens to user
        DistributePresaleUKGEvent(phase, msg.sender, phaseAllocation);              // Logs the user claiming their tokens
    }


    /// @dev Called to iterate through phases and distribute tokens
    function claimPresaleTokens()
    notCanceled
    isTokenAddressSet
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
    isTokenAddressSet
    distributionStarted
    {
        // Participant must not have already collected tokens from sale allocation
        if (!saleParticipantCollected[msg.sender]) {
            claimSaleTokens();
        }
        claimPresaleTokens();
    }

    /// @dev Cancels contract if something is wrong prior to distribution
    function cancelDist() external
    onlyOwner
    isTokenAddressSet
    notFrozen
    {
        cancelDistribution = true;
    }
}