import { parseZerodhaCsv } from "../src/parsers/zerodha";

const ZERODHA_SAMPLE_CSV = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ
INFY,INE009A01021,01-04-2026,sell,25,1520.75,TRD002,ORD002,NSE,EQ
TATAMOTORS,INE155A01022,02-04-2026,buy,50,650.00,TRD003,ORD003,BSE,EQ
HDFCBANK,,03-04-2026,buy,15,1680.30,TRD004,ORD004,NSE,EQ
SBIN,INE062A01020,03-04-2026,SELL,30,820.45,TRD005,ORD005,NSE,EQ
RELIANCE,INE002A01018,invalid_date,buy,10,2480.00,TRD006,ORD006,NSE,EQ
WIPRO,INE075A01022,05-04-2026,buy,-5,450.00,TRD007,ORD007,NSE,EQ`;

describe("parseZerodhaCsv", () => {
  it("parses the full sample and skips invalid rows", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);

    expect(result.trades).toHaveLength(5);
    expect(result.errors).toHaveLength(2);
  });

  it("captures invalid dates as row errors", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);
    const error = result.errors.find((entry) =>
      entry.reason.includes("Invalid date"),
    );

    expect(error).toEqual(
      expect.objectContaining({
        row: 7,
      }),
    );
    expect(error?.reason).toContain("Invalid date");
  });

  it("captures negative quantity validation errors", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);
    const error = result.errors.find((entry) =>
      entry.reason.includes("greater than 0"),
    );

    expect(error).toEqual(
      expect.objectContaining({
        row: 8,
      }),
    );
    expect(error?.reason).toContain("greater than 0");
  });

  it("accepts uppercase SELL values", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);
    const sellTrade = result.trades.find((trade) => trade.symbol === "SBIN");

    expect(sellTrade?.side).toBe("SELL");
  });

  it("allows an empty isin value", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);
    const hdfcTrade = result.trades.find((trade) => trade.symbol === "HDFCBANK");

    expect(hdfcTrade).toBeDefined();
    expect(hdfcTrade?.rawData).toHaveProperty("isin", "");
  });

  it("produces ISO 8601 executedAt values", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);

    result.trades.forEach((trade) => {
      expect(new Date(trade.executedAt).toISOString()).toBe(trade.executedAt);
    });
  });

  it("uses INR for all valid trades", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);

    expect(result.trades.every((trade) => trade.currency === "INR")).toBe(true);
  });

  it("preserves the original row keys in rawData", () => {
    const result = parseZerodhaCsv(ZERODHA_SAMPLE_CSV);
    const firstTrade = result.trades[0];

    expect(firstTrade.rawData).toEqual(
      expect.objectContaining({
        symbol: "RELIANCE",
        isin: "INE002A01018",
        trade_date: "01-04-2026",
        trade_type: "buy",
        quantity: "10",
        price: "2450.50",
        trade_id: "TRD001",
        order_id: "ORD001",
        exchange: "NSE",
        segment: "EQ",
      }),
    );
  });

  it("returns empty results for an empty CSV string", () => {
    const result = parseZerodhaCsv("");

    expect(result).toEqual({
      trades: [],
      errors: [],
    });
  });

  it("returns empty results for a header-only CSV", () => {
    const result = parseZerodhaCsv(
      "symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment",
    );

    expect(result).toEqual({
      trades: [],
      errors: [],
    });
  });
});
