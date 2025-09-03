// === PHASE 1 CONFIG (Spreadsheet-like grid input) ===
let currentStep = 0;
let responses = [];

const relationships = [
  "Friend", "Spouse", "Child", "Parent", "Parent-in-law",
  "Other close family member", "Schoolmate", "Workmate",
  "Close neighbors", "Member of religious group",
  "Member of group without religious affiliations"
];

let participantId = '';  // global

const questionArea = document.getElementById('question-area');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');

// ----------------- Worker/Participant ID intake (unchanged) -----------------
function askPartid() {
  const urlParams = new URLSearchParams(window.location.search);
  const workerId = urlParams.get("worker_id");

  if (workerId) {
    participantId = workerId;
    nextBtn.style.display = 'inline-block';
    nextBtn.onclick = () => {
      console.log("Auto-loaded Participant ID:", participantId);
      savePartid();
    };
    nextBtn.click();  // auto-advance
  } else {
    questionArea.innerHTML = `
      <label>Please enter your Participant ID:</label>
      <input type="text" id="partid-input" placeholder="e.g., P001">
      <div id="partid-error" style="color:red; font-size:14px;"></div>
    `;
    nextBtn.style.display = 'none';
    nextBtn.onclick = savePartid;

    const input = document.getElementById('partid-input');
    input.addEventListener('input', () => {
      const val = input.value.trim();
      document.getElementById('partid-error').textContent = val ? "" : "Participant ID cannot be empty.";
      nextBtn.style.display = val ? 'inline-block' : 'none';
    });
  }
}

function savePartid() {
  if (!participantId) {
    const input = document.getElementById('partid-input');
    participantId = input.value.trim();
  }
  if (!participantId) {
    document.getElementById('partid-error').textContent = "Participant ID cannot be empty.";
    return;
  }
  console.log("Participant ID set to:", participantId);
  showPhase1();
}

function updateProgress(text = "") {
  progressBar.textContent = text;
}

// ----------------- NEW: Grid (Excel/Sheets-like) entry -----------------
function showPhase1() {
  showGridEntry();
}

function showGridEntry() {
  updateProgress("Fill at least 5 rows: initials + relationship");

    const relOptions = relationships.map(r => `<option value="${r}">${r}</option>`).join('');
    questionArea.innerHTML = `
    <div style="overflow:auto;">
        <table id="grid-table" style="width:100%; border-collapse:collapse;">
        <thead>
            <tr>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px; padding-right:16px;">initials</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">relationship</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:6px; width:60px;">&nbsp;</th>
            </tr>
        </thead>
        <tbody id="grid-body"></tbody>
        </table>
    </div>

    <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
        <button id="add-row-btn" type="button">Add row</button>
        <span id="grid-msg" style="color:#999; font-size:14px;"></span>
        <span id="grid-err" style="color:red; font-size:14px; margin-left:auto;"></span>
    </div>
    `;


  nextBtn.style.display = 'none';
  nextBtn.onclick = proceedAfterGrid;

  const body = document.getElementById('grid-body');
  const addBtn = document.getElementById('add-row-btn');

  // helpers
  const makeRow = (initials = "", relationship = "") => {
    const tr = document.createElement('tr');

    const tdInit = document.createElement('td');
    tdInit.style.padding = '6px';
    tdInit.style.paddingRight = '16px';
    const initInput = document.createElement('input');
    initInput.type = 'text';
    initInput.placeholder = 'e.g., A.S.';
    initInput.value = initials;
    initInput.style.width = '100%';
    initInput.addEventListener('input', validateGrid);
    tdInit.appendChild(initInput);

    const tdRel = document.createElement('td');
    tdRel.style.padding = '6px';
    tdRel.style.paddingLeft = '4px';
    const sel = document.createElement('select');
    sel.innerHTML = `<option value="">Select</option>${relOptions}`;
    sel.value = relationship;
    sel.addEventListener('change', validateGrid);
    sel.style.width = '100%';
    tdRel.appendChild(sel);

    const tdDel = document.createElement('td');
    tdDel.style.padding = '6px';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '−';
    delBtn.title = 'Remove row';
    delBtn.addEventListener('click', () => {
      tr.remove();
      validateGrid();
    });
    tdDel.appendChild(delBtn);

    tr.appendChild(tdInit);
    tr.appendChild(tdRel);
    tr.appendChild(tdDel);
    return tr;
  };

  // Seed with 5 empty rows
  for (let i = 0; i < 10; i++) body.appendChild(makeRow());

  addBtn.addEventListener('click', () => {
    body.appendChild(makeRow());
    validateGrid();
  });

  // Initial validation
  validateGrid();
}

