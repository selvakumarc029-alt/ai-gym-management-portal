const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 5600);
const attendanceShiftHours = Number(process.env.ATTENDANCE_SHIFT_HOURS || 8);
const generatedPassword = () => crypto.randomBytes(18).toString("base64url");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const seedState = {
  plans: [
    { name: "Basic", duration: "1 Month", price: 999, label: "Attendance + membership" },
    { name: "Standard", duration: "3 Months", price: 2499, label: "Workout schedule + attendance" },
    { name: "Premium", duration: "6 Months", price: 4499, label: "Diet plan + trainer reviews" },
    { name: "Elite", duration: "12 Months", price: 7999, label: "Priority trainer support" }
  ],
  members: [
    { id: "M001", name: "Arun Kumar", email: "member@aigym.com", trainerId: "T001", plan: "Premium", status: "Active", attendance: 21, progress: 82 },
    { id: "M002", name: "Priya Shah", email: "priya@aigym.com", trainerId: "T002", plan: "Basic", status: "Active", attendance: 14, progress: 64 },
    { id: "M003", name: "Daniel Roy", email: "daniel@aigym.com", trainerId: "T001", plan: "Basic", status: "Trial", attendance: 6, progress: 35 }
  ],
  trainers: [
    { id: "T001", name: "David Johnson", specialty: "Strength", sessions: 7, score: 96 },
    { id: "T002", name: "Sarah Parker", specialty: "Fitness", sessions: 5, score: 94 }
  ],
  subscriptions: [
    { memberId: "M001", plan: "Premium", amount: 4499, status: "Active" },
    { memberId: "M002", plan: "Basic", amount: 999, status: "Active" },
    { memberId: "M003", plan: "Basic", amount: 999, status: "Trial" }
  ],
  workouts: [
    { memberId: "M001", title: "Upper body strength", tag: "45 min", done: false },
    { memberId: "M001", title: "High protein diet note", tag: "Diet", done: false },
    { memberId: "M002", title: "Mobility and core", tag: "30 min", done: false }
  ],
  dietTemplates: ["Weight Loss", "Muscle Gain", "Fat Loss", "Bodybuilding", "Women Fitness", "Senior Fitness"],
  workoutTemplates: ["Chest", "Leg", "Back", "Shoulder", "Cardio", "HIIT"],
  payments: [
    { memberId: "M001", amount: 4499, status: "Paid", invoice: "INV-1001" },
    { memberId: "M002", amount: 999, status: "Pending", invoice: "INV-1002" },
    { memberId: "M003", amount: 999, status: "Partial", invoice: "INV-1003" }
  ],
  equipment: [
    { id: "E001", name: "Treadmill", count: 4, status: "Ready" },
    { id: "E002", name: "Dumbbell Rack", count: 2, status: "Ready" },
    { id: "E003", name: "Smith Machine", count: 1, status: "Service" }
  ],
  activity: [
    ["Dynamic server started", "API"],
    ["Subscription plans synced", "Billing"],
    ["Workout assignments ready", "AI"]
  ],
  aiMessages: {},
  attendanceLog: []
};

const seedUsers = [
  { email: process.env.SUPER_ADMIN_EMAIL || "superadmin@aigym.com", password: process.env.SUPER_ADMIN_PASSWORD || generatedPassword(), role: "super_admin", name: "Platform Owner", redirect: "super-admin.html" },
  { email: process.env.INITIAL_ADMIN_EMAIL || "admin@aigym.com", password: process.env.INITIAL_ADMIN_PASSWORD || generatedPassword(), role: "admin", name: "Admin", redirect: "admin-dashboard.html" },
  { email: "trainer@aigym.com", password: generatedPassword(), role: "trainer", name: "David Johnson", redirect: "trainer-dashboard.html" },
  { email: "member@aigym.com", password: generatedPassword(), role: "member", name: "Arun Kumar", redirect: "member-dashboard.html" }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(dbFile)) {
    writeDatabase({ users: seedUsers, state: clone(seedState), sessions: {} });
  }
}

function readDatabase() {
  ensureDatabase();
  const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  let changed = false;
  if (!Array.isArray(db.tenants)) {
    db.tenants = [{ id: "gym_001", name: "AI Gym Central", slug: "ai-gym-central", plan: "Growth", status: "active", trialEndsAt: null, createdAt: new Date().toISOString(), state: db.state || clone(seedState) }];
    changed = true;
  }
  if (!db.users.some((user) => user.role === "super_admin")) {
    db.users.unshift(clone(seedUsers[0]));
    changed = true;
  }
  db.users.forEach((user) => {
    if (user.role !== "super_admin" && !user.tenantId) { user.tenantId = "gym_001"; changed = true; }
  });
  if (!db.platformPlans) {
    db.platformPlans = [
      { id: "starter", name: "Starter", price: 1499, memberLimit: 100, trainerLimit: 5 },
      { id: "growth", name: "Growth", price: 3499, memberLimit: 500, trainerLimit: 25 },
      { id: "scale", name: "Scale", price: 7999, memberLimit: 2500, trainerLimit: 100 }
    ];
    changed = true;
  }
  if (!Array.isArray(db.platformInvoices)) { db.platformInvoices = []; changed = true; }
  if (!Array.isArray(db.platformLeads)) { db.platformLeads = []; changed = true; }
  if (autoCloseAttendance(db)) changed = true;
  if (changed) writeDatabase(db);
  return db;
}

