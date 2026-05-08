import { parse } from "csv-parse/sync";

import { TradeSchema } from "../schemas/trade";
import { ParseResult } from "./types";

type CsvRow = Record<string, string>;

function isCsvRow(value: unknown): value is CsvRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}

function parseRows(csvText: string): CsvRow[] {
  if (!csvText.trim()) {
    return [];
  }

  const records: unknown = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter(isCsvRow);
}

function parseDate(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function parseSide(value: string): "BUY" | "SELL" | null {
  const normalized = value.toUpperCase();
  if (normalized === "BUY" || normalized === "SELL") {
    return normalized;
  }

  return null;
}

function getValidationMessage(messages: string[]): string {
  return messages.join("; ");
}

export function parseZerodhaCsv(csvText: string): ParseResult {
  const result: ParseResult = {
    trades: [],
    errors: [],
  };

  const rows = parseRows(csvText);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const tradeDate = row["trade_date"] ?? "";
      const executedAt = parseDate(tradeDate);
      if (!executedAt) {
        result.errors.push({
          row: rowNumber,
          reason: `Invalid date: '${tradeDate}'`,
        });
        return;
      }

      const tradeType = row["trade_type"] ?? "";
      const side = parseSide(tradeType);
      if (!side) {
        result.errors.push({
          row: rowNumber,
          reason: `Invalid side: '${tradeType}'`,
        });
        return;
      }

      const quantity = Number.parseFloat(row["quantity"] ?? "");
      const price = Number.parseFloat(row["price"] ?? "");

      const validation = TradeSchema.safeParse({
        symbol: row["symbol"] ?? "",
        side,
        quantity,
        price,
        totalAmount: side === "BUY" ? quantity * price : -(quantity * price),
        currency: "INR",
        executedAt,
        broker: "zerodha",
        rawData: row,
      });

      if (!validation.success) {
        result.errors.push({
          row: rowNumber,
          reason: getValidationMessage(
            validation.error.issues.map((issue) => issue.message),
          ),
        });
        return;
      }

      result.trades.push(validation.data);
    } catch (error: unknown) {
      result.errors.push({
        row: rowNumber,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return result;
}
