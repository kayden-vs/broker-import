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

function normalizeSymbol(value: string): string {
  return /^[A-Za-z]{3}\.[A-Za-z]{3}$/.test(value)
    ? value.replace(".", "/")
    : value;
}

function parseIsoDate(value: string): string | null {
  const isoWithTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

  if (!isoWithTimezone.test(value)) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseUsDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
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

function parseDate(value: string): string | null {
  return parseIsoDate(value) ?? parseUsDate(value);
}

function parseSide(value: string): "BUY" | "SELL" | null {
  if (value === "BOT") {
    return "BUY";
  }

  if (value === "SLD") {
    return "SELL";
  }

  return null;
}

function getValidationMessage(messages: string[]): string {
  return messages.join("; ");
}

export function parseIbkrCsv(csvText: string): ParseResult {
  const result: ParseResult = {
    trades: [],
    errors: [],
  };

  const rows = parseRows(csvText);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const dateTime = row["DateTime"] ?? "";
      const executedAt = parseDate(dateTime);
      if (!executedAt) {
        result.errors.push({
          row: rowNumber,
          reason: `Invalid date: '${dateTime}'`,
        });
        return;
      }

      const buySell = row["Buy/Sell"] ?? "";
      const side = parseSide(buySell);
      if (!side) {
        result.errors.push({
          row: rowNumber,
          reason: `Invalid side: '${buySell}'`,
        });
        return;
      }

      const quantity = Number.parseFloat(row["Quantity"] ?? "");
      const price = Number.parseFloat(row["TradePrice"] ?? "");

      const validation = TradeSchema.safeParse({
        symbol: normalizeSymbol(row["Symbol"] ?? ""),
        side,
        quantity,
        price,
        totalAmount: side === "BUY" ? quantity * price : -(quantity * price),
        currency: row["Currency"] ?? "",
        executedAt,
        broker: "ibkr",
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
