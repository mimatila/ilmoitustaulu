let loading = false;
let refreshInterval = null;
let editingIndex = null;
let currentButtonsCache = [];
let selectedQuickIndex = "";

function quickSend(text) {
  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");
  const boardUsername = localStorage.getItem("boardUsername") || boardName;

  fetch("http://localhost:3000/boardMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardName,
      boardPassword,
      boardMessage: text,
      boardUsername
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) return alert(data.message);

    loadMessage(true);
  });
}

function renderQuickSelect(buttons) {
  const select = document.getElementById("quickSelect");

  currentButtonsCache = buttons;

  const previous = select.value;

  select.innerHTML = "";

  const empty = document.createElement("option");
  empty.value = "";
  empty.innerText = "Valitse tila...";
  select.appendChild(empty);

  buttons.forEach((text, index) => {
    const opt = document.createElement("option");
    opt.value = String(index);
    opt.innerText = text;
    select.appendChild(opt);
  });

  // 🔥 ÄLÄ pakota tyhjää takaisin
  if (previous && previous !== "") {
    select.value = previous;
  } else {
    select.value = "";
  }
}

function saveQuickButton() {
  const input = document.getElementById("quickEditInput");
  const newText = input.value.trim();

  if (editingIndex === null) return;

  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");

  fetch("http://localhost:3000/quickButtons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardName,
      boardPassword,
      index: editingIndex,
      text: newText
    })
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById("quickEditor").style.display = "none";
    editingIndex = null;
    loadMessage(true);
  });
}

function sendQuick(index) {

  if (index === "" || index == null) return;

  selectedQuickIndex = index; // 👈 TÄRKEÄ

  const text = currentButtonsCache[Number(index)];
  if (!text) return;

  document.getElementById("boardNewMsg").value = text;
  updateMessage();
}

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("boardCount");

  if (el) {
    el.innerText = "Ladataan...";

    fetch("http://localhost:3000/boards/count")
      .then(res => res.json())
      .then(data => {
        el.innerText = `Tauluja: ${data.count ?? 0}`;
      })
      .catch(() => {
        el.innerText = "Tauluja ei saatu";
      });
  }

  initApp();
});

// =====================
// APP INIT
// =====================

function initApp() {
  bindUI();
  autoLoginFill();

  if (document.getElementById("boardMessagesDiv")) {
    initBoard();
  }

}


// =====================
// UI EVENTS
// =====================

function bindUI() {

  const homeBtn = document.getElementById("koti");
  if (homeBtn) homeBtn.addEventListener("click", koti);

  const msgInput = document.getElementById("boardNewMsg");
  if (msgInput) {
    msgInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        updateMessage();
      }
    });
  }

  document.addEventListener("change", (e) => {
  if (e.target?.id === "todayMode") {
    loadMessage(true);
  }
});
}


// =====================
// SAFE HELPERS
// =====================

function isTypingField(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

function getBoardName() {
  return localStorage.getItem("boardName");
}


// =====================
// AUTO LOGIN FILL
// =====================

function autoLoginFill() {

  const boardName = localStorage.getItem("boardName") || "";
  const boardPassword = localStorage.getItem("boardPassword") || "";
  const boardUsername = localStorage.getItem("boardUsername") || "";

  const loggedIn = localStorage.getItem("loggedIn");

  const nameInput = document.getElementById("boardName");

  if (!nameInput) return;

  if (loggedIn === "true") {
    window.location.href = "board.html";
    return;
  }

  nameInput.value = boardName;
  document.getElementById("boardPassword").value = boardPassword;
  document.getElementById("boardUsername").value = boardUsername;
}


// =====================
// BOARD INIT
// =====================


function initBoard() {

  const boardName = getBoardName();

  const boardNameEl = document.getElementById("boardTitle");
  const box = document.getElementById("boardMessagesDiv");

  if (!boardNameEl || !box || !boardName) return;

  boardNameEl.innerText = boardName;

  loadMessage(true);

if (refreshInterval) clearInterval(refreshInterval);

refreshInterval = setInterval(() => {
  if (!document.hidden) {
    loadMessage(false);
  }
}, 5000);

/*
  setTimeout(() => {
  loadMessage(true);
}, 200);*/

}



// =====================
// LOAD MESSAGES
// =====================

function loadMessage(forceScroll = false) {

  console.log("loadMessage called", loading);

  const box = document.getElementById("boardMessagesDiv");
  if (!box) return;

  if (loading) return;
  loading = true;

  console.log("checkbox state:", document.getElementById("todayMode")?.checked);

  const boardName = getBoardName();
  if (!boardName) {
    loading = false;
    return;
  }

  fetch(`http://localhost:3000/board/${boardName}`)
  .then(res => res.json())
  .then(data => {

  renderQuickSelect(data.quickButtons ?? []);

  if (editingIndex !== null) return; // 👈 estää UI resetin

    const isAtBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 10;

    box.innerHTML = "";

    console.log("MESSAGES:", data.boardMessages);

    (data.boardMessages || []).forEach(msg => {
  const div = document.createElement("div");

  const date = new Date(msg.time);

  div.innerText = `${date.toLocaleString()} - ${msg.author}: ${msg.text}`;

  box.appendChild(div);
});

    if (forceScroll || isAtBottom) {
      box.scrollTop = box.scrollHeight;
    }
  })
  .catch(console.error)
  .finally(() => {
    loading = false;
  });
}


// =====================
// UPDATE MESSAGE
// =====================

function updateMessage() {

  const messageEl = document.getElementById("boardNewMsg");
  if (!messageEl) return;

  const boardMessage = messageEl.value;

  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");
  const boardUsername = localStorage.getItem("boardUsername") || boardName;

  fetch("http://localhost:3000/boardMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardName, boardPassword, boardMessage, boardUsername })
  })
  .then(res => res.json())
  .then(data => {
     console.log("BOARD RESPONSE:", data);
    if (!data.success) return alert(data.boardMessage);

    messageEl.value = "";
    loadMessage(true);
  });
}


