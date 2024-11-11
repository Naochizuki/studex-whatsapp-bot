import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import connectDB from "./utils/mongo";
import connectWA from "./utils/whatsapp";
import "dotenv/config";

import CommandRoute from "./app/routers/command.route";

export const app = express();
const port = 8888;

connectDB();
const qrCode = connectWA();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());
app.use(CommandRoute);

app.get('/qr', (req, res) => {
  if (qrCodeUrl) {
    res.send(`<img src=${qrCodeUrl} alt="QR Code" />`);
  } else {
    res.send('QR code not available yet.');
  }
})

app.disable("x-powered-by");

// Menjalankan server express
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
