let loading = false;
let refreshInterval = null;
let editingIndex = null;
let currentButtonsCache = [];

function sendQuick(text) {
  console.log("SENDQUICK INPUT:", text);

  const boardName = localStorage.getItem("boardName");
  const boardUsername = localStorage.getItem("boardUsername") || boardName;

  let type="normal";


  if (document.getElementById("importantMode").checked) {
    type = "important";
  }

  if (document.getElementById("infoMode").checked) { 
    type="info";
  }

  console.log("TOKEN:", localStorage.getItem("token"));

  fetch("http://localhost:3000/boardMessage", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
    boardName,
    boardMessage: text,
    type
})
  })
  .then(res => res.json())
  .then(data => {
  if (!data.success) return alert(data.message);

  const input = document.getElementById("boardNewMsg");
  if (input) input.value = "";   // 👈 TÄRKEÄ

  loadMessage(true);

  document.getElementById("importantMode").checked = false;
  document.getElementById("infoMode").checked = false;
  type="normal";
});
}

function renderQuickSelect(buttons) {
  const select = document.getElementById("quickSelect");

  select.innerHTML = "";

  const empty = document.createElement("option");
  empty.value = "";
  empty.innerText = "Quick messages...";
  select.appendChild(empty);

  /*
  buttons.forEach((text, index) => {
    const opt = document.createElement("option");
    opt.value = String(index);
    opt.innerText = text;
    select.appendChild(opt);
  });*/

  buttons.forEach((text, index) => {
  const opt = document.createElement("option");
  opt.value = String(index);

  opt.innerText =
    text.length > 64
      ? text.substring(0, 64) + "..."
      : text;

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

  console.log("INITAPP CALLED");
  console.trace();
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

  const boardName = localStorage.getItem("boardName");
  const boardUsername = localStorage.getItem("boardUsername");
  const token = localStorage.getItem("token");

  // Täytä kentät aina
  const boardNameInput = document.getElementById("boardName");
  const boardUsernameInput = document.getElementById("boardUsername");

  if (boardNameInput) {
    boardNameInput.value = boardName || "";
  }

  if (boardUsernameInput) {
    boardUsernameInput.value = boardUsername || "";
  }

  // Home -> älä tee autologinia
  if (sessionStorage.getItem("skipAutoLogin")) {
    sessionStorage.removeItem("skipAutoLogin");
    return;
  }

  if (!boardName || !token) {
    return;
  }

  // authCheck...
}


// =====================
// BOARD INIT
// =====================


function initBoard() {

  console.log("INITBOARD CALLED");
  console.trace();

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

    const todayMode = document.getElementById("todayMode")?.checked;

let messages = data.boardMessages;

if (todayMode) {
  const now = new Date();

  messages = messages.filter(msg => {
    const d = new Date(msg.time);

    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
}

messages.forEach(msg => {

    /*data.boardMessages.forEach(msg => {*/

  console.log("TYPE:", msg.type);
  const div = document.createElement("div");
  div.className = "msg-row";

  if (msg.type === "important") {
    div.classList.add("important-msg");
  }

  if (msg.type === "info") {
    div.classList.add("info-msg");
  }

  /*
  const text = document.createElement("span");
  text.innerText = formatMessage(msg);
  div.appendChild(text);*/

  
  const wrapper = document.createElement("div");
  wrapper.className = "msg-content";
/*
  const text = document.createElement("div");
  text.className = "msg-text";
  text.innerText = `${msg.author}: ${msg.text}`;
*/
const text = document.createElement("div");
text.className = "msg-text";

const author = document.createElement("span");
author.className = "msg-author";
author.innerText = `${msg.author}: `;

const body = document.createElement("span");
body.innerText = msg.text;

text.appendChild(author);
text.appendChild(body);


const time = document.createElement("div");
time.className = "msg-time";

const date = new Date(msg.time);

if (todayMode) {
  time.innerText = date.toLocaleTimeString("fi-FI", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
} else {
  time.innerText = date.toLocaleString("fi-FI", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
}

wrapper.appendChild(text);
wrapper.appendChild(time);

div.appendChild(wrapper);


  const editMode = document.getElementById("editMode")?.checked;
  const username = localStorage.getItem("boardUsername");
  //const owner = localStorage.getItem("boardUsername") === boardName; // jos käytät owner-logiikkaa erikseen
  const owner = data.owner === username;

  const showTrash =
  editMode && (owner || msg.author === username);

  if (showTrash) {
    const trash = document.createElement("button");
    trash.innerText = "🗑";
    trash.className = "trash-btn";

    trash.onclick = () => deleteMessage(msg.id);

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
  const boardUsername = localStorage.getItem("boardUsername") || boardName;
  let type="normal";


  if (document.getElementById("importantMode").checked) {
  type = "important";
}

  if (document.getElementById("infoMode").checked) { 
    type="info";
  }

  console.log("TOKEN:", localStorage.getItem("token"));

  fetch("http://localhost:3000/boardMessage", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
    boardName,
    boardMessage,
    boardUsername,
    type
})
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
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
  boardName,
  boardPassword,
  boardUsername
})
  })
  .then(res => res.json())
  .then(async data => {

    if (!data.success) {
      return alert("Login failed");
    }

    // ✔ token talteen
    localStorage.setItem("token", data.token);
    localStorage.setItem("boardName", boardName);
    localStorage.setItem("boardUsername", boardUsername);

    await fetch("http://localhost:3000/visit", {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
      body: JSON.stringify({
        boardName,
        boardUsername
      })
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

  const ownerEmail = prompt("Anna owner email:");
  const ownerPassword = prompt("Anna owner salasana:");

  if (!ownerEmail || !ownerPassword) {
    alert("Email ja owner-salasana vaaditaan");
    return;
  }

  fetch("http://localhost:3000/create", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
      boardName,
      boardPassword,
      boardUsername,
      ownerEmail,
      ownerPassword
    })
  })
} 


// =====================
// DELETE BOARD
// =====================

function deleteBoard() {

  //const boardName = localStorage.getItem("boardName");
  const boardName = document.getElementById("boardName").value.trim();

  const boardUsername = getCurrentUsername();

  const ownerPassword = prompt("Anna owner-salasana:");

  if (!confirm("Haluatko varmasti poistaa taulun?")) return;

  fetch(`http://localhost:3000/delete/${boardName}`, {
    method: "DELETE",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
}
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
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
}
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
const token = localStorage.getItem("token");

fetch("http://localhost:3000/quickButtons", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": token
  },
  body: JSON.stringify({
    boardName,
    index: editingIndex,
    text
  })
})
  .then(res => res.json())
  .then(() => {

    document.getElementById("boardNewMsg").value = "";

    editingIndex = null;

    document.getElementById("editMode").checked = false;
    document.getElementById("editMode").dispatchEvent(new Event("change"));

    loadMessage(true);
  });
}

function loadBoardCount() {

  const el = document.getElementById("boardCount");
  if (!el) return;

  el.innerText = "Ladataan...";

  fetch("http://localhost:3000/boards/count")
    .then(res => res.json())
    .then(data => {
      el.innerText = `Boards: ${data.count ?? 0}`;
    })
    .catch(() => {
      el.innerText = "Cannot get Boards";
    });
}

function deleteMessage(id) {
  if (!confirm("Oletko varma että haluat poistaa viestin?")) {
    return;
  }

  const boardName = localStorage.getItem("boardName");
  const token = localStorage.getItem("token");

  fetch(`http://localhost:3000/message/${boardName}/${id}`, {
    method: "DELETE",
    headers: {
    "Content-Type":"application/json",
    "Authorization":token
},
    body: JSON.stringify({
    boardName
})
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

  el.innerText = "🟢 Last visited: " +
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
  console.log("OPEN SETTINGS TRIGGERED BY CLICK");
  console.trace();

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

  const token = localStorage.getItem("token");

  const autoDeleteDays =
    Number(
      document.getElementById(
        "autoDeleteDays"
      ).value
    );

  fetch("http://localhost:3000/settings", {
    method: "POST",
    headers:{
   "Content-Type":"application/json",
   "Authorization":token
},
    body:JSON.stringify({
    boardName,
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

document.getElementById("editMode")?.addEventListener("change", (e) => {
  const saveBtn = document.getElementById("saveBtn");

  if (!saveBtn) return;

  if (e.target.checked) {
    saveBtn.style.display = "inline-block";
  } else {
    saveBtn.style.display = "none";
    editingIndex = null; // optional: reset edit state
  }

  loadMessage(false); // jo sulla on tämä idea käytössä
});

document.getElementById("membersPopup").addEventListener("click", (e) => {
  if (e.target.id === "membersPopup") closeMembers();
});

document.getElementById("settingsPopup").addEventListener("click", (e) => {
  if (e.target.id === "settingsPopup") closeSettings();
});

function showMembers() {
   console.log("SHOW MEMBERS TRIGGERED BY CLICK");
  console.trace();
  const boardName = localStorage.getItem("boardName");

  fetch(`http://localhost:3000/board/${boardName}`)
    .then(res => res.json())
    .then(board => {

      console.log(board);
  console.log(board.users);

      const el = document.getElementById("membersList");
      const popup = document.getElementById("membersPopup");

      if (!el || !popup) return;

      const members = board.users || [];

el.innerHTML = members.map(m => `
  <div class="member-row">
    <div class="member-name">
      ${m.username}
      <span class="member-role">(${m.role})</span>
    </div>
  </div>
`).join("");

      popup.style.display = "block";
    });
}

function closeMembers() {
  document.getElementById("membersPopup").style.display = "none";
}

function openJoinBoard() {

  document.getElementById("joinBoardPopup").style.display = "flex";

}

function closeJoinBoard() {

  document.getElementById("joinBoardPopup").style.display = "none";

}

function sendJoinRequest() {

  const boardName = document.getElementById("joinBoardName").value;
  const username = document.getElementById("joinUsername").value;
  const password = document.getElementById("joinPassword").value;
  const email = document.getElementById("joinEmail").value;

  console.log(boardName, username, email);

  fetch("http://localhost:3000/joinRequest", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
      boardName,
      username,
      password,
      email
    })
  })
  .then(res => res.json())
  .then(data => {

    if (!data.success) {
      alert(data.message || "Join request failed");
      return;
    }

    alert("Join request sent!");
  })
  .catch(err => {
    console.error(err);
    alert("Server error");
  });

}

function openCreatePopup() {
  document.getElementById("createPopup").style.display = "flex";
}

function closeCreatePopup() {
  document.getElementById("createPopup").style.display = "none";
}

function submitCreateBoard() {

  const boardName = document.getElementById("cp_boardName").value;
  const boardPassword = document.getElementById("cp_boardPassword").value;
  const boardUsername = document.getElementById("cp_username").value;
  const ownerEmail = document.getElementById("cp_email").value;
  const ownerPassword = document.getElementById("cp_ownerPassword").value;

  fetch("http://localhost:3000/create", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({
      boardName,
      boardPassword,
      boardUsername,
      ownerEmail,
      ownerPassword
    })
  })
  .then(r => r.json())
  .then(data => {
    alert(data.message);

    if (data.success) {
      closeCreatePopup();

      localStorage.setItem("boardName", boardName);
      localStorage.setItem("boardPassword", boardPassword);
      localStorage.setItem("boardUsername", boardUsername);
    }
  });
}

function openRequests() {
  document.getElementById("requestsPopup").style.display = "block";
  loadRequests();
}

function closeRequests() {
  document.getElementById("requestsPopup").style.display = "none";
}

function loadRequests() {

  const boardName = localStorage.getItem("boardName");

  fetch(`http://localhost:3000/board/${boardName}`)
    .then(res => res.json())
    .then(board => {

      const list = document.getElementById("requestsList");
      list.innerHTML = "";

      board.pendingRequests.forEach(req => {

        const div = document.createElement("div");

        div.innerHTML = `
          <b>${req.username}</b> (${req.email})
          <br>
          <button onclick="acceptRequest('${req.id}')">Accept</button>
          <button onclick="rejectRequest('${req.id}')">Reject</button>
          <hr>
        `;

        list.appendChild(div);
      });
    });
}

function acceptRequest(id) {

  const boardName = localStorage.getItem("boardName");

  fetch(`http://localhost:3000/acceptRequest`, {
    method: "POST",
   headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({ boardName, id })
  })
  .then(() => loadRequests());
}

function rejectRequest(id) {

  const boardName = localStorage.getItem("boardName");

  fetch(`http://localhost:3000/rejectRequest`, {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  "Authorization": localStorage.getItem("token")
},
    body: JSON.stringify({ boardName, id })
  })
  .then(() => loadRequests());
}

document.addEventListener("click", (e) => {
  console.log("CLICK:", e.target);
});






