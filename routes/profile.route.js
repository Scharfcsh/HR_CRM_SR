import express from "express";
import {
	getEmployeeProfile,
	updateEmployeeProfile,
} from "../controllers/employee.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.patch("/me", verifyToken, updateEmployeeProfile);
router.post("/:userId", verifyToken, getEmployeeProfile);

export default router;
