import { dataSource, BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts";
import {
  UniswapV3PositionManager,
  IncreaseLiquidity,
  Transfer,
  Collect,
  UniswapV3PositionManager__positionsResult,
} from "../../../generated/UniswapV3/UniswapV3PositionManager";
import { savePositionChange } from "../../common/savePositionChange";
import { PositionChangeAction } from "../../common/PositionChangeAction.enum";
import { PositionType } from "../../common/PositionType.enum";
import {
  getInvestmentId,
  getProtocolId,
} from "../../common/helpers/investmentHelper";
import { UniswapV3Pool } from "../../../generated/UniswapV3/UniswapV3Pool";
import { PositionParams } from "../../common/helpers/positionHelper";
import { LogData, filterAndDecodeLogs } from "../../common/filterEventLogs";
import { feesOf, principalOf } from "./utils/positionAmount";
import { PositionInfo, getLog, getPositionInfo } from "./utils/getPositionInfo";
import { UniswapV3Factory } from "../../../generated/UniswapV3/UniswapV3Factory";
import { savePositionSnapshot } from "../../common/savePositionSnapshot";
import { hex2Uint } from "../../common/helpers/bigintHelper";
import { hash2Address } from "../../common/helpers/hashHelper";
import { Investment, Protocol } from "../../../generated/schema";
import { getContextAddress } from "../../common/helpers/contextHelper";
import { UniswapV3Helper } from "./helper";

export const UNISWAP_V3_PROTOCOL = "UniswapV3";

///////////////////////////////////////////
//////////// Position Changes /////////////
///////////////////////////////////////////

const MINT_TOPIC =
  "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function handleIncreaseLiquidity(event: IncreaseLiquidity): void {
  const tag = event.params.tokenId.toString();
  const mintLog = getLog(
    event,
    MINT_TOPIC,
    "(address,uint128,uint256,uint256)",
    function (log: LogData, event: IncreaseLiquidity): boolean {
      return log.data[1].toBigInt().equals(event.params.liquidity);
    }
  );
  if (!mintLog) {
    throw new Error("Mint log not found");
  }

  const nftTransferLog = getLog(
    event,
    TRANSFER_TOPIC,
    "()",
    function (log: LogData, event: IncreaseLiquidity): boolean {
      return (
        log.address.equals(dataSource.address()) &&
        hex2Uint(log.topics[3].toHexString()).equals(event.params.tokenId) &&
        hash2Address(log.topics[1]).equals(Address.zero())
      );
    }
  );

  const info = getPositionInfo(mintLog);
  const helper = new UniswapV3Helper(info.pool);

  // Created a new position
  let liquidity: BigInt;
  let principals: BigInt[];
  let fees: BigInt[];
  let owner: Address;

  // new position
  if (nftTransferLog) {
    liquidity = event.params.liquidity;
    principals = [event.params.amount0, event.params.amount1];
    fees = [BigInt.zero(), BigInt.zero()];
    owner = hash2Address(nftTransferLog.topics[2]);

    // Update totalSupply of the protocol
    const protocol = helper.getProtocol(event.block);
    if (!protocol) throw new Error("Protocol not found");
    protocol.meta = [event.params.tokenId.toString()]; // totalSupplied
    protocol.save();
  }
  // Added liquidity to an existing position
  else {
    const dbPosition = helper.findNftPosition(event.params.tokenId);
    const pm = UniswapV3PositionManager.bind(dataSource.address());
    if (dbPosition) {
      owner = Address.fromBytes(dbPosition.owner);
    } else {
      owner = pm.ownerOf(event.params.tokenId);
    }

    const poolContract = UniswapV3Pool.bind(info.pool);
    const position = pm.try_positions(event.params.tokenId);

    // In case of a position that has burned in a same blockNumber
    // when the position is created
    // In this case, the position is not found in the contract
    // [IncreaseLiquidity #11622]
    // https://polygonscan.com/tx/0xc7c8de36c5a8e32005114d5fa9d456f36ce55ebc499ab1b6374932aa66be1377#eventlog
    // [Burn #11622]
    // https://polygonscan.com/tx/0xd5c72036741af3921edaa3e02b41f5add29f13521bf6379e6484dc3552b15f8b#eventlog
    if (position.reverted) {
      if (dbPosition) {
        liquidity = dbPosition.liquidity;
        principals = dbPosition.amounts.slice(0, 2);
        fees = dbPosition.amounts.slice(2, 4);
      } else {
        liquidity = event.params.liquidity;
        principals = [event.params.amount0, event.params.amount1];
        fees = [BigInt.zero(), BigInt.zero()];
      }
    } else {
      liquidity = position.value.getLiquidity();
      const slot0 = poolContract.slot0();

      principals = principalOf(
        position.value.getTickLower(),
        position.value.getTickUpper(),
        liquidity,
        slot0.getSqrtPriceX96()
      );
      fees = feesOf(position.value, poolContract, slot0.getTick());
    }
  }

  savePositionChange(
    event,
    PositionChangeAction.Deposit,
    helper,
    new PositionParams(
      owner, // owner
      tag, // tag
      PositionType.Invest, // type
      principals,
      fees,
      liquidity,
      [info.tl.toString(), info.tu.toString()] // meta: [tickLower, tickUpper]
    ),
    [event.params.amount0, event.params.amount1], // inputAmounts
    [BigInt.zero(), BigInt.zero()] // rewardAmounts
  );
}

