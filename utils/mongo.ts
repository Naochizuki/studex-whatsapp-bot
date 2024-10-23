import { connect, connection } from "mongoose";
import "dotenv/config";

const connectDB = async () => {
  try {
    const url = process.env.MONGO_URL ?? "";

    await connect(url, {
      autoIndex: true,
    });

    console.log("MongoDB Connected...");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectDB;
