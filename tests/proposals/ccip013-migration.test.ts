import { Account, assertEquals, Clarinet, Chain, types } from "../../utils/deps.ts";
import { constructAndPassProposal, passProposal, PROPOSALS } from "../../utils/common.ts";

Clarinet.test({
  name: "ccip-013: migration proposal passes and executes",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    constructAndPassProposal(chain, accounts, PROPOSALS.CCIP_012);
    // TODO: setupLegacyProtocol(chain, accounts);

    // act
    const receipts = passProposal(chain, accounts, PROPOSALS.CCIP_013);
    // console.log(JSON.stringify(receipts, null, 2));

    // assert
    receipts[0].result.expectOk().expectUint(1);
    receipts[1].result.expectOk().expectUint(2);
    // ERROR: (err u1005) ERR_CONTRACT_NOT_ACTIVATED
    receipts[2].result.expectErr().expectUint(1005);

    // TODO: fails because CCIP-013 requires an
    // activated legacy protocol (see arrange above)

    // TODO: check data from each call in CCIP-013
    // set-city-activation-status
    // set-city-activation-details
    // add-city-treasury (x4)
    // add-city-token-contract
    // set-active-city-token-contract
    // set-city-coinbase-thresholds
    // set-city-coinbase-amounts
    // set-city-coinbase-details
  },
});

// LEGACY CITYCOINS PROTOCOL SETUP
// This function will automatically:
// - initialize and activate the legacy protocol
// - perform mining and stacking actions for 3 users
// - return the related data for further processing
function setupLegacyProtocol(chain: Chain, accounts: Map<string, Account>) {
  // initialize core contract
  const deployer = accounts.get("deployer")!;
  const approver_1 = accounts.get("wallet_1")!;
  const approver_2 = accounts.get("wallet_2")!;
  const approver_3 = accounts.get("wallet_3")!;
  const testUser_1 = accounts.get("wallet_4")!;
  const testUser_2 = accounts.get("wallet_5")!;
  const testUser_3 = accounts.get("wallet_6")!;

  // initialize core contract
  // register users and activate contract
  // fast-forward past activation threshold
  // mine tokens for 3 users
  // fast-forward to future stacking cycle
  // stack tokens for 3 users
  // fast-forward to next stacking cycle
  // mine tokens for 3 users

  // use v1->v2 legacy migration as example of flow
  // https://github.com/citycoins/contracts/blob/develop/tests/cities/mia/upgrade/miamicoin-core-v1-v2.test.ts
}

// UPGRADE TESTING

// fast-forward to upgrade block height
// process ccip-013-migration

// GOAL: stack one cycle before, during, and after upgrade
// GOAL: mine before, during, and after upgrade
// GOAL: claim mining rewards from legacy/current after upgrade
// GOAL: claim stacking rewards from legacy/current after upgrade
