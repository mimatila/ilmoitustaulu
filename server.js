const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();
const crypto = require("crypto");

// 🔥 CORS ENSIN
app.use(cors());

// sitten JSON parsing
app.use(express.json());

const FILE = "boards.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "{}");
}

app.post("/login", (req, res) => {

  const { boardName, boardUsername, boardPassword } = req.body;

  const data = loadData();
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success: false, message: "Board not found" });
  }

  const user = board.users.find(
    u => u.username === boardUsername
  );

  if (!user || user.password !== boardPassword) {
    return res.status(401).json({ success: false, message: "Invalid login" });
  }

  const token = crypto.randomUUID();
  user.token = token;

  saveData(data);

  res.json({
    success: true,
    token,
    username: boardUsername,
    role: user.role
  });
});

app.post("/create", (req, res) => {

  const {
    boardName,
    boardUsername,
    boardPassword,
    ownerEmail   // 👈 LISÄÄ TÄMÄ
  } = req.body;

  const data = loadData();

  if (data[boardName]) {
    return res.status(400).json({
      success: false,
      message: "Taulu on jo olemassa"
    });
  }

  data[boardName] = {
    users: [
    {
      username: boardUsername,
      email: ownerEmail,   // 👈 TÄMÄ
      role: "owner",
      password: boardPassword,
      token: null
    }
  ],

  boardMessages: [],
  pendingRequests: [],
  autoDeleteDays: 10,

  quickMessages: [
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

  visitedUsers: []
};

  saveData(data);

  res.json({
    success: true,
    message: "Board created!"
  });

});

app.delete("/delete/:boardName", (req, res) => {

  const boardName = req.params.boardName;

  const data = loadData();
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löytynyt"
    });
  }

  const user = authUser(req, board);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Kirjaudu uudelleen"
    });
  }

  console.log("ROLE:", user.role);

  if (user.role !== "owner") {
  return res.status(403).json({ success: false, message: "Not owner" });
}

  delete data[boardName];

  saveData(data);

  res.json({
    success: true,
    message: "Taulu poistettu"
  });
});

app.post("/boardMessage", (req, res) => {

  const {
    boardName,
    boardMessage,
    type
  } = req.body;

  const token = req.headers.authorization;

  const data = loadData();

  const board = data[boardName];

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löydy"
    });
  }

  // Tarkista token
  const user = board.users.find(u => u.token === token);

  console.log("FOUND USER:", user);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Kirjaudu uudelleen"
    });
  }

  cleanup(board);

  board.boardMessages.push({
    id: crypto.randomUUID(),
    author: user.username,      // <-- käytetään tokenista löytynyttä käyttäjää
    time: new Date().toISOString(),
    text: boardMessage,
    type
  });

  saveData(data);

  res.json({
    success: true,
    message: "Viesti tallennettu"
  });

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

  const data = loadData();

  const board = data[req.params.boardName];

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Taulua ei löytynyt"
    });
  }

  const user = authUser(req, board);

  console.log(user);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Kirjaudu uudelleen"
    });
  }

  if (user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Ei oikeuksia"
    });
  }

  board.boardMessages = [];

  saveData(data);

  res.json({
    success: true,
    message: "Viestit tyhjennetty"
  });

});

app.get("/boards/count", (req, res) => {

  const data = loadData();

  const count = Object.keys(data).length;

  console.log("COUNT:", count);

  res.json({ count });
});

