export enum PositionType {
  Invest,
  Borrow,
}

const types = ["Invest", "Borrow"];
export function getPosType(typeId: PositionType): string {
  return types[typeId];
}
