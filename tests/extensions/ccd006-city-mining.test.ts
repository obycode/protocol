/**
 * Test class is structured;
 * 0. AUTHORIZATION CHECKS
 * 1. MINING
 *    - mine
 * 2. CLAIMING
 *    - claim-mining-reward
 * 3. REWARD DELAY
 *    - set-reward-delay
 */
import { Account, assertEquals, Clarinet, Chain } from "../../utils/deps.ts";
import { constructAndPassProposal, passProposal, PROPOSALS } from "../../utils/common.ts";
import { CCD006CityMining } from "../../models/extensions/ccd006-city-mining.model.ts";
import { CCD002Treasury } from "../../models/extensions/ccd002-treasury.model.ts";
import { CCD003UserRegistry } from "../../models/extensions/ccd003-user-registry.model.ts";
import { CCD005CityData } from "../../models/extensions/ccd005-city-data.model.ts";
import { types } from "../../utils/deps.ts";

// =============================
// INTERNAL DATA / FUNCTIONS
// =============================
const rewardDelay = 100;
const miaCityId = 1;
const miaCityName = "mia";
const miaTreasuryId = 1;
const miaMiningTreasuryName = "mining";
const miaTreasuryName = "ccd002-treasury-mia-mining";

const dumpMiningData = (ccd006CityMining: any, cityId: number, height: number, userId: number, miningStatsAt: object, minerAt: object) => {
  console.log("getMiningStatsAtBlock: [height: " + height + "] --> " + ccd006CityMining.getMiningStatsAtBlock(cityId, height).result);
  //console.log("getMiningStatsAtBlock: [height: " + height + "] --> ", miningStatsAt);
  console.log("getMinerAtBlock: [height: " + height + ", userId: " + userId + "] --> " + ccd006CityMining.getMinerAtBlock(cityId, height, userId).result);
  //console.log("getMinerAtBlock: [height: " + height + ", userId: " + userId + "] --> ", minerAt);
};

const checkMiningData = (ccd006CityMining: any, cityId: number, height: number, userId: number, miningStatsAt: object, minerAt: object) => {
  let expectedStats = {
    amount: types.uint(miningStatsAt.amount),
    claimed: types.bool(miningStatsAt.claimed),
    miners: types.uint(miningStatsAt.miners),
  };
  assertEquals(ccd006CityMining.getMiningStatsAtBlock(cityId, height).result.expectTuple(), expectedStats);

  expectedStats = {
    commit: types.uint(minerAt.commit),
    high: types.uint(minerAt.high),
    low: types.uint(minerAt.low),
    winner: types.bool(minerAt.winner),
  };
  assertEquals(ccd006CityMining.getMinerAtBlock(cityId, height, userId).result.expectTuple(), expectedStats);
};

// =============================
// 0. AUTHORIZATION CHECKS
// =============================

Clarinet.test({
  name: "ccd006-city-mining: is-dao-or-extension() fails when called directly",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act

    // assert
    ccd006CityMining.isDaoOrExtension().result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_UNAUTHORIZED);
  },
});

// Extension callback

Clarinet.test({
  name: "ccd006-city-mining: callback() succeeds when called directly",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const { receipts } = chain.mineBlock([ccd006CityMining.callback(sender, "test")]);

    // assert
    assertEquals(receipts.length, 1);
    receipts[0].result.expectOk().expectBool(true);
  },
});

