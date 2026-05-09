import Phaser from 'phaser';
import { useColonyStore } from '../../store/colony';

const TS = 32;
const WORLD_W = 40;
const WORLD_H = 26;

const COL = {
  bg:          0xb8a888,
  corridor:    0xc8b89a,
  corridorRug: 0x9b7a58,
  command:     0xf2e8d4,
  research:    0xd4e4f4,
  developer:   0xd4f0d8,
  debug:       0xf4d8d8,
  deploy:      0xd8f4e8,
  server:      0xc8d4e4,
  memory:      0xe4d8f4,
  meeting:     0xf4e8d4,
  monitoring:  0xd4e0f4,
  energy:      0xf2f4d4,
  desk:        0x5c3d1e,
  deskTop:     0x7a5230,
  chair:       0x2d4a7a,
  chairSeat:   0x3d5a8c,
  monitor:     0x1a1a2e,
  screen:      0x00c8aa,
  screenLine:  0x004433,
  plant:       0x2d7a3d,
  plant2:      0x1d6030,
  pot:         0x8b4513,
  rack:        0x252535,
  rackOn:      0x00ff66,
  rackOff:     0xff3333,
  whiteboard:  0xf5f0e8,
  wbBorder:    0x9b7355,
  coffee:      0x3a2828,
  table:       0x6b4c2a,
  tableTop:    0x8b6234,
  wall:        0x3d2810,
  wallInner:   0x5c3d1e,
  energyGlow:  0x88ffcc,
  windowFrame: 0x5c4428,
  windowGlass: 0xa8d8f0,
  rug:         0x8b6040,
};

// Unique visual profiles per agent name
const AGENT_VISUALS: Record<string, {
  skin: number;
  hair: number;
  hairStyle: 'short' | 'long' | 'spiky' | 'bun' | 'buzz';
  shirt: number;
  pants: number;
  accessory: 'none' | 'glasses' | 'headphones' | 'earpiece';
}> = {
  ARIA:  { skin: 0xf5c5a3, hair: 0x2c1810, hairStyle: 'short',  shirt: 0x0d47a1, pants: 0x1a237e, accessory: 'none' },
  BOLT:  { skin: 0xe0b896, hair: 0x5d4037, hairStyle: 'spiky',  shirt: 0x1b5e20, pants: 0x263238, accessory: 'headphones' },
  SAGE:  { skin: 0xf5c5a3, hair: 0xb71c1c, hairStyle: 'long',   shirt: 0xe8eaf6, pants: 0x3f51b5, accessory: 'glasses' },
  GLITCH:{ skin: 0xd4956a, hair: 0x37474f, hairStyle: 'spiky',  shirt: 0x8b0000, pants: 0x212121, accessory: 'none' },
  NEXUS: { skin: 0xf5c5a3, hair: 0xf9a825, hairStyle: 'short',  shirt: 0xe65100, pants: 0x4e342e, accessory: 'none' },
  VAULT: { skin: 0xe0b896, hair: 0x9e9e9e, hairStyle: 'short',  shirt: 0x4a148c, pants: 0x311b92, accessory: 'none' },
  PRISM: { skin: 0x8d5524, hair: 0x1a1a1a, hairStyle: 'buzz',   shirt: 0xb71c1c, pants: 0x1a1a2e, accessory: 'earpiece' },
  ECHO:  { skin: 0xf5c5a3, hair: 0x1a237e, hairStyle: 'bun',    shirt: 0x00695c, pants: 0x004d40, accessory: 'glasses' },
  NOVA:  { skin: 0xf5c5a3, hair: 0xf48fb1, hairStyle: 'long',   shirt: 0xad1457, pants: 0x880e4f, accessory: 'none' },
  PIXEL: { skin: 0xd4956a, hair: 0x4a148c, hairStyle: 'bun',    shirt: 0x7b1fa2, pants: 0x4a148c, accessory: 'glasses' },
};

const STATE_PHRASES: Record<string, string[]> = {
  coding:      ['Writing code...', 'git commit', 'Fix bug #347', 'npm install', 'Compiling...', 'Refactoring', 'const x =', 'async/await', '// TODO: fix', 'console.log'],
  researching: ['Analyzing...', 'New finding!', 'Reading paper', 'Taking notes', 'Hypothesis!', 'Interesting...', 'Data pattern', 'Cross-ref...'],
  debugging:   ['Stack trace?', 'Found it!', 'Weird error...', 'Print debug', 'Reproduced!', 'Line 347...', 'Off by one!', 'Why tho??'],
  deploying:   ['Building...', 'Tests pass!', 'Deploying...', 'CI running', 'Ship it!', 'Staging ok', 'DNS update', 'Live!'],
  discussing:  ['Good idea!', 'What if...', 'Agree', 'Hmm...', 'LGTM!', 'Sprint plan', 'Sync tmr?'],
  planning:    ['Sprint plan', 'Roadmap...', 'Prioritizing', 'Tickets done', 'Q2 goals', 'Backlog'],
  fixing:      ['Patch ready', 'Fixed!', 'Regression?', 'Hotfix', 'Test again'],
  sleeping:    ['zzz...', 'zZz'],
  idle:        ['...', 'Thinking...', 'Coffee time?', 'Slack?', 'Stretch...'],
};

