import { Router } from "express";

import { importRouter } from "./import";

export const router = Router();

router.use("/import", importRouter);
