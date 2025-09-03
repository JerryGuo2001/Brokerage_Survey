// === PHASE 1 CONFIG (Updated to CSV Upload) ===
const maxRepeats = 10;  // kept to preserve structure; not used in CSV flow
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

// ----------------- Worker/Participant ID intake (unchanged behavior) -----------------
function askPartid() {
  const urlParams = new URLSearchParams(window.location.search);
  const workerId = urlParams.get("worker_id");

  if (workerId) {
    participantId = workerId;
    nextBtn.style.display = 'inline-block';
    nextBtn.onclick = () => {
      console.log("Auto-loaded Participant ID:", participantId);
      // Proceed to next step
      savePartid();
    };
    nextBtn.click();  // auto-advance
  } else {
    // Manual input
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
  // Move to next step in your flow
}

// ----------------- (Minor) progress helper kept for consistency -----------------
function updateProgress(text = "") {
  progressBar.textContent = text;
}

// ----------------- NEW: CSV-Driven Phase 1 -----------------
function showPhase1() {
  showCSVUpload();
}

function showCSVUpload() {
  updateProgress("Upload your CSV: initials,relationship (at least 5 rows)");
  questionArea.innerHTML = `
    <div>
      <p><strong>CSV format:</strong> <code>initials,relationship</code></p>
      <ul style="margin: 0.5em 0 1em 1.2em;">
        <li><code>initials</code>: e.g., <em>A.S.</em> or <em>JK</em></li>
        <li><code>relationship</code> must be one of:
          <em>${relationships.join(", ")}</em>
        </li>
      </ul>
      <input type="file" id="csv-file" accept=".csv" />
      <div id="csv-error" style="color:red; font-size:14px; margin-top:8px;"></div>
      <div id="csv-preview" style="margin-top:12px;"></div>
    </div>
  `;

  nextBtn.style.display = 'none';
  nextBtn.onclick = proceedAfterCSV;

  const fileInput = document.getElementById('csv-file');
  fileInput.addEventListener('change', handleCSVSelected);
}

function handleCSVSelected(e) {
  const file = e.target.files && e.target.files[0];
  const errorDiv = document.getElementById('csv-error');
  const previewDiv = document.getElementById('csv-preview');
  errorDiv.textContent = "";
  previewDiv.innerHTML = "";
  responses = [];
  nextBtn.style.display = 'none';

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const parsed = parseCSV(text); // returns array of objects with {initials, relationship}
      const validated = validateCSV(parsed);
      if (!validated.ok) {
        errorDiv.textContent = validated.message;
        return;
      }
      // map to internal responses structure {name, relationship}
      responses = validated.rows.map(r => ({ name: r.initials, relationship: r.relationship }));
      // Preview
      const list = document.createElement('ul');
      for (const r of responses) {
        const li = document.createElement('li');
        li.textContent = `${r.name} — ${r.relationship}`;
        list.appendChild(li);
      }
      previewDiv.innerHTML = "<strong>Loaded entries:</strong>";
      previewDiv.appendChild(list);

      updateProgress(`Loaded ${responses.length} from CSV`);
      nextBtn.style.display = 'inline-block';
    } catch (err) {
      console.error(err);
      errorDiv.textContent = "Failed to parse CSV. Please check the format.";
    }
  };
  reader.onerror = () => {
    errorDiv.textContent = "Unable to read the selected file.";
  };
  reader.readAsText(file);
}

// Basic CSV parser supporting simple quoted fields
function parseCSV(text) {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  // Detect header (expect "initials,relationship" in any case/whitespace)
  const header = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  let startIdx = 0;
  let hasHeader = false;
  const initialsIdx = header.indexOf("initials");
  const relIdx = header.indexOf("relationship");
  if (initialsIdx !== -1 && relIdx !== -1) {
    hasHeader = true;
    startIdx = 1;
  }

  const rows = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    // If header exists, use those indexes; else assume two columns in order
    let initials, relationship;
    if (hasHeader) {
      initials = (cols[initialsIdx] || "").trim();
      relationship = (cols[relIdx] || "").trim();
    } else {
      initials = (cols[0] || "").trim();
      relationship = (cols[1] || "").trim();
    }
    if (!initials && !relationship) continue; // skip blank lines
    rows.push({ initials, relationship });
  }
  return rows;
}

