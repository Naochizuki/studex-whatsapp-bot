import GroupChat from "../models/groupChat.model";
import { handleErrors } from "../../utils/common";

export const createGroupChat = async (req: any, res: any) => {
  const groupChatDocs = req.body;
  try {
    groupChatDocs.isActive = true;
    const newGroupChat = new GroupChat(groupChatDocs);
    await newGroupChat.save();

    res.status(200).json(newGroupChat);
  } catch (err: any) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};

export const getGroupChats = async (req: any, res: any) => {
  try {
    const groupChats = await GroupChat.find({ isActive: true });

    res.status(200).json(groupChats);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