type RoomDef = { id: string; name: string; x: number; y: number; w: number; h: number; floor: number };

const ROOMS: RoomDef[] = [
  { id: 'command',    name: 'Command',      x: 1,  y: 1,  w: 8, h: 6, floor: COL.command },
  { id: 'research',   name: 'Research Lab', x: 11, y: 1,  w: 8, h: 6, floor: COL.research },
  { id: 'developer',  name: 'Dev Corner',   x: 21, y: 1,  w: 8, h: 6, floor: COL.developer },
  { id: 'debug',      name: 'Debug Room',   x: 1,  y: 9,  w: 8, h: 6, floor: COL.debug },
  { id: 'deploy',     name: 'Deploy Bay',   x: 11, y: 9,  w: 8, h: 6, floor: COL.deploy },
  { id: 'server',     name: 'Server Room',  x: 21, y: 9,  w: 8, h: 6, floor: COL.server },
  { id: 'memory',     name: 'Memory',       x: 1,  y: 17, w: 8, h: 6, floor: COL.memory },
  { id: 'meeting',    name: 'Meeting',      x: 11, y: 17, w: 8, h: 6, floor: COL.meeting },
  { id: 'monitoring', name: 'Monitoring',   x: 21, y: 17, w: 8, h: 6, floor: COL.monitoring },
  { id: 'energy',     name: 'Energy Core',  x: 31, y: 9,  w: 6, h: 6, floor: COL.energy },
];

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((color >> 8)  & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (color & 0xff)          + Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}
function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((color >> 8)  & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (color & 0xff)          - Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}

// ─── Furniture Helpers ───────────────────────────────────────────────────────

function drawDesk(g: Phaser.GameObjects.Graphics, px: number, py: number, w = 64, h = 26) {
  g.fillStyle(COL.desk, 1);    g.fillRect(px, py + 6, w, h - 6);
  g.fillStyle(COL.deskTop, 1); g.fillRect(px, py, w, 8);
  g.fillStyle(0x3d2810, 1);
  g.fillRect(px + 2, py + h - 5, 5, 5);
  g.fillRect(px + w - 7, py + h - 5, 5, 5);
}

function drawMonitor(g: Phaser.GameObjects.Graphics, px: number, py: number, on = true, glowMult = 1) {
  g.fillStyle(COL.monitor, 1);
  g.fillRect(px + 6, py + 15, 5, 5);
  g.fillRect(px + 1, py + 19, 16, 3);
  g.fillRect(px, py, 18, 15);
  const screenAlpha = on ? (0.85 * glowMult) : 0.3;
  g.fillStyle(on ? COL.screen : 0x111122, Math.min(1, screenAlpha));
  g.fillRect(px + 2, py + 2, 14, 11);
  if (on) {
    g.fillStyle(0x000000, 0.25);
    g.fillRect(px + 3, py + 3, 9, 1);
    g.fillRect(px + 3, py + 5, 7, 1);
    g.fillRect(px + 3, py + 7, 10, 1);
    g.fillRect(px + 3, py + 9, 5, 1);
  }
}

function drawChair(g: Phaser.GameObjects.Graphics, px: number, py: number, facingDown = false) {
  if (facingDown) {
    g.fillStyle(COL.chair, 1);     g.fillRoundedRect(px, py + 12, 18, 8, 3);
    g.fillStyle(COL.chairSeat, 1); g.fillRoundedRect(px, py, 18, 14, 3);
  } else {
    g.fillStyle(COL.chair, 1);     g.fillRoundedRect(px, py, 18, 8, 3);
    g.fillStyle(COL.chairSeat, 1); g.fillRoundedRect(px, py + 6, 18, 14, 3);
  }
}

function drawPlant(g: Phaser.GameObjects.Graphics, px: number, py: number, s = 1.0) {
  const r = Math.round(9 * s);
  g.fillStyle(COL.pot, 1);    g.fillRect(px - Math.round(5*s), py, Math.round(10*s), Math.round(10*s));
  g.fillStyle(0x3a1a0a, 1);  g.fillRect(px - Math.round(4*s), py + 1, Math.round(8*s), Math.round(4*s));
  g.fillStyle(COL.plant, 1); g.fillCircle(px, py - r / 2, r);
  g.fillStyle(COL.plant2, 1);
  g.fillCircle(px - Math.round(r * 0.5), py - Math.round(r * 0.3), Math.round(r * 0.72));
  g.fillCircle(px + Math.round(r * 0.5), py - Math.round(r * 0.3), Math.round(r * 0.72));
}

function drawServerRack(g: Phaser.GameObjects.Graphics, px: number, py: number, ledSeed = 0) {
  g.fillStyle(COL.rack, 1);  g.fillRect(px, py, 20, 48);
  g.lineStyle(1, 0x444466, 1); g.strokeRect(px, py, 20, 48);
  for (let i = 0; i < 6; i++) {
    const uy = py + 4 + i * 7;
    g.fillStyle(0x1a1a2e, 1); g.fillRect(px + 2, uy, 16, 5);
    const isOn = ((ledSeed + i * 3) % 5) !== 0;
    g.fillStyle(isOn ? COL.rackOn : COL.rackOff, 1);
    g.fillCircle(px + 16, uy + 2, 2);
  }
}

