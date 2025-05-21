// === PHASE 1 CONFIG ===
const maxRepeats = 3;
let currentStep = 0;
let responses = [];

const relationships = [
"Friend", "Spouse", "Child", "Parent", "Parent-in-law",
"Other close family member", "Schoolmate", "Workmate",
"Close neighbors", "Member of religious group",
"Member of group without religious affiliations"
];

const questionArea = document.getElementById('question-area');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');

function showPhase1() {
showNameInput();
}

function updateProgress() {
progressBar.textContent = `Question ${currentStep + 1} of ${maxRepeats}`;
}

function showNameInput() {
updateProgress();
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
updateProgress();
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

// === PHASE 2 START ===
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

    // Box click handler
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


    submitBtn.onclick = () => {
        const result = getPhase2Results();
    
        const header = ['name', 'relationship', 'x', 'y', 'connectedTo'];
        const rows = result.map(r =>
        [r.name, r.relationship, r.x, r.y, r.connectedTo.join(';')].join(',')
        );
        const csvContent = [header.join(','), ...rows].join('\n');
    
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'phase2_results.csv';
        a.click();
        URL.revokeObjectURL(url);
    };


    // Save final layout + connections into responses
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








// Start Phase 1
showPhase1();
