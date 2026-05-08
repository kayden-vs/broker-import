import { Trade } from "../schemas/trade";

export type ParseResult = {
  trades: Trade[];
  errors: Array<{ row: number; reason: string }>;
};