function drawWhiteboard(g: Phaser.GameObjects.Graphics, px: number, py: number, w = 48, h = 32) {
  g.fillStyle(COL.wbBorder, 1); g.fillRect(px, py, w, h);
  g.fillStyle(COL.whiteboard, 1); g.fillRect(px + 2, py + 2, w - 4, h - 4);
  g.lineStyle(1, 0x9999aa, 0.4);
  for (let i = 0; i < 4; i++) {
    const ly = py + 7 + i * 6;
    const len = w - 12 - (i % 2) * 8;
    g.lineBetween(px + 5, ly, px + 5 + len, ly);
  }
  g.fillStyle(0x2255cc, 1); g.fillCircle(px + 7,  py + h - 6, 2);
  g.fillStyle(0xcc2222, 1); g.fillCircle(px + 13, py + h - 6, 2);
  g.fillStyle(0x22aa22, 1); g.fillCircle(px + 19, py + h - 6, 2);
}

function drawCoffeeMachine(g: Phaser.GameObjects.Graphics, px: number, py: number) {
  g.fillStyle(COL.coffee, 1); g.fillRect(px, py, 18, 26);
  g.fillStyle(0x4a3838, 1);   g.fillRect(px + 2, py + 2, 14, 8);
  g.fillStyle(0x00ff44, 1);   g.fillCircle(px + 5, py + 6, 2);
  g.fillStyle(0x2a1818, 1);   g.fillRect(px + 3, py + 13, 12, 9);
  g.fillStyle(0x5c3000, 1);   g.fillCircle(px + 9, py + 19, 3);
}

function drawMeetingTable(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number) {
  g.fillStyle(COL.table, 1);  g.fillRoundedRect(cx - w/2, cy - h/2, w, h, 10);
  g.fillStyle(COL.tableTop, 0.45); g.fillRoundedRect(cx - w/2+4, cy - h/2+4, w-8, h-8, 8);
}

function drawWindow(g: Phaser.GameObjects.Graphics, px: number, py: number, w = 48, h = 14, glowMult = 1) {
  g.fillStyle(COL.windowFrame, 1); g.fillRect(px, py, w, h);
  const glassAlpha = 0.65 + glowMult * 0.1;
  g.fillStyle(COL.windowGlass, Math.min(1, glassAlpha));
  g.fillRect(px + 2,       py + 2, w/2 - 4, h - 4);
  g.fillRect(px + w/2 + 2, py + 2, w/2 - 4, h - 4);
  g.lineStyle(1, COL.windowFrame, 0.8);
  g.lineBetween(px + w/2, py + 2, px + w/2, py + h - 2);
}

function drawWorkstation(g: Phaser.GameObjects.Graphics, px: number, py: number, monitorCount = 1, glowMult = 1) {
  drawDesk(g, px, py + 24, 56, 22);
  for (let m = 0; m < monitorCount; m++) {
    drawMonitor(g, px + 4 + m * 22, py + 6, true, glowMult);
  }
  drawChair(g, px + 18, py + 48, false);
}