// =====================
// LOGIN
// =====================

function loginBoard() {

  const boardName = document.getElementById("boardName").value;
  const boardPassword = document.getElementById("boardPassword").value;
  const boardUsername = document.getElementById("boardUsername").value;

  fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardName, boardPassword, boardUsername })
  })
  .then(res => res.json())
  .then(data => {

    if (!data.success) return alert(data.message);

    localStorage.setItem("boardName", boardName);
    localStorage.setItem("boardPassword", boardPassword);
    localStorage.setItem("boardUsername", boardUsername);
    localStorage.setItem("loggedIn", "true");

    window.location.href = "board.html";
    
  });
}


// =====================
// CREATE BOARD
// =====================

function createBoard() {

  const boardName = document.getElementById("boardName").value;
  const boardPassword = document.getElementById("boardPassword").value;
  const boardUsername = document.getElementById("boardUsername").value;

  const ownerPassword = prompt("Anna owner-salasana:");

  if (!ownerPassword) {
    alert("Owner-salasana vaaditaan");
    return;
  }

  fetch("http://localhost:3000/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boardName,
      boardPassword,
      ownerPassword,
      boardUsername
    })
  })
  .then(res => res.json())
  .then(data => {

    if (!data.success) {
      alert(data.message);
      return;
    }

    localStorage.setItem("boardName", boardName);
    localStorage.setItem("boardPassword", boardPassword);
    localStorage.setItem("boardUsername", boardUsername);

    alert(data.message);
  });
}


// =====================
// DELETE BOARD
// =====================

function deleteBoard() {

  const boardName = localStorage.getItem("boardName");
  const ownerPassword = prompt("Anna owner-salasana:");

  if (!confirm("Haluatko varmasti poistaa taulun?")) return;

  fetch(`http://localhost:3000/delete/${boardName}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerPassword })
  })
  .then(res => res.json())
  .then(data => {

    alert(data.message);

    if (data.success) {
      localStorage.clear();
      window.location.href = "index.html";
    }
  });
}


// =====================
// CLEAR TABLE
// =====================

function clearTable() {

  const boardName = localStorage.getItem("boardName");
  const ownerPassword = prompt("Anna owner-salasana:");
  const boardUsername = localStorage.getItem("boardUsername");

  if (!confirm("Tyhjennetäänkö kaikki viestit?")) return;

  fetch(`http://localhost:3000/clear/${boardName}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerPassword,
      boardUsername
    })
  })
  .then(res => res.json())
  .then(data => {

    alert(data.message);

    if (data.success) {
      loadMessage(true);
    }
  });
}


// =====================
// NAV
// =====================

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadMessage(false);
  }
});

function toggleEditor() {
  const el = document.getElementById("quickEditor");
  el.style.display = el.style.display === "none" ? "flex" : "none";
}

function openEdit(index) {
  index = Number(index);

  if (!currentButtonsCache.length) {
    return alert("Napit ei ladattu vielä");
  }

  if (index < 0 || index >= currentButtonsCache.length) {
    return alert("Virheellinen valinta");
  }

  editingIndex = index;

  document.getElementById("quickEditInput").value =
    currentButtonsCache[index];

  document.getElementById("quickEditor").style.display = "flex";
}

function handleEditClick() {
  const select = document.getElementById("quickSelect");

  const val = select.value;

  console.log("SELECT VALUE:", val);

  if (val === "") {
    alert("Valitse ensin tila dropdownista");
    return;
  }

  openEdit(Number(val));
}

const select = document.getElementById("quickSelect");
const btn = document.getElementById("editBtn");

if (select && btn) {
  select.addEventListener("change", (e) => {
    btn.disabled = !e.target.value;
  });
}

function handleSelectChange(e) {
  const val = e.target.value;
  if (!val) return;

  sendQuick(val);
}

document.getElementById("quickSelect")
  .addEventListener("change", handleSelectChange);

