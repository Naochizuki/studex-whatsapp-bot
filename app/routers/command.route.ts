import express, { Router } from "express";
import { createCommand, getCommands } from "../controllers/command.controller";

const router: Router = express.Router();

router.post("/api/v1/commands", createCommand);
router.get("/api/v1/commands", getCommands);

export default router;
