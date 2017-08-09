This repository defines the UnikoinGold token distribution flow and provides additional information surrounding the presale and sale itself.

## Table of Contents

* [Contracts](#contracts)
    * [Descriptions](#descriptions)
* [Specifications](#specifications)
    * [Functions](#functions)


## Contracts

### Descriptions

#### SafeMath.sol
SafeMath library used to protect against overflows during math logic throughout the contracts.

#### Ownable.sol
The Ownable contract has an owner address, and provides basic authorization control functions, this simplifies the implementation of "user permissions".

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