function drawRoomFurniture(g: Phaser.GameObjects.Graphics, room: RoomDef, opts: { ledSeed: number; glowMult: number }) {
  const { ledSeed, glowMult } = opts;
  const rx = room.x * TS;
  const ry = room.y * TS;
  const rw = room.w * TS;
  const rh = room.h * TS;

  switch (room.id) {
    case 'command': {
      drawWindow(g, rx + 20, ry + 2, 60, 12, glowMult);
      drawWhiteboard(g, rx + rw - 58, ry + 30, 50, 48);
      drawDesk(g, rx + 16, ry + 26, 100, 26);
      drawMonitor(g, rx + 26, ry + 10, true, glowMult);
      drawMonitor(g, rx + 50, ry + 10, true, glowMult);
      drawMonitor(g, rx + 74, ry + 10, true, glowMult);
      drawChair(g, rx + 30, ry + 54, false);
      drawChair(g, rx + 60, ry + 54, false);
      drawChair(g, rx + 90, ry + 54, false);
      drawPlant(g, rx + 12, ry + rh - 36, 1.1);
      break;
    }
    case 'research': {
      drawWindow(g, rx + 10, ry + 2, 44, 12, glowMult);
      drawWorkstation(g, rx + 12, ry + 18, 1, glowMult);
      drawWorkstation(g, rx + 82, ry + 18, 1, glowMult);
      drawWorkstation(g, rx + 12, ry + 92, 1, glowMult);
      drawWorkstation(g, rx + 82, ry + 92, 1, glowMult);
      drawPlant(g, rx + rw - 26, ry + 24, 0.9);
      drawPlant(g, rx + rw - 26, ry + rh - 36, 0.9);
      break;
    }
    case 'developer': {
      drawWindow(g, rx + 14, ry + 2, 56, 12, glowMult);
      drawWorkstation(g, rx + 10, ry + 16, 2, glowMult);
      drawWorkstation(g, rx + 84, ry + 16, 2, glowMult);
      drawWorkstation(g, rx + 10, ry + 92, 2, glowMult);
      drawWorkstation(g, rx + 84, ry + 92, 2, glowMult);
      drawCoffeeMachine(g, rx + rw - 24, ry + 64);
      drawPlant(g, rx + rw - 18, ry + rh - 30, 0.85);
      break;
    }
    case 'debug': {
      drawDesk(g, rx + 10, ry + 24, 80, 26);
      drawMonitor(g, rx + 14, ry + 8, true, glowMult);
      drawMonitor(g, rx + 36, ry + 8, true, glowMult);
      drawMonitor(g, rx + 58, ry + 8, true, glowMult);
      drawChair(g, rx + 32, ry + 52, false);
      drawChair(g, rx + 58, ry + 52, false);
      drawDesk(g, rx + 10, ry + 112, 80, 26);
      drawMonitor(g, rx + 14, ry + 96, true, glowMult);
      drawMonitor(g, rx + 36, ry + 96, true, glowMult);
      drawMonitor(g, rx + 58, ry + 96, true, glowMult);
      drawChair(g, rx + 44, ry + 140, false);
      drawServerRack(g, rx + rw - 28, ry + 20, ledSeed);
      drawServerRack(g, rx + rw - 4,  ry + 20, ledSeed + 7);
      break;
    }
    case 'deploy': {
      drawWorkstation(g, rx + 14,  ry + 18, 2, glowMult);
      drawWorkstation(g, rx + 100, ry + 18, 2, glowMult);
      g.fillStyle(0xcc2222, 1);
      g.fillCircle(rx + rw / 2, ry + rh - 36, 18);
      g.lineStyle(3, 0xff4444, 0.8);
      g.strokeCircle(rx + rw / 2, ry + rh - 36, 18);
      g.fillStyle(0xff6666, 1);
      g.fillCircle(rx + rw / 2, ry + rh - 36, 10);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(rx + rw / 2 - 4, ry + rh - 40, 3);
      drawPlant(g, rx + 12, ry + rh - 32, 1.0);
      break;
    }
    case 'server': {
      drawServerRack(g, rx + 14, ry + 16, ledSeed);
      drawServerRack(g, rx + 40, ry + 16, ledSeed + 3);
      drawServerRack(g, rx + 66, ry + 16, ledSeed + 6);
      drawServerRack(g, rx + 14, ry + 88, ledSeed + 9);
      drawServerRack(g, rx + 40, ry + 88, ledSeed + 12);
      drawServerRack(g, rx + 66, ry + 88, ledSeed + 15);
      g.fillStyle(0x3a4455, 1);
      g.fillRoundedRect(rx + rw - 44, ry + 28, 36, 52, 6);
      g.fillStyle(0x6688aa, 0.55);
      g.fillCircle(rx + rw - 26, ry + 54, 14);
      g.lineStyle(1, 0x8899bb, 0.7);
      g.strokeCircle(rx + rw - 26, ry + 54, 10);
      g.fillStyle(0x00ff88, Math.min(1, 0.8 * glowMult));
      g.fillRect(rx + 10, ry + rh - 10, rw - 20, 5);
      break;
    }
    case 'memory': {
      g.fillStyle(COL.desk, 1);
      g.fillRect(rx + 6, ry + 6, rw - 30, 14);
      g.fillRect(rx + 6, ry + 24, rw - 30, 4);
      const bookColors = [0x2244aa, 0xaa2244, 0x22aa44, 0xaaaa22, 0x884422, 0x224488, 0x882288];
      for (let i = 0; i < 7; i++) {
        g.fillStyle(bookColors[i], 1);
        g.fillRect(rx + 8 + i * 23, ry + 8, 17, 10);
      }
      drawDesk(g, rx + 14, ry + 78, 56, 22);
      drawMonitor(g, rx + 22, ry + 62, true, glowMult);
      drawChair(g, rx + 28, ry + 102, false);
      drawDesk(g, rx + 102, ry + 78, 56, 22);
      drawMonitor(g, rx + 110, ry + 62, true, glowMult);
      drawChair(g, rx + 116, ry + 102, false);
      drawPlant(g, rx + rw - 22, ry + rh - 28, 1.0);
      break;
    }
    case 'meeting': {
      const cx = rx + rw / 2 - 14;
      const cy = ry + rh / 2 + 4;
      drawMeetingTable(g, cx, cy, 92, 52);
      drawChair(g, cx - 56, cy - 10, false);
      drawChair(g, cx + 38, cy - 10, false);
      drawChair(g, cx - 28, cy - 38, false);
      drawChair(g, cx + 10, cy - 38, false);
      drawChair(g, cx - 28, cy + 30, true);
      drawChair(g, cx + 10, cy + 30, true);
      drawWhiteboard(g, rx + 4, ry + 44, 46, 54);
      drawPlant(g, rx + rw - 30, ry + rh - 36, 1.1);
      break;
    }
    case 'monitoring': {
      g.fillStyle(0x1a1a2e, 1);
      g.fillRect(rx + 8, ry + 6, rw - 16, 52);
      g.lineStyle(1, 0x333366, 0.6);
      g.strokeRect(rx + 8, ry + 6, rw - 16, 52);
      for (let i = 0; i < 4; i++) {
        drawMonitor(g, rx + 16 + i * 38, ry + 10, true, glowMult);
        drawMonitor(g, rx + 16 + i * 38, ry + 32, i % 2 === 0, glowMult);
      }
      drawDesk(g, rx + 16, ry + 108, 64, 22);
      drawChair(g, rx + 34, ry + 132, false);
      drawMonitor(g, rx + 22, ry + 94, true, glowMult);
      drawDesk(g, rx + 100, ry + 108, 64, 22);
      drawChair(g, rx + 118, ry + 132, false);
      drawMonitor(g, rx + 106, ry + 94, true, glowMult);
      break;
    }
    case 'energy': {
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;
      g.fillStyle(COL.energyGlow, 0.08); g.fillCircle(cx, cy, 56);
      g.fillStyle(COL.energyGlow, 0.16); g.fillCircle(cx, cy, 40);
      g.fillStyle(COL.energyGlow, 0.35); g.fillCircle(cx, cy, 26);
      g.fillStyle(0xaaffee, Math.min(1, 0.7 * glowMult)); g.fillCircle(cx, cy, 14);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy, 6);
      g.lineStyle(4, 0x888899, 0.65);
      g.lineBetween(cx, ry + 4, cx, cy - 26);
      g.lineBetween(cx, cy + 26, cx, ry + rh - 4);
      g.lineBetween(rx + 4, cy, cx - 26, cy);
      g.lineBetween(cx + 26, cy, rx + rw - 4, cy);
      g.fillStyle(0x252535, 1);
      g.fillRect(rx + 6, ry + 6, 22, 28);
      g.fillRect(rx + rw - 28, ry + 6, 22, 28);
      g.fillRect(rx + 6, ry + rh - 34, 22, 28);
      g.fillRect(rx + rw - 28, ry + rh - 34, 22, 28);
      g.fillStyle(COL.rackOn, 1);
      g.fillCircle(rx + 17, ry + 14, 3);
      g.fillCircle(rx + rw - 17, ry + 14, 3);
      break;
    }
  }
}

