let loading = false;
let refreshInterval = null;
let editingIndex = null;
let currentButtonsCache = [];

function sendQuick(text) {
  console.log("SENDQUICK INPUT:", text);

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

  const input = document.getElementById("boardNewMsg");
  if (input) input.value = "";   // 👈 TÄRKEÄ

  loadMessage(true);
});
}

function renderQuickSelect(buttons) {
  const select = document.getElementById("quickSelect");

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

  select.selectedIndex = 0;
}

/*
function handleQuick(text) {
  const editMode = document.getElementById("editMode").checked;

  console.log("EDIT MODE:", editMode);

  if (editMode) {
    document.getElementById("boardNewMsg").value = text;
  } else {
    sendQuick(text);
  }
}*/

document.addEventListener("DOMContentLoaded", () => {

  const select = document.getElementById("quickSelect");
  const el = document.getElementById("boardCount");

  loadBoardCount();

  if (select) {
  select.addEventListener("change", (e) => {

  const index = Number(e.target.value);
  const text = currentButtonsCache[index];

  if (!text) return;

  const editMode = document.getElementById("editMode").checked;

  if (editMode) {
    editingIndex = index;
    document.getElementById("boardNewMsg").value = text;
  } else {
    sendQuick(text);
  }
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

function getBoardName() {
  return localStorage.getItem("boardName");
}


// =====================
// AUTO LOGIN FILL
// =====================

function autoLoginFill() {

  if (location.pathname.includes("board.html")) return;

  const boardName = localStorage.getItem("boardName") || "";
  const boardPassword = localStorage.getItem("boardPassword") || "";
  const boardUsername = localStorage.getItem("boardUsername") || "";

  const loggedIn = localStorage.getItem("loggedIn");
  const skip = sessionStorage.getItem("skipAutoLogin");

  const nameInput = document.getElementById("boardName");

  if (!nameInput) return;

  if (!skip && loggedIn === "true") {
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

console.log("BOARD INIT ONCE");
  const boardName = getBoardName();

  loadMessage(true); // heti päivitys

  const boardNameEl = document.getElementById("boardTitle");
  const box = document.getElementById("boardMessagesDiv");

  if (!boardNameEl || !box || !boardName) return;

  boardNameEl.innerText = boardName;

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

  console.trace("LOADMESSAGE CALL STACK");

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

    //renderQuickButtons(currentButtonsCache);
    currentButtonsCache = data.quickButtons ?? [];

    console.log("RENDER QUICK SELECT");

    //renderQuickSelect(currentButtonsCache);
    //renderVisitedUsers(data.visitedUsers);

    updateQuickUI(data);

    const isAtBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 10;

      console.log("CLEARING MESSAGE BOX");
    box.innerHTML = "";

    console.log("MESSAGES:", data.boardMessages);

    /*
    (data.boardMessages || []).forEach(msg => {
    const div = document.createElement("div");
    div.innerText = formatMessage(msg);
    box.appendChild(div);
    });*/

    data.boardMessages.forEach(msg => {

  console.log("TYPE:", msg.type);
  const div = document.createElement("div");
  div.className = "msg-row";

 if (msg.type === "important") {
  div.classList.add("important-msg");
}

if (msg.type === "info") {
  div.classList.add("info-msg");
}

console.log(div.className);

  const text = document.createElement("span");

  text.innerText = formatMessage(msg);

  div.appendChild(text);

  const editMode = document.getElementById("editMode")?.checked;
  const username = localStorage.getItem("boardUsername");
  //const owner = localStorage.getItem("boardUsername") === boardName; // jos käytät owner-logiikkaa erikseen
  const owner = data.owner === username;

  /*
  const showTrash =
    (editMode && msg.author === username) || owner;
  */

  const showTrash =
  editMode && (owner || msg.author === username);

  if (showTrash) {
    const trash = document.createElement("button");
    trash.innerText = "🗑";
    trash.className = "trash-btn";

    trash.onclick = () => deleteMessage(msg.id);

    //console.log("DELETE CLICK", msg.id);

    div.appendChild(trash);
  }
   
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

  console.log("INPUT VALUE:", messageEl.value);

  if (!messageEl) return;

  const boardMessage = messageEl.value;

  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");
  const boardUsername = localStorage.getItem("boardUsername") || boardName;
  let type="normal";


  if (document.getElementById("importantMode").checked) {
  type = "important";
}

  if (document.getElementById("infoMode").checked) { 
    type="info";
  }

  fetch("http://localhost:3000/boardMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardName, boardPassword, boardMessage, boardUsername, type })
  })
  .then(res => res.json())
  .then(data => {
     
    if (!data.success) return alert(data.boardMessage);

    messageEl.value = "";
    loadMessage(true);

    document.getElementById("importantMode").checked = false;
    document.getElementById("infoMode").checked = false;
    type="normal";
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
  .then(async data => {
    if (!data.success) return alert(data.message);

    localStorage.setItem("boardName", boardName);
    localStorage.setItem("boardPassword", boardPassword);
    localStorage.setItem("boardUsername", boardUsername);
    localStorage.setItem("loggedIn", "true");

    await fetch("http://localhost:3000/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardName, boardUsername })
    });

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

  const boardUsername = getCurrentUsername();

  const ownerPassword = prompt("Anna owner-salasana:");

  if (!confirm("Haluatko varmasti poistaa taulun?")) return;

  fetch(`http://localhost:3000/delete/${boardName}`, {
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

function koti() {
  sessionStorage.setItem("skipAutoLogin", "1");
  window.location.href = "index.html";
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}


/*
function handleEditClick() {

  const select = document.getElementById("quickSelect");

  console.log("SELECT VALUE:", select.value);
  console.log("SELECTED INDEX:", select.selectedIndex);

  const index = Number(select.value);

  console.log("EDIT INDEX:", index);

  openEdit(index);
}*/

function handleSaveClick() {

  if (editingIndex === null) {
    alert("Valitse ensin Edit-moodi");
    return;
  }

  const text =
    document.getElementById("boardNewMsg").value.trim();

  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");

  fetch("http://localhost:3000/quickButtons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      boardName,
      boardPassword,
      index: editingIndex,
      text
    })
  })
  .then(res => res.json())
  .then(() => {

    document.getElementById("boardNewMsg").value = "";

    editingIndex = null;

    loadMessage(true);
  });
}

function formatMessage(msg) {
  const date = new Date(msg.time);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const todayMode = document.getElementById("todayMode")?.checked;

  if (todayMode && isToday) {
    return `Today - ${msg.author}: ${msg.text}`;
  }

  return `${date.toLocaleString()} - ${msg.author}: ${msg.text}`;
}

function loadBoardCount() {

  const el = document.getElementById("boardCount");
  if (!el) return;

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

function deleteMessage(id) {
  if (!confirm("Oletko varma että haluat poistaa viestin?")) {
    return;
  }

  const boardName = localStorage.getItem("boardName");
  const boardPassword = localStorage.getItem("boardPassword");

  fetch(`http://localhost:3000/message/${boardName}/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardPassword })
  })
  .then(res => res.json())
  .then(data => {
    loadMessage(true);
  });
}

function renderVisitedUsers(users) {
  const el = document.getElementById("visitedUsers");
  if (!el) return;

  const sorted = (users || [])
  .sort((a, b) => b.lastSeen - a.lastSeen)
  .slice(0, 5);

  el.innerText = "🟢 Viimeksi paikalla: " +
  sorted.map(u => u.name).join(", ");
}

/*
function renderQuickButtons(buttons) {
  const container = document.getElementById("quickButtons");
  if (!container) return;

  container.innerHTML = "";

  buttons.forEach(text => {
    const btn = document.createElement("button");
    btn.innerText = text;

    btn.onclick = () => sendQuick(text);

    container.appendChild(btn);
  });
}*/

function updateQuickUI(data) {
  currentButtonsCache = data.quickButtons ?? [];

  //renderQuickButtons(currentButtonsCache);
  renderVisitedUsers(data.visitedUsers);
  renderQuickSelect(currentButtonsCache);

}

function openSettings() {

  const boardName =
    localStorage.getItem("boardName");

  fetch(`http://localhost:3000/board/${boardName}`)
    .then(res => res.json())
    .then(board => {

      document.getElementById(
        "autoDeleteDays"
      ).value =
        board.autoDeleteDays ?? 10;

      document.getElementById(
        "settingsPopup"
      ).style.display = "block";
    });
}

function closeSettings() {

  document.getElementById(
    "settingsPopup"
  ).style.display = "none";
}

function saveSettings() {

  const boardName =
    localStorage.getItem("boardName");

  const boardPassword =
    localStorage.getItem("boardPassword");

  const autoDeleteDays =
    Number(
      document.getElementById(
        "autoDeleteDays"
      ).value
    );

  fetch("http://localhost:3000/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      boardName,
      boardPassword,
      autoDeleteDays
    })
  })
  .then(res => res.json())
  .then(data => {

    if (data.success) {
      alert("Tallennettu");
      closeSettings();
    }
  });
}

function getCurrentUsername() {
  return document.getElementById("boardUsername")?.value
    || localStorage.getItem("boardUsername");
}

document.getElementById("editMode")?.addEventListener("change", () => {
  loadMessage(false);
});

document.getElementById("importantMode")
  .addEventListener("change", function () {

    if (this.checked) {
      document.getElementById("infoMode").checked = false;
    }
});

document.getElementById("infoMode")
  .addEventListener("change", function () {

    if (this.checked) {
      document.getElementById("importantMode").checked = false;
    }
});