function writeDatabase(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  response.end(JSON.stringify(payload));
}

function currentSession(request, db) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const session = token && db.sessions?.[token];
  if (!session) return null;
  const user = db.users.find((item) => item.email === session.email);
  return user ? { token, ...session, user } : null;
}

function tenantFor(session, db) {
  return session?.user?.tenantId ? db.tenants.find((item) => item.id === session.user.tenantId) : null;
}

function requireSession(request, response, db, roles = []) {
  const session = currentSession(request, db);
  if (!session) { sendJson(response, 401, { message: "Please sign in again." }); return null; }
  const tenant = tenantFor(session, db);
  if (tenant?.trialEndsAt && Date.now() >= new Date(tenant.trialEndsAt).getTime()) {
    tenant.status = "expired";
    delete db.sessions[session.token];
    writeDatabase(db);
    sendJson(response, 403, { message: "Your seven-day free trial has expired. Please contact AI Gym to subscribe." });
    return null;
  }
  if (tenant && tenant.status !== "active") { sendJson(response, 403, { message: "This gym workspace is not active. Contact the platform owner." }); return null; }
  if (roles.length && !roles.includes(session.user.role)) { sendJson(response, 403, { message: "You do not have permission for this action." }); return null; }
  return session;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function nextId(items, prefix) {
  const number = items
    .map((item) => Number(String(item.id || "").replace(prefix, "")))
    .filter(Boolean)
    .reduce((max, value) => Math.max(max, value), 0) + 1;
  return `${prefix}${String(number).padStart(3, "0")}`;
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).reduce((all, part) => ({ ...all, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseAttendanceTime(date, time) {
  const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12; if (match[3].toLowerCase() === "pm") hour += 12;
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${match[2]}:00+05:30`);
}

function formatIndiaTime(date) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
}

function autoCloseLog(log, now, currentDate) {
  if (!Array.isArray(log)) return false;
  let changed = false;
  log.forEach((record) => {
    if (record.checkOutTime || !record.date || !record.time) return;
    const checkIn = parseAttendanceTime(record.date, record.time); if (!checkIn) return;
    const shiftEnd = new Date(checkIn.getTime() + attendanceShiftHours * 3600000);
    if (record.date < currentDate) {
      const endOfDay = new Date(`${record.date}T23:59:00+05:30`);
      const checkout = shiftEnd < endOfDay ? shiftEnd : endOfDay;
      record.checkOutTime = formatIndiaTime(checkout); record.checkOutAt = checkout.toISOString(); record.checkoutSource = "Automatic"; record.checkoutReason = shiftEnd < endOfDay ? `${attendanceShiftHours}-hour shift completed` : "End of day"; changed = true;
    } else if (record.date === currentDate && now >= shiftEnd) {
      record.checkOutTime = formatIndiaTime(shiftEnd); record.checkOutAt = shiftEnd.toISOString(); record.checkoutSource = "Automatic"; record.checkoutReason = `${attendanceShiftHours}-hour shift completed`; changed = true;
    }
  });
  return changed;
}

function autoCloseAttendance(db) {
  const now = new Date(); const currentDate = todayKey(); let changed = false;
  (db.tenants || []).forEach((tenant) => { const state = tenant.state || {}; if (autoCloseLog(state.attendanceLog, now, currentDate)) changed = true; if (autoCloseLog(state.trainerAttendanceLog, now, currentDate)) changed = true; });
  return changed;
}

function localBaseUrl(request) {
  const hostHeader = request.headers.host || `localhost:${port}`;
  const interfaces = os.networkInterfaces();
  const lanAddress = Object.values(interfaces)
    .flat()
    .find((item) => item && item.family === "IPv4" && !item.internal)?.address;
  const host = lanAddress ? `${lanAddress}:${port}` : hostHeader;
  return `http://${host}`;
}

function gfMultiply(a, b) {
  let result = 0;
  for (let i = 0; i < 8; i += 1) {
    if (b & 1) result ^= a;
    const carry = a & 0x80;
    a = (a << 1) & 0xff;
    if (carry) a ^= 0x1d;
    b >>= 1;
  }
  return result;
}

function reedSolomonRemainder(data, degree) {
  let generator = [1];
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(generator.length + 1).fill(0);
    generator.forEach((coefficient, index) => {
      next[index] ^= gfMultiply(coefficient, root);
      next[index + 1] ^= coefficient;
    });
    generator = next;
    root = gfMultiply(root, 2);
  }

  const result = new Array(degree).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    generator.slice(0, degree).forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });
  return result;
}

function bitsToBytes(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8).join(""), 2));
  }
  return bytes;
}