// ─── Enhanced Agent Character ────────────────────────────────────────────────

class AgentCharacter {
  id: string;
  container: Phaser.GameObjects.Container;

  private shadow: Phaser.GameObjects.Ellipse;
  private leftLeg: Phaser.GameObjects.Rectangle;
  private rightLeg: Phaser.GameObjects.Rectangle;
  private leftShoe: Phaser.GameObjects.Rectangle;
  private rightShoe: Phaser.GameObjects.Rectangle;
  private leftArm: Phaser.GameObjects.Rectangle;
  private rightArm: Phaser.GameObjects.Rectangle;
  private torso: Phaser.GameObjects.Rectangle;
  private neck: Phaser.GameObjects.Rectangle;
  private head: Phaser.GameObjects.Arc;
  private hairGfx: Phaser.GameObjects.Graphics;
  private faceGfx: Phaser.GameObjects.Graphics;
  private eyeL: Phaser.GameObjects.Arc;
  private eyeR: Phaser.GameObjects.Arc;
  private selectionRing: Phaser.GameObjects.Arc;
  private nameLabel: Phaser.GameObjects.Text;
  private stateLabel: Phaser.GameObjects.Text;
  private bubbleGfx: Phaser.GameObjects.Graphics;
  private bubbleTextObj: Phaser.GameObjects.Text;

  targetX: number;
  targetY: number;

  private lastState = '';
  private bubbleUntil = 0;
  private lastPhrase = '';
  private nextPhraseAt = 0;
  private vis: (typeof AGENT_VISUALS)[string];
  private blinkTimer = 0;
  private blinkOpen = true;
  private nextBlinkAt = 0;

