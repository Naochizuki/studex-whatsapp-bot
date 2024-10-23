import express, { Router } from "express";
import {
  createGroupChat,
  getGroupChats,
} from "../controllers/groupChat.controller";

const router: Router = express.Router();

router.post("api/v1/group-chats", createGroupChat);
router.get("api/v1/group-chats", getGroupChats);

export default router;
