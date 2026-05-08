import { Router } from "express";
import multer from "multer";

import { detectBroker, parseCsv } from "../parsers";

const upload = multer({
  storage: multer.memoryStorage(),
});

export const importRouter = Router();

importRouter.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const csvText = req.file.buffer.toString("utf-8");

    if (!csvText.trim()) {
      return res.status(400).json({ error: "File is empty" });
    }

    const broker = detectBroker(csvText);
    const result = parseCsv(broker, csvText);

    return res.json({
      broker,
      summary: {
        total: result.trades.length + result.errors.length,
        valid: result.trades.length,
        skipped: result.errors.length,
      },
      trades: result.trades,
      errors: result.errors,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.startsWith("Unrecognized broker format.")
    ) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
});