const BURN_TOPIC =
  "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c";

const DECREASE_LIQUIDITY_TOPIC =
  "0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4";

// Collect event from Pool, not from NFTPositionManager
const COLLECT_TOPIC =
  "0x70935338e69775456a85ddef226c395fb668b63fa0115f5f20610b388e6ca9c0";
export function handleCollect(event: Collect): void {
  const tag = event.params.tokenId.toString();
  const decreaseLiquidityLog = getLog(
    event,
    DECREASE_LIQUIDITY_TOPIC,
    "(uint128,uint256,uint256)",
    function (log: LogData, event: Collect): boolean {
      return hex2Uint(log.topics[1].toHexString()).equals(event.params.tokenId);
    }
  );

  let helper: UniswapV3Helper;
  let owner: Address;
  let liquidity: BigInt;
  let info: PositionInfo;
  let action: PositionChangeAction;
  let currPrincipals: BigInt[];
  let currFees: BigInt[];
  let dInputs: BigInt[];
  let dRewards: BigInt[];

  // Only collect fee
  if (!decreaseLiquidityLog) {
    action = PositionChangeAction.Harvest;
    const collectLog = getLog(
      event,
      COLLECT_TOPIC,
      "(address,uint128,uint128)",
      function (log: LogData, event: Collect): boolean {
        return (
          log.index.equals(event.logIndex.minus(BigInt.fromI32(1))) &&
          event.params.recipient.equals(log.data[0].toAddress())
        );
      }
    );

    if (!collectLog) throw new Error("Collect log not found");

    info = getPositionInfo(collectLog);
    helper = new UniswapV3Helper(info.pool);
    const dbPosition = helper.findNftPosition(event.params.tokenId);

    if (dbPosition) {
      liquidity = dbPosition.liquidity;
      owner = Address.fromBytes(dbPosition.owner);
    } else {
      const pm = UniswapV3PositionManager.bind(dataSource.address());
      const position = pm.try_positions(event.params.tokenId);
      if (position.reverted) {
        liquidity = BigInt.zero();
        owner = event.transaction.from;
      } else {
        liquidity = position.value.getLiquidity();
        owner = pm.ownerOf(event.params.tokenId);
      }
    }

    dInputs = [BigInt.zero(), BigInt.zero()];
    dRewards = [event.params.amount0.neg(), event.params.amount1.neg()];
  }

  // Collect fee and burn liquidity
  else {
    const decreasedLiq = decreaseLiquidityLog.data[0].toBigInt();
    const burnLogs = filterAndDecodeLogs(
      event,
      BURN_TOPIC,
      "(uint128,uint256,uint256)"
    );
    let targetLogIdx = 0;
    for (; targetLogIdx < burnLogs.length; targetLogIdx++) {
      if (burnLogs[targetLogIdx].data[0].toBigInt() == decreasedLiq) break;
    }

    if (targetLogIdx == burnLogs.length) throw new Error("Burn log not found");
    const burnLog = burnLogs[targetLogIdx];

    action = PositionChangeAction.Withdraw;
    info = getPositionInfo(burnLog);
    helper = new UniswapV3Helper(info.pool);

    const dbPosition = helper.findNftPosition(event.params.tokenId);

    if (dbPosition) {
      liquidity = dbPosition.liquidity.minus(burnLog.data[0].toBigInt());
      owner = Address.fromBytes(dbPosition.owner);
    } else {
      const pm = UniswapV3PositionManager.bind(dataSource.address());
      const position = pm.try_positions(event.params.tokenId);
      if (position.reverted) {
        liquidity = BigInt.zero();
        owner = event.transaction.from;
      } else {
        liquidity = position.value.getLiquidity();
        owner = pm.ownerOf(event.params.tokenId);
      }
    }

    dInputs = [
      burnLog.data[1].toBigInt().neg(),
      burnLog.data[2].toBigInt().neg(),
    ];
    dRewards = [
      event.params.amount0.minus(burnLog.data[1].toBigInt()).neg(),
      event.params.amount1.minus(burnLog.data[2].toBigInt()).neg(),
    ];
  }

  if (liquidity.gt(BigInt.zero())) {
    const poolContract = UniswapV3Pool.bind(info.pool);
    currPrincipals = principalOf(
      info.tl,
      info.tu,
      liquidity,
      poolContract.slot0().getSqrtPriceX96()
    );
  } else {
    currPrincipals = [BigInt.zero(), BigInt.zero()];
  }
  currFees = [BigInt.zero(), BigInt.zero()];

  savePositionChange(
    event,
    action,
    helper,
    new PositionParams(
      owner, // owner
      tag, // tag
      PositionType.Invest, // type
      currPrincipals,
      currFees,
      liquidity,
      [info.tl.toString(), info.tu.toString()] // meta: [tickLower, tickUpper]
    ),
    dInputs,
    dRewards
  );
}

