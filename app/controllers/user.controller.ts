import User from "../models/user.model";
import { handleErrors } from "../../utils/common";

export const createUser = async (req: any, res: any) => {
  const userDocs = req.body;
  try {
    userDocs.isActive = true;
    const newUser = new User(userDocs);
    await newUser.save();

    res.status(200).json(newUser);
  } catch (err: any) {
    const errors = handleErrors(err);
    res.status(400).json(errors);
  }
};

export const getUsers = async (req: any, res: any) => {
  try {
    const users = await User.find({ isActive: true });

    res.status(200).json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
