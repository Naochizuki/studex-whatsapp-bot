import express, { Router } from "express";
import { createUser, getUsers } from "../controllers/user.controller";

const router: Router = express.Router();

router.post("/api/v1/users", createUser);
router.get("/api/v1/users", getUsers);

export default router;
