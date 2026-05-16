'use strict';

function clampNumber(value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatSpan(min, max) {
  return `${formatNumber(min)}–${formatNumber(max)}`;
}

function formatUnits(units) {
  return units === 'inch' ? 'inch' : 'mm';
}

function unitsCommand(units) {
  return units === 'inch' ? 'G20' : 'G21';
}

function estimateTime(pathLength, feed) {
  if (!feed || feed <= 0) {
    return '~ 1 min';
  }

  const minutes = pathLength / feed;

  if (minutes < 1) {
    return '< 1 min';
  }

  return `~ ${Math.max(1, Math.round(minutes))} min`;
}

function makeHeader(instruction, units, tool) {
  return [
    '; FAB-LabCode - Generated G-code',
    `; Instruction: ${instruction}`,
    `; Units: ${units}`,
    `; Tool: ${tool}`,
    '',
  ];
}

function squareTemplate(size, feed, safeZ, units, tool) {
  const side = clampNumber(size, 10, { min: 0.1, max: 5000 });
  const code = [
    ...makeHeader(`draw a square ${formatNumber(side)}x${formatNumber(side)}`, units, tool),
    `${unitsCommand(units)}            ; Set units`,
    'G90            ; Use absolute positioning',
    `G0 Z${formatNumber(safeZ)}         ; Move tool to safe Z`,
    'G0 X0 Y0       ; Rapid move to start point',
    'G0 Z0          ; Pen down / tool to drawing height',
    `G1 X${formatNumber(side)} Y0 F${formatNumber(feed)}  ; Line 1`,
    `G1 X${formatNumber(side)} Y${formatNumber(side)} F${formatNumber(feed)}  ; Line 2`,
    `G1 X0 Y${formatNumber(side)} F${formatNumber(feed)}  ; Line 3`,
    `G1 X0 Y0 F${formatNumber(feed)}  ; Line 4`,
    `G0 Z${formatNumber(safeZ)}         ; Pen up / tool to safe Z`,
    'M2             ; Program end',
  ];

  return {
    code,
    explanation: `This G-code draws a square with side length ${formatNumber(side)} ${units} starting from (0,0).`,
    steps: [
      'Moves to the origin',
      `Draws four edges to form a ${formatNumber(side)} x ${formatNumber(side)} square`,
      'Closes the profile at the start point',
      'Lifts the tool back to the safe height',
    ],
    summary: {
      time: estimateTime(side * 4, feed),
      length: `${formatNumber(side * 4)} ${units}`,
      moves: 8,
      bounds: `X: ${formatSpan(0, side)} / Y: ${formatSpan(0, side)}`,
    },
    shape: 'square',
    size: side,
    instruction: `draw a square ${formatNumber(side)}x${formatNumber(side)}`,
    tool,
    units,
  };
}

function rectangleTemplate(width, height, feed, safeZ, units, tool) {
  const w = clampNumber(width, 20, { min: 0.1, max: 5000 });
  const h = clampNumber(height, 10, { min: 0.1, max: 5000 });
  const code = [
    ...makeHeader(`draw a rectangle ${formatNumber(w)}x${formatNumber(h)}`, units, tool),
    unitsCommand(units),
    'G90',
    `G0 Z${formatNumber(safeZ)}`,
    'G0 X0 Y0',
    'G0 Z0',
    `G1 X${formatNumber(w)} Y0 F${formatNumber(feed)}`,
    `G1 X${formatNumber(w)} Y${formatNumber(h)} F${formatNumber(feed)}`,
    `G1 X0 Y${formatNumber(h)} F${formatNumber(feed)}`,
    `G1 X0 Y0 F${formatNumber(feed)}`,
    `G0 Z${formatNumber(safeZ)}`,
    'M2',
  ];

  return {
    code,
    explanation: `This G-code draws a rectangle ${formatNumber(w)} x ${formatNumber(h)} ${units} starting from (0,0).`,
    steps: [
      'Moves to the rectangle origin',
      `Cuts the width edge to X=${formatNumber(w)}`,
      `Cuts the height edge to Y=${formatNumber(h)}`,
      'Closes the rectangle profile',
      'Retracts the tool to safe Z',
    ],
    summary: {
      time: estimateTime((w + h) * 2, feed),
      length: `${formatNumber((w + h) * 2)} ${units}`,
      moves: 7,
      bounds: `X: ${formatSpan(0, w)} / Y: ${formatSpan(0, h)}`,
    },
    shape: 'rect',
    w,
    h,
    instruction: `draw a rectangle ${formatNumber(w)}x${formatNumber(h)}`,
    tool,
    units,
  };
}

function circleTemplate(radius, feed, safeZ, units, tool) {
  const r = clampNumber(radius, 10, { min: 0.1, max: 5000 });
  const circumference = 2 * Math.PI * r;
  const code = [
    ...makeHeader(`draw a circle radius ${formatNumber(r)}`, units, tool),
    unitsCommand(units),
    'G90',
    `G0 Z${formatNumber(safeZ)}`,
    `G0 X${formatNumber(r)} Y0`,
    'G0 Z0',
    `G2 X${formatNumber(r)} Y0 I-${formatNumber(r)} J0 F${formatNumber(feed)}  ; Full CW circle`,
    `G0 Z${formatNumber(safeZ)}`,
    'M2',
  ];

  return {
    code,
    explanation: `This G-code draws a full circle with radius ${formatNumber(r)} ${units}.`,
    steps: [
      `Moves to the start point at X=${formatNumber(r)}, Y=0`,
      'Lowers the tool to cutting height',
      'Executes a clockwise circular interpolation with a single G2 command',
      'Retracts the tool to safe Z',
    ],
    summary: {
      time: estimateTime(circumference, feed),
      length: `${formatNumber(circumference)} ${units}`,
      moves: 4,
      bounds: `X: ${formatSpan(-r, r)} / Y: ${formatSpan(-r, r)}`,
    },
    shape: 'circle',
    r,
    instruction: `draw a circle radius ${formatNumber(r)}`,
    tool,
    units,
  };
}

function engraveTemplate(text, feed, safeZ, units, tool) {
  const content = text.trim().replace(/\s+/g, ' ').toUpperCase() || 'HELLO';
  const code = [
    ...makeHeader(`engrave "${content}"`, units, tool),
    unitsCommand(units),
    'G90',
    `G0 Z${formatNumber(safeZ)}`,
    ...content.split('').flatMap((character, index) => [
      `G0 X${formatNumber(index * 6)} Y0`,
      'G0 Z0',
      `G1 X${formatNumber(index * 6)} Y8 F${formatNumber(feed)}  ; Char: ${character}`,
      `G0 Z${formatNumber(safeZ)}`,
    ]),
    'M2',
  ];

  return {
    code,
    explanation: `This engraving pass approximates "${content}" using vertical strokes spaced across the X axis.`,
    steps: content.split('').map((character, index) => (
      `Positions to character ${index + 1} and engraves "${character}" with a vertical stroke`
    )),
    summary: {
      time: estimateTime(content.length * 8, feed),
      length: `${formatNumber(content.length * 8)} ${units}`,
      moves: content.length * 4,
      bounds: `X: ${formatSpan(0, content.length * 6)} / Y: ${formatSpan(0, 8)}`,
    },
    shape: 'engrave',
    text: content,
    instruction: `engrave "${content}"`,
    tool,
    units,
  };
}

function triangleTemplate(size, feed, safeZ, units, tool) {
  const side = clampNumber(size, 15, { min: 0.1, max: 5000 });
  const height = Number((side * 0.8660254).toFixed(3));
  const code = [
    ...makeHeader(`triangle ${formatNumber(side)}`, units, tool),
    unitsCommand(units),
    'G90',
    `G0 Z${formatNumber(safeZ)}`,
    'G0 X0 Y0',
    'G0 Z0',
    `G1 X${formatNumber(side)} Y0 F${formatNumber(feed)}`,
    `G1 X${formatNumber(side / 2)} Y${formatNumber(height)} F${formatNumber(feed)}`,
    `G1 X0 Y0 F${formatNumber(feed)}`,
    `G0 Z${formatNumber(safeZ)}`,
    'M2',
  ];

  return {
    code,
    explanation: `This G-code draws an equilateral triangle with side length ${formatNumber(side)} ${units}.`,
    steps: [
      'Moves to the triangle origin',
      `Draws the base to X=${formatNumber(side)}`,
      `Cuts to the apex at Y=${formatNumber(height)}`,
      'Returns to the origin to close the shape',
      'Retracts the tool',
    ],
    summary: {
      time: estimateTime(side * 3, feed),
      length: `${formatNumber(side * 3)} ${units}`,
      moves: 6,
      bounds: `X: ${formatSpan(0, side)} / Y: ${formatSpan(0, height)}`,
    },
    shape: 'triangle',
    size: side,
    instruction: `triangle ${formatNumber(side)}`,
    tool,
    units,
  };
}

function lineTemplate(x1, y1, x2, y2, feed, safeZ, units, tool) {
  const startX = clampNumber(x1, 0, { min: -5000, max: 5000 });
  const startY = clampNumber(y1, 0, { min: -5000, max: 5000 });
  const endX = clampNumber(x2, 20, { min: -5000, max: 5000 });
  const endY = clampNumber(y2, 0, { min: -5000, max: 5000 });
  const distance = Math.hypot(endX - startX, endY - startY);
  const code = [
    ...makeHeader(`line from (${formatNumber(startX)},${formatNumber(startY)}) to (${formatNumber(endX)},${formatNumber(endY)})`, units, tool),
    unitsCommand(units),
    'G90',
    `G0 Z${formatNumber(safeZ)}`,
    `G0 X${formatNumber(startX)} Y${formatNumber(startY)}`,
    'G0 Z0',
    `G1 X${formatNumber(endX)} Y${formatNumber(endY)} F${formatNumber(feed)}`,
    `G0 Z${formatNumber(safeZ)}`,
    'M2',
  ];

  return {
    code,
    explanation: `This G-code draws a straight line from (${formatNumber(startX)}, ${formatNumber(startY)}) to (${formatNumber(endX)}, ${formatNumber(endY)}).`,
    steps: [
      `Moves rapidly to (${formatNumber(startX)}, ${formatNumber(startY)})`,
      'Lowers the tool to cutting height',
      `Cuts a linear move to (${formatNumber(endX)}, ${formatNumber(endY)})`,
      'Retracts the tool to safe Z',
    ],
    summary: {
      time: estimateTime(distance, feed),
      length: `${formatNumber(distance)} ${units}`,
      moves: 4,
      bounds: `X: ${formatSpan(Math.min(startX, endX), Math.max(startX, endX))} / Y: ${formatSpan(Math.min(startY, endY), Math.max(startY, endY))}`,
    },
    shape: 'line',
    x1: startX,
    y1: startY,
    x2: endX,
    y2: endY,
    instruction: `line from (${formatNumber(startX)},${formatNumber(startY)}) to (${formatNumber(endX)},${formatNumber(endY)})`,
    tool,
    units,
  };
}

function generateGcode(input = {}) {
  const instruction = typeof input.instruction === 'string' ? input.instruction.trim() : '';

  if (!instruction) {
    const error = new Error('Instruction is required');
    error.statusCode = 400;
    throw error;
  }

  const raw = instruction.toLowerCase();
  const units = formatUnits(input.units);
  const feed = clampNumber(input.feed, 1000, { min: 100, max: 5000 });
  const safeZ = clampNumber(input.safeZ, 2, { min: 0, max: 20 });
  const tool = typeof input.tool === 'string' && input.tool.trim() ? input.tool.trim() : 'Pen (Drawing)';

  let data;

  const squareMatch = raw.match(/square\s+(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?/);
  const rectangleMatch = raw.match(/rect(?:angle)?\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  const circleMatch = raw.match(/circle\s+(?:radius\s+)?(\d+(?:\.\d+)?)/);
  const engraveMatch = instruction.match(/engrave\s+["']?(.+?)["']?\s*$/i);
  const triangleMatch = raw.match(/triangle\s+(\d+(?:\.\d+)?)/);
  const lineMatch = raw.match(/line\s+from\s+\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?\s+to\s+\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?/);

  if (rectangleMatch) {
    data = rectangleTemplate(rectangleMatch[1], rectangleMatch[2], feed, safeZ, units, tool);
  } else if (squareMatch) {
    data = squareTemplate(squareMatch[1], feed, safeZ, units, tool);
  } else if (circleMatch) {
    data = circleTemplate(circleMatch[1], feed, safeZ, units, tool);
  } else if (engraveMatch) {
    data = engraveTemplate(engraveMatch[1], feed, safeZ, units, tool);
  } else if (triangleMatch) {
    data = triangleTemplate(triangleMatch[1], feed, safeZ, units, tool);
  } else if (lineMatch) {
    data = lineTemplate(lineMatch[1], lineMatch[2], lineMatch[3], lineMatch[4], feed, safeZ, units, tool);
  } else {
    data = squareTemplate(10, feed, safeZ, units, tool);
  }

  return {
    ...data,
    request: {
      instruction,
      feed,
      safeZ,
      tool,
      units,
    },
  };
}

module.exports = { generateGcode };