  constructor(scene: Phaser.Scene, agent: any) {
    this.id = agent.id;
    this.vis = AGENT_VISUALS[agent.name] || {
      skin: 0xf5c5a3, hair: 0x4a2c12, hairStyle: 'short',
      shirt: parseInt((agent.color || '#ff6600').replace('#', ''), 16),
      pants: 0x2c3e50, accessory: 'none',
    };

    this.targetX = agent.posX * TS + TS / 2;
    this.targetY = agent.posY * TS + TS / 2;

    const skinColor = this.vis.skin;
    const shirtColor = this.vis.shirt;
    const pantsColor = this.vis.pants;
    const shoesColor = 0x2c1a0e;

    // Build all parts
    this.shadow   = scene.add.ellipse(0, 14, 22, 7, 0x000000, 0.2);
    this.leftShoe  = scene.add.rectangle(-4, 14, 7, 3, shoesColor);
    this.rightShoe = scene.add.rectangle(4,  14, 7, 3, shoesColor);
    this.leftLeg   = scene.add.rectangle(-4, 8,  5, 10, pantsColor);
    this.rightLeg  = scene.add.rectangle(4,  8,  5, 10, pantsColor);
    this.leftArm   = scene.add.rectangle(-10, -2, 4, 10, shirtColor);
    this.rightArm  = scene.add.rectangle(10,  -2, 4, 10, shirtColor);
    this.torso     = scene.add.rectangle(0, -3, 14, 14, shirtColor);
    this.neck      = scene.add.rectangle(0, -11, 4, 5, skinColor);
    this.head      = scene.add.arc(0, -20, 8, 0, 360, false, skinColor);
    this.head.setStrokeStyle(0.5, darken(skinColor, 0.1));
    this.hairGfx   = scene.add.graphics();
    this.faceGfx   = scene.add.graphics();
    this.eyeL      = scene.add.arc(-3, -21, 1.5, 0, 360, false, 0x1a1a1a);
    this.eyeR      = scene.add.arc(3,  -21, 1.5, 0, 360, false, 0x1a1a1a);

    this.selectionRing = scene.add.arc(0, 0, 20, 0, 360, false, 0xffd700, 0.15);
    this.selectionRing.setStrokeStyle(2, 0xffd700);
    this.selectionRing.setVisible(false);

    this.nameLabel = scene.add.text(0, -34, agent.name || '', {
      fontSize: '7px', color: '#2c1e0f',
      backgroundColor: '#ffffffcc', padding: { x: 3, y: 1 }, fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.stateLabel = scene.add.text(0, -46, '', { fontSize: '11px' }).setOrigin(0.5);

    this.bubbleGfx = scene.add.graphics();
    this.bubbleTextObj = scene.add.text(0, -72, '', {
      fontSize: '7px', color: '#1a1a1a', fontFamily: 'monospace',
      wordWrap: { width: 76 }, align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.container = scene.add.container(this.targetX, this.targetY, [
      this.shadow,
      this.selectionRing,
      this.leftShoe, this.rightShoe,
      this.leftLeg, this.rightLeg,
      this.leftArm, this.rightArm,
      this.torso,
      this.neck, this.head,
      this.hairGfx, this.faceGfx,
      this.eyeL, this.eyeR,
      this.nameLabel, this.stateLabel,
      this.bubbleGfx, this.bubbleTextObj,
    ]);
    this.container.setSize(22, 32);
    this.container.setInteractive({ cursor: 'pointer' });
    this.container.on('pointerdown', () => {
      useColonyStore.getState().setSelectedAgent(this.id);
    });

    this.drawHair();
    this.drawAccessory();
    this.nextBlinkAt = Date.now() + 2000 + Math.random() * 4000;
  }

  private drawHair() {
    const g = this.hairGfx;
    g.clear();
    g.fillStyle(this.vis.hair, 1);
    switch (this.vis.hairStyle) {
      case 'short':
        g.fillRect(-8, -30, 16, 9);
        g.fillRect(-8, -28, 4, 5);
        g.fillRect(4,  -28, 4, 5);
        break;
      case 'long':
        g.fillRect(-8, -30, 16, 9);
        g.fillRect(-9, -26, 4, 14);
        g.fillRect(5,  -26, 4, 14);
        break;
      case 'spiky':
        g.fillRect(-7, -30, 14, 7);
        g.fillTriangle(-6, -30, -3, -38, 0, -30);
        g.fillTriangle(0,  -30, 3, -38, 6, -30);
        g.fillTriangle(3,  -30, 7, -36, 8, -30);
        break;
      case 'bun':
        g.fillRect(-8, -30, 16, 8);
        g.fillCircle(0, -32, 5);
        break;
      case 'buzz':
        g.fillRect(-8, -30, 16, 6);
        break;
    }
  }

  private drawAccessory() {
    const g = this.faceGfx;
    g.clear();
    switch (this.vis.accessory) {
      case 'glasses':
        g.lineStyle(1, 0x1a1a1a, 0.8);
        g.strokeRect(-6, -23, 5, 4);
        g.strokeRect(1, -23, 5, 4);
        g.lineBetween(-1, -21, 1, -21);
        break;
      case 'headphones':
        g.lineStyle(2, 0x263238, 1);
        g.strokeCircle(0, -22, 9);
        g.fillStyle(0x37474f, 1);
        g.fillRect(-10, -24, 4, 5);
        g.fillRect(6, -24, 4, 5);
        break;
      case 'earpiece':
        g.fillStyle(0x424242, 1);
        g.fillRect(6, -23, 3, 3);
        break;
    }
  }

  showBubble(text: string, duration = 4000) {
    this.lastPhrase = text;
    this.bubbleUntil = Date.now() + duration;
  }

  private renderBubble(show: boolean) {
    this.bubbleGfx.clear();
    if (!show || !this.lastPhrase) { this.bubbleTextObj.setVisible(false); return; }
    this.bubbleTextObj.setText(this.lastPhrase);
    this.bubbleTextObj.setVisible(true);
    const tw = this.bubbleTextObj.width + 12;
    const th = this.bubbleTextObj.height + 8;
    const bx = -tw / 2;
    const by = -80;
    this.bubbleGfx.fillStyle(0xffffff, 0.95);
    this.bubbleGfx.fillRoundedRect(bx, by, tw, th, 5);
    this.bubbleGfx.lineStyle(1, 0xbbbbbb, 0.8);
    this.bubbleGfx.strokeRoundedRect(bx, by, tw, th, 5);
    this.bubbleGfx.fillStyle(0xffffff, 0.95);
    this.bubbleGfx.fillTriangle(-4, by + th, 4, by + th, 0, by + th + 5);
    this.bubbleTextObj.setY(by + 4);
  }

  update(agent: any, selectedId: string | null, now: number) {
    this.targetX = agent.posX * TS + TS / 2;
    this.targetY = agent.posY * TS + TS / 2;
    const lerp = 0.1;
    this.container.x += (this.targetX - this.container.x) * lerp;
    this.container.y += (this.targetY - this.container.y) * lerp;

    // ── Animations ──
    const t = now * 0.001;

    if (agent.state === 'walking') {
      const swing = Math.sin(t * 8) * 4;
      const swingOpp = Math.sin(t * 8 + Math.PI) * 4;
      this.leftLeg.y   = 8 + swing;
      this.rightLeg.y  = 8 + swingOpp;
      this.leftShoe.y  = 14 + Math.max(0, swing);
      this.rightShoe.y = 14 + Math.max(0, swingOpp);
      this.leftArm.y   = -2 + swingOpp * 0.5;
      this.rightArm.y  = -2 + swing * 0.5;
      this.torso.angle = Math.sin(t * 8) * 2;
    } else if (['coding', 'debugging', 'fixing'].includes(agent.state)) {
      const typeSwing = Math.sin(t * 12) * 2;
      this.leftArm.y  = -2 + typeSwing;
      this.rightArm.y = -2 - typeSwing;
      this.leftLeg.y  = 8;
      this.rightLeg.y = 8;
      this.leftShoe.y = 14;
      this.rightShoe.y = 14;
      this.torso.angle = 0;
      // lean forward slightly
      this.torso.y = -2;
    } else if (agent.state === 'sleeping') {
      this.torso.angle = 15;
      this.head.angle  = 20;
      this.leftArm.y  = -2;
      this.rightArm.y = -2;
      this.leftLeg.y  = 8;
      this.rightLeg.y = 8;
    } else if (agent.state === 'deploying') {
      const bounce = Math.abs(Math.sin(t * 5)) * 3;
      this.container.y += bounce * 0.3;
      this.leftArm.y  = -2;
      this.rightArm.y = -2 - bounce;
      this.leftLeg.y  = 8;
      this.rightLeg.y = 8;
      this.torso.angle = 0;
    } else {
      const breathe = Math.sin(t * 1.5) * 0.8;
      this.torso.y = -3 + breathe;
      this.leftArm.y  = -2 + breathe;
      this.rightArm.y = -2 + breathe;
      this.leftLeg.y  = 8;
      this.rightLeg.y = 8;
      this.leftShoe.y = 14;
      this.rightShoe.y = 14;
      this.torso.angle = 0;
      this.head.angle  = 0;
    }

    // ── Blink ──
    if (now > this.nextBlinkAt) {
      this.blinkOpen = false;
      this.blinkTimer = now;
      this.nextBlinkAt = now + 3000 + Math.random() * 5000;
    }
    if (!this.blinkOpen && now - this.blinkTimer > 120) {
      this.blinkOpen = true;
    }
    this.eyeL.setVisible(this.blinkOpen);
    this.eyeR.setVisible(this.blinkOpen);

    // ── Speech bubbles ──
    if (agent.state !== this.lastState) {
      this.lastState = agent.state;
      const phrases = STATE_PHRASES[agent.state] || [];
      if (phrases.length > 0 && agent.state !== 'walking') {
        this.showBubble(phrases[Math.floor(Math.random() * phrases.length)], 3200);
      }
    }
    const workStates = ['coding','researching','debugging','deploying','discussing','planning','fixing'];
    if (now > this.nextPhraseAt && workStates.includes(agent.state)) {
      const phrases = STATE_PHRASES[agent.state] || [];
      if (phrases.length) {
        this.showBubble(phrases[Math.floor(Math.random() * phrases.length)], 3500);
        this.nextPhraseAt = now + 7000 + Math.random() * 8000;
      }
    }

    const EMOJIS: Record<string, string> = {
      coding: '💻', researching: '🔬', debugging: '🐛', deploying: '🚀',
      sleeping: '💤', discussing: '💬', planning: '📋', fixing: '🔧',
    };
    this.stateLabel.setText(EMOJIS[agent.state] || '');
    this.renderBubble(now < this.bubbleUntil);

    const isSelected = selectedId === this.id;
    this.selectionRing.setVisible(isSelected);

    if (['coding', 'debugging', 'deploying'].includes(agent.state)) {
      const pulse = Math.sin(now * 0.003) * 0.5 + 0.5;
      this.torso.setAlpha(0.85 + pulse * 0.15);
    } else {
      this.torso.setAlpha(1);
    }
  }

  destroy() { this.container.destroy(); }
}

// ─── World Scene ─────────────────────────────────────────────────────────────

export class WorldScene extends Phaser.Scene {
  private agentChars: Map<string, AgentCharacter> = new Map();
  private worldGfx!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private roomLabelTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'WorldScene' }); }

  create() {
    this.worldGfx = this.add.graphics();
    this.drawWorld(this.worldGfx, 0, 1);

    // Night overlay — covers whole world, depth above furniture/below agents
    this.nightOverlay = this.add.rectangle(
      (WORLD_W * TS) / 2, (WORLD_H * TS) / 2,
      WORLD_W * TS + 128, WORLD_H * TS + 128,
      0x000033, 0
    );
    this.nightOverlay.setDepth(8);

    this.cameras.main.setBackgroundColor('#b8a888');
    this.cameras.main.setBounds(-32, -32, WORLD_W * TS + 64, WORLD_H * TS + 64);
    this.cameras.main.setZoom(1.6);
    this.cameras.main.centerOn((WORLD_W * TS) / 2, (WORLD_H * TS) / 2);

    // Drag to pan
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !p.wasTouch) {
        this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Mouse wheel zoom
    this.input.on('wheel', (_p: any, _g: any, _dx: number, dy: number) => {
      const z = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.5, 4);
      this.cameras.main.setZoom(z);
    });

    // Touch pan
    let lastTouchX = 0, lastTouchY = 0;
    let lastPinchDist = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, hits: any[]) => {
      if (!hits || hits.length === 0) {
        useColonyStore.getState().setSelectedAgent(null);
      }
      if (p.wasTouch) { lastTouchX = p.x; lastTouchY = p.y; }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch || !p.isDown) return;
      const pointer2 = this.input.pointer2;
      if (pointer2 && pointer2.isDown) {
        // Pinch-to-zoom
        const dx = p.x - pointer2.x;
        const dy = p.y - pointer2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          const scale = dist / lastPinchDist;
          const newZ = Phaser.Math.Clamp(this.cameras.main.zoom * scale, 0.4, 4.5);
          this.cameras.main.setZoom(newZ);
        }
        lastPinchDist = dist;
      } else {
        lastPinchDist = 0;
        this.cameras.main.scrollX -= (p.x - lastTouchX) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (p.y - lastTouchY) / this.cameras.main.zoom;
        lastTouchX = p.x;
        lastTouchY = p.y;
      }
    });

    this.input.on('pointerup', () => { lastPinchDist = 0; });
  }

  private getNightFactor(): { alpha: number; color: number; glowMult: number } {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h >= 22 || h < 5) return { alpha: 0.52, color: 0x000022, glowMult: 1.6 };
    if (h >= 20) return { alpha: 0.28, color: 0x0d1020, glowMult: 1.35 };
    if (h >= 18) return { alpha: 0.12, color: 0x1a0800, glowMult: 1.15 };
    if (h >= 6 && h < 8) return { alpha: 0.06, color: 0x100800, glowMult: 1.05 };
    return { alpha: 0, color: 0x000000, glowMult: 1.0 };
  }

  private drawWorld(g: Phaser.GameObjects.Graphics, ledSeed: number, glowMult: number) {
    g.clear();
    g.fillStyle(COL.bg, 1);
    g.fillRect(0, 0, WORLD_W * TS, WORLD_H * TS);

    g.fillStyle(COL.corridorRug, 0.35);
    g.fillRect(0, 7 * TS, WORLD_W * TS, 2 * TS);
    g.fillRect(0, 15 * TS, WORLD_W * TS, 2 * TS);
    g.fillRect(9 * TS, 0, 2 * TS, WORLD_H * TS);
    g.fillRect(19 * TS, 0, 2 * TS, WORLD_H * TS);
    g.fillRect(29 * TS, 0, 2 * TS, WORLD_H * TS);

    g.fillStyle(0x000000, 0.04);
    for (let tx = 0; tx < WORLD_W; tx++) {
      for (let ty = 0; ty < WORLD_H; ty++) {
        g.fillRect(tx * TS + TS/2 - 1, ty * TS + TS/2 - 1, 2, 2);
      }
    }

    ROOMS.forEach(room => this.drawRoom(g, room, { ledSeed, glowMult }));
  }

  private drawRoom(g: Phaser.GameObjects.Graphics, room: RoomDef, opts: { ledSeed: number; glowMult: number }) {
    const rx = room.x * TS, ry = room.y * TS;
    const rw = room.w * TS, rh = room.h * TS;

    g.fillStyle(0x000000, 0.1); g.fillRect(rx + 4, ry + 4, rw, rh);
    g.fillStyle(room.floor, 1); g.fillRect(rx, ry, rw, rh);

    g.lineStyle(0.5, 0x000000, 0.06);
    for (let tx = rx; tx <= rx + rw; tx += TS) g.lineBetween(tx, ry, tx, ry + rh);
    for (let ty = ry; ty <= ry + rh; ty += TS) g.lineBetween(rx, ty, rx + rw, ty);

    g.lineStyle(4, COL.wall, 1);      g.strokeRect(rx, ry, rw, rh);
    g.lineStyle(1.5, COL.wallInner, 0.55); g.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);

    drawRoomFurniture(g, room, opts);

    this.add.text(rx + 6, ry + 6, room.name, {
      fontSize: '8px', color: '#4a2e10', fontFamily: 'monospace',
      fontStyle: 'bold', backgroundColor: '#ffffff99', padding: { x: 3, y: 2 },
    }).setDepth(2);
  }

  update() {
    const now = Date.now();
    const { agents, selectedAgentId } = useColonyStore.getState();

    // Update night overlay color/alpha based on real time (cheap, no redraw)
    const { alpha, color } = this.getNightFactor();
    this.nightOverlay.setFillStyle(color, alpha);

    // Agent characters
    agents.forEach(agent => {
      if (!this.agentChars.has(agent.id)) {
        this.agentChars.set(agent.id, new AgentCharacter(this, agent));
      }
    });
    this.agentChars.forEach((char, id) => {
      const data = agents.find(a => a.id === id);
      if (data) { char.update(data, selectedAgentId, now); }
      else { char.destroy(); this.agentChars.delete(id); }
    });
  }
}