// Just transfer position to another address
// Uncommon case
export function handleTransfer(event: Transfer): void {
  const zeroAddress = Address.zero();
  if (
    event.params.from.equals(zeroAddress) ||
    event.params.to.equals(zeroAddress)
  )
    return;

  const pm = UniswapV3PositionManager.bind(dataSource.address());
  const factory = UniswapV3Factory.bind(getContextAddress("factory"));

  const position = pm.try_positions(event.params.tokenId);
  if (position.reverted) return;
  const pool = factory.getPool(
    position.value.getToken0(),
    position.value.getToken1(),
    position.value.getFee()
  );

  const helper = new UniswapV3Helper(pool);
  const poolContract = UniswapV3Pool.bind(pool);
  const slot0 = poolContract.slot0();
  const principals = principalOf(
    position.value.getTickLower(),
    position.value.getTickUpper(),
    position.value.getLiquidity(),
    slot0.getSqrtPriceX96()
  );
  const fees = feesOf(position.value, poolContract, slot0.getTick());

  const positionMeta = [
    position.value.getTickLower().toString(),
    position.value.getTickUpper().toString(),
  ];

  savePositionChange(
    event,
    PositionChangeAction.Send,
    helper,
    new PositionParams(
      event.params.from, // owner
      event.params.tokenId.toString(), // tag
      PositionType.Invest, // type
      [BigInt.zero(), BigInt.zero()], // principals
      [BigInt.zero(), BigInt.zero()], // fees
      BigInt.zero(), // liquidity
      positionMeta
    ),
    [principals[0].neg(), principals[1].neg()], // dInputs
    [fees[0].neg(), fees[1].neg()] // dRewards
  );
  savePositionChange(
    event,
    PositionChangeAction.Receive,
    helper,
    new PositionParams(
      event.params.to, // owner
      event.params.tokenId.toString(), // tag
      PositionType.Invest, // type
      principals,
      fees,
      position.value.getLiquidity(), // liquidity
      positionMeta
    ),
    principals,
    fees
  );
}

///////////////////////////////////////////
////////// Position Snapshots /////////////
///////////////////////////////////////////
export function handleBlock(block: ethereum.Block): void {
  const protocol = Protocol.load(getProtocolId(UNISWAP_V3_PROTOCOL));
  // before initialized
  if (!protocol) return;

  const totalSupply = i32(parseInt(protocol.meta[0]));
  const init = protocol._batchIterator.toI32();
  const snapshotBatch = dataSource.context().getI32("snapshotBatch");
  const pm = UniswapV3PositionManager.bind(dataSource.address());

  for (let tokenId = init; tokenId <= totalSupply; tokenId += snapshotBatch) {
    const tId = BigInt.fromI32(tokenId);
    let owner: Address;
    let investment: Investment | null;
    const dbPosition = UniswapV3Helper.findNft(tId);
    let position: UniswapV3PositionManager__positionsResult;
    
    if (dbPosition == null) {
      const _position = pm.try_positions(tId);
      if (_position.reverted) continue;
      position = _position.value;
      owner = pm.ownerOf(tId);
      const factory = UniswapV3Factory.bind(getContextAddress("factory"));
      const pool = factory.getPool(
        position.getToken0(),
        position.getToken1(),
        position.getFee()
      );
      investment = Investment.load(getInvestmentId(UNISWAP_V3_PROTOCOL, pool));
    } else if (dbPosition.closed) {
      continue;
    } else {
      owner = Address.fromBytes(dbPosition.owner);
      investment = Investment.load(dbPosition.investment);
      const _position = pm.try_positions(tId);
      if (_position.reverted) continue;
      position = _position.value;
    }

    if (investment == null) continue;

    const poolContract = UniswapV3Pool.bind(
      Address.fromBytes(investment.address)
    );

    let principals: BigInt[];
    let fees: BigInt[];
    if (position.getLiquidity().equals(BigInt.zero())) {
      principals = [BigInt.zero(), BigInt.zero()];
      fees = [BigInt.zero(), BigInt.zero()];
    } else {
      const slot0 = poolContract.slot0();
      principals = principalOf(
        position.getTickLower(),
        position.getTickUpper(),
        position.getLiquidity(),
        slot0.getSqrtPriceX96()
      );
      fees = feesOf(position, poolContract, slot0.getTick());
    }

    savePositionSnapshot(
      block,
      new UniswapV3Helper(poolContract._address),
      new PositionParams(
        Address.fromBytes(owner),
        tokenId.toString(),
        PositionType.Invest,
        principals,
        fees,
        position.getLiquidity(),
        [position.getTickLower().toString(), position.getTickUpper().toString()] // meta: [tickLower, tickUpper]
      )
    );
  }

  protocol._batchIterator = BigInt.fromI32((init + 1) % snapshotBatch);
  protocol.save();
}

export function handleOnce(block: ethereum.Block): void {
  new UniswapV3Helper(Address.zero()).getProtocol(block);
}
