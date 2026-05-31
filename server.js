const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

// 🔥 CORS ENSIN
app.use(cors());

// sitten JSON parsing
app.use(express.json());

const FILE = "boards.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "{}");
}

app.post("/login", (req, res) => {

  //console.log("REQ BODY:", req.body);

  const { boardName, boardPassword, boardUsername } = req.body;

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  if (!data[boardName]) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löydy"
    });
  }

  if (data[boardName].boardPassword !== boardPassword) {
    return res.status(401).json({
      success: false,
      message: "Väärä salasana"
    });
  }

  if (
  boardUsername &&
  Array.isArray(data[boardName].members) &&
  !data[boardName].members.includes(boardUsername)
) {
  data[boardName].members.push(boardUsername);

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

  // 👍 onnistui
  res.status(200).json({
    success: true
  });

});

app.post("/create", (req, res) => {

  const { boardName, boardPassword, boardUsername, ownerPassword } = req.body;
  console.log(req.body);

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  if (data[boardName]) {
    return res.status(400).json({
      success: false,
      message: "Taulu on jo olemassa"
    });
  }

  /*
  data[boardName] = {
  password,
  messages: []
  };*/

 data[boardName] = {
  boardPassword,
  owner: boardUsername,
  ownerPassword,
  members: [boardUsername],
  boardMessages: [],
  quickButtons: [
  "Kaupassa",
  "Töissä",
  "Kotona",
  "Nukkumassa",
  "Syömässä",
  "Tulossa",
  "Myöhässä",
  "Sairas",
  "Tauolla",
  "Kuntosalilla"
],
};

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({
    success: true,
    message: "Taulu luotu"
  });

});

app.delete("/delete/:boardName", (req, res) => {

  const boardName = req.params.boardName;
  const { ownerPassword } = req.body;

  const data = JSON.parse(
    fs.readFileSync(FILE, "utf8")
  );

  // löytyykö taulu
  if (!data[boardName]) {
    return res.status(404).json({
    success: false,
    message: "Taulua ei löytynyt"
  });
  }

  // tarkista salasana
  if (data[boardName].ownerPassword !== ownerPassword) {
    return res.status(401).json({
    success: false,
    message: "Väärä salasana"
  });
  }

  delete data[boardName];

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );

  res.json({ success: true, message: "Taulu poistettu" });

});

app.post("/boardMessage", (req, res) => {
  
  const { boardName, boardPassword, boardMessage, boardUsername } = req.body;

  const data = JSON.parse(
    fs.readFileSync(FILE, "utf8")
  );

  if (!data[boardName]) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löydy"
    });
  }

  if (data[boardName].boardPassword !== boardPassword) {
    return res.status(401).json({
      success: false,
      message: "Väärä salasana"
    });
  }

  // 🔥 TÄMÄ PITÄÄ OLLA ENNEN RESPONSEA
  //data[boardName].messages.push(message);

  data[boardName].boardMessages.push({
  author: boardUsername,
  time: new Date().toISOString(),
  text: boardMessage
  });

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );

  res.json({ success: true, message: "Viesti tallennettu" });

});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.get("/board/:boardName", (req, res) => {

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  const board = data[req.params.boardName];

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löydy"
    });
  }

  // 👇 TÄHÄN TÄMÄ
  if (!board.quickButtons) {
    board.quickButtons = [
      "Kaupassa",
      "Töissä",
      "Kotona",
      "Nukkumassa",
      "Syömässä",
      "Tulossa",
      "Myöhässä",
      "Sairas",
      "Tauolla",
      "Kuntosalilla"
    ];
  }

  res.json(board);
});

app.get("/boards", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  res.json(data);
});

app.delete("/clear/:boardName", (req, res) => {

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const board = data[req.params.boardName];

  const { ownerPassword, boardUsername } = req.body;

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löytynyt"
    });
  }

  // 🔥 TÄRKEIN TARKISTUS
  if (
  board.owner !== boardUsername ||
  board.ownerPassword !== ownerPassword
) {
    return res.status(403).json({
      success: false,
      message: "Ei oikeuksia (ei owner)"
    });
  }

  board.boardMessages = [];

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({
    success: true,
    message: "Viestit tyhjennetty"
  });
});

app.get("/boards/count", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  const count = Object.keys(data).length;

  console.log("COUNT:", count);

  res.json({ count });
});

app.post("/quickButtons", (req, res) => {

  console.log("HIT /quickButtons", req.body);
  const { boardName, boardPassword, index, text } = req.body;

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  if (!data[boardName]) {
    return res.status(404).json({ success: false });
  }

  if (data[boardName].boardPassword !== boardPassword) {
    return res.status(401).json({ success: false });
  }

  // 🔥 TÄMÄ TÄNNE
  if (
    typeof index !== "number" ||
    index < 0 ||
    index >= data[boardName].quickButtons.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid index"
    });
  }

  data[boardName].quickButtons[index] = text;

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Serveri käynnissä portissa 3000");
});