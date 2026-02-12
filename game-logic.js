// Configuración y Estado
const STATE_KEY = 'betterMeState_v4'; // Update version
const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 Minutos
// const UPDATE_INTERVAL_MS = 10 * 1000; // Debug

// Sonido de Alarma
const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
alarmSound.loop = true;

let state = {
    level: 0,
    lastUpdate: Date.now(),
    logs: []
};

// Elementos del DOM
const levelDisplay = document.getElementById('level-display');
const timeLeftDisplay = document.getElementById('time-left');
const progressBar = document.getElementById('main-progress-bar');
const progressText = document.getElementById('progress-text');

const btnUpdate = document.getElementById('btn-update');
const btnReset = document.getElementById('btn-reset');

const modalPending = document.getElementById('modal-pending');
const pendingCountSpan = document.getElementById('pending-count');
const pendingLabel = document.getElementById('pending-label');
const btnSubmitPending = document.getElementById('btn-submit-pending');
const logTableBody = document.getElementById('log-table-body');

const CATEGORIES = ['salud', 'enfoque', 'ingreso', 'control'];

// Inicialización
function init() {
    loadState();
    checkPendingUpdates();
    renderLogs();
    setInterval(updateTimer, 1000);
    updateUI();
}

// Sincronización entre pestañas
window.addEventListener('storage', (event) => {
    if (event.key === STATE_KEY) {
        loadState();
        updateUI();
        renderLogs();
    }
});

function loadState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        if (!state.logs) state.logs = [];
        if (state.level === undefined) state.level = 0;
    } else {
        state.lastUpdate = Date.now();
        state.level = 0;
        saveState();
    }
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    updateUI();
    renderLogs();
}

