  // Tab switching logic
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
  }

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

  // Flow conversion
  const flowConversions = {
    gpm: 1,
    lpm: 3.78541,
    cfm: 0.133681,
    cms: 0.00006309
  };

  function convertFlow(value, fromUnit, toUnit) {
    if (value <= 0) return null;
    // Convert input to GPM first
    let valueInGPM = value;
    if (fromUnit !== 'gpm') {
      if (!flowConversions[fromUnit]) return null;
      valueInGPM = value / flowConversions[fromUnit];
    }
    // Convert from GPM to desired unit
    if (!flowConversions[toUnit]) return null;
    const converted = valueInGPM * flowConversions[toUnit];
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
    document.getElementById('pressureDropResult').textContent = result !== null ? result + ' psi' : 'Invalid input';
  });

  document.getElementById('convertFlowBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('flowInput').value);
    const from = document.getElementById('flowUnit').value;
    const to = document.getElementById('flowUnitTo').value;
    const result = convertFlow(val, from, to);
    document.getElementById('flowConvertResult').textContent = result !== null ? result + ' ' + to.toUpperCase() : 'Invalid input';
  });

  document.getElementById('calcCylinderForceBtn').addEventListener('click', () => {
    const bore = parseFloat(document.getElementById('cylBoreDiameter').value);
    const pressure = parseFloat(document.getElementById('cylPressure').value);
    const result = calculateCylinderForce(bore, pressure);
    document.getElementById('cylinderForceResult').textContent = result !== null ? result + ' lbf' : 'Invalid input';
  });

  document.getElementById('calcPumpPowerBtn').addEventListener('click', () => {
    const flow = parseFloat(document.getElementById('pumpFlow').value);
    const pressure = parseFloat(document.getElementById('pumpPressure').value);
    const efficiency = parseFloat(document.getElementById('pumpEfficiency').value);
    const result = calculatePumpPower(flow, pressure, efficiency);
    document.getElementById('pumpPowerResult').textContent = result !== null ? result + ' HP' : 'Invalid input';
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
    if (filter !== 'all') {
      filtered = results.filter(r => r.status === filter);
    }
	if (filter === 'Changed') {
		filtered = results.filter(r => r.status === 'Qty Change' || r.status === 'Added' || r.status === 'Removed');
	}
    if (filtered.length === 0) {
      bomResults.innerHTML = '<p><em>No results to display for selected filter.</em></p>';
      return;
    }
    let html = '<table><thead><tr><th>Part Number</th><th>Old Qty</th><th>New Qty</th><th>Status</th></tr></thead><tbody>';
    filtered.forEach(r => {
      let rowClass = '';
      if (r.status === 'Added') rowClass = 'added';
      else if (r.status === 'Removed') rowClass = 'removed';
      else if (r.status === 'Qty Change') rowClass = 'changed';
      else if (r.status === 'Unchanged') rowClass = '';
      html += `<tr class="${rowClass}"><td>${r.part}</td><td>${r.oldQty}</td><td>${r.newQty}</td><td>${r.status}</td></tr>`;
    });
    html += '</tbody></table>';
    bomResults.innerHTML = html;
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
