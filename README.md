## Install

```bash
npm install
```

## Run the server

```bash
npm start
# Server runs on http://localhost:3000
```

## Run tests

```bash
npm test
```

## Test the endpoint manually

```bash
# Save one of the sample CSVs to a file, then:
curl -X POST http://localhost:3000/import \
  -F "file=@zerodha_sample.csv"
```

## Design decisions

- The service uses a parser-per-broker pattern. Each broker parser is a pure function that owns its own column mapping and validation rules, while [src/parsers/index.ts](/c:/Users/rohit/OneDrive/Desktop/broker-import/src/parsers/index.ts) handles broker detection and dispatch. To add Broker C, create a new parser file and register one new entry in that dispatcher.
- `safeParse` is used instead of `parse` so invalid rows can be collected into the `errors` array without throwing and aborting the import. That keeps the parser resilient and lets valid trades still be returned.
- `rawData` stores the original CSV row object exactly as `csv-parse` produced it. That preserves the source payload for debugging, auditing, and future broker-specific enrichment without losing fields that are not part of the normalized trade schema.
- Row numbers are 1-based and count the CSV header as row 1, so the first data row is row 2. The parsers compute error row numbers from the record index using that convention.
