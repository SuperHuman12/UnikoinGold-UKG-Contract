This repository defines the UnikoinGold token distribution flow and provides additional information surrounding the
distribution of UKG. 

## Table of Contents

* [Deployment](#deployment)
* [Assumptions](#assumptions)
* [Contracts](#contracts)
    * [Descriptions](#descriptions)
* [Specifications](#specifications)
    * [Functions](#functions)

## Deployment


## Assumptions

### Sale Process
- **This will be done prior to the deployment of any smart contracts. It will be completed with individual wallets with
a system we built.**
- The sale will consist of users sending funds to specific wallet addresses, prior to the use audited smart contracts
- Their contribution amount will be added to a DB consisting of wallet addresses and their associated balances
- Users can contribute a minimum of $30 USD and a maximum of $100k USD

### Participant Addition
- **This contract will collect no funds**. All funds will have been collected prior to the deployment of this contract
- Before the distribute contract is deployed, ParticipantAdditionProxy.sol will be deployed
- Unikrn will populate allocatePresaleBalances and allocateSaleBalances with address and balances of the 
participants who participated in the presale and the sale
    - This will be done programmatically with a script that adds users and their balances via multiple transactions
        - The function has the ability to accept as many or as few addresses per transaction, as to avoid the block
        gas limit
- Upon completion of the addition of users, Unikrn will call endPresaleParticipantAddition and endSaleParticipantAddition
in order to finalize this contract. After these are called, this contract will never be edited again

### Participant Claim 
- **This contract will collect no funds**. All funds will have been collected prior to the deployment of this contract
- 200 million total tokens distributed between presale and sale participants
    - These tokens are initially sent to the contract in order to create all 1B tokens
        - This is done because if a participant were to lose their key, there would never be 1B tokens created
- Both sale and presale participants will have their balances checked by the proxy contract that is already on the
blockchain
- Sale participants will receive their tokens immediately upon calling a function to claim them
- Presale participants will receive their tokens at a rate of 10% every 9 days over a total of 90 days
    - A call to the claim function will give them all their available tokens, to date
    - These participants will have to call `claimPresaleTokens` function to receive these tokens
            - IE if the user calls clam for the first time after 19 days, they will receive 20% of their tokens
        - This function will iterate through phases in `claimPresaleTokensIterate` 
        - The first phase to receive tokens is phase 1
- If something goes wrong, the owner can call of the contract 1 day before the distribution begins

## Contracts

### Descriptions

#### [SafeMath.sol](https://github.com/CoinCircle/ukg-distrbution/blob/master/contracts/SafeMath.sol)
SafeMath library used to protect against overflows during math logic throughout the contracts.

#### [Ownable.sol](https://github.com/CoinCircle/ukg-distrbution/blob/master/contracts/Ownable.sol)
The Ownable contract has an owner address, and provides basic authorization control functions, this simplifies the 
implementation of "user permissions".

#### [Token.sol](https://github.com/CoinCircle/ukg-distrbution/blob/master/contracts/Token.sol)
ERC20 token standard.

#### [ParticipantAddiitionProxy.sol](https://github.com/CoinCircle/ukg-distrbution/blob/master/contracts/ParticipantAdditionProxy.sol)
Contract to add users to the sale and presale contributors list. The data in this contract will be called by the main
token distribution contract.

#### [TokenDistribution.sol](https://github.com/CoinCircle/ukg-distrbution/blob/master/contracts/TokenDistribution.sol)
This contract creates tokens and holds them until users claim them. Sale participants can claim their tokens immediately
while presale participants will receive 10% of their funds via a call every 9 days for 90 days.

## Specificaitons


### Functions
Name | Keywords | Description
--- | --- | ---
claimSaleTokens() | `external` `notCanceled` `distributionStarted` `saleTokensStillAvailable` | Distributes tokens to sale participants.
time() | `constant` | Returns the block.timstamp. Necessary for testing.
currentPhase() | `constant` | Returns the current phase number that the distribution is on.
min() | `private` | Returns the mininum of two numbers.
whichPhase() | `constant` | Calculates the phase number that the distribution is on.
timeRemainingInPhase() | `constant` | Returns the time remaining in the current phase
phasesClaimable() | `constant` | Returns the number of phases a participant has available to claim
claimPresaleTokensIterate(phase) | `internal` | Internal function that gets looped through based on when presale user calls claimPresaleTokens().
claimPresaleTokens() | `external` `notCanceled` `distributionStarted` `presaleTokensStillAvailable` | User calls this function to claim their presale tokens.
claimAllAvailableTokens() | `notCanceled` `distributionStarted` | Function to call that allows user to claim both sale and presale tokens available at the current time
cancelDistribution() | `external` `onlyOwner` `notFrozen` | Cancels distribution if a false parameter is entered.
