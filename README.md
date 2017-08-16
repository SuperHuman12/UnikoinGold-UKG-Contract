This repository defines the UnikoinGold token distribution flow and provides additional information surrounding the 
presale and sale itself. 

## Table of Contents

* [Assumptions](#assumptions)
* [Contracts](#contracts)
    * [Descriptions](#descriptions)
* [Specifications](#specifications)
    * [Functions](#functions)


## Assumptions
- 200 million total tokens distributed between presale and sale participants
- Sale participants will receive their tokens immediately
- Presale participants will receive their tokens at a rate of 10% every 9 days over a total of 90 days
    - These participants will have to call a claim function to receive these tokens
- This contract will collect no funds. All funds will have been collected prior to the deployment of this contract.
- Users who participated in the sale will have their tokens distributed immediately upon call of distributeSaleTokens
    - This can only be called by the contract creator
    - Owner inputs an array of addresses and their respective balances
    - Any block gas limit issues will be circumvented by the iterative token distribution function
- Users who participated in the presale will have their allocations input into an array, but will not receive the 
tokens until they become unlocked
    - Presale participants will have to call the claim function to receive their tokens. 
    - A call to the claim function will give them all their available tokens, to date.
        - IE if the user calls clam for the first time after 19 days (in phase 2), they will receive 20% of their tokens
- If all the users have not yet claimed their tokens after a long period of time, the owner will call a
finishDistribution function that will send the remaining funds to Unikrn to be distributed manually
    - These tokens will be distributed shortly (1-2 days) after the collection
- The end of the distribution period will be signaled by the owner calling the endDistribution function and throwing
a flag

## Contracts

### Descriptions

#### SafeMath.sol
SafeMath library used to protect against overflows during math logic throughout the contracts.

#### Ownable.sol
The Ownable contract has an owner address, and provides basic authorization control functions, this simplifies the 
implementation of "user permissions".

#### Distribution.sol
This contract creates and distributes tokens to the appropriate contributors. 

## Specificaitons

### Functions
Name | Keywords | Description
--- | --- | ---
distrubuteSaleTokens() | `onlyOwner` | Distributes tokens to sale participants.
addPresaleContributors() | `onlyOwner` | Defines presale participants.
claimTokens() | `external` | Presale participants call this to collect their appropriate funds.
toggleHold() | `external` `onlyOwner` | Toggles onHold switch. True if something is wrong.
changeUkgDepositAddr() | `onlyOwner` | Changes the address to deposit funds, if ne
