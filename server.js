const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();
//const board = data[boardName];

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

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

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

  //fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  saveData(data);
}

  // 👍 onnistui
  res.status(200).json({
    success: true
  });

});

app.post("/create", (req, res) => {

  const { boardName, boardPassword, boardUsername, ownerPassword } = req.body;
  console.log(req.body);

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

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
  autoDeleteDays: 10,
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
  visitedUsers: []   // 👈 TÄMÄ
};

  //fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  saveData(data);

  res.json({
    success: true,
    message: "Taulu luotu"
  });

});

app.delete("/delete/:boardName", (req, res) => {

  const boardName = req.params.boardName;
  console.log("hep: ", boardName);
  const { ownerPassword, boardUsername } = req.body;

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

  const board = data[req.params.boardName];
// 🔥 TÄRKEIN TARKISTUS
console.log("hei vaan heu: ", board);
  if (
  board.owner !== boardUsername ||
  board.ownerPassword !== ownerPassword
) {
    return res.status(403).json({
      success: false,
      message: "Ei oikeuksia (ei owner)"
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
  
  const { boardName, boardPassword, boardMessage, boardUsername,type } = req.body;

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
  cleanup(data[boardName]); // 👈 aina ennen muutosta

  data[boardName].boardMessages.push({
  id: crypto.randomUUID(),
  author: boardUsername,
  time: new Date().toISOString(),
  text: boardMessage,
  type: type
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

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

  const board = data[req.params.boardName];

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löydy"
    });
  }

  cleanup(board);
  //saveData(data);

  res.json(board);
});

app.get("/boards", (req, res) => {

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

  res.json(data);
});

app.delete("/clear/:boardName", (req, res) => {

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

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

  //fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  saveData(data);

  res.json({
    success: true,
    message: "Viestit tyhjennetty"
  });
});

app.get("/boards/count", (req, res) => {

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

  const count = Object.keys(data).length;

  console.log("COUNT:", count);

  res.json({ count });
});

app.post("/quickButtons", (req, res) => {

  console.log("HIT /quickButtons", req.body);

  const { boardName, boardPassword, index, text } = req.body;

  //const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const data = loadData();

  if (!data[boardName]) {
    return res.status(404).json({ success: false });
  }

  if (data[boardName].boardPassword !== boardPassword) {
    return res.status(401).json({ success: false });
  }

  // 🔥 VARMISTUS ETTÄ ARRAY ON OLEMASSA
  if (!data[boardName].quickButtons) {
    data[boardName].quickButtons = [
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

  // 🔥 INDEX CHECK TURVALLISESTI
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

  //fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  saveData(data);

  res.json({ success: true });
});

function loadData() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveData(data) {

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function cleanup(board) {
  const days = board.autoDeleteDays ?? 10;
  const cutoff = Date.now() - days * 86400000;

  board.boardMessages =
    board.boardMessages.filter(m =>
      new Date(m.time).getTime() > cutoff
    );
}

app.delete("/message/:boardName/:id", (req, res) => {
  const { boardName, id } = req.params;
  const { boardPassword } = req.body;

  console.log("PARAMS:", req.params);

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const board = data[boardName];

  if (!board) return res.status(404).json({ success: false });

  if (board.boardPassword !== boardPassword) {
    return res.status(401).json({ success: false });
  }
  
  board.boardMessages = board.boardMessages.filter(m => m.id !== id);

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

app.post("/visit", (req, res) => {

  console.log("humppaa eka kerta");
  
  const { boardName, boardUsername } = req.body;

  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success: false });
  }

  if (!board.visitedUsers) board.visitedUsers = [];

  let user = board.visitedUsers.find(u => u.name === boardUsername);
  console.log("humppaa");
  if (user) {
    user.lastSeen = Date.now();
  } else {
    board.visitedUsers.push({
      name: boardUsername,
      lastSeen: Date.now()
    });
  }

  board.visitedUsers.sort((a, b) => b.lastSeen - a.lastSeen);
  board.visitedUsers = board.visitedUsers.slice(0, 5);

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  res.json({ success: true });
});

app.post("/settings", (req, res) => {

  const {
    boardName,
    boardPassword,
    autoDeleteDays
  } = req.body;

  const data = loadData();

  const board = data[boardName];

  if (!board) {
    return res.status(404).json({
      success: false
    });
  }

  if (board.boardPassword !== boardPassword) {
    return res.status(401).json({
      success: false
    });
  }

  board.autoDeleteDays = Number(autoDeleteDays);

  saveData(data);

  res.json({
    success: true
  });
});

app.listen(3000, () => {
  console.log("Serveri käynnissä portissa 3000");
});