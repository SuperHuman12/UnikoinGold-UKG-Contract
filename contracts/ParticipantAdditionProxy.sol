pragma solidity ^0.4.11;

import {SafeMath} from './SafeMath.sol';
import {Ownable} from './Ownable.sol';

contract ParticipantAdditionProxy is Ownable {
    using SafeMath for uint;

    // Constants
    uint256 public constant EXP_18 = 18;                                                 // Used to convert Wei to ETH
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 65 * (10**6) * 10**EXP_18;    // 65M tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 135 * (10**6) * 10**EXP_18;      // 135M tokens distributed after sale distribution
    uint256 public constant LOCKED_TOKEN_ALLOCATION_CAP = 200 * (10**6) * 10**EXP_18;    // 200M tokens locked

    // Parameters
    bool    public presaleAdditionDone;           // State of presale addition
    bool    public saleAdditionDone;              // Finalizes sale participant addition
    bool    public lockedAdditionDone;            // Finalizes locked participant addition
    uint256 public presaleAllocationTokenCount;   // Counts presale tokens allocated. Used as safety check.
    uint256 public saleAllocationTokenCount;      // Counts sale tokens allocated. Used as safety check.
    uint256 public lockedAllocationTokenCount;    // Counts locked tokens allocated. Used as safety check.

    // Mapping
    mapping(address => uint256) public presaleBalances;                // Save presale participant balances
    mapping(address => uint256) public saleBalances;                   // Save sale participant balances
    mapping(address => uint256) public lockedBalances;                 // Save sale participant balances
    mapping(address => bool)    public presaleParticipantAllocated;    // Presale participant has already been allocated
    mapping(address => bool)    public saleParticipantAllocated;       // Sale participant has already been allocated
    mapping(address => bool)    public lockedParticipantAllocated;     // Locked participant has already been allocated

    // Modifiers

    modifier presaleParticipantAdditionOngoing {
        require(!presaleAdditionDone);
        _;
    }

    modifier saleParticipantAdditionOngoing {
        require(!saleAdditionDone);
        _;
    }

    modifier lockedParticipantAdditionOngoing {
        require(!lockedAdditionDone);
        _;
    }
    /// @dev ParticipantAddition(): Constructor for the participant addition contract
    function ParticipantAdditionProxy()
    {
        saleAdditionDone = false;          // Sale participants not yet added
        presaleAdditionDone = false;       // Presale participants not yet added
        lockedAdditionDone = false;        // Locked participants not yet added
        presaleAllocationTokenCount = 0;   // No presale tokens allocated initially
        saleAllocationTokenCount = 0;      // No sale tokens allocated initially
        lockedAllocationTokenCount = 0;    // No locked tokens allocated initially
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedPresaleParticipants Array of presale participants
    /// @param approvedPresaleParticipantsAllocations Array of allocations
    function allocatePresaleBalances(address[] approvedPresaleParticipants, uint256[] approvedPresaleParticipantsAllocations)
    onlyOwner
    presaleParticipantAdditionOngoing
    {
        require(approvedPresaleParticipants.length == approvedPresaleParticipantsAllocations.length);   // The arrays passed in must be of equal length
        // Does not need to be global variable since they are saved in mapping. Can use as many arrays/tx as needed.
        for (uint256 i = 0; i < approvedPresaleParticipants.length; i++) {
            require(!presaleParticipantAllocated[approvedPresaleParticipants[i]]); // Participant's funds cannot have been allocated already

            presaleAllocationTokenCount  = presaleAllocationTokenCount.add(approvedPresaleParticipantsAllocations[i]);  // Total supply balance
            require(presaleAllocationTokenCount <= PRESALE_TOKEN_ALLOCATION_CAP);                                       // Cannot allocate > 65M tokens

            presaleParticipantAllocated[approvedPresaleParticipants[i]] = true;    // Participant's funds have been allocated
            presaleBalances[approvedPresaleParticipants[i]] = approvedPresaleParticipantsAllocations[i];      // Assigns tokens to participant
        }
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedSaleParticipants Array of sale participants
    /// @param approvedSaleParticipantsAllocations Array of allocations
    function allocateSaleBalances(address[] approvedSaleParticipants, uint256[] approvedSaleParticipantsAllocations)
    onlyOwner
    saleParticipantAdditionOngoing
    {
        require(approvedSaleParticipants.length == approvedSaleParticipantsAllocations.length);  // The arrays passed in must be of equal length
        // Does not need to be global variable since they are saved in mapping. Can use as many arrays/tx as needed.
        for (uint256 j = 0; j < approvedSaleParticipants.length; j++) {
            require(!saleParticipantAllocated[approvedSaleParticipants[j]]);        // Participant's funds cannot have been allocated already

            saleAllocationTokenCount  = saleAllocationTokenCount.add(approvedSaleParticipantsAllocations[j]);  // Total supply balance
            require(saleAllocationTokenCount <= SALE_TOKEN_ALLOCATION_CAP);                                    // Cannot allocate > 135M tokens

            saleParticipantAllocated[approvedSaleParticipants[j]] = true;          // Participant's funds have been allocated
            saleBalances[approvedSaleParticipants[j]] = approvedSaleParticipantsAllocations[j];      // Assigns tokens to participant
        }
    }

    /// @dev Distribute tokens to locked participants immediately
    /// @param approvedLockedParticipants Array of locked participants
    /// @param approvedLockedParticipantsAllocations Array of allocations
    function allocateLockedBalances(address[] approvedLockedParticipants, uint256[] approvedLockedParticipantsAllocations)
    onlyOwner
    lockedParticipantAdditionOngoing
    {
        require(approvedLockedParticipants.length == approvedLockedParticipantsAllocations.length);  // The arrays passed in must be of equal length
        // Does not need to be global variable since they are saved in mapping. Can use as many arrays/tx as needed.
        for (uint256 j = 0; j < approvedLockedParticipants.length; j++) {
            require(!lockedParticipantAllocated[approvedLockedParticipants[j]]);        // Participant's funds cannot have been allocated already

            lockedAllocationTokenCount = lockedAllocationTokenCount.add(approvedLockedParticipantsAllocations[j]);  // Total supply balance
            require(lockedAllocationTokenCount <= LOCKED_TOKEN_ALLOCATION_CAP);                                     // Cannot allocate > 200M tokens

            lockedParticipantAllocated[approvedLockedParticipants[j]] = true;          // Participant's funds have been allocated
            lockedBalances[approvedLockedParticipants[j]] = approvedLockedParticipantsAllocations[j];      // Assigns tokens to participant
        }
    }

    /**
     * State Definition Functions
     **/

    /// @dev Signals the end of the presale participant addition
    /// @notice call when all presale participants have been added and checked
    function endPresaleParticipantAddition()
    onlyOwner
    {
        require(presaleAllocationTokenCount == PRESALE_TOKEN_ALLOCATION_CAP);      // Cannot allocate > 65M tokens
        // Need to have allocated all tokens
        presaleAdditionDone = true;
    }

    /// @dev Signals the end of the sale participant addition
    /// @notice call when all sale participants have been added and checked
    function endSaleParticipantAddition()
    onlyOwner
    {
        require(saleAllocationTokenCount == SALE_TOKEN_ALLOCATION_CAP);      // Cannot allocate > 135M tokens
        // Need to have allocated all tokens

        saleAdditionDone = true;
    }

    /// @dev Signals the end of the locked participant addition
    /// @notice call when all locked participants have been added and checked
    function endLockedParticipantAddition()
    onlyOwner
    {
        require(lockedAllocationTokenCount == LOCKED_TOKEN_ALLOCATION_CAP);      // Cannot allocate > 200M tokens
        // Need to have allocated all tokens

        lockedAdditionDone = true;
    }

    /**
     * Balance Functions
     **/

    function balanceOfPresaleParticipants(address _owner) constant returns (uint256 balance) {
        return presaleBalances[_owner];
    }

    function balanceOfSaleParticipants(address _owner) constant returns (uint256 balance) {
        return saleBalances[_owner];
    }

    function balanceOfLockedParticipants(address _owner) constant returns (uint256 balance) {
        return lockedBalances[_owner];
    }
}