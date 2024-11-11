import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import connectDB from "./utils/mongo";
import connectWA from "./utils/whatsapp";
import "dotenv/config";

import CommandRoute from "./app/routers/command.route";

export const app = express();
const port = 8080;

connectDB();
connectWA();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());
app.use(CommandRoute);

app.disable("x-powered-by");

// Menjalankan server express
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
