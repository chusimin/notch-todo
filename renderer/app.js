const STORAGE_KEY = 'notch-todo-data';
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const app = document.getElementById('app');
const notch = document.getElementById('notch');
const card = document.getElementById('card');

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { P0: [], P1: [], P2: [], P3: [] };
    const parsed = JSON.parse(raw);
    return {
      P0: Array.isArray(parsed.P0) ? parsed.P0 : [],
      P1: Array.isArray(parsed.P1) ? parsed.P1 : [],
      P2: Array.isArray(parsed.P2) ? parsed.P2 : [],
      P3: Array.isArray(parsed.P3) ? parsed.P3 : [],
    };
  } catch (e) {
    return { P0: [], P1: [], P2: [], P3: [] };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore quota errors
  }
}

let data = loadData();

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function checkSvg() {
  return '<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(priority) {
  const list = document.querySelector(`.todo-list[data-priority="${priority}"]`);
  if (!list) return;
  const items = data[priority] || [];
  list.innerHTML = items
    .map((item) => {
      const doneClass = item.done ? ' done' : '';
      const safeText = escapeHtml(item.text);
      return `
        <li class="todo-item${doneClass}" data-id="${item.id}" data-priority="${priority}">
          <button class="checkbox" data-action="toggle">${checkSvg()}</button>
          <span class="todo-text">${safeText}</span>
          <button class="delete" data-action="delete" aria-label="删除">×</button>
        </li>
      `;
    })
    .join('');
}

function updateCount(priority) {
  const countEl = document.querySelector(`.count[data-priority="${priority}"]`);
  if (!countEl) return;
  const items = data[priority] || [];
  const pending = items.filter((t) => !t.done).length;
  countEl.textContent = String(pending);
}

function renderAll() {
  PRIORITIES.forEach((p) => {
    renderList(p);
    updateCount(p);
  });
}

function addTodo(priority, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  data[priority].push({
    id: generateId(),
    text: trimmed,
    done: false,
    createdAt: Date.now(),
  });
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

function toggleTodo(priority, id) {
  const list = data[priority];
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  list[idx].done = !list[idx].done;
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

function deleteTodo(priority, id) {
  data[priority] = data[priority].filter((t) => t.id !== id);
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

let isExpanded = false;

async function setMode(expanded) {
  if (expanded === isExpanded) return;
  isExpanded = expanded;
  if (expanded) {
    app.classList.remove('collapsed');
    app.classList.add('expanded');
  } else {
    app.classList.remove('expanded');
    app.classList.add('collapsed');
  }
  if (window.notchAPI && typeof window.notchAPI.setMode === 'function') {
    try {
      await window.notchAPI.setMode(expanded ? 'expanded' : 'collapsed');
    } catch (e) {
      // ignore
    }
  }
}

notch.addEventListener('click', (e) => {
  e.stopPropagation();
  setMode(!isExpanded);
});

card.addEventListener('click', (e) => {
  e.stopPropagation();
});

PRIORITIES.forEach((priority) => {
  const input = document.querySelector(`.add-row input[data-priority="${priority}"]`);
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo(priority, input.value);
      input.value = '';
    }
  });
});

PRIORITIES.forEach((priority) => {
  const list = document.querySelector(`.todo-list[data-priority="${priority}"]`);
  if (!list) return;
  list.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const item = target.closest('.todo-item');
    if (!item) return;
    const id = item.dataset.id;
    const action = target.dataset.action;
    if (action === 'toggle') {
      toggleTodo(priority, id);
    } else if (action === 'delete') {
      deleteTodo(priority, id);
    }
  });
});

renderAll();