function readGridRows() {
  const rows = [];
  const body = document.getElementById('grid-body');
  const trs = Array.from(body.querySelectorAll('tr'));
  for (const tr of trs) {
    const inputs = tr.querySelectorAll('input, select');
    const initials = (inputs[0].value || "").trim();
    const relationship = (inputs[1].value || "").trim();
    rows.push({ initials, relationship });
  }
  return rows;
}

function validateGrid() {
  const msgEl = document.getElementById('grid-msg');
  const errEl = document.getElementById('grid-err');
  const rows = readGridRows();

  // Keep only filled rows for validation
  const filled = rows.filter(r => r.initials !== "" || r.relationship !== "");
  const complete = filled.filter(r => r.initials !== "" && r.relationship !== "");

  const relSet = new Set(relationships.map(r => r.toLowerCase()));
  const seen = new Set();
  let error = "";

  // Must have at least 5 complete rows
  if (complete.length < 5) {
    error = "Please fill at least 5 rows (both columns).";
  } else {
    // Validate contents
    for (let i = 0; i < complete.length; i++) {
      const r = complete[i];
      if (!relSet.has(r.relationship.toLowerCase())) {
        error = `Invalid relationship: "${r.relationship}".`;
        break;
      }
      const key = r.initials.toLowerCase();
      if (seen.has(key)) {
        error = `Duplicate initials: "${r.initials}".`;
        break;
      }
      seen.add(key);
    }
  }

  if (error) {
    errEl.textContent = error;
    nextBtn.style.display = 'none';
  } else {
    errEl.textContent = "";
    nextBtn.style.display = 'inline-block';
  }

  msgEl.textContent = `${complete.length} valid row(s) detected.`;
  return { ok: !error, rows: complete };
}

function proceedAfterGrid() {
  const validated = validateGrid();
  if (!validated.ok) return;

  // Map to internal structure used by Phase 2
  responses = validated.rows.map(r => ({ name: r.initials, relationship: r.relationship }));

  document.getElementById('phase1').style.display = 'none';
  document.getElementById('phase2').style.display = 'block';
  launchPhase2();
}

// --------------- Legacy name/relationship Q&A (kept for compatibility; unused) ---------------
function showNameInput() {}
function saveName() {}
function showRelationshipSelect() {}
function saveRelationship() {}
function endPhase1() {
  document.getElementById('phase1').style.display = 'none';
  document.getElementById('phase2').style.display = 'block';
  launchPhase2();
}

