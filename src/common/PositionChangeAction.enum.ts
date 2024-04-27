export enum PositionChangeAction {
  Deposit,
  Withdraw,
  Harvest,
  Borrow,
  Repay,
  Liquidate,
  Send,
  Receive,
  Stake,
  Unstake,
  Compound
}

const actions = [
  "Deposit",
  "Withdraw",
  "Harvest",
  "Borrow",
  "Repay",
  "Liquidate",
  "Send",
  "Receive",
  "Stake",
  "Unstake",
  "Compound"
];
export function getAction(actionId: PositionChangeAction): string {
  return actions[actionId];
}
