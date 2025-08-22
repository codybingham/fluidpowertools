// Unit conversion logic for the Unit Conversions tab
const unitConversionData = {
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
      kw: { label: 'Kilowatt (kW)', toBase: 1.34102 },
      w: { label: 'Watt (W)', toBase: 0.00134102 }
    }
  },
  length: {
    units: {
      in: { label: 'Inch (in)', toBase: 1 },
      ft: { label: 'Foot (ft)', toBase: 12 },
      mm: { label: 'Millimeter (mm)', toBase: 0.0393701 },
      m: { label: 'Meter (m)', toBase: 39.3701 }
    }
  },
  torque: {
    units: {
      ftlb: { label: 'Foot-pound (ft·lbf)', toBase: 1 },
      inlb: { label: 'Inch-pound (in·lbf)', toBase: 0.0833333 },
      nm: { label: 'Newton-meter (N·m)', toBase: 0.737562 }
    }
  }
};

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
}

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

ucCategoryEl.addEventListener('change', populateUnitSelects);

document.getElementById('convertUnitBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('ucValue').value);
  const category = ucCategoryEl.value;
  const from = ucFromUnitEl.value;
  const to = ucToUnitEl.value;
  const result = convertUnits(val, category, from, to);
  const unitLabel = ucToUnitEl.options[ucToUnitEl.selectedIndex].text;
  document.getElementById('unitConvertResult').textContent =
    result !== null ? `${result} ${unitLabel}` : 'Invalid input';
});

// Initialize on load
populateUnitSelects();
