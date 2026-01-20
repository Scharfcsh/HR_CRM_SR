import express from "express";
import { revokeAllTokens } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/revoke", verifyToken, revokeAllTokens);

export default router;
