import { parseIbkrCsv } from "../src/parsers/ibkr";

const IBKR_SAMPLE_CSV = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK
U1234-002,U1234567,MSFT,2026-04-01T15:45:00Z,SLD,50,420.25,USD,-1.00,-21011.50,STK
U1234-003,U1234567,EUR.USD,2026-04-02T09:00:00Z,BOT,10000,1.0850,USD,-2.00,10848.00,CASH
U1234-004,U1234567,TSLA,04/03/2026,BOT,25,245.00,USD,-1.00,6124.00,STK
U1234-005,U1234567,AMZN,2026-04-03T16:20:00Z,SLD,0,190.75,USD,-1.00,0.00,STK
U1234-006,U1234567,GOOGL,2026-04-04T10:15:00Z,BOT,30,175.50,USD,,5265.00,STK`;

describe("parseIbkrCsv", () => {
  it("parses the full sample and skips invalid rows", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);

    expect(result.trades).toHaveLength(5);
    expect(result.errors).toHaveLength(1);
  });

  it("captures zero quantity validation errors", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const error = result.errors.find((entry) =>
      entry.reason.includes("greater than 0"),
    );

    expect(error).toEqual(
      expect.objectContaining({
        row: 6,
      }),
    );
    expect(error?.reason).toContain("greater than 0");
  });

  it("parses MM/DD/YYYY values into midnight UTC", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const tslaTrade = result.trades.find((trade) => trade.symbol === "TSLA");

    expect(tslaTrade?.executedAt).toBe("2026-04-03T00:00:00.000Z");
  });

  it("preserves empty Commission values in rawData", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const googlTrade = result.trades.find((trade) => trade.symbol === "GOOGL");

    expect(googlTrade).toBeDefined();
    expect(googlTrade?.rawData).toHaveProperty("Commission", "");
  });

  it("normalizes forex symbols", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const forexTrade = result.trades.find((trade) => trade.symbol === "EUR/USD");

    expect(forexTrade).toBeDefined();
  });

  it("maps BOT and SLD sides correctly", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const buyTrade = result.trades.find((trade) => trade.symbol === "AAPL");
    const sellTrade = result.trades.find((trade) => trade.symbol === "MSFT");

    expect(buyTrade?.side).toBe("BUY");
    expect(sellTrade?.side).toBe("SELL");
  });

  it("keeps broker-specific rawData fields", () => {
    const result = parseIbkrCsv(IBKR_SAMPLE_CSV);
    const firstTrade = result.trades[0];

    expect(firstTrade.rawData).toEqual(
      expect.objectContaining({
        AccountID: "U1234567",
        AssetClass: "STK",
        Commission: "-1.00",
        NetAmount: "18549.00",
      }),
    );
  });
});
