// === Smart Study Planner JS ===
const STORAGE_KEY = 'smart.study.planner.v1';

// Elements
const taskForm = document.getElementById('taskForm');
const title = document.getElementById('title');
const desc = document.getElementById('desc');
const due = document.getElementById('due');
const hours = document.getElementById('hours');
const priority = document.getElementById('priority');
const reminder = document.getElementById('reminder');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const listEl = document.getElementById('list');
const status = document.getElementById('status');
const search = document.getElementById('search');
const allFilter = document.getElementById('allFilter');
const todayFilter = document.getElementById('todayFilter');
const upcomingFilter = document.getElementById('upcomingFilter');
const doneFilter = document.getElementById('doneFilter');
const timelineRows = document.getElementById('timelineRows');
const nowTag = document.getElementById('nowTag');
const editingId = document.getElementById('editingId');

// In-memory tasks
let tasks = loadTasks();
let currentFilter = 'all';

// Init
render();
requestNotificationPermission();
setInterval(checkReminders, 20*1000); // check reminders
setInterval(renderTimeline, 60*1000); // update timeline

// Helpers
function uid(){ return 't_'+Math.random().toString(36).slice(2,9); }
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function loadTasks(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [] }catch(e){ console.error(e); return [] } }
function humanDate(dt){ if(!dt) return '—'; const d = new Date(dt); return d.toLocaleString(); }
function isToday(dt){ if(!dt) return false; const d = new Date(dt); const n = new Date(); return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }

// Notifications
async function requestNotificationPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch(e) { /* ignore */ }
  }
}

function checkReminders(){
  const now = Date.now();
  tasks.forEach(t => {
    if(t.completed) return;
    if(!t.reminder || !t.due) return;
    if(t._notified) return;
    const remindAt = new Date(t.due).getTime() - (t.reminder||0)*60*1000;
    if(now >= remindAt && now < remindAt + 30*1000){
      fireReminder(t);
      t._notified = true;
      saveTasks();
      render();
    }
  });
}

function fireReminder(task){
  const text = `${task.title} — due ${new Date(task.due).toLocaleString()}`;
  if('Notification' in window && Notification.permission === 'granted'){
    try { new Notification('Study Planner Reminder', { body: text }); }
    catch(e) { alert('Reminder: ' + text); }
  } else {
    alert('Reminder: ' + text);
  }
}

// CRUD
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = editingId.value;
  if(id) updateTask(id);
  else addTask();
  taskForm.reset();
  editingId.value = '';
  saveBtn.textContent = 'Add Task';
});

clearBtn.addEventListener('click', () => {
  taskForm.reset();
  editingId.value = '';
  saveBtn.textContent = 'Add Task';
});

function addTask(){
  if(!title.value.trim()) { alert('Enter a title'); return; }
  if(!due.value) { alert('Set due date & time'); return; }
  const t = {
    id: uid(),
    title: title.value.trim(),
    desc: desc.value.trim(),
    due: due.value ? new Date(due.value).toISOString() : null,
    hours: hours.value ? Number(hours.value) : null,
    priority: priority.value || 'med',
    reminder: reminder.value ? Number(reminder.value) : null,
    created: new Date().toISOString(),
    completed: false,
    _notified: false
  };
  tasks.push(t);
  saveTasks();
  render();
  status.textContent = 'Task added.';
}

function updateTask(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  t.title = title.value.trim();
  t.desc = desc.value.trim();
  t.due = due.value ? new Date(due.value).toISOString() : null;
  t.hours = hours.value ? Number(hours.value) : null;
  t.priority = priority.value || 'med';
  t.reminder = reminder.value ? Number(reminder.value) : null;
  t._notified = false;
  saveTasks();
  render();
  status.textContent = 'Task updated.';
}