function renderLogs() {
    logTableBody.innerHTML = '';
    const sortedLogs = [...state.logs].sort((a, b) => b.timestamp - a.timestamp);

    sortedLogs.forEach(log => {
        const tr = document.createElement('tr');
        
        const date = new Date(log.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        let typeClass = '';
        let typeLabel = '';
        
        if (log.type === 'regular') {
            typeClass = 'tag-regular';
            typeLabel = 'NORMAL';
        } else if (log.type === 'recovery') {
            typeClass = 'tag-recovery';
            typeLabel = 'RECUPERACIÓN';
        } else if (log.type === 'reset') {
            typeClass = 'tag-recovery';
            typeLabel = '💀 REINICIO';
        }

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td class="${typeClass}">${typeLabel}</td>
            <td>${formatLogData(log.data.salud)}</td>
            <td>${formatLogData(log.data.enfoque)}</td>
            <td>${formatLogData(log.data.ingreso)}</td>
            <td>${formatLogData(log.data.control)}</td>
        `;
        logTableBody.appendChild(tr);
    });
}

function formatLogData(val) {
    if (!val) return '-';
    if (val === 'si') return '✅ SÍ';
    if (val === 'no') return '❌ NO';
    return val;
}

function updateUI() {
    // Actualizar Nivel
    levelDisplay.textContent = state.level;
    
    // Calcular porcentaje (0 a 1000)
    const maxLevel = 1000;
    let percentage = (state.level / maxLevel) * 100;
    if (percentage > 100) percentage = 100;
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage.toFixed(1)}% (Lvl ${state.level}/${maxLevel})`;

    // Colores
    if (state.level > 100) levelDisplay.style.color = '#00ff00';
    if (state.level > 500) levelDisplay.style.color = '#ff00ff';
}

// Lógica de Tiempo y Actualizaciones Pendientes
let pendingIntervals = 0;

function checkPendingUpdates() {
    const now = Date.now();
    const diff = now - state.lastUpdate;
    pendingIntervals = Math.floor(diff / UPDATE_INTERVAL_MS);

    if (pendingIntervals > 0) {
        showPendingModal();
    } else {
        hidePendingModal();
    }
}

function updateTimer() {
    const now = Date.now();
    const diff = now - state.lastUpdate;
    const nextUpdate = state.lastUpdate + UPDATE_INTERVAL_MS;
    const timeLeft = nextUpdate - now;

    if (timeLeft <= 0) {
        timeLeftDisplay.textContent = "¡AHORA!";
        timeLeftDisplay.style.color = "red";
        
        if (alarmSound.paused) {
            alarmSound.play().catch(e => console.log("Interacción requerida para audio"));
        }

        if (modalPending.classList.contains('hidden')) {
            checkPendingUpdates();
        }
    } else {
        if (!alarmSound.paused) {
            alarmSound.pause();
            alarmSound.currentTime = 0;
        }

        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timeLeftDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
        timeLeftDisplay.style.color = "inherit";
    }
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// Manejo del Modal de Pendientes
function showPendingModal() {
    modalPending.classList.remove('hidden');
    updatePendingUI();
}

function hidePendingModal() {
    modalPending.classList.add('hidden');
}

function updatePendingUI() {
    pendingCountSpan.textContent = pendingIntervals;
    
    const recoveredTime = new Date(state.lastUpdate + UPDATE_INTERVAL_MS);
    const timeString = recoveredTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    pendingLabel.textContent = `Pendiente: ${timeString}`;
    
    // Limpiar radios pendientes
    CATEGORIES.forEach(cat => {
        const radios = document.getElementsByName(`pending-${cat}`);
        radios.forEach(r => r.checked = false);
    });
}

// Helper para obtener valor de radio buttons
function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
}

// Helper para validar radio buttons
function validateRadios(prefix = '') {
    return CATEGORIES.every(cat => {
        const val = getRadioValue(`${prefix}${cat}`);
        return val !== null;
    });
}

function getRadioValues(prefix = '') {
    const data = {};
    CATEGORIES.forEach(cat => {
        data[cat] = getRadioValue(`${prefix}${cat}`);
    });
    return data;
}

// Enviar reporte pendiente
btnSubmitPending.addEventListener('click', () => {
    if (!validateRadios('pending-')) {
        alert("¡Debes responder SÍ o NO en todas las categorías!");
        return;
    }

    const logTimestamp = state.lastUpdate + UPDATE_INTERVAL_MS;
    const values = getRadioValues('pending-');

    // Check failure
    const hasFailure = Object.values(values).includes('no');

    const log = {
        type: 'recovery',
        timestamp: logTimestamp,
        data: values
    };
    state.logs.push(log);

    // Update Logic
    state.lastUpdate += UPDATE_INTERVAL_MS;
    pendingIntervals--;
    
    state.level++;

    if (pendingIntervals > 0) {
        updatePendingUI();
        saveState();
    } else {
        state.lastUpdate = Date.now();
        alarmSound.pause();
        alarmSound.currentTime = 0;
        saveState();
        hidePendingModal();
    }
});

// Actualización Normal
btnUpdate.addEventListener('click', () => {
    if (!validateRadios('')) {
        alert("¡Responde todas las preguntas! SÍ o NO.");
        return;
    }

    const values = getRadioValues('');
    
    const log = {
        type: 'regular',
        timestamp: Date.now(),
        data: values
    };
    state.logs.push(log);

    state.level++;
    state.lastUpdate = Date.now();
    
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    // Clear inputs
    CATEGORIES.forEach(cat => {
        const radios = document.getElementsByName(cat);
        radios.forEach(r => r.checked = false);
    });

    saveState();
    alert(`¡Actualizado! Nivel ${state.level}.`);
});

// Reinicio de Nivel
btnReset.addEventListener('click', () => {
    if (!confirm("¿Seguro que quieres reiniciar? Volverás a Nivel 0.")) return;
    
    const log = {
        type: 'reset',
        timestamp: Date.now(),
        data: {
            salud: 'REINICIO',
            enfoque: 'REINICIO',
            ingreso: 'REINICIO',
            control: 'REINICIO'
        }
    };
    state.logs.push(log);
    
    state.level = 0;
    state.lastUpdate = Date.now();
    
    saveState();
    alert("Nivel reiniciado a 0.");
});

init();
