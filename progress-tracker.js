// Progress Tracker module
(function () {
  const sampleProjects = {
    "4735": [
      {
        id: "A123",
        description: "Boom Assembly",
        parent_id: null,
        status: "work_in_progress",
        substatus: "modeled",
        notes: [
          { date: "2025-09-09", text: "Initial modeling started" }
        ]
      },
      {
        id: "A123-1",
        description: "Arm",
        parent_id: "A123",
        status: "not_started",
        substatus: null,
        notes: []
      },
      {
        id: "A123-2",
        description: "Hydraulic Cylinder",
        parent_id: "A123",
        status: "completed",
        substatus: null,
        notes: [
          { date: "2025-09-11", text: "Purchased" }
        ]
      }
    ],
    "celery_harvester": [
      {
        id: "C1",
        description: "Main Frame",
        parent_id: null,
        status: "not_started",
        substatus: null,
        notes: []
      },
      {
        id: "C1-1",
        description: "Left Wheel",
        parent_id: "C1",
        status: "not_started",
        substatus: null,
        notes: []
      },
      {
        id: "C1-2",
        description: "Right Wheel",
        parent_id: "C1",
        status: "work_in_progress",
        substatus: "quoted",
        notes: []
      }
    ]
  };

  let curName = null;
  let items = [];
  let open = new Set();
  let filter = 'all';

  const statusProgress = {
    not_started: 0,
    work_in_progress: 0.5,
    completed: 1
  };

  const substatusProgress = {
    '': 0,
    modeled: 0.33,
    quoted: 0.66
  };

  const projSel = document.getElementById('ptProject');
  const filterSel = document.getElementById('ptFilter');
  const treeEl = document.getElementById('ptTree');
  const importInput = document.getElementById('ptImport');

  document
    .getElementById('ptNewProject')
    .addEventListener('click', newProject);
  document
    .getElementById('ptDeleteProject')
    .addEventListener('click', deleteProject);
  document
    .getElementById('ptAddRoot')
    .addEventListener('click', () => addItem(null));
  document
    .getElementById('ptExport')
    .addEventListener('click', exportProject);
  document
    .getElementById('ptImportBtn')
    .addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', handleImport);
  projSel.addEventListener('change', () => loadProject(projSel.value));
  filterSel.addEventListener('change', () => {
    filter = filterSel.value;
    applyFilter();
  });

  initProjects();
  if (projSel.options.length > 0) loadProject(projSel.value);

  function initProjects() {
    for (const name in sampleProjects) {
      const key = 'project_' + name;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(sampleProjects[name]));
      }
    }
    populateProjects();
  }

  function populateProjects() {
    projSel.innerHTML = '';
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('project_')) names.push(k.slice(8));
    }
    names.sort();
    for (const n of names) {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      projSel.appendChild(opt);
    }
  }

  function loadProject(name) {
    curName = name;
    const key = 'project_' + name;
    const data = localStorage.getItem(key);
    items = data ? JSON.parse(data) : [];
    renderTree();
  }

  function saveProject() {
    if (!curName) return;
    const key = 'project_' + curName;
    localStorage.setItem(key, JSON.stringify(items));
  }

  function newProject() {
    const name = prompt('Project name?');
    if (!name) return;
    const key = 'project_' + name;
    if (localStorage.getItem(key)) {
      alert('Exists.');
      return;
    }
    localStorage.setItem(key, '[]');
    populateProjects();
    projSel.value = name;
    loadProject(name);
  }

  function deleteProject() {
    if (!curName) return;
    if (!confirm('Delete project?')) return;
    localStorage.removeItem('project_' + curName);
    curName = null;
    items = [];
    populateProjects();
    if (projSel.options.length > 0) {
      loadProject(projSel.options[0].value);
    } else {
      treeEl.innerHTML = '';
    }
  }

  function buildTree() {
    const map = {};
    for (const it of items) map[it.id] = { ...it, children: [] };
    const roots = [];
    for (const it of items) {
      if (it.parent_id) {
        const p = map[it.parent_id];
        if (p) p.children.push(map[it.id]);
      } else roots.push(map[it.id]);
    }
    return roots;
  }

  function progress(node) {
    if (!node.children.length) {
      if (node.status === 'work_in_progress') {
        const ss = node.substatus || '';
        if (ss === 'drafted') {
          node.status = 'completed';
          node.substatus = null;
          node.progress = 1;
        } else {
          const subprog =
            Object.prototype.hasOwnProperty.call(substatusProgress, ss)
              ? substatusProgress[ss]
              : undefined;
          node.progress =
            subprog !== undefined
              ? subprog
              : statusProgress[node.status] || 0;
          node.substatus = ss;
        }
      } else {
        node.progress = statusProgress[node.status] || 0;
      }
    } else {
      let sum = 0;
      let completed = true;
      let notStarted = true;
      for (const c of node.children) {
        sum += progress(c);
        if (c.status !== 'completed') completed = false;
        if (c.status !== 'not_started') notStarted = false;
      }
      node.progress =
        node.children.length ? sum / node.children.length : 0;
      node.status = completed
        ? 'completed'
        : notStarted
        ? 'not_started'
        : 'work_in_progress';
      node.substatus = null;
    }
    const item = items.find(it => it.id === node.id);
    if (item) {
      item.status = node.status;
      item.substatus = node.substatus;
    }
    return node.progress;
  }

  function renderTree() {
    captureOpen();
    const roots = buildTree();
    for (const r of roots) progress(r);
    treeEl.innerHTML = '<ul class="tree" id="ptRoot"></ul>';
    const rootUl = document.getElementById('ptRoot');
    for (const r of roots) rootUl.appendChild(renderNode(r));
    restoreOpen();
    applyFilter();
    saveProject();
  }

  function captureOpen() {
    open.clear();
    document.querySelectorAll('#ptRoot li').forEach(li => {
      if (!li.classList.contains('pt-collapsed') && li.querySelector('ul')) {
        open.add(li.dataset.id);
      }
    });
  }

  function restoreOpen() {
    open.forEach(id => {
      const li = document.querySelector(`#ptRoot li[data-id="${id}"]`);
      if (li) li.classList.remove('pt-collapsed');
    });
  }

  function renderNode(node) {
    const li = document.createElement('li');
    li.dataset.id = node.id;
    const row = document.createElement('div');
    row.className = 'pt-row status-' + node.status;

    const toggle = document.createElement('span');
    toggle.className =
      node.children.length ? 'pt-toggle' : 'pt-toggle empty';
    toggle.textContent = node.children.length ? '▾' : '';
    if (node.children.length) {
      toggle.addEventListener('click', () => {
        li.classList.toggle('pt-collapsed');
        toggle.textContent =
          li.classList.contains('pt-collapsed') ? '▸' : '▾';
      });
    }
    row.appendChild(toggle);

    const idSpan = document.createElement('span');
    idSpan.className = 'pt-id';
    idSpan.textContent = node.id;
    row.appendChild(idSpan);

    const desc = document.createElement('span');
    desc.className = 'pt-desc';
    desc.textContent = node.description;
    row.appendChild(desc);

    const prog = document.createElement('span');
    prog.className = 'pt-progress';
    prog.textContent = Math.round(node.progress * 100) + '%';
    row.appendChild(prog);

    const statusSel = document.createElement('select');
    for (const o of [
      ['not_started', 'Not Started'],
      ['work_in_progress', 'Work in Progress'],
      ['completed', 'Completed']
    ]) {
      const opt = document.createElement('option');
      opt.value = o[0];
      opt.textContent = o[1];
      if (node.status === o[0]) opt.selected = true;
      statusSel.appendChild(opt);
    }
    statusSel.addEventListener('change', e => {
      const item = items.find(it => it.id === node.id);
      if (item) {
        item.status = e.target.value;
        if (item.status === 'work_in_progress') {
          item.substatus = item.substatus || '';
        } else {
          item.substatus = null;
        }
      }
      renderTree();
    });
    row.appendChild(statusSel);

    const subSel = document.createElement('select');
    subSel.className = 'pt-substatus';
    for (const s of ['', 'modeled', 'quoted', 'drafted']) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s
        ? s.charAt(0).toUpperCase() + s.slice(1)
        : '';
      if ((node.substatus || '') === s) opt.selected = true;
      subSel.appendChild(opt);
    }
    subSel.style.display =
      node.status === 'work_in_progress' ? '' : 'none';
    subSel.addEventListener('change', e => {
      const item = items.find(it => it.id === node.id);
      if (item) {
        if (e.target.value === 'drafted') {
          item.status = 'completed';
          item.substatus = null;
        } else {
          item.substatus = e.target.value;
        }
      }
      renderTree();
    });
    row.appendChild(subSel);

    const notesBtn = document.createElement('button');
    notesBtn.textContent = 'Notes';
    notesBtn.className = 'pt-mini';
    row.appendChild(notesBtn);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'pt-mini';
    addBtn.addEventListener('click', () => addItem(node.id));
    row.appendChild(addBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Del';
    delBtn.className = 'pt-mini';
    delBtn.addEventListener('click', () => deleteItem(node.id));
    row.appendChild(delBtn);

    li.appendChild(row);

    const notesPanel = document.createElement('div');
    notesPanel.className = 'pt-notes hidden';
    renderNotes();
    notesBtn.addEventListener('click', () => {
      notesPanel.classList.toggle('hidden');
    });
    li.appendChild(notesPanel);

    function renderNotes() {
      notesPanel.innerHTML = '';
      const list = document.createElement('ul');
      for (const n of node.notes) {
        const liN = document.createElement('li');
        liN.textContent = n.date + ' - ' + n.text;
        list.appendChild(liN);
      }
      notesPanel.appendChild(list);
      const ta = document.createElement('textarea');
      ta.rows = 3;
      notesPanel.appendChild(ta);
      const addN = document.createElement('button');
      addN.textContent = 'Add Note';
      addN.className = 'pt-mini';
      addN.addEventListener('click', () => {
        const t = ta.value.trim();
        if (!t) return;
        node.notes.push({
          date: new Date().toISOString().split('T')[0],
          text: t
        });
        ta.value = '';
        renderTree();
      });
      notesPanel.appendChild(addN);
    }

    if (node.children.length) {
      const childUl = document.createElement('ul');
      for (const ch of node.children) childUl.appendChild(renderNode(ch));
      li.appendChild(childUl);
    }
    return li;
  }

  function addItem(parentId) {
    const id = prompt('Item number?');
    if (!id) return;
    if (items.some(it => it.id === id)) {
      alert('Exists.');
      return;
    }
    const desc = prompt('Item description?');
    if (!desc) return;
    items.push({
      id,
      description: desc,
      parent_id: parentId,
      status: 'not_started',
      substatus: null,
      notes: []
    });
    renderTree();
  }

  function deleteItem(id) {
    if (!confirm('Delete item?')) return;
    const ids = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const it of items) {
        if (it.parent_id && ids.has(it.parent_id) && !ids.has(it.id)) {
          ids.add(it.id);
          changed = true;
        }
      }
    }
    items = items.filter(it => !ids.has(it.id));
    renderTree();
  }

  function applyFilter() {
    const rootUl = document.getElementById('ptRoot');
    if (!rootUl) return;
    function evalLi(li) {
      const id = li.dataset.id;
      const item = items.find(it => it.id === id);
      const match = filter === 'all' || item.status === filter;
      const childUl = li.querySelector(':scope > ul');
      let childMatch = false;
      if (childUl) {
        Array.from(childUl.children).forEach(c => {
          if (evalLi(c)) childMatch = true;
        });
      }
      const show = match || childMatch;
      li.style.display = show ? '' : 'none';
      return show;
    }
    Array.from(rootUl.children).forEach(c => evalLi(c));
  }

  function exportProject() {
    saveProject();
    const data = { name: curName, items };
    const blob =
      new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = curName + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.name || !Array.isArray(data.items)) {
          alert('Bad file');
          return;
        }
        localStorage.setItem(
          'project_' + data.name,
          JSON.stringify(data.items)
        );
        populateProjects();
        projSel.value = data.name;
        loadProject(data.name);
      } catch {
        alert('Bad JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
})();