function createQrMatrix(text) {
  const version = 4;
  const size = 33;
  const dataCodewords = 80;
  const ecCodewords = 20;
  const bytes = Buffer.from(text, "utf8");

  if (bytes.length > 78) {
    throw new Error("Attendance URL is too long for the QR code.");
  }

  const bits = [];
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  bytes.forEach((byte) => pushBits(byte, 8));
  for (let i = 0; i < 4 && bits.length < dataCodewords * 8; i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);

  const data = bitsToBytes(bits);
  for (let pad = 0; data.length < dataCodewords; pad += 1) {
    data.push(pad % 2 ? 0x11 : 0xec);
  }

  const codewords = data.concat(reedSolomonRemainder(data, ecCodewords));
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (row, col, value, isReserved = true) => {
    if (row < 0 || col < 0 || row >= size || col >= size) return;
    matrix[row][col] = Boolean(value);
    if (isReserved) reserved[row][col] = true;
  };

  const addFinder = (row, col) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const r = row + y;
        const c = col + x;
        const on = y >= 0 && y <= 6 && x >= 0 && x <= 6 &&
          (y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4));
        setModule(r, c, on);
      }
    }
  };

  const addAlignment = (row, col) => {
    for (let y = -2; y <= 2; y += 1) {
      for (let x = -2; x <= 2; x += 1) {
        setModule(row + y, col + x, Math.max(Math.abs(x), Math.abs(y)) !== 1);
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);
  addAlignment(26, 26);

  for (let i = 8; i < size - 8; i += 1) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }
  setModule(size - 8, 8, true);

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  const codewordBits = codewords.flatMap((byte) => {
    const output = [];
    for (let i = 7; i >= 0; i -= 1) output.push((byte >>> i) & 1);
    return output;
  });

  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col -= 1;
    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;
      for (let c = col; c >= col - 1; c -= 1) {
        if (!reserved[row][c]) {
          matrix[row][c] = Boolean(codewordBits[bitIndex] || 0);
          bitIndex += 1;
        }
      }
    }
    upward = !upward;
  }

  const mask = (row, col) => (row + col) % 2 === 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!reserved[row][col] && mask(row, col)) matrix[row][col] = !matrix[row][col];
    }
  }

  const format = 0b111011111000100; // ECC L, mask 0.
  for (let i = 0; i < 15; i += 1) {
    const bit = ((format >>> i) & 1) === 1;
    const first = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ][i];
    const second = i < 8 ? [size - 1 - i, 8] : [8, size - 15 + i];
    setModule(first[0], first[1], bit);
    setModule(second[0], second[1], bit);
  }

  return matrix;
}

function qrSvg(text) {
  const matrix = createQrMatrix(text);
  const quiet = 4;
  const moduleSize = 8;
  const size = (matrix.length + quiet * 2) * moduleSize;
  const cells = [];

  matrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        cells.push(`<rect x="${(colIndex + quiet) * moduleSize}" y="${(rowIndex + quiet) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
      }
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${cells.join("")}</g></svg>`;
}

function safeStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.resolve(root, `.${filePath}`);
  return resolved.startsWith(root) ? resolved : null;
}