// =============================
// 1. MINING
// =============================

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if city is not registered",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    const { receipts } = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    assertEquals(receipts.length, 1);
    receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_ID_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if city is not active",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_NOT_ACTIVATED);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if city details are not set",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    //passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_DETAILS_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if city treasury is not set",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_TREASURY_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if mining contract is not a valid dao extension",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_001);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    ccd005CityData.getCityTreasuryId(miaCityId, miaMiningTreasuryName).result.expectSome().expectUint(1);
    ccd005CityData.getCityTreasuryName(miaCityId, miaTreasuryId).result.expectSome().expectAscii(miaMiningTreasuryName);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD003UserRegistry.ErrCode.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if user has insufficient balance",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [100000000000001];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_INSUFFICIENT_BALANCE);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() succeeds if user's cumulative commit uses their exact balance",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd002Treasury = new CCD002Treasury(chain, sender, "ccd002-treasury-mia-mining");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [50000000000000, 50000000000000];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    ccd002Treasury.getBalanceStx().result.expectUint(100000000000000);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if user's cumulative commit leaves insufficient balance",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd002Treasury = new CCD002Treasury(chain, sender, "ccd002-treasury-mia-mining");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [50000000000000, 50000000000000, 1];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    ccd002Treasury.getBalanceStx().result.expectUint(0);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_INSUFFICIENT_BALANCE);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if city has been de-activated",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries = [10, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_003);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    ccd005CityData.getCityTreasuryId(miaCityId, miaMiningTreasuryName).result.expectSome().expectUint(1);
    ccd005CityData.getCityTreasuryName(miaCityId, miaTreasuryId).result.expectSome().expectAscii(miaMiningTreasuryName);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_NOT_ACTIVATED);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails called with no commit amounts",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    ccd005CityData.getCityTreasuryId(miaCityId, miaMiningTreasuryName).result.expectSome().expectUint(1);
    ccd005CityData.getCityTreasuryName(miaCityId, miaTreasuryId).result.expectSome().expectAscii(miaMiningTreasuryName);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_INVALID_COMMIT_AMOUNTS);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if a commit amount is insufficient",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10, 0, 10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_INSUFFICIENT_COMMIT);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() successfully mines 1 block",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert
    const firstBlock = 8;
    const lastBlock = 8;
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    block.receipts[0].events.expectSTXTransferEvent(10, sender.address, `${sender.address}.${miaTreasuryName}`);
    const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(userId)}}`;

    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() fails if already mined",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd002Treasury = new CCD002Treasury(chain, sender, "ccd002-treasury-mia-mining");
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");
    const firstBlock = 8;
    const lastBlock = 10;
    const totalAmount = 30;
    const totalBlocks = 3;
    const userId = 1;
    const entries: number[] = [10, 10, 10];

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    const block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries), ccd006CityMining.mine(sender, miaCityName, entries)]);

    // assert

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_ALREADY_MINED);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    block.receipts[0].events.expectSTXTransferEvent(totalAmount, sender.address, `${sender.address}.${miaTreasuryName}`);

    // block.receipts[1].events.expectSTXTransferEvent(totalAmount, sender.address, `${sender.address}.${miaTreasuryName}`);

    const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(userId)}}`;

    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    // Expecting ERR_ALREADY_MINED if same user tried mine twice at same height ?
    block.receipts[1].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_ALREADY_MINED);
    // and for the treasury balance to show the first tx only ..
    ccd002Treasury.getBalanceStx().result.expectUint(totalAmount);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: mine() keeps track of mining stats for 4 users mining 3 blocks concurrently",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const users = [accounts.get("wallet_1")!, accounts.get("wallet_2")!, accounts.get("wallet_3")!, accounts.get("wallet_4")!];

    const ccd002Treasury = new CCD002Treasury(chain, sender, "ccd002-treasury-mia-mining");
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");
    const ccd003UserRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    const firstBlock = 8;
    const lastBlock = 10;
    const totalAmount = 120;
    const totalBlocks = 3;
    const userId = 1;
    const entries: number[] = [10, 10, 10];

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    const block = chain.mineBlock([ccd006CityMining.mine(users[0], miaCityName, entries), ccd006CityMining.mine(users[1], miaCityName, entries), ccd006CityMining.mine(users[2], miaCityName, entries), ccd006CityMining.mine(users[3], miaCityName, entries)]);

    // assert
    let miningStatsAt, minerAt;
    for (let idx = 0; idx < 4; idx++) {
      block.receipts[idx].result.expectOk().expectBool(true);
      ccd003UserRegistry
        .getUserId(users[idx].address)
        .result.expectSome()
        .expectUint(idx + 1);
      ccd003UserRegistry
        .getUser(idx + 1)
        .result.expectSome()
        .expectPrincipal(users[idx].address);
      block.receipts[idx].events.expectSTXTransferEvent(30, users[idx].address, `${sender.address}.${miaTreasuryName}`);

      const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount / 4)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(idx + 1)}}`;
      block.receipts[idx].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);
    }

    for (let idx1 = 0; idx1 < entries.length; idx1++) {
      // 3 blocks
      for (let idx = 0; idx < users.length; idx++) {
        // 4 users
        miningStatsAt = { amount: users.length * entries[idx1], claimed: false, miners: users.length };
        minerAt = { commit: 10, high: 10 * (idx + 1), low: idx === 0 ? 0 : idx * 10 + 1, winner: false };
        //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock + idx1), (idx + 1), miningStatsAt, minerAt);
        checkMiningData(ccd006CityMining, miaCityId, firstBlock + idx1, idx + 1, miningStatsAt, minerAt);
      }
    }

    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    // check that total balance was transferred to treasury
    ccd002Treasury.getBalanceStx().result.expectUint(totalAmount);
    ccd006CityMining.getHighValue(miaCityId, firstBlock).result.expectUint(totalAmount / 3);
    ccd006CityMining.getHighValue(miaCityId, lastBlock).result.expectUint(totalAmount / 3);
    ccd006CityMining.getHighValue(miaCityId, lastBlock + 1).result.expectUint(0);
  },
});

// =============================
// 2. CLAIMING
// =============================

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() is not possible for an unknown city",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const { receipts } = chain.mineBlock([ccd006CityMining.claimMiningReward(sender, miaCityName, 50)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(100);
    receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_ID_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() is not possible for an inactive city",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_003);
    const { receipts } = chain.mineBlock([ccd006CityMining.claimMiningReward(sender, miaCityName, 50)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(100);
    receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_CITY_NOT_ACTIVATED);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() is not possible if current tip height is less than maturity height ",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    const block = chain.mineBlock([ccd006CityMining.claimMiningReward(sender, miaCityName, 50)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(100);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_REWARD_NOT_MATURE);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() is not possible if current tip height is equal to maturity height ",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    const claimHeight = 7;
    chain.mineEmptyBlock(rewardDelay);
    const block = chain.mineBlock([ccd006CityMining.claimMiningReward(sender, miaCityName, claimHeight)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_REWARD_NOT_MATURE);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() is not possible if user is not registered",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    const claimHeight = 5; // one less than actual bh
    chain.mineEmptyBlock(rewardDelay);
    const block = chain.mineBlock([ccd006CityMining.claimMiningReward(sender, miaCityName, claimHeight)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_USER_ID_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() returns sensible values if called without having mined",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD003_USER_REGISTRY_001);
    const claimHeight = 6; // one less than actual bh
    chain.mineEmptyBlock(rewardDelay);
    const block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, claimHeight)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_MINER_DATA_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() fails if a user tries claiming another users rewards",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    let block = chain.mineBlock([ccd006CityMining.mine(sender, miaCityName, entries)]);
    const claimHeight = block.height - 1; // one less than actual bh
    chain.mineEmptyBlock(rewardDelay);
    block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, claimHeight)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_USER_ID_NOT_FOUND);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() fails if there is nothing to mint at the given claim height",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    let block = chain.mineBlock([ccd006CityMining.mine(user, miaCityName, entries)]);
    const claimHeight = block.height - 1; // one less than actual bh
    chain.mineEmptyBlock(rewardDelay);
    block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, claimHeight)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() fails if the coinbase amounts have not been set for the given city",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    let block = chain.mineBlock([ccd006CityMining.mine(user, miaCityName, entries)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].result.expectOk().expectBool(true);
    const firstBlock = 8;
    const lastBlock = 8;
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    block.receipts[0].events.expectSTXTransferEvent(10, user.address, `${sender.address}.${miaTreasuryName}`);
    const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(userId)}}`;
    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    const miningStatsAt = { amount: 10, claimed: false, miners: 1 };
    const minerAt = { commit: 10, high: 11, low: 0, winner: false };
    // dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);

    const claimHeight = block.height - 1;
    chain.mineEmptyBlock(rewardDelay + 1);
    block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, claimHeight)]);

    // assert

    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() returns sensible values if called at the wrong claim height",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_007);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    let block = chain.mineBlock([ccd006CityMining.mine(user, miaCityName, entries)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].result.expectOk().expectBool(true);
    const firstBlock = 9;
    const lastBlock = 9;
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    block.receipts[0].events.expectSTXTransferEvent(10, user.address, `${sender.address}.${miaTreasuryName}`);
    const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(userId)}}`;
    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    const miningStatsAt = { amount: 10, claimed: false, miners: 1 };
    const minerAt = { commit: 10, high: 11, low: 0, winner: false };
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);

    const claimHeight = block.height - 1;
    chain.mineEmptyBlock(rewardDelay + 1);

    block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, claimHeight)]);

    // assert

    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() allows user to claim rewards",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user = accounts.get("wallet_1")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const entries: number[] = [10];
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_007);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);
    let block = chain.mineBlock([ccd006CityMining.mine(user, miaCityName, entries)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].result.expectOk().expectBool(true);
    const firstBlock = 9;
    const lastBlock = 9;
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    block.receipts[0].events.expectSTXTransferEvent(10, user.address, `${sender.address}.${miaTreasuryName}`);
    const expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(userId)}}`;
    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    const miningStatsAt = { amount: 10, claimed: false, miners: 1 };
    const minerAt = { commit: 10, high: 11, low: 0, winner: false };
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);

    chain.mineEmptyBlock(rewardDelay);
    block = chain.mineBlock([ccd006CityMining.claimMiningReward(user, miaCityName, firstBlock)]);

    // assert

    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);
    block.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() fails if user is not the winner or if there is nothing to mint",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");
    const firstBlock = 9;
    const lastBlock = 9;
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    const entries: number[] = [10];

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_007);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);

    const block1 = chain.mineBlock([ccd006CityMining.mine(user1, miaCityName, entries), ccd006CityMining.mine(user2, miaCityName, entries)]);

    chain.mineEmptyBlock(rewardDelay);
    const block2 = chain.mineBlock([ccd006CityMining.claimMiningReward(user1, miaCityName, firstBlock), ccd006CityMining.claimMiningReward(user2, miaCityName, firstBlock)]);

    // assert

    block1.receipts[0].result.expectOk().expectBool(true);
    block1.receipts[1].result.expectOk().expectBool(true);

    //const miningStatsAt = { amount: 10, claimed: false, miners: 1 };
    //const minerAt = { commit: 10, high: 11, low: 0, winner: false };
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (2), miningStatsAt, minerAt);

    if (block2.receipts[0].result === "(err u6011)") {
      console.log("USER 2 WINS");
      block2.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_MINER_NOT_WINNER);
      block2.receipts[1].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
    } else {
      console.log("USER 1 WINS");
      block2.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_NOTHING_TO_MINT);
      block2.receipts[1].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_MINER_NOT_WINNER);
    }

    block1.receipts[0].events.expectSTXTransferEvent(10, user1.address, `${sender.address}.${miaTreasuryName}`);
    block1.receipts[1].events.expectSTXTransferEvent(10, user2.address, `${sender.address}.${miaTreasuryName}`);

    let expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(1)}}`;
    block1.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);
    expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(firstBlock)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(2)}}`;
    block1.receipts[1].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);

    //ccd006CityMining.getBlockWinner(miaCityId, firstBlock).result.expectUint(2);
    ccd006CityMining.getBlockWinner(miaCityId, firstBlock).result.expectNone();
  },
});

