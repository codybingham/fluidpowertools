  // Tab switching logic
  const PART_LOOKUP_PASSWORD = 'hydraulics';
  let partLookupUnlocked =
    localStorage.getItem('plUnlocked') === 'true';
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      activateTab(i);
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        let newIndex = i;
        if (e.key === 'ArrowRight') {
          newIndex = (i + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
          newIndex = (i - 1 + tabs.length) % tabs.length;
        }
        activateTab(newIndex);
        tabs[newIndex].focus();
      }
    });
  });

  function activateTab(index) {
    if (
      tabs[index].id === 'tab-part-lookup' &&
      !partLookupUnlocked
    ) {
      const pw = prompt('Enter password for Part Lookup:');
      if (pw !== PART_LOOKUP_PASSWORD) {
        alert('Incorrect password.');
        return;
      }
      partLookupUnlocked = true;
      localStorage.setItem('plUnlocked', 'true');
    }
    tabs.forEach((tab, i) => {
      if (i === index) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        panels[i].classList.add('active');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('tabindex', '-1');
        panels[i].classList.remove('active');
      }
    });
    localStorage.setItem('activeTab', index);
  }

  const storedTab = localStorage.getItem('activeTab');
  let storedIndex = storedTab !== null ? parseInt(storedTab, 10) : 0;
  if (
    !partLookupUnlocked &&
    tabs[storedIndex] &&
    tabs[storedIndex].id === 'tab-part-lookup'
  ) {
    storedIndex = 0;
  }
  if (storedIndex >= 0 && storedIndex < tabs.length) {
    activateTab(storedIndex);
  } else {
    activateTab(0);
  }

  const persistEls = document.querySelectorAll('input, select, textarea');
  persistEls.forEach(el => {
    if (!el.id) return;
    const stored = localStorage.getItem(el.id);
    if (stored !== null) {
      if (el.type === 'checkbox') {
        el.checked = stored === 'true';
      } else {
        el.value = stored;
      }
    }
    const evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(evt, () => {
      const val = el.type === 'checkbox' ? el.checked : el.value;
      localStorage.setItem(el.id, val);
    });
  });

  const resultIds = [
    'pressureDropResult',
    'unitConvertResult',
    'cylinderForceResult',
    'pumpPowerResult',
    'bomResults',
    'partLookupResults'
    ];
  resultIds.forEach(id => {
    const el = document.getElementById(id);
    const stored = localStorage.getItem(id);
    if (stored !== null && el) {
      el.innerHTML = stored;
    }
  });

  // -------- Calculator functions --------

  // Pressure Drop Calculation (Darcy-Weisbach with Swamee-Jain approx)
  // Inputs: flow (GPM), diameter (in), length (ft), viscosity (cP)
  // Output: pressure drop in psi
  function calculatePressureDrop(flowGPM, diameterIn, lengthFt, viscosityCp) {
    if (flowGPM <= 0 || diameterIn <= 0 || lengthFt <= 0 || viscosityCp <= 0) return null;

    // Convert units
    const diameterM = diameterIn * 0.0254; // m
    const lengthM = lengthFt * 0.3048; // m
    const flow_m3s = flowGPM * 0.00378541 / 60; // m^3/s
    const area = Math.PI * (diameterM / 2) ** 2; // m^2
    const velocity = flow_m3s / area; // m/s

    // Fluid properties (assuming water-like density ~1000 kg/m3)
    const density = 1000; // kg/m^3

    // Reynolds number
    const dynamicViscosity = viscosityCp / 1000; // Pa.s (cP to Pa.s)
    const reynolds = (density * velocity * diameterM) / dynamicViscosity;

    // Roughness for steel pipe approx (m)
    const roughness = 0.000045; 

    // Swamee-Jain formula for friction factor f
    const A = roughness / (3.7 * diameterM);
    const B = 5.74 / Math.pow(reynolds, 0.9);
    let frictionFactor = 0.25 / Math.pow(Math.log10(A + B), 2);

    // For low Reynolds (laminar), friction factor is 64/Re
    if (reynolds < 2300) frictionFactor = 64 / reynolds;

    // Darcy-Weisbach pressure drop (Pa)
    const deltaP = frictionFactor * (lengthM / diameterM) * 0.5 * density * velocity * velocity;

    // Convert Pa to psi (1 Pa = 0.000145038 psi)
    const deltaPsi = deltaP * 0.000145038;

    return deltaPsi.toFixed(2);
  }

  // General Unit Conversions
  const unitConversionData = {
    flow: {
      units: {
        gpm: { label: 'GPM (US Gallons/min)', toBase: 1 },
        lpm: { label: 'LPM (Liters/min)', toBase: 0.264172 },
        cfm: { label: 'CFM (Cubic Feet/min)', toBase: 7.48052 },
        cms: { label: 'CMS (Cubic Meters/sec)', toBase: 15850.3 }
      }
    },
    pressure: {
      units: {
        psi: { label: 'PSI', toBase: 1 },
        bar: { label: 'Bar', toBase: 14.5038 },
        kpa: { label: 'kPa', toBase: 0.145038 }
      }
    },
    force: {
      units: {
        lbf: { label: 'Pound-force (lbf)', toBase: 1 },
        n: { label: 'Newton (N)', toBase: 0.224809 }
      }
    },
    power: {
      units: {
        hp: { label: 'Horsepower (HP)', toBase: 1 },
        kw: { label: 'Kilowatt (kW)', toBase: 1.34102 }
      }
    },
    length: {
      units: {
        in: { label: 'Inches (in)', toBase: 1 },
        ft: { label: 'Feet (ft)', toBase: 12 },
        mm: { label: 'Millimeters (mm)', toBase: 0.0393701 },
        m: { label: 'Meters (m)', toBase: 39.3701 }
      }
    }
  };

  function convertUnits(value, category, fromUnit, toUnit) {
    if (value <= 0) return null;
    const cat = unitConversionData[category];
    if (!cat) return null;
    const from = cat.units[fromUnit];
    const to = cat.units[toUnit];
    if (!from || !to) return null;
    const baseValue = value * from.toBase;
    const converted = baseValue / to.toBase;
    return converted.toFixed(4);
  }

  // Cylinder Force (lbf)
  // Force = Pressure (psi) * Area (in^2)
  function calculateCylinderForce(boreDiameterIn, pressurePsi) {
    if (boreDiameterIn <= 0 || pressurePsi <= 0) return null;
    const areaIn2 = Math.PI * (boreDiameterIn / 2) ** 2;
    const forceLbf = pressurePsi * areaIn2;
    return forceLbf.toFixed(2);
  }

  // Pump Power (HP)
  // Power (HP) = (Flow GPM * Pressure PSI) / (1714 * Efficiency)
  function calculatePumpPower(flowGPM, pressurePsi, efficiencyPct) {
    if (flowGPM <= 0 || pressurePsi <= 0 || efficiencyPct <= 0) return null;
    const eff = efficiencyPct / 100;
    const powerHP = (flowGPM * pressurePsi) / (1714 * eff);
    return powerHP.toFixed(3);
  }

  // -------- Calculator event handlers --------

  document.getElementById('calcPressureDrop').addEventListener('click', () => {
    const flow = parseFloat(document.getElementById('pdFlow').value);
    const dia = parseFloat(document.getElementById('pdDiameter').value);
    const len = parseFloat(document.getElementById('pdLength').value);
    const visc = parseFloat(document.getElementById('pdViscosity').value);

    const result = calculatePressureDrop(flow, dia, len, visc);
    const txt = result !== null ? result + ' psi' : 'Invalid input';
    document.getElementById('pressureDropResult').textContent = txt;
    localStorage.setItem('pressureDropResult', txt);
  });

  document.getElementById('clearPressureDrop').addEventListener('click', () => {
    ['pdFlow','pdDiameter','pdLength','pdViscosity'].forEach(id => {
      document.getElementById(id).value = id === 'pdViscosity' ? '40' : '';
      localStorage.removeItem(id);
    });
    document.getElementById('pressureDropResult').textContent = '';
    localStorage.removeItem('pressureDropResult');
  });

  const ucCategoryEl = document.getElementById('ucCategory');
  const ucFromUnitEl = document.getElementById('ucFromUnit');
  const ucToUnitEl = document.getElementById('ucToUnit');

  function populateUnitSelects() {
    const category = ucCategoryEl.value;
    const units = unitConversionData[category].units;
    ucFromUnitEl.innerHTML = '';
    ucToUnitEl.innerHTML = '';
    Object.keys(units).forEach(key => {
      const label = units[key].label;
      const optFrom = document.createElement('option');
      optFrom.value = key;
      optFrom.textContent = label;
      ucFromUnitEl.appendChild(optFrom);
      const optTo = document.createElement('option');
      optTo.value = key;
      optTo.textContent = label;
      ucToUnitEl.appendChild(optTo);
    });
    const storedFrom = localStorage.getItem('ucFromUnit');
    const storedTo = localStorage.getItem('ucToUnit');
    if (storedFrom && units[storedFrom]) ucFromUnitEl.value = storedFrom;
    if (storedTo && units[storedTo]) ucToUnitEl.value = storedTo;
  }

  ucCategoryEl.addEventListener('change', populateUnitSelects);
  populateUnitSelects();

  document.getElementById('convertUnitBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('ucValue').value);
    const category = ucCategoryEl.value;
    const from = ucFromUnitEl.value;
    const to = ucToUnitEl.value;
    const result = convertUnits(val, category, from, to);
    const txt = result !== null ? result + ' ' + to.toUpperCase() : 'Invalid input';
    document.getElementById('unitConvertResult').textContent = txt;
    localStorage.setItem('unitConvertResult', txt);
  });

  document.getElementById('clearUnitConvert').addEventListener('click', () => {
    ['ucCategory','ucValue','ucFromUnit','ucToUnit','unitConvertResult'].forEach(k => localStorage.removeItem(k));
    ucCategoryEl.value = 'flow';
    document.getElementById('ucValue').value = '';
    populateUnitSelects();
    document.getElementById('unitConvertResult').textContent = '';
  });

  document.getElementById('calcCylinderForceBtn').addEventListener('click', () => {
    const bore = parseFloat(document.getElementById('cylBoreDiameter').value);
    const pressure = parseFloat(document.getElementById('cylPressure').value);
    const result = calculateCylinderForce(bore, pressure);
    const txt = result !== null ? result + ' lbf' : 'Invalid input';
    document.getElementById('cylinderForceResult').textContent = txt;
    localStorage.setItem('cylinderForceResult', txt);
  });

  document.getElementById('clearCylinderForce').addEventListener('click', () => {
    ['cylBoreDiameter','cylPressure'].forEach(id => {
      document.getElementById(id).value = '';
      localStorage.removeItem(id);
    });
    document.getElementById('cylinderForceResult').textContent = '';
    localStorage.removeItem('cylinderForceResult');
  });

  document.getElementById('calcPumpPowerBtn').addEventListener('click', () => {
    const flow = parseFloat(document.getElementById('pumpFlow').value);
    const pressure = parseFloat(document.getElementById('pumpPressure').value);
    const efficiency = parseFloat(document.getElementById('pumpEfficiency').value);
    const result = calculatePumpPower(flow, pressure, efficiency);
    const txt = result !== null ? result + ' HP' : 'Invalid input';
    document.getElementById('pumpPowerResult').textContent = txt;
    localStorage.setItem('pumpPowerResult', txt);
  });

  document.getElementById('clearPumpPower').addEventListener('click', () => {
    document.getElementById('pumpFlow').value = '';
    document.getElementById('pumpPressure').value = '';
    document.getElementById('pumpEfficiency').value = '85';
    ['pumpFlow','pumpPressure','pumpEfficiency','pumpPowerResult'].forEach(k => localStorage.removeItem(k));
    document.getElementById('pumpPowerResult').textContent = '';
  });

  // -------- BOM Comparator code --------
  const oldBOMEl = document.getElementById('oldBOM');
  const newBOMEl = document.getElementById('newBOM');
  const compareBtn = document.getElementById('compareBOM');
  const clearBtn = document.getElementById('clearBOM');
  const bomResults = document.getElementById('bomResults');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const enableScalerCheckbox = document.getElementById('enableScaler');
  const qtyScalerInput = document.getElementById('qtyScaler');
  const scalerContainer = document.getElementById('scalerContainer');
  const filterContainer = document.getElementById('filterContainer');
  const statusFilter = document.getElementById('statusFilter');
  const lookupBtn = document.getElementById('lookupPart');
  const clearLookupBtn = document.getElementById('clearPartLookup');
  const plPart = document.getElementById('plPart');
  const plDesc = document.getElementById('plDesc');
  const partLookupResults = document.getElementById('partLookupResults');

  function triggerOnEnter(ids, buttonId) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById(buttonId).click();
        }
      });
    });
  }

  if (bomResults.innerHTML.trim()) {
    showExtras();
  }
  qtyScalerInput.style.display = enableScalerCheckbox.checked ? 'inline-block' : 'none';

  // Show scaler toggle & filter after first compare
  function showExtras() {
    scalerContainer.style.display = 'block';
    filterContainer.style.display = 'block';
  }

  // Parsing BOM input
  function parseBOM(text) {
    const lines = text.trim().split(/\n+/);
    const parts = {};
    const invalidLines = [];
    lines.forEach((line, idx) => {
      const match = line.trim().match(/^(\S+)\s+([\d.]+)$/);
      if (match && !isNaN(match[2]) && Number(match[2]) >= 0) {
        const part = match[1];
        const qty = parseFloat(match[2]);
        parts[part] = (parts[part] || 0) + qty;
      } else {
        if(line.trim().length > 0) invalidLines.push(idx + 1);
      }
    });
    return { parts, invalidLines };
  }

  // Compare BOMs
  function compareBOMs(oldParts, newParts, qtyScale = 1) {
    const allParts = new Set([...Object.keys(oldParts), ...Object.keys(newParts)]);
    const results = [];
    allParts.forEach(part => {
      const oldQtyRaw = oldParts[part] || 0;
      const newQtyRaw = newParts[part] || 0;
      const newQty = newQtyRaw * qtyScale;
	  const oldQty = oldQtyRaw * qtyScale;
	  
      if (oldQty === 0 && newQty > 0) {
        results.push({ part, status: 'Added', oldQty, newQty });
      } else if (oldQty > 0 && newQty === 0) {
        results.push({ part, status: 'Removed', oldQty, newQty });
      } else if (oldQty !== newQty) {
        results.push({ part, status: 'Qty Change', oldQty, newQty });
      } else {
        results.push({ part, status: 'Unchanged', oldQty, newQty });
      }
    });
    return results.sort((a,b) => a.part.localeCompare(b.part, undefined, { numeric:true }));
  }

  // Render results table
  function renderResults(results, filter = 'all') {
    let filtered = results;
    if (filter === 'Changed') {
      filtered = results.filter(r =>
        r.status === 'Qty Change' ||
        r.status === 'Added' ||
        r.status === 'Removed'
      );
    } else if (filter !== 'all') {
      filtered = results.filter(r => r.status === filter);
    }
    if (filtered.length === 0) {
      bomResults.innerHTML =
        '<p><em>No results to display for selected filter.</em></p>';
      localStorage.setItem('bomResults', bomResults.innerHTML);
      return;
    }
    let html =
      '<table><thead><tr><th>Part Number</th><th>Old Qty</th>' +
      '<th>New Qty</th><th>Status</th></tr></thead><tbody>';
    filtered.forEach(r => {
      let rowClass = '';
      if (r.status === 'Added') rowClass = 'added';
      else if (r.status === 'Removed') rowClass = 'removed';
      else if (r.status === 'Qty Change') rowClass = 'changed';
      else if (r.status === 'Unchanged') rowClass = '';
      html +=
        `<tr class="${rowClass}"><td>${r.part}</td><td>${r.oldQty}</td>` +
        `<td>${r.newQty}</td><td>${r.status}</td></tr>`;
    });
    html += '</tbody></table>';
    bomResults.innerHTML = html;
    localStorage.setItem('bomResults', bomResults.innerHTML);
  }

  // Show spinner
  function showLoading(show) {
    loadingSpinner.style.visibility = show ? 'visible' : 'hidden';
  }

  compareBtn.addEventListener('click', () => {
    showLoading(true);
    setTimeout(() => {
      const oldData = parseBOM(oldBOMEl.value);
      const newData = parseBOM(newBOMEl.value);
      if (oldData.invalidLines.length || newData.invalidLines.length) {
        bomResults.innerHTML = `<p style="color:red;"><strong>Invalid lines detected.</strong> Old BOM lines: ${oldData.invalidLines.join(', ') || 'none'}. New BOM lines: ${newData.invalidLines.join(', ') || 'none'}.</p>`;
        localStorage.setItem('bomResults', bomResults.innerHTML);
        showLoading(false);
        return;
      }
      const qtyScale = enableScalerCheckbox.checked ? parseFloat(qtyScalerInput.value) || 1 : 1;
      const results = compareBOMs(oldData.parts, newData.parts, qtyScale);
      renderResults(results, statusFilter.value);
      showExtras();
      showLoading(false);
    }, 100); // allow spinner show
  });

  clearBtn.addEventListener('click', () => {
    oldBOMEl.value = '';
    newBOMEl.value = '';
    bomResults.innerHTML = '';
    scalerContainer.style.display = 'none';
    filterContainer.style.display = 'none';
    enableScalerCheckbox.checked = false;
    qtyScalerInput.style.display = 'none';
    qtyScalerInput.value = '1';
    statusFilter.value = 'all';
    ['oldBOM','newBOM','bomResults','enableScaler','qtyScaler','statusFilter'].forEach(k => localStorage.removeItem(k));
  });

  enableScalerCheckbox.addEventListener('change', () => {
    qtyScalerInput.style.display = enableScalerCheckbox.checked ? 'inline-block' : 'none';
  });

  qtyScalerInput.addEventListener('input', () => {
    if (compareBtn.disabled) return;
    compareBtn.click();
  });

  statusFilter.addEventListener('change', () => {
    compareBtn.click();
  });

  document.addEventListener('copy', e => {
    const sel = document.getSelection();
    if (!sel || !bomResults.contains(sel.anchorNode)) return;
    const table = bomResults.querySelector('table');
    if (!table || !e.clipboardData) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const lines = rows.map(row => {
      const cells = row.querySelectorAll('td');
      const part = cells[0] ? cells[0].textContent.trim() : '';
      const newQty = cells[2] ? cells[2].textContent.trim() : '';
      return `${part}\t${newQty}`;
    });
    e.clipboardData.setData('text/plain', lines.join('\n'));
    e.preventDefault();
  });

  // ----- Part Lookup -----
  let itemsData = null;

  function loadItems() {
    if (itemsData) return Promise.resolve(itemsData);
    return fetch('items_export_slim.json')
      .then(r => r.json())
      .then(data => {
        itemsData = data;
        return itemsData;
      });
  }


  function wildcardToRegex(str) {
    const esc = str.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const reg = '^' + esc.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    return new RegExp(reg, 'i');
  }

  lookupBtn.addEventListener('click', () => {
    loadItems().then(data => {
      const partVal = plPart.value.trim();
      const descVal = plDesc.value.trim();
      const partRe = partVal ? wildcardToRegex(partVal) : null;
      const descRe = descVal ? wildcardToRegex(descVal) : null;
      const results = data.filter(it => {
        const pn = String(it.part_number);
        const desc = it.description || '';
        let match = true;
        if (partRe) match = partRe.test(pn);
        if (match && descRe) match = descRe.test(desc);
        return match;
      });
      if (results.length === 0) {
        partLookupResults.innerHTML =
          '<p><em>No matching parts found.</em></p>';
      } else {
        let html =
          '<table><thead><tr><th>Part Number</th>' +
          '<th>Description</th></tr></thead><tbody>';
        results.forEach(r => {
          html +=
            `<tr><td>${r.part_number}</td><td>${r.description}</td></tr>`;
        });
        html += '</tbody></table>';
        partLookupResults.innerHTML = html;
      }
      localStorage.setItem(
        'partLookupResults',
        partLookupResults.innerHTML
      );
    });
  });

  clearLookupBtn.addEventListener('click', () => {
    plPart.value = '';
    plDesc.value = '';
    partLookupResults.innerHTML = '';
    ['plPart','plDesc','partLookupResults'].forEach(k => {
      localStorage.removeItem(k);
    });
  });

    triggerOnEnter(
      ['pdFlow','pdDiameter','pdLength','pdViscosity'],
      'calcPressureDrop'
    );
  triggerOnEnter(['ucValue'], 'convertUnitBtn');
  triggerOnEnter(
    ['cylBoreDiameter','cylPressure'],
    'calcCylinderForceBtn'
  );
  triggerOnEnter(
    ['pumpFlow','pumpPressure','pumpEfficiency'],
    'calcPumpPowerBtn'
  );
  triggerOnEnter(['plPart','plDesc'], 'lookupPart');

  // ----- Fuzzy Part Lookup -----
  const fuzzyInput = document.getElementById('fuzzyQuery');
  const fuzzyResultsEl = document.getElementById('fuzzyResults');
  const fuzzyStatsEl = document.getElementById('fuzzyStats');
  const fuzzyExportBtn = document.getElementById('fuzzyExport');
  let fuzzyLast = [];
  const fuzzyBomInput = document.getElementById('fuzzyBomQuery');
  const fuzzyBomResultsEl = document.getElementById('fuzzyBomResults');
  const fuzzyBomStatsEl = document.getElementById('fuzzyBomStats');
  const fuzzyBomListEl = document.getElementById('fuzzyBomList');
  const fuzzyBomExportBtn = document.getElementById('fuzzyBomExport');
  const fuzzyBomClearBtn = document.getElementById('fuzzyBomClear');
  let fuzzyBomLast = [];
  let fuzzyBom = [];
  try {
    fuzzyBom = JSON.parse(localStorage.getItem('fuzzyBom')) || [];
  } catch (e) {
    fuzzyBom = [];
  }

  function normalize(s) {
    return (s || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9\-\s°\/\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ed(a, b) {
    a = a || '';
    b = b || '';
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  function scoreRow(qTokens, raw, pn) {
    const text = normalize((pn || '') + ' ' + (raw || ''));
    if (!qTokens.length) return 0;
    let tokenScore = 0;
    let strictMatches = 0;
    for (const t of qTokens) {
      if (text.includes(t)) {
        tokenScore += 2;
        strictMatches++;
      } else {
        const words = text.split(' ');
        let best = 999;
        for (const w of words) {
          if (!w) continue;
          const d = ed(t, w);
          if (d < best) best = d;
          if (best === 0) break;
        }
        const approx = Math.max(0, 2 - best * 0.5);
        tokenScore += approx;
      }
    }
    const pnNorm = normalize(pn || '');
    const qJoined = qTokens.join(' ');
    if ((qTokens[0] || '') && pnNorm.startsWith(qTokens[0]))
      tokenScore += 1.5;
    if (normalize(raw || '').includes(qJoined)) tokenScore += 1.0;
    return tokenScore + strictMatches * 0.25;
  }

  function fuzzySearch(q, limit = 200) {
    const nq = normalize(q);
    const tokens = nq.split(' ').filter(Boolean);
    if (tokens.length === 0) return [];
    const scored = [];
    for (const row of itemsData || []) {
      const s = scoreRow(
        tokens,
        row.description || '',
        row.part_number || ''
      );
      if (s > 0) scored.push([s, row]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit);
  }

  function renderFuzzy(results, q) {
    fuzzyResultsEl.innerHTML = '';
    fuzzyStatsEl.textContent = results.length
      ? `Top ${results.length} results for "${q}"`
      : (q ? 'No results.' : '');
    for (const [s, row] of results) {
      const div = document.createElement('div');
      div.className = 'row';
      const safeDesc = (row.description || '').replace(/</g, '&lt;');
      div.innerHTML =
        `<div><strong>${row.part_number || '(no PN)'}</strong> ` +
        `<span class="score">score ${s.toFixed(2)}</span></div>` +
        `<div class="meta">${safeDesc}</div>`;
      fuzzyResultsEl.appendChild(div);
    }
  }

  function renderBom() {
    if (!fuzzyBomListEl) return;
    fuzzyBomListEl.innerHTML = '';
    for (const item of fuzzyBom) {
      const div = document.createElement('div');
      const safe = (item.desc || '').replace(/</g, '&lt;');
      div.innerHTML = `<strong>${item.pn || ''}</strong> ` +
        `<span class="meta">${safe}</span>`;
      fuzzyBomListEl.appendChild(div);
    }
    localStorage.setItem('fuzzyBom', JSON.stringify(fuzzyBom));
  }

  function renderFuzzyBom(results, q) {
    fuzzyBomResultsEl.innerHTML = '';
    fuzzyBomStatsEl.textContent = results.length
      ? `Top ${results.length} results for "${q}"`
      : (q ? 'No results.' : '');
    for (const [s, row] of results) {
      const div = document.createElement('div');
      div.className = 'row';
      const safeDesc = (row.description || '').replace(/</g, '&lt;');
      div.innerHTML = `<div><strong>${row.part_number || '(no PN)'}</strong> ` +
        `<span class="score">score ${s.toFixed(2)}</span> ` +
        `<button class="add">Add</button></div>` +
        `<div class="meta">${safeDesc}</div>`;
      const btn = div.querySelector('button.add');
      btn.addEventListener('click', () => {
        fuzzyBom.push({
          pn: row.part_number,
          desc: row.description
        });
        renderBom();
      });
      fuzzyBomResultsEl.appendChild(div);
    }
  }

  renderBom();

  if (fuzzyInput) {
    fuzzyInput.addEventListener('input', () => {
      loadItems().then(() => {
        fuzzyLast = fuzzySearch(fuzzyInput.value, 200);
        renderFuzzy(fuzzyLast, fuzzyInput.value);
      });
    });
  }

  if (fuzzyBomInput) {
    fuzzyBomInput.addEventListener('input', () => {
      loadItems().then(() => {
        fuzzyBomLast = fuzzySearch(fuzzyBomInput.value, 200);
        renderFuzzyBom(fuzzyBomLast, fuzzyBomInput.value);
      });
    });
  }

  if (fuzzyExportBtn) {
    fuzzyExportBtn.addEventListener('click', () => {
      const rows = fuzzyLast.map(([s, r]) => ({
        score: s.toFixed(3),
        pn: r.part_number,
        desc: r.description
      }));
      const header = 'score,pn,desc\n';
      const body = rows
        .map(r => `${r.score},"${(r.pn || '').replace(/"/g,'""')}","` +
          `${(r.desc || '').replace(/"/g,'""')}"`)
        .join('\n');
      const blob = new Blob(
        [header + body],
        {type:'text/csv;charset=utf-8;'}
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'search_results.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (fuzzyBomExportBtn) {
    fuzzyBomExportBtn.addEventListener('click', () => {
      const rows = fuzzyBomLast.map(([s, r]) => ({
        score: s.toFixed(3),
        pn: r.part_number,
        desc: r.description
      }));
      const header = 'score,pn,desc\n';
      const body = rows
        .map(r => `${r.score},"${(r.pn || '').replace(/"/g,'""')}","` +
          `${(r.desc || '').replace(/"/g,'""')}"`)
        .join('\n');
      const blob = new Blob(
        [header + body],
        {type:'text/csv;charset=utf-8;'}
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'search_results.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (fuzzyBomClearBtn) {
    fuzzyBomClearBtn.addEventListener('click', () => {
      fuzzyBom = [];
      renderBom();
    });
  }