app.post("/quickMessages", (req, res) => {

  console.log("HIT /quickMessages", req.body);

  const { boardName, index, text } = req.body;

  const token = req.headers.authorization;

  const data = loadData();

  const board = data[boardName];

if (!board) {
  return res.status(404).json({ success: false });
}

const user = board.users.find(u => u.token === token);

if (!user) {
  return res.status(401).json({
    success: false,
    message: "Kirjaudu uudelleen"
  });
}

  // 🔥 VARMISTUS ETTÄ ARRAY ON OLEMASSA
  if (!board.quickMessages) {
    board.quickMessages = [
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
    index >= board.quickMessages.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid index"
    });
  }

  board.quickMessages[index] = text;

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

  const data = loadData();

  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success:false });
  }

  const user = authUser(req, board);

  if (!user) {
    return res.status(401).json({ success:false });
  }

  const message = board.boardMessages.find(m => m.id === id);

  if (!message) {
    return res.status(404).json({ success:false });
  }

  // Owner saa poistaa kaiken
  // Muut saavat poistaa vain omat viestinsä
  if (
    user.role !== "owner" &&
    message.author !== user.username
  ) {
    return res.status(403).json({
      success:false,
      message:"Ei oikeuksia"
    });
  }

  board.boardMessages =
    board.boardMessages.filter(m => m.id !== id);

  saveData(data);

  res.json({ success:true });

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
    autoDeleteDays
  } = req.body;

  const data = loadData();

  const board = data[boardName];

  if (!board) {
    return res.status(404).json({
      success: false
    });
  }

  const user = authUser(req, board);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Kirjaudu uudelleen"
    });
  }

  if (user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Ei oikeuksia"
    });
  }

  board.autoDeleteDays = Number(autoDeleteDays);

  saveData(data);

  res.json({
    success: true
  });
});

app.post("/joinRequest", (req, res) => {

  console.log("JOIN REQUEST HIT");

  const { boardName, username, password, email } = req.body;

  const data = loadData();

  const board = data[boardName];

  if (board.users.some(u => u.username === username)) {
    return res.json({
        success: false,
        message: "Username already exists."
    });
}

if (board.pendingRequests.some(r => r.username === username)) {
  return res.json({
    success: false,
    message: "Join request already exists."
  });
}

  if (!board) {
    return res.status(404).json({
      success: false,
      message: "Board not found"
    });
  }

  if (!board.pendingRequests) {
    board.pendingRequests = [];
  }

  // 👇 Tarkista onko jo olemassa
  const exists = board.pendingRequests.some(
    r => r.username === username || r.email === email
  );

  if (exists) {
    return res.json({
      success: false,
      message: "Request already pending"
    });
  }

  // 👇 Lisätään uusi pyyntö
  board.pendingRequests.push({
  id: crypto.randomUUID(),
  username,
  password,
  email,
  status: "pending",
  time: new Date().toISOString()
});

  saveData(data);

  res.json({
    success: true,
    message: "Request sent"
  });

});

app.post("/acceptRequest", (req, res) => {

  const { boardName, id } = req.body;

  const data = loadData();
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success: false });
  }

  const reqItem = board.pendingRequests.find(r => r.id === id);

  if (!reqItem) {
    return res.status(404).json({ success: false });
  }

  // 1. lisää users-listaan
  board.users.push({
    username: reqItem.username,
    email: reqItem.email,
    password: reqItem.password,
    role: "member",
    token: null
  });

  // 2. poista pendingistä
  board.pendingRequests =
    board.pendingRequests.filter(r => r.id !== id);

  saveData(data);

  res.json({ success: true });
});

app.post("/rejectRequest", (req, res) => {

  const { boardName, id } = req.body;

  const data = loadData();
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success: false });
  }

  const user = authUser(req, board);

  if (!user) {
    return res.status(401).json({ success: false });
  }

  if (user.role !== "owner") {
    return res.status(403).json({ success: false });
  }

  // poista vain pendingistä
  board.pendingRequests =
    board.pendingRequests.filter(r => r.id !== id);

  saveData(data);

  res.json({
    success: true,
    message: "Request rejected"
  });
});

app.post("/authCheck", (req, res) => {

  const { boardName } = req.body;

  const data = loadData();
  const board = data[boardName];

  if (!board) {
    return res.status(404).json({ success: false });
  }

  const user = authUser(req, board);

  if (!user) {
    return res.status(401).json({ success: false });
  }

  res.json({
    success: true,
    username: user.username,
    role: user.role
  });
});

function authUser(req, board) {

    const token = req.headers.authorization;

    if (!token) {
        return null;
    }

    return board.users.find(u => u.token === token);
}

app.listen(3000, () => {
  console.log("Serveri käynnissä portissa 3000");
});