Clarinet.test({
  name: "ccd006-city-mining: claim-mining-reward() user makes successful claim",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const ccd005CityData = new CCD005CityData(chain, sender, "ccd005-city-data");
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");
    const totalAmount = 10;
    const totalBlocks = 1;
    const userId = 1;
    const entries: number[] = [10];

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_009);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_010);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_018);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_002);
    ccd005CityData.getCityTreasuryNonce(miaCityId).result.expectUint(1);

    const miningBlock = chain.mineBlock([ccd006CityMining.mine(user1, miaCityName, entries), ccd006CityMining.mine(user2, miaCityName, entries)]);
    // console.log(JSON.stringify(miningBlock, null, 2));
    const claimHeight = miningBlock.height - 1;
    const lastBlock = claimHeight + totalBlocks - 1;
    chain.mineEmptyBlock(rewardDelay + 1);

    const miningClaimBlock = chain.mineBlock([ccd006CityMining.claimMiningReward(user1, miaCityName, claimHeight), ccd006CityMining.claimMiningReward(user2, miaCityName, claimHeight)]);

    // assert
    ccd005CityData.getCityCoinbaseAmounts(miaCityId).result.expectSome().expectTuple();
    ccd005CityData.getCityCoinbaseThresholds(miaCityId).result.expectSome().expectTuple();

    miningBlock.receipts[0].result.expectOk().expectBool(true);
    miningBlock.receipts[1].result.expectOk().expectBool(true);

    //const miningStatsAt = { amount: 10, claimed: false, miners: 1 };
    //const minerAt = { commit: 10, high: 11, low: 0, winner: false };
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);
    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (2), miningStatsAt, minerAt);

    /**
     * TODO MJC: Note that the previous test does not set coinbase amounts
     * this one sets the amounts and thresholds via CITY_DATA 009 and 010
     */
    if (miningClaimBlock.receipts[0].result === "(err u6010)") {
      console.log("USER 2 WINS");
      miningClaimBlock.receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_ALREADY_CLAIMED);
      miningClaimBlock.receipts[1].result.expectOk().expectBool(true);
    } else {
      console.log("USER 1 WINS");
      miningClaimBlock.receipts[0].result.expectOk().expectBool(true);
      miningClaimBlock.receipts[1].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_ALREADY_CLAIMED);
    }

    miningBlock.receipts[0].events.expectSTXTransferEvent(10, user1.address, `${sender.address}.${miaTreasuryName}`);
    miningBlock.receipts[1].events.expectSTXTransferEvent(10, user2.address, `${sender.address}.${miaTreasuryName}`);
    // {action: \"mining\", cityId: u1, cityName: \"mia\", cityTreasury: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.ccd002-treasury-mia-mining, firstBlock: u10, lastBlock: u10, totalAmount: u10, totalBlocks: u1, userId: u1}"}
    let expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(claimHeight)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(1)}}`;
    // console.log(JSON.stringify(miningBlock.receipts[0].events), null, 2);
    miningBlock.receipts[0].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);
    expectedPrintMsg = `{action: "mining", cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, firstBlock: ${types.uint(claimHeight)}, lastBlock: ${types.uint(lastBlock)}, totalAmount: ${types.uint(totalAmount)}, totalBlocks: ${types.uint(totalBlocks)}, userId: ${types.uint(2)}}`;
    miningBlock.receipts[1].events.expectPrintEvent(`${sender.address}.ccd006-city-mining`, expectedPrintMsg);

    //dumpMiningData(ccd006CityMining, miaCityId, (firstBlock), (1), miningStatsAt, minerAt);
    ccd006CityMining.getRewardDelay().result.expectUint(rewardDelay);

    //ccd006CityMining.getBlockWinner(miaCityId, firstBlock).result.expectUint(2);
    ccd006CityMining.getBlockWinner(miaCityId, claimHeight).result.expectSome().expectUint(1);
  },
});

// =============================
// 3. REWARD DELAY
// =============================

Clarinet.test({
  name: "ccd006-city-mining: set-reward-delay() can only be called by the dao",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const { receipts } = chain.mineBlock([ccd006CityMining.setRewardDelay(sender, 50)]);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(100);
    receipts[0].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: set-reward-delay() cannot set a zero block delay",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");

    // act
    const receipts = constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_004);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(100);
    receipts[3].result.expectErr().expectUint(CCD006CityMining.ErrCode.ERR_INVALID_DELAY);
  },
});

Clarinet.test({
  name: "ccd006-city-mining: set-reward-delay() can only be called by the dao",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd006CityMining = new CCD006CityMining(chain, sender, "ccd006-city-mining");
    ccd006CityMining.getRewardDelay().result.expectUint(100);

    // act
    const receipts = constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD006_CITY_MINING_003);

    // assert
    ccd006CityMining.getRewardDelay().result.expectUint(50);
    assertEquals(receipts.length, 4);
    receipts[3].result.expectOk();
  },
});
