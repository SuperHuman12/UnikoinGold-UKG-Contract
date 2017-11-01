pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract ParticipantAdditionProxy is Ownable {
    using SafeMath for uint;

    // Constants
    uint256 public constant EXP_18 = 18;                                               // Used to convert Wei to ETH
    uint256 public constant PRESALE_TOKEN_ALLOCATION_CAP = 9500000333530000000000000;  // tokens distributed after sale distribution
    uint256 public constant SALE_TOKEN_ALLOCATION_CAP = 190499999666470000000000000;    // tokens distributed after sale distribution

    // Parameters
    bool    public presaleAdditionDone;          // State of presale addition
    bool    public saleAdditionDone;             // Finalizes sale participant addition
    uint256 public presaleAllocationTokenCount;  // Counts presale tokens allocated. Used as safety check.
    uint256 public saleAllocationTokenCount;     // Counts sale tokens allocated. Used as safety check.

    // Mapping
    mapping(address => uint256) public presaleBalances;  // Save presale participant balances
    mapping(address => uint256) public saleBalances;     // Save sale participant balances

    /// @dev ParticipantAddition(): Constructor for the participant addition contract
    function ParticipantAdditionProxy()
    {
        saleAdditionDone = false;         // Sale participants not yet added
        presaleAdditionDone = false;      // Presale participants not yet added
        presaleAllocationTokenCount = 0;  // No presale tokens allocated initially
        saleAllocationTokenCount = 0;     // No sale tokens allocated initially
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedPresaleParticipants Array of presale participants
    /// @param approvedPresaleParticipantsAllocations Array of allocations
    function allocatePresaleBalances(address[] approvedPresaleParticipants, uint256[] approvedPresaleParticipantsAllocations)
    onlyOwner
    {
        require(!presaleAdditionDone);  // Presale participant allocation cannot be completed
        require(approvedPresaleParticipants.length == approvedPresaleParticipantsAllocations.length);  // The arrays passed in must be of equal length
        // Does not need to be global variable since they are saved in mapping. Can use as many arrays/tx as needed.
        for (uint256 i = 0; i < approvedPresaleParticipants.length; i++) {
            require(presaleBalances[approvedPresaleParticipants[i]] == 0);  // Participant's funds cannot have been allocated already

            presaleAllocationTokenCount  = presaleAllocationTokenCount.add(approvedPresaleParticipantsAllocations[i]);  // Total supply balance
            require(presaleAllocationTokenCount <= PRESALE_TOKEN_ALLOCATION_CAP);                                       // Cannot allocate > 65M tokens

            presaleBalances[approvedPresaleParticipants[i]] = approvedPresaleParticipantsAllocations[i];  // Assigns tokens to participant
        }
    }

    /// @dev Distribute tokens to sale participants immediately
    /// @param approvedSaleParticipants Array of sale participants
    /// @param approvedSaleParticipantsAllocations Array of allocations
    function allocateSaleBalances(address[] approvedSaleParticipants, uint256[] approvedSaleParticipantsAllocations)
    onlyOwner
    {
        require(!saleAdditionDone);  // Sale participant allocation cannot be completed
        require(approvedSaleParticipants.length == approvedSaleParticipantsAllocations.length);  // The arrays passed in must be of equal length
        // Does not need to be global variable since they are saved in mapping. Can use as many arrays/tx as needed.
        for (uint256 j = 0; j < approvedSaleParticipants.length; j++) {
            require(saleBalances[approvedSaleParticipants[j]] == 0);  // Participant's funds cannot have been allocated already

            saleAllocationTokenCount  = saleAllocationTokenCount.add(approvedSaleParticipantsAllocations[j]);  // Total supply balance
            require(saleAllocationTokenCount <= SALE_TOKEN_ALLOCATION_CAP);                                    // Cannot allocate > 135M tokens

            saleBalances[approvedSaleParticipants[j]] = approvedSaleParticipantsAllocations[j];  // Assigns tokens to participant
        }
    }

    /// @dev Removes a participant from a mapping in the event of an error
    /// @param saleType Sale type that the participant is being removed from
    /// @param participantAddress Address of the participant being removed
    function removeParticipant(string saleType, address participantAddress)
    onlyOwner
    {
        require(sha3(saleType) == sha3('presale') || sha3(saleType) == sha3('sale'));

        if (sha3(saleType) == sha3('presale')) {
            require(!presaleAdditionDone);
            require(presaleBalances[participantAddress] != 0);
            presaleAllocationTokenCount = presaleAllocationTokenCount.sub(presaleBalances[participantAddress]);
            delete presaleBalances[participantAddress];
        }

        if (sha3(saleType) == sha3('sale')) {
            require(!saleAdditionDone);
            require(saleBalances[participantAddress] != 0);
            saleAllocationTokenCount = saleAllocationTokenCount.sub(saleBalances[participantAddress]);
            delete saleBalances[participantAddress];
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
        require(presaleAllocationTokenCount == PRESALE_TOKEN_ALLOCATION_CAP);  // Cannot allocate > 65M tokens
        // Need to have allocated all tokens
        presaleAdditionDone = true;
    }

    /// @dev Signals the end of the sale participant addition
    /// @notice call when all sale participants have been added and checked
    function endSaleParticipantAddition()
    onlyOwner
    {
        require(saleAllocationTokenCount == SALE_TOKEN_ALLOCATION_CAP);  // Cannot allocate > 135M tokens
        // Need to have allocated all tokens

        saleAdditionDone = true;
    }
}