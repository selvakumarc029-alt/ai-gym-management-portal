const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 5600);

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
  { email: "admin@aigym.com", password: "admin123", role: "admin", name: "Admin", redirect: "admin-dashboard.html" },
  { email: "trainer@aigym.com", password: "trainer123", role: "trainer", name: "David Johnson", redirect: "trainer-dashboard.html" },
  { email: "sarah@aigym.com", password: "trainer123", role: "trainer", name: "Sarah Parker", redirect: "trainer-dashboard.html" },
  { email: "member@aigym.com", password: "member123", role: "member", name: "Arun Kumar", redirect: "member-dashboard.html" },
  { email: "priya@aigym.com", password: "member123", role: "member", name: "Priya Shah", redirect: "member-dashboard.html" },
  { email: "daniel@aigym.com", password: "member123", role: "member", name: "Daniel Roy", redirect: "member-dashboard.html" }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    writeDatabase({ users: seedUsers, state: clone(seedState), sessions: {} });
  }
}

function readDatabase() {
  ensureDatabase();
  try {
    const raw = fs.readFileSync(dbFile, "utf8").trim();
    if (!raw) throw new Error("Database file is empty.");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
      throw new Error("Invalid database schema.");
    }
    return parsed;
  } catch (error) {
    console.error("Database read error, re-initializing database:", error.message);
    const fallback = { users: seedUsers, state: clone(seedState), sessions: {} };
    writeDatabase(fallback);
    return fallback;
  }
}

function writeDatabase(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tempFile = path.join(dataDir, `db.json.tmp.${Date.now()}`);
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tempFile, dbFile);
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
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
  return new Date().toISOString().slice(0, 10);
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
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/api/qr") {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const memberId = String(url.searchParams.get("memberId") || "").trim();
    const member = db.state.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: "Member not found." });
    }

    const attendanceUrl = `${localBaseUrl(request)}/attendance.html?memberId=${encodeURIComponent(memberId)}`;
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
    const password = String(body.password || "").trim();
    const user = db.users.find(
      (item) => String(item.email || "").toLowerCase() === email && String(item.password || "").trim() === password
    );

    if (!user) return sendJson(response, 401, { message: "Invalid email or password." });

    const token = crypto.randomBytes(24).toString("hex");
    db.sessions[token] = { email: user.email, role: user.role, createdAt: new Date().toISOString() };
    writeDatabase(db);
    return sendJson(response, 200, { token, email: user.email, role: user.role, name: user.name, redirect: user.redirect });
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

    const memberId = nextId(db.state.members, "M");
    db.users.push({ email, password, role: "member", name, redirect: "member-dashboard.html" });
    db.state.members.push({
      id: memberId,
      name,
      email,
      trainerId: db.state.trainers[0]?.id || "",
      plan: "Basic",
      status: "Trial",
      attendance: 0,
      progress: 0,
      membershipStart: new Date().toISOString().slice(0, 10),
      membershipEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      goal: "Build consistency"
    });
    db.state.subscriptions.push({ memberId, plan: "Basic", amount: 999, status: "Trial" });
    db.state.payments.push({ memberId, amount: 999, status: "Pending", invoice: `INV-${1000 + db.state.payments.length + 1}` });
    db.state.activity.unshift([`${name} registered`, "Member"]);
    writeDatabase(db);

    return sendJson(response, 201, { email, role: "member", redirect: "member-dashboard.html" });
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-in") {
    const body = await readBody(request);
    const memberId = String(body.memberId || "").trim();
    const member = db.state.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: "Member not found." });
    }

    if (!Array.isArray(db.state.attendanceLog)) db.state.attendanceLog = [];

    const date = todayKey();
    const alreadyCheckedIn = db.state.attendanceLog.some((item) => item.memberId === memberId && item.date === date);

    if (alreadyCheckedIn) {
      return sendJson(response, 200, {
        alreadyCheckedIn: true,
        message: `${member.name} is already checked in today.`,
        member
      });
    }

    const checkIn = {
      id: `A${String(db.state.attendanceLog.length + 1).padStart(4, "0")}`,
      memberId,
      date,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };

    db.state.attendanceLog.unshift(checkIn);
    member.attendance = Number(member.attendance || 0) + 1;
    member.progress = Math.min(100, Number(member.progress || 0) + 2);
    db.state.activity.unshift([`${member.name} marked attendance`, "Check-in"]);
    db.state.activity = db.state.activity.slice(0, 8);
    writeDatabase(db);

    return sendJson(response, 200, {
      alreadyCheckedIn: false,
      message: `${member.name} checked in successfully.`,
      member,
      checkIn
    });
  }

  if (request.method === "POST" && pathname === "/api/attendance/check-out") {
    const body = await readBody(request);
    const memberId = String(body.memberId || "").trim();
    const member = db.state.members.find((item) => item.id === memberId);

    if (!member) {
      return sendJson(response, 404, { message: "Member not found." });
    }

    if (!Array.isArray(db.state.attendanceLog)) db.state.attendanceLog = [];

    const date = todayKey();
    const record = db.state.attendanceLog.find((item) => item.memberId === memberId && item.date === date);

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
    db.state.activity.unshift([`${member.name} checked out`, "Check-out"]);
    db.state.activity = db.state.activity.slice(0, 8);
    writeDatabase(db);

    return sendJson(response, 200, {
      alreadyCheckedOut: false,
      message: `${member.name} checked out successfully.`,
      member,
      checkIn: record
    });
  }

  if (request.method === "GET" && pathname === "/api/state") {
    return sendJson(response, 200, db.state);
  }

  if (request.method === "POST" && pathname === "/api/state") {
    const body = await readBody(request);
    db.state = body;
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