// Split a CSV line into cells (handles simple quotes)
function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function validateCSV(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "CSV appears empty." };
  }
  if (rows.length < 5) {
    return { ok: false, message: "Please provide at least 5 rows." };
  }

  const relSet = new Set(relationships.map(r => r.toLowerCase()));
  const seenNames = new Set();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const lineNo = i + 1; // approximate (header not counted)
    if (!r.initials) {
      return { ok: false, message: `Row ${lineNo}: "initials" is required.` };
    }
    if (!r.relationship) {
      return { ok: false, message: `Row ${lineNo}: "relationship" is required.` };
    }
    if (!relSet.has(r.relationship.toLowerCase())) {
      return { ok: false, message: `Row ${lineNo}: relationship "${r.relationship}" is not allowed.` };
    }
    const key = r.initials.toLowerCase();
    if (seenNames.has(key)) {
      return { ok: false, message: `Duplicate initials found: "${r.initials}". Please ensure initials are unique.` };
    }
    seenNames.add(key);
  }

  return { ok: true, rows };
}

function proceedAfterCSV() {
  // We already validated and populated `responses`
  document.getElementById('phase1').style.display = 'none';
  document.getElementById('phase2').style.display = 'block';
  launchPhase2();
}

// --------------- Original name/relationship Q&A kept (unused now) ---------------
function showNameInput() {
  updateProgress(`Question ${currentStep + 1} of ${maxRepeats}`);
  questionArea.innerHTML = `
      <label>Enter the initial of someone you're directly connected to:</label>
      <input type="text" id="name-input" placeholder="e.g., A.S.">
      <div id="error-msg" style="color:red; font-size:14px;"></div>
  `;
  nextBtn.style.display = 'none';
  nextBtn.onclick = saveName;

  const input = document.getElementById('name-input');
  input.addEventListener('input', () => {
    const name = input.value.trim();
    const duplicate = responses.some(r => r.name.toLowerCase() === name.toLowerCase());
    const errorMsg = document.getElementById('error-msg');

    if (!name || duplicate) {
      nextBtn.style.display = 'none';
      errorMsg.textContent = duplicate ? "This initial has already been entered." : "";
    } else {
      errorMsg.textContent = "";
      nextBtn.style.display = 'inline-block';
    }
  });
}
function saveName() {
  const name = document.getElementById('name-input').value.trim();
  responses.push({ name });
  showRelationshipSelect();
}
function showRelationshipSelect() {
  updateProgress(`Question ${currentStep + 1} of ${maxRepeats}`);
  const options = relationships.map(r => `<option value="${r}">${r}</option>`).join('');
  questionArea.innerHTML = `
      <label>Select your relationship with ${responses[currentStep].name}:</label>
      <select id="relationship-select">
        <option value="">Select</option>
        ${options}
      </select>
  `;
  nextBtn.style.display = 'none';
  nextBtn.onclick = saveRelationship;

  const select = document.getElementById('relationship-select');
  select.addEventListener('change', () => {
    nextBtn.style.display = select.value ? 'inline-block' : 'none';
  });
}
function saveRelationship() {
  const relationship = document.getElementById('relationship-select').value;
  responses[currentStep].relationship = relationship;
  currentStep++;

  if (currentStep < maxRepeats) {
    showNameInput();
  } else {
    endPhase1();
  }
}
function endPhase1() {
  document.getElementById('phase1').style.display = 'none';
  document.getElementById('phase2').style.display = 'block';
  launchPhase2();
}

// === PHASE 2 START (unchanged UI/logic) ===
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

    // Box click handler for connecting/disconnecting
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

        // Check if line already exists
        const existingIndex = lines.findIndex(line =>
          (line.from === name1 && line.to === name2) ||
          (line.from === name2 && line.to === name1)
        );

        if (existingIndex !== -1) {
          // Line exists → remove it
          lines.splice(existingIndex, 1);
        } else {
          // Line doesn't exist → add it
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

    // Check proximity to a line
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
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

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
