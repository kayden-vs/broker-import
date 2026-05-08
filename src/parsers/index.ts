import { parseIbkrCsv } from "./ibkr";
import { ParseResult } from "./types";
import { parseZerodhaCsv } from "./zerodha";

export type Broker = "zerodha" | "ibkr";

type Parser = (csvText: string) => ParseResult;

const parsers: Record<Broker, Parser> = {
  zerodha: parseZerodhaCsv,
  ibkr: parseIbkrCsv,
};

function getHeaders(csvText: string): string[] {
  const [firstLine = ""] = csvText.replace(/^\uFEFF/, "").split(/\r?\n/, 1);
  return firstLine ? firstLine.split(",") : [];
}

export function detectBroker(csvText: string): Broker {
  const headers = getHeaders(csvText);
  const headerSet = new Set(headers);

  const isZerodha = [
    "symbol",
    "trade_date",
    "trade_type",
    "quantity",
    "price",
  ].every((header) => headerSet.has(header));

  if (isZerodha) {
    return "zerodha";
  }

  const isIbkr = [
    "TradeID",
    "Symbol",
    "DateTime",
    "Buy/Sell",
    "TradePrice",
  ].every((header) => headerSet.has(header));

  if (isIbkr) {
    return "ibkr";
  }

  throw new Error(
    `Unrecognized broker format. Got headers: ${headers.join(",")}`,
  );
}

export function parseCsv(broker: Broker, csvText: string): ParseResult {
  return parsers[broker](csvText);
}
