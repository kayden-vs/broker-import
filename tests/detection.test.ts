import { detectBroker } from "../src/parsers";

const ZERODHA_HEADERS = `symbol,isin,trade_date,trade_type,quantity,price,trade_id,order_id,exchange,segment
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50,TRD001,ORD001,NSE,EQ`;

const IBKR_HEADERS = `TradeID,AccountID,Symbol,DateTime,Buy/Sell,Quantity,TradePrice,Currency,Commission,NetAmount,AssetClass
U1234-001,U1234567,AAPL,2026-04-01T14:30:00Z,BOT,100,185.50,USD,-1.00,18549.00,STK`;

describe("detectBroker", () => {
  it("detects Zerodha CSV headers", () => {
    expect(detectBroker(ZERODHA_HEADERS)).toBe("zerodha");
  });

  it("detects IBKR CSV headers", () => {
    expect(detectBroker(IBKR_HEADERS)).toBe("ibkr");
  });

  it("throws for unknown headers", () => {
    expect(() => detectBroker("foo,bar,baz\n1,2,3")).toThrow(
      /Unrecognized broker format/,
    );
  });

  it("throws for an empty string", () => {
    expect(() => detectBroker("")).toThrow();
  });
});