// === PHASE 2 START (unchanged logic/UI) ===
function launchPhase2() {
  const initialsList = document.getElementById('initials-list');
  const canvas = document.getElementById('drop-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const ctx = canvas.getContext('2d');
  const eraserBtn = document.getElementById('eraser-toggle');
  const submitBtn = document.getElementById('submit-btn');

  function checkSubmitEligibility() {
    const allPlaced = responses.every(r => boxMap.has(r.name));
    submitBtn.style.display = allPlaced ? 'inline-block' : 'none';
  }

  initialsList.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasContainer.querySelectorAll('.draggable-box').forEach(el => el.remove());

  const boxMap = new Map();
  const lines = [];
  let selectedBox = null;
  let isEraserMode = false;

  // Eraser toggle
  eraserBtn.addEventListener('click', () => {
    isEraserMode = !isEraserMode;
    eraserBtn.style.backgroundColor = isEraserMode ? '#f88' : '';
  });

  // Create draggable source items (initials)
  responses.forEach(({ name }) => {
    const box = document.createElement('div');
    box.className = 'draggable-box';
    box.textContent = name;
    box.draggable = true;

    box.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', name);
    });

    initialsList.appendChild(box);
  });

  canvas.addEventListener('dragover', e => e.preventDefault());

  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');

    // Fix for jumping bug
    e.dataTransfer.setData('offset-x', 0);
    e.dataTransfer.setData('offset-y', 0);

    const x = e.offsetX;
    const y = e.offsetY;

    const original = [...initialsList.children].find(div => div.textContent === name);
    if (original) original.remove();

    if (!boxMap.has(name)) {
      createMovableBox(name, x, y);
    }
  });

  canvasContainer.addEventListener('dragover', e => e.preventDefault());

  canvasContainer.addEventListener('drop', e => {
    const name = e.dataTransfer.getData('text/plain');
    const offsetX = +e.dataTransfer.getData('offset-x');
    const offsetY = +e.dataTransfer.getData('offset-y');

    const box = boxMap.get(name);
    if (!box) return;

    const newX = e.offsetX - offsetX;
    const newY = e.offsetY - offsetY;
    const boxWidth = box.offsetWidth;
    const boxHeight = box.offsetHeight;

    const clampedX = Math.min(Math.max(0, newX), canvas.width - boxWidth);
    const clampedY = Math.min(Math.max(0, newY), canvas.height - boxHeight);

    box.style.left = `${clampedX}px`;
    box.style.top = `${clampedY}px`;

    drawAllLines();
    checkSubmitEligibility();
  });

  function createMovableBox(name, x, y) {
    const box = document.createElement('div');
    box.className = 'draggable-box';
    box.textContent = name;
    box.style.position = 'absolute';
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.draggable = true;

    box.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', name);
      e.dataTransfer.setData('offset-x', e.offsetX);
      e.dataTransfer.setData('offset-y', e.offsetY);
    });

    // Click to connect/disconnect
    box.addEventListener('click', e => {
      e.stopPropagation();
      if (isEraserMode) return;

      if (selectedBox === box) {
        box.classList.remove('selected');
        selectedBox = null;
      } else if (selectedBox === null) {
        box.classList.add('selected');
        selectedBox = box;
      } else {
        const name1 = selectedBox.textContent;
        const name2 = box.textContent;

        const existingIndex = lines.findIndex(line =>
          (line.from === name1 && line.to === name2) ||
          (line.from === name2 && line.to === name1)
        );

        if (existingIndex !== -1) {
          lines.splice(existingIndex, 1);
        } else {
          lines.push({ from: name1, to: name2 });
        }

        selectedBox.classList.remove('selected');
        selectedBox = null;
        drawAllLines();
        checkSubmitEligibility();
      }
    });

    canvasContainer.appendChild(box);
    boxMap.set(name, box);
  }

  // Handle line click for erasing
  canvas.addEventListener('click', e => {
    if (!isEraserMode) return;

    const clickX = e.offsetX;
    const clickY = e.offsetY;

    const threshold = 5;
    for (let i = 0; i < lines.length; i++) {
      const { from, to } = lines[i];
      const boxA = boxMap.get(from);
      const boxB = boxMap.get(to);

      const ax = boxA.offsetLeft + boxA.offsetWidth / 2;
      const ay = boxA.offsetTop + boxA.offsetHeight / 2;
      const bx = boxB.offsetLeft + boxB.offsetWidth / 2;
      const by = boxB.offsetTop + boxB.offsetHeight / 2;

      const dist = pointToLineDistance(clickX, clickY, ax, ay, bx, by);
      if (dist < threshold) {
        lines.splice(i, 1);
        drawAllLines();
        break;
      }
    }
  });

  function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function drawAllLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const { from, to } of lines) {
      const boxA = boxMap.get(from);
      const boxB = boxMap.get(to);
      if (boxA && boxB) {
        const ax = boxA.offsetLeft + boxA.offsetWidth / 2;
        const ay = boxA.offsetTop + boxA.offsetHeight / 2;
        const bx = boxB.offsetLeft + boxB.offsetWidth / 2;
        const by = boxB.offsetTop + boxB.offsetHeight / 2;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Submit handler (unchanged)
  submitBtn.onclick = async () => {
    const result = getPhase2Results();

    const header = 'name,relationship,x,y,connectedTo';
    const rows = result.map(r =>
      `${r.name},${r.relationship},${r.x},${r.y},${r.connectedTo.join(';')}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const filename = `brokerage_${participantId}.csv`;
    const formData = new FormData();
    formData.append("file", blob, filename);

    try {
      const response = await fetch(`https://srnpro.vercel.app/api/upload-runsheet?key=${filename}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      console.log("Upload response:", result);

      // Redirect to the next page with worker_id in query string
      window.location.href = `demo_survey.html.html?worker_id=${participantId}`;

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    }
  };

  // Expose final layout + connections
  window.getPhase2Results = function () {
    return responses.map(r => {
      const box = boxMap.get(r.name);
      const x = box ? box.offsetLeft : null;
      const y = box ? box.offsetTop : null;

      const connectedTo = lines
        .filter(line => line.from === r.name || line.to === r.name)
        .map(line => (line.from === r.name ? line.to : line.from));

      return { ...r, x, y, connectedTo };
    });
  };
}

// ----------------- Boot -----------------
askPartid();

const urlParams = new URLSearchParams(window.location.search);
const paramId = urlParams.get("ParticipantId");
if (paramId) {
  participantId = paramId;
  showPhase1();  // skip manual ID input
}