function deleteTask(id){
  if(!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function toggleComplete(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  t.completed = !t.completed;
  saveTasks();
  render();
}

function editTask(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  title.value = t.title;
  desc.value = t.desc;
  due.value = t.due ? new Date(t.due).toISOString().slice(0,16) : '';
  hours.value = t.hours || '';
  priority.value = t.priority || 'med';
  reminder.value = (t.reminder !== undefined && t.reminder !== null) ? t.reminder : 30;
  editingId.value = t.id;
  saveBtn.textContent = 'Save changes';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render + Filters
search.addEventListener('input', render);
allFilter.addEventListener('click', ()=>{ currentFilter='all'; render(); });
todayFilter.addEventListener('click', ()=>{ currentFilter='today'; render(); });
upcomingFilter.addEventListener('click', ()=>{ currentFilter='upcoming'; render(); });
doneFilter.addEventListener('click', ()=>{ currentFilter='done'; render(); });

function render(){
  tasks.sort((a,b) => {
    const da = a.due ? Date.parse(a.due) : Infinity;
    const db = b.due ? Date.parse(b.due) : Infinity;
    return da - db;
  });

  const q = (search.value || '').trim().toLowerCase();

  const shown = tasks.filter(t => {
    if(q) {
      const hay = (t.title||'') + ' ' + (t.desc||'');
      if(!hay.toLowerCase().includes(q)) return false;
    }
    if(currentFilter === 'today') {
      if(!t.due || !isToday(t.due)) return false;
    } else if(currentFilter === 'upcoming') {
      if(!t.due) return false;
      if(isToday(t.due)) return false;
    } else if(currentFilter === 'done') {
      if(!t.completed) return false;
    }
    return true;
  });

  listEl.innerHTML = '';
  if(shown.length === 0){
    listEl.innerHTML = '<div class="small" style="padding:12px">No tasks found for this filter/search.</div>';
  }

  shown.forEach(t => {
    const el = document.createElement('div');
    el.className = 'task';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const titleHtml = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="title">${escapeHtml(t.title)} ${t.completed ? '<span class="small" style="color:var(--ok);margin-left:8px">(Completed)</span>' : ''}</div>
        <div class="small">${t.due ? humanDate(t.due) : '<em>No due date</em>'} · ${t.priority ? ('Priority: '+t.priority) : ''}</div>
      </div>
      <div class="actions"></div>
    </div>`;

    meta.innerHTML = titleHtml + `<div class="small" style="margin-top:8px">${escapeHtml(t.desc || '')}</div>`;
    const actions = meta.querySelector('.actions');

    const doneBtn = document.createElement('button');
    doneBtn.className = 'pill';
    doneBtn.textContent = t.completed ? 'Unmark' : 'Done';
    doneBtn.addEventListener('click', ()=> toggleComplete(t.id));

    const editBtn = document.createElement('button');
    editBtn.className = 'pill';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', ()=> editTask(t.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'pill';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> deleteTask(t.id));

    actions.appendChild(doneBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    const right = document.createElement('div');
    right.style.minWidth = '220px';
    right.innerHTML = `<div class="small">Est hours: ${t.hours || '—'}</div>
      <div style="margin-top:8px" class="progress"><div class="bar" style="width:${timeProgressPercent(t)}%"></div></div>`;

    el.appendChild(meta);
    el.appendChild(right);
    listEl.appendChild(el);
  });

  status.textContent = `${shown.length} task(s) — filter: ${currentFilter}`;
  renderTimeline();
}

function timeProgressPercent(t){
  if(!t.due) return 0;
  const created = Date.parse(t.created);
  const dueTs = Date.parse(t.due);
  const now = Date.now();
  if(now <= created) return 0;
  if(now >= dueTs) return 100;
  const pct = Math.round(((now - created) / (dueTs - created)) * 100);
  return Math.min(100, Math.max(0, pct));
}

function renderTimeline(){
  timelineRows.innerHTML = '';
  nowTag.textContent = new Date().toLocaleTimeString();
  const visible = tasks.slice().sort((a,b) => {
    const da = a.due ? Date.parse(a.due) : Infinity;
    const db = b.due ? Date.parse(b.due) : Infinity;
    return da - db;
  }).slice(0,20);

  visible.forEach(t => {
    const r = document.createElement('div');
    r.className = 'row';
    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:600">${escapeHtml(t.title)}</div>
                      <div class="small">due: ${t.due ? humanDate(t.due) : '—'} · ${t.completed ? '<span style="color:var(--ok)">Completed</span>' : ''}</div>`;
    const right = document.createElement('div');
    right.style.width = '45%';
    right.innerHTML = `<div class="progress"><div class="bar" style="width:${timeProgressPercent(t)}%"></div></div>`;
    r.appendChild(left);
    r.appendChild(right);
    timelineRows.appendChild(r);
  });
}

// Utilities
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
