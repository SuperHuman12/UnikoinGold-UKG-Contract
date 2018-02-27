This repository defines the UnikoinGold token distribution flow and provides additional information surrounding the distribution of UKG. The ERC20 token will distribute 1 Billion UKG in total.

You can find the UKG Contract at https://unikoingold.com/contract.

You can find the [UnikoinGold audit report](https://blog.zeppelin.solutions/unikoingold-token-audit-aafb7de07f3) from Zeppelin Solutions [here](https://blog.zeppelin.solutions/unikoingold-token-audit-aafb7de07f3).

# UKG Links
* Token Contract Address: 0x24692791Bc444c5Cd0b81e3CBCaba4b04Acd1F3B
* Token Symbol:UKG
* Decimals: 18
* Website: https://unikoingold.com
* Official Contact Email Address: support@unikoingold.com
* FAQ: https://unikoingold.com/faq
* Facebook: https://www.facebook.com/unikoingold
* Twitter: https://twitter.com/unikoingold
* Blog: https://news.unikrn.com/topic/UnikoinGold
* Bitcointalk: https://bitcointalk.org/index.php?topic=2206150.40
* Github: https://github.com/unikoingold/UnikoinGold-UKG-Contract
* Whitepaper: https://unikoingold.com/whitepaper
* Reddit: https://www.reddit.com/r/unikoingold/
* Discord: https://community.unikrn.com
* UKG Logo: https://f.unkrn.com/2017-11-04/a/1509813079_unikoin-icon-gold.svg
* Unikrn Website: https://unikrn.com
* You found a bug / security flaw, who do I contact? Please contact us via security@unikrn.com (GPG https://unikrn.com/unikrn.asc) or https://hackerone.com/unikrn. Thx!
 

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
- Both sale and presale participants will have their balances checked by the proxy contract that is already on the
blockchain
- Sale participants will receive their tokens automatically
- Locked Presale participants will receive their tokens at a rate of 10% every 9 days over a total of 90 days
    - A call to the claim function will give them all their available tokens, to date
    - These participants will have to call `claimPresaleTokens` function to receive these tokens
            - IE if the user calls clam for the first time after 19 days, they will receive 20% of their tokens
        - This function will iterate through phases in `claimPresaleTokensIterate` 
        - The first phase to receive tokens is phase 1

## Contracts

### Descriptions

#### [ParticipantAdditionProxy.sol](https://github.com/unikoingold/UnikoinGold-UKG-Contract/blob/master/contracts/ParticipantAdditionProxy.sol)
Contract to add users to the sale and presale contributors list. The data in this contract will be called by the main token distribution contract.

#### [TokenDistribution.sol](https://github.com/unikoingold/UnikoinGold-UKG-Contract/blob/master/contracts/TokenDistribution.sol)
This contract creates tokens and holds them until users claim them. Locked presale participants will receive 10% of their funds via a call every 9 days for 90 days.

## Specifications


### Functions
Name | Keywords | Description
--- | --- | ---
time() | `constant` | Returns the block.timstamp. Necessary for testing.
currentPhase() | `constant` | Returns the current phase number that the distribution is on.
min() | `private` | Returns the mininum of two numbers.
whichPhase() | `constant` | Calculates the phase number that the distribution is on.
timeRemainingInPhase() | `constant` | Returns the time remaining in the current phase
phasesClaimable() | `constant` | Returns the number of phases a participant has available to claim
claimPresaleTokensIterate(phase) | `internal` | Internal function that gets looped through based on when presale user calls claimPresaleTokens().
claimPresaleTokens() | `external` `notCanceled` `distributionStarted` `presaleTokensStillAvailable` | User calls this function to claim their presale tokens.
cancelDistribution() | `external` `onlyOwner` `notFrozen` | Cancels distribution if a false parameter is entered.

## Setup

### Installation
```
npm install -g truffle testrpc && npm install
```

Before running tests and interacting with the contract, make sure you are running testrpc to simulate the blockchain:
```
testrpc
```


### Testing
Run all tests:
```
truffle test
```

## Thanks
Thank you [CoinCircle](https://coincircle.com/) for the relentless efforts to make this happen! Make sure to also checkout the [CoinCircle Github](https://github.com/coincircle).
Thank you [Zeppelin](https://zeppelin.solutions/) for the helping us to make UKG even more secure. 