async function handleApi(request, response, pathname) {
  const db = readDatabase();

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/api/platform-plans") {
    return sendJson(response, 200, { plans: db.platformPlans });
  }

  if (request.method === "POST" && pathname === "/api/leads") {
    const body = await readBody(request); const name = String(body.name || "").trim(); const email = String(body.email || "").trim().toLowerCase(); const phone = String(body.phone || "").trim(); const gymName = String(body.gymName || "").trim(); const gymAddress = String(body.gymAddress || "").trim();
    if (!name || !email || !phone || !gymName || !gymAddress) return sendJson(response, 400, { message: "Full name, gym name, gym address, email and phone number are required." });
    const existing = db.platformLeads.find((lead) => lead.email === email && lead.status !== "Converted");
    if (existing) { existing.name = name; existing.gymName = gymName; existing.gymAddress = gymAddress; existing.phone = phone; existing.updatedAt = new Date().toISOString(); writeDatabase(db); return sendJson(response, 200, { ok: true, leadId: existing.id }); }
    const lead = { id: `LEAD-${String(db.platformLeads.length + 1).padStart(5, "0")}`, name, gymName, gymAddress, email, phone, source: "Landing page lead form", status: "New", createdAt: new Date().toISOString() };
    db.platformLeads.unshift(lead); writeDatabase(db); return sendJson(response, 201, { ok: true, leadId: lead.id });
  }

  if (request.method === "GET" && pathname === "/api/subscription-qr") {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const leadId = String(url.searchParams.get("leadId") || "").trim();
    const plan = String(url.searchParams.get("plan") || "starter").trim();
    const lead = db.platformLeads.find((item) => item.id === leadId);
    if (!lead) return sendJson(response, 404, { message: "Lead not found." });
    const upiUrl = "upi://pay?pa=aigym@upi&pn=AI%20Gym";
    const svg = qrSvg(upiUrl);
    response.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" });
    response.end(svg);
    return;
  }

  if (request.method === "POST" && pathname === "/api/activate-trial") {
    const body = await readBody(request);
    const lead = db.platformLeads.find((item) => item.id === String(body.leadId || ""));
    if (!lead) return sendJson(response, 404, { message: "Lead not found. Please submit the subscription form again." });
    const requested = String(body.plan || "starter").toLowerCase();
    const planId = requested === "pro" ? "growth" : requested;
    const plan = db.platformPlans.find((item) => item.id === planId) || db.platformPlans[0];
    let user = db.users.find((item) => item.email === lead.email && item.role === "admin");
    let tenant = user?.tenantId ? db.tenants.find((item) => item.id === user.tenantId) : null;
    if (!tenant) {
      const id = `gym_${String(db.tenants.length + 1).padStart(3, "0")}`;
      const slugBase = lead.gymName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id;
      tenant = { id, name: lead.gymName, address: lead.gymAddress, slug: `${slugBase}-${db.tenants.length + 1}`, plan: plan.name, status: "active", trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdAt: new Date().toISOString(), state: clone(seedState) };
      tenant.state.members = []; tenant.state.trainers = []; tenant.state.subscriptions = []; tenant.state.payments = []; tenant.state.attendanceLog = []; tenant.state.trainerAttendanceLog = []; tenant.state.activity = [["Seven-day trial activated", "Subscription"]];
      db.tenants.push(tenant);
      user = { email: lead.email, password: crypto.randomBytes(12).toString("base64url"), role: "admin", name: lead.name, tenantId: id, redirect: "admin-dashboard.html" };
      db.users.push(user);
    } else {
      tenant.status = "active";
      tenant.plan = plan.name;
      tenant.trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();
    }
    lead.status = "Converted";
    lead.plan = plan.name;
    lead.trialEndsAt = tenant.trialEndsAt;
    lead.paymentConfirmation = "Customer confirmed in local checkout";
    lead.updatedAt = new Date().toISOString();
    const token = crypto.randomBytes(24).toString("hex");
    db.sessions[token] = { email: user.email, role: user.role, tenantId: tenant.id, createdAt: new Date().toISOString() };
    writeDatabase(db);
    return sendJson(response, 200, { token, email: user.email, role: user.role, name: user.name, tenantId: tenant.id, tenantName: tenant.name, trialEndsAt: tenant.trialEndsAt, redirect: user.redirect });
  }

  if (request.method === "GET" && pathname === "/api/qr") {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const memberId = String(url.searchParams.get("memberId") || "").trim();
    const trainerId = String(url.searchParams.get("trainerId") || "").trim();
    const member = trainerId ? db.state.trainers.find((item) => item.id === trainerId) : db.state.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: `${trainerId ? "Trainer" : "Member"} not found.` });
    }

    const attendanceUrl = `${localBaseUrl(request)}/attendance.html?${trainerId ? `trainerId=${encodeURIComponent(trainerId)}` : `memberId=${encodeURIComponent(memberId)}`}`;
    response.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Attendance-Url": attendanceUrl
    });
    response.end(qrSvg(attendanceUrl));
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    const body = await readBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const user = db.users.find((item) => item.email === email && item.password === body.password);

    if (!user) return sendJson(response, 401, { message: "Invalid email or password." });

    const token = crypto.randomBytes(24).toString("hex");
    const tenant = user.tenantId ? db.tenants.find((item) => item.id === user.tenantId) : null;
    if (tenant?.trialEndsAt && Date.now() >= new Date(tenant.trialEndsAt).getTime()) { tenant.status = "expired"; writeDatabase(db); return sendJson(response, 403, { message: "Your seven-day free trial has expired. Please contact AI Gym to subscribe." }); }
    if (tenant && tenant.status !== "active") return sendJson(response, 403, { message: "This gym workspace is not active. Contact the platform owner." });
    db.sessions[token] = { email: user.email, role: user.role, tenantId: user.tenantId || null, createdAt: new Date().toISOString() };
    writeDatabase(db);
    return sendJson(response, 200, { token, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId || null, tenantName: tenant?.name || "AI Gym SaaS", redirect: user.redirect });
  }

  if (request.method === "GET" && pathname === "/api/me") {
    const session = requireSession(request, response, db); if (!session) return;
    const tenant = tenantFor(session, db);
    return sendJson(response, 200, { email: session.user.email, name: session.user.name, role: session.user.role, phone: session.user.phone || "", address: session.user.address || "", bio: session.user.bio || "", photo: session.user.photo || "", tenantId: tenant?.id || null, tenantName: tenant?.name || "AI Gym SaaS" });
  }

  if (request.method === "POST" && pathname === "/api/profile") {
    const session = requireSession(request, response, db); if (!session) return;
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    if (!name) return sendJson(response, 400, { message: "Name is required." });
    const previousName = session.user.name;
    session.user.name = name;
    session.user.phone = String(body.phone || "").trim();
    session.user.address = String(body.address || "").trim();
    session.user.bio = String(body.bio || "").trim();
    if (String(body.photo || "").startsWith("data:image/")) session.user.photo = String(body.photo);
    const tenant = tenantFor(session, db);
    if (tenant && session.user.role === "trainer") {
      const trainer = tenant.state.trainers.find((item) => item.email === session.user.email || item.name === previousName);
      if (trainer) { trainer.name = name; trainer.email = session.user.email; trainer.phone = session.user.phone; trainer.address = session.user.address; trainer.bio = session.user.bio; if (session.user.photo) trainer.photo = session.user.photo; }
    }
    writeDatabase(db);
    return sendJson(response, 200, { email: session.user.email, name, role: session.user.role, phone: session.user.phone, address: session.user.address, bio: session.user.bio, photo: session.user.photo || "", tenantId: tenant?.id || null, tenantName: tenant?.name || "AI Gym SaaS" });
  }

  if (pathname === "/api/super-admin/overview" && request.method === "GET") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const tenants = db.tenants.map(({ state, ...tenant }) => ({ ...tenant, members: state?.members?.length || 0, trainers: state?.trainers?.length || 0, revenue: (state?.payments || []).filter((p) => p.status === "Paid").reduce((sum, p) => sum + Number(p.amount || 0), 0) }));
    return sendJson(response, 200, { tenants, plans: db.platformPlans, invoices: db.platformInvoices, leads: db.platformLeads, totals: { gyms: tenants.length, activeGyms: tenants.filter((t) => t.status === "active").length, members: tenants.reduce((s, t) => s + t.members, 0), mrr: tenants.filter((t) => t.status === "active").reduce((s, t) => s + (db.platformPlans.find((p) => p.name === t.plan)?.price || 0), 0) } });
  }

  if (pathname === "/api/super-admin/lead-status" && request.method === "POST") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const body = await readBody(request); const lead = db.platformLeads.find((item) => item.id === body.id); if (!lead) return sendJson(response, 404, { message: "Lead not found." });
    const allowed = ["New", "Contacted", "Qualified", "Converted", "Closed"]; lead.status = allowed.includes(body.status) ? body.status : lead.status; lead.updatedAt = new Date().toISOString(); writeDatabase(db); return sendJson(response, 200, lead);
  }

  if (pathname === "/api/super-admin/platform-invoices" && request.method === "POST") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const body = await readBody(request); const tenant = db.tenants.find((item) => item.id === body.tenantId);
    if (!tenant) return sendJson(response, 404, { message: "Select a valid gym workspace." });
    const items = Array.isArray(body.items) ? body.items.map((item) => ({ description: String(item.description || "").trim(), quantity: Number(item.quantity), rate: Number(item.rate) })).filter((item) => item.description && item.quantity > 0 && item.rate >= 0) : [];
    if (!items.length) return sendJson(response, 400, { message: "Add at least one valid invoice line item." });
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0); const discount = Math.max(0, Number(body.discount || 0)); const taxRate = Math.max(0, Number(body.taxRate || 0)); const taxable = Math.max(0, subtotal - discount); const tax = taxable * taxRate / 100; const total = taxable + tax;
    const invoice = { id: `PINV-${String(db.platformInvoices.length + 1).padStart(5, "0")}`, number: `SaaS-${new Date().getFullYear()}-${String(db.platformInvoices.length + 1).padStart(4, "0")}`, tenantId: tenant.id, tenantName: tenant.name, billingEmail: String(body.billingEmail || db.users.find((user) => user.tenantId === tenant.id && user.role === "admin")?.email || ""), issueDate: body.issueDate || todayKey(), dueDate: body.dueDate || todayKey(), billingPeriod: String(body.billingPeriod || ""), purchaseOrder: String(body.purchaseOrder || ""), items, subtotal, discount, taxRate, tax, total, currency: "INR", status: "Issued", paymentStatus: String(body.paymentStatus || "Unpaid"), notes: String(body.notes || ""), terms: String(body.terms || "Payment is due by the stated due date."), createdAt: new Date().toISOString(), createdBy: session.user.email };
    db.platformInvoices.unshift(invoice); writeDatabase(db); return sendJson(response, 201, invoice);
  }

  if (pathname === "/api/platform-invoices" && request.method === "GET") {
    const session = requireSession(request, response, db, ["admin"]); if (!session) return;
    return sendJson(response, 200, { invoices: db.platformInvoices.filter((invoice) => invoice.tenantId === session.user.tenantId) });
  }

  if (pathname === "/api/super-admin/tenants" && request.method === "POST") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const body = await readBody(request); const name = String(body.name || "").trim(); const adminEmail = String(body.adminEmail || "").trim().toLowerCase(); const password = String(body.password || "");
    if (!name || !adminEmail || password.length < 8) return sendJson(response, 400, { message: "Gym name, admin email, and an 8+ character password are required." });
    if (db.users.some((u) => u.email === adminEmail)) return sendJson(response, 409, { message: "That admin email is already in use." });
    const id = `gym_${String(db.tenants.length + 1).padStart(3, "0")}`; const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id;
    const tenant = { id, name, slug: `${slugBase}-${db.tenants.length + 1}`, plan: body.plan || "Starter", status: "active", trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), createdAt: new Date().toISOString(), state: clone(seedState) };
    tenant.state.members = []; tenant.state.trainers = []; tenant.state.subscriptions = []; tenant.state.payments = []; tenant.state.attendanceLog = []; tenant.state.trainerAttendanceLog = []; tenant.state.activity = [["Workspace created", "SaaS"]];
    db.tenants.push(tenant); db.users.push({ email: adminEmail, password, role: "admin", name: body.adminName || `${name} Admin`, tenantId: id, redirect: "admin-dashboard.html" }); writeDatabase(db);
    return sendJson(response, 201, { id, name, adminEmail, status: tenant.status });
  }

  if (pathname === "/api/super-admin/tenant-status" && request.method === "POST") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const body = await readBody(request); const tenant = db.tenants.find((t) => t.id === body.tenantId);
    if (!tenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    tenant.status = body.status === "suspended" ? "suspended" : "active"; writeDatabase(db); return sendJson(response, 200, { ok: true, status: tenant.status });
  }

  if (pathname === "/api/super-admin/platform-plans" && request.method === "POST") {
    const session = requireSession(request, response, db, ["super_admin"]); if (!session) return;
    const body = await readBody(request); const plan = db.platformPlans.find((item) => item.id === String(body.id || ""));
    if (!plan) return sendJson(response, 404, { message: "Platform plan not found." });
    const name = String(body.name || "").trim(); const price = Number(body.price); const memberLimit = Number(body.memberLimit); const trainerLimit = Number(body.trainerLimit);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(memberLimit) || memberLimit < 1 || !Number.isInteger(trainerLimit) || trainerLimit < 1) return sendJson(response, 400, { message: "Enter a valid name, price, member limit and trainer limit." });
    const oldName = plan.name; Object.assign(plan, { name, price: Math.round(price), memberLimit, trainerLimit });
    db.tenants.forEach((tenant) => { if (tenant.plan === oldName) tenant.plan = name; }); writeDatabase(db);
    return sendJson(response, 200, { ok: true, plan });
  }

  if (request.method === "POST" && pathname === "/api/register") {
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || password.length < 4) {
      return sendJson(response, 400, { message: "Enter name, email, and a password with at least 4 characters." });
    }

    if (db.users.some((user) => user.email === email)) {
      return sendJson(response, 409, { message: "This email is already registered." });
    }

    const tenant = db.tenants.find((item) => item.slug === String(body.gymCode || "ai-gym-central").trim().toLowerCase());
    if (!tenant || tenant.status !== "active") return sendJson(response, 404, { message: "Enter a valid active gym code." });
    const state = tenant.state; const memberId = nextId(state.members, "M");
    db.users.push({ email, password, role: "member", name, tenantId: tenant.id, redirect: "member-dashboard.html" });
    state.members.push({
      id: memberId,
      name,
      email,
      trainerId: state.trainers[0]?.id || "",
      plan: "Basic",
      status: "Trial",
      attendance: 0,
      progress: 0,
      membershipStart: new Date().toISOString().slice(0, 10),
      membershipEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      goal: "Build consistency"
    });
    state.subscriptions.push({ memberId, plan: "Basic", amount: 999, status: "Trial" });
    state.payments.push({ memberId, amount: 999, status: "Pending", invoice: `INV-${1000 + state.payments.length + 1}` });
    state.activity.unshift([`${name} registered`, "Member"]);
    writeDatabase(db);

    return sendJson(response, 201, { email, role: "member", redirect: "member-dashboard.html" });
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-in") {
    const attendanceSession = requireSession(request, response, db, ["admin", "trainer", "member"]); if (!attendanceSession) return;
    const attendanceTenant = tenantFor(attendanceSession, db); if (!attendanceTenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    const attendanceState = attendanceTenant.state;
    const body = await readBody(request);
    const trainerId = String(body.trainerId || "").trim();
    if (trainerId) {
      const trainer = attendanceState.trainers.find((item) => item.id === trainerId);
      if (!trainer) return sendJson(response, 404, { message: "Trainer not found." });
      if (!Array.isArray(attendanceState.trainerAttendanceLog)) attendanceState.trainerAttendanceLog = [];
      const date = todayKey();
      const existing = attendanceState.trainerAttendanceLog.find((item) => item.trainerId === trainerId && item.date === date);
      if (existing) return sendJson(response, 200, { alreadyCheckedIn: true, message: `${trainer.name} is already checked in today.`, checkIn: existing });
      const now = new Date();
      const checkIn = { id: `TA${String(attendanceState.trainerAttendanceLog.length + 1).padStart(4, "0")}`, trainerId, date, time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), checkInAt: now.toISOString(), source: "QR" };
      attendanceState.trainerAttendanceLog.unshift(checkIn); attendanceState.activity.unshift([`${trainer.name} checked in`, "Trainer attendance"]); writeDatabase(db);
      return sendJson(response, 200, { alreadyCheckedIn: false, message: `${trainer.name} checked in successfully.`, checkIn });
    }
    const memberId = String(body.memberId || "").trim();
    const member = attendanceState.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: "Member not found." });
    }

    if (!Array.isArray(attendanceState.attendanceLog)) attendanceState.attendanceLog = [];

    const date = todayKey();
    const alreadyCheckedIn = attendanceState.attendanceLog.some((item) => item.memberId === memberId && item.date === date);

    if (alreadyCheckedIn) {
      return sendJson(response, 200, {
        alreadyCheckedIn: true,
        message: `${member.name} is already checked in today.`,
        member
      });
    }

    const checkIn = {
      id: `A${String(attendanceState.attendanceLog.length + 1).padStart(4, "0")}`,
      memberId,
      date,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };

    attendanceState.attendanceLog.unshift(checkIn);
    member.attendance = Number(member.attendance || 0) + 1;
    member.progress = Math.min(100, Number(member.progress || 0) + 2);
    attendanceState.activity.unshift([`${member.name} marked attendance`, "Check-in"]);
    attendanceState.activity = attendanceState.activity.slice(0, 8);
    writeDatabase(db);

    return sendJson(response, 200, {
      alreadyCheckedIn: false,
      message: `${member.name} checked in successfully.`,
      member,
      checkIn
    });
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-out") {
    const attendanceSession = requireSession(request, response, db, ["admin", "trainer", "member"]); if (!attendanceSession) return;
    const attendanceTenant = tenantFor(attendanceSession, db); if (!attendanceTenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    const attendanceState = attendanceTenant.state;
    const body = await readBody(request);
    const trainerId = String(body.trainerId || "").trim();
    if (trainerId) {
      const trainer = attendanceState.trainers.find((item) => item.id === trainerId);
      if (!trainer) return sendJson(response, 404, { message: "Trainer not found." });
      if (!Array.isArray(attendanceState.trainerAttendanceLog)) attendanceState.trainerAttendanceLog = [];
      const record = attendanceState.trainerAttendanceLog.find((item) => item.trainerId === trainerId && item.date === todayKey());
      if (!record) return sendJson(response, 400, { message: `${trainer.name} has not checked in today.` });
      if (record.checkOutTime) return sendJson(response, 200, { alreadyCheckedOut: true, message: `${trainer.name} is already checked out today.`, checkIn: record });
      const now = new Date(); record.checkOutTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); record.checkOutAt = now.toISOString(); attendanceState.activity.unshift([`${trainer.name} checked out`, "Trainer attendance"]); writeDatabase(db);
      return sendJson(response, 200, { alreadyCheckedOut: false, message: `${trainer.name} checked out successfully.`, checkIn: record });
    }
    const memberId = String(body.memberId || "").trim();
    const member = attendanceState.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: "Member not found." });
    }

    if (!Array.isArray(attendanceState.attendanceLog)) attendanceState.attendanceLog = [];

    const date = todayKey();
    const record = attendanceState.attendanceLog.find((item) => item.memberId === memberId && item.date === date);

    if (!record) {
      return sendJson(response, 400, { message: `${member.name} has not checked in today.` });
    }

    if (record.checkOutTime) {
      return sendJson(response, 200, {
        alreadyCheckedOut: true,
        message: `${member.name} is already checked out today.`,
        member,
        checkIn: record
      });
    }

    record.checkOutTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    attendanceState.activity.unshift([`${member.name} checked out`, "Check-out"]);
    attendanceState.activity = attendanceState.activity.slice(0, 8);
    writeDatabase(db);

    return sendJson(response, 200, {
      alreadyCheckedOut: false,
      message: `${member.name} checked out successfully.`,
      member,
      checkIn: record
    });
  }

  if (request.method === "GET" && pathname === "/api/state") {
    const session = requireSession(request, response, db, ["admin", "trainer", "member"]); if (!session) return;
    const tenant = tenantFor(session, db); if (!tenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    return sendJson(response, 200, tenant.state);
  }

  if (request.method === "POST" && pathname === "/api/admin/members") {
    const session = requireSession(request, response, db, ["admin"]); if (!session) return;
    const tenant = tenantFor(session, db); if (!tenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const state = tenant.state;
    if (!name || !email || password.length < 8) return sendJson(response, 400, { message: "Name, email, and a password of at least 8 characters are required." });
    if (db.users.some((user) => user.email === email) || state.members.some((member) => String(member.email).toLowerCase() === email)) {
      return sendJson(response, 409, { message: "That email is already registered." });
    }
    const trainerId = state.trainers.some((trainer) => trainer.id === body.trainerId) ? body.trainerId : (state.trainers[0]?.id || "");
    const plan = state.plans.find((item) => item.name === body.plan) || state.plans[0] || { name: "Basic", price: 0 };
    const memberId = nextId(state.members, "M");
    const member = { id: memberId, name, email, trainerId, plan: plan.name, status: "Active", attendance: 0, progress: 0, membershipStart: new Date().toISOString().slice(0, 10), goal: "Build consistency" };
    state.members.push(member);
    state.subscriptions.push({ memberId, plan: plan.name, amount: Number(plan.price || 0), status: "Active" });
    state.payments.push({ memberId, amount: Number(plan.price || 0), status: "Pending", invoice: `INV-${1001 + state.payments.length}` });
    state.activity.unshift([`Admin added member ${name}`, "Member"]);
    state.activity = state.activity.slice(0, 8);
    db.users.push({ email, password, role: "member", name, tenantId: tenant.id, redirect: "member-dashboard.html" });
    writeDatabase(db);
    return sendJson(response, 201, { member: { id: member.id, name: member.name, email: member.email }, state });
  }

  if (request.method === "POST" && pathname === "/api/admin/member-delete") {
    const session = requireSession(request, response, db, ["admin"]); if (!session) return;
    const tenant = tenantFor(session, db); if (!tenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    const body = await readBody(request);
    const state = tenant.state;
    const member = state.members.find((item) => item.id === body.memberId);
    if (!member) return sendJson(response, 404, { message: "Member not found." });
    state.members = state.members.filter((item) => item.id !== member.id);
    state.subscriptions = state.subscriptions.filter((item) => item.memberId !== member.id);
    state.payments = state.payments.filter((item) => item.memberId !== member.id);
    state.workouts = state.workouts.filter((item) => item.memberId !== member.id);
    state.attendanceLog = (state.attendanceLog || []).filter((item) => item.memberId !== member.id);
    state.invoices = (state.invoices || []).filter((item) => !(item.recipientType === "member" && item.recipientId === member.id));
    if (state.aiMessages) delete state.aiMessages[member.id];
    db.users = db.users.filter((user) => !(user.tenantId === tenant.id && user.role === "member" && user.email === member.email));
    Object.keys(db.sessions).forEach((token) => { if (db.sessions[token].email === member.email && db.sessions[token].tenantId === tenant.id) delete db.sessions[token]; });
    state.activity.unshift([`Admin removed ${member.name}`, "Member"]);
    state.activity = state.activity.slice(0, 8);
    writeDatabase(db);
    return sendJson(response, 200, { ok: true, state });
  }

  if (request.method === "POST" && pathname === "/api/state") {
    const session = requireSession(request, response, db, ["admin", "trainer", "member"]); if (!session) return;
    const tenant = tenantFor(session, db); if (!tenant) return sendJson(response, 404, { message: "Gym workspace not found." });
    const body = await readBody(request);
    tenant.state = body;
    writeDatabase(db);
    return sendJson(response, 200, { ok: true });
  }

  return sendJson(response, 404, { message: "API route not found." });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Server error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AI Gym Portal running at http://localhost:${port}/`);
});

// Keep automatic attendance closures running even when no dashboard is open.
setInterval(() => { try { readDatabase(); } catch (error) { console.error("Automatic checkout failed:", error.message); } }, 60_000).unref();
