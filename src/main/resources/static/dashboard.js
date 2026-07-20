const dashboardRoot = document.querySelector("[data-dashboard-role]");

const storageKey = "aiGymAppState";
let serverSyncReady = false;
const MEMBER_PREVIEW_LIMIT = 5;
let memberListExpanded = false;
let adminActiveView = "overview";
let adminAttendanceMemberId = "";
let adminAttendanceTrainerId = "";
let memberAssistantShouldRemainOpen = false;
const dynamicAppOrigin = window.location.port === "5600" ? window.location.origin : "http://localhost:5600";
const apiBaseUrl = window.location.port === "5600" ? "" : dynamicAppOrigin;

const defaultPlans = [
  { name: "Basic", duration: "1 Month", price: 999, label: "Attendance + membership" },
  { name: "Standard", duration: "3 Months", price: 2499, label: "Workout schedule + attendance" },
  { name: "Premium", duration: "6 Months", price: 4499, label: "Diet plan + trainer reviews" },
  { name: "Elite", duration: "12 Months", price: 7999, label: "Priority trainer support" }
];

const defaultState = {
  plans: clone(defaultPlans),
  members: [
    { id: "M001", name: "Arun Kumar", email: "member@aigym.com", trainerId: "T001", plan: "Pro", status: "Active", attendance: 21, progress: 82 },
    { id: "M002", name: "Priya Shah", email: "priya@aigym.com", trainerId: "T002", plan: "Basic", status: "Active", attendance: 14, progress: 64 },
    { id: "M003", name: "Daniel Roy", email: "daniel@aigym.com", trainerId: "T001", plan: "Free", status: "Trial", attendance: 6, progress: 35 }
  ],
  trainers: [
    { id: "T001", name: "David Johnson", specialty: "Strength", sessions: 7, score: 96 },
    { id: "T002", name: "Sarah Parker", specialty: "Fitness", sessions: 5, score: 94 }
  ],
  subscriptions: [
    { memberId: "M001", plan: "Pro", amount: 1999, status: "Active" },
    { memberId: "M002", plan: "Basic", amount: 999, status: "Active" },
    { memberId: "M003", plan: "Free", amount: 0, status: "Trial" }
  ],
  workouts: [
    { memberId: "M001", title: "Upper body strength", tag: "45 min", done: false },
    { memberId: "M001", title: "High protein diet note", tag: "Diet", done: false },
    { memberId: "M002", title: "Mobility and core", tag: "30 min", done: false }
  ],
  dietTemplates: ["Weight Loss", "Muscle Gain", "Fat Loss", "Bodybuilding", "Women Fitness", "Senior Fitness"],
  workoutTemplates: ["Chest", "Leg", "Back", "Shoulder", "Cardio", "HIIT"],
  payments: [
    { memberId: "M001", amount: 1999, status: "Paid", invoice: "INV-1001" },
    { memberId: "M002", amount: 999, status: "Pending", invoice: "INV-1002" },
    { memberId: "M003", amount: 0, status: "Partial", invoice: "INV-1003" }
  ],
  invoices: [],
  equipment: [
    { id: "E001", name: "Treadmill", count: 4, status: "Ready" },
    { id: "E002", name: "Dumbbell Rack", count: 2, status: "Ready" },
    { id: "E003", name: "Smith Machine", count: 1, status: "Service" },
    { id: "E004", name: "Bench Press", count: 3, status: "Ready" },
    { id: "E005", name: "Squat Rack", count: 2, status: "Ready" },
    { id: "E006", name: "Cable Crossover", count: 1, status: "Ready" },
    { id: "E007", name: "Leg Press", count: 2, status: "Ready" },
    { id: "E008", name: "Rowing Machine", count: 2, status: "Ready" },
    { id: "E009", name: "Exercise Bike", count: 5, status: "Ready" },
    { id: "E010", name: "Kettlebell Set", count: 3, status: "Ready" }
  ],
  activity: [
    ["Gym system loaded", "Live"],
    ["Subscription plans synced", "Billing"],
    ["Workout assignments ready", "AI"]
  ],
  aiMessages: {}
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  const state = saved ? JSON.parse(saved) : clone(defaultState);

  state.plans = Array.isArray(state.plans) && state.plans.length ? state.plans : clone(defaultPlans);
  state.members = Array.isArray(state.members) ? state.members : clone(defaultState.members);
  state.trainers = Array.isArray(state.trainers) ? state.trainers : clone(defaultState.trainers);
  state.subscriptions = Array.isArray(state.subscriptions) ? state.subscriptions : clone(defaultState.subscriptions);
  state.workouts = Array.isArray(state.workouts) ? state.workouts : clone(defaultState.workouts);
  state.equipment = Array.isArray(state.equipment) ? state.equipment : clone(defaultState.equipment);
  state.dietTemplates = Array.isArray(state.dietTemplates) ? state.dietTemplates : clone(defaultState.dietTemplates);
  state.workoutTemplates = Array.isArray(state.workoutTemplates) ? state.workoutTemplates : clone(defaultState.workoutTemplates);
  state.payments = Array.isArray(state.payments) ? state.payments : clone(defaultState.payments);
  state.invoices = Array.isArray(state.invoices) ? state.invoices : [];
  state.attendanceLog = Array.isArray(state.attendanceLog) ? state.attendanceLog : [];
  state.trainerAttendanceLog = Array.isArray(state.trainerAttendanceLog) ? state.trainerAttendanceLog : [];
  defaultPlans.forEach((item) => {
    if (!state.plans.some((plan) => plan.name === item.name)) state.plans.push(clone(item));
  });
  state.plans.forEach((plan) => {
    if (!plan.duration) plan.duration = plan.name === "Elite" ? "12 Months" : plan.name === "Premium" ? "6 Months" : plan.name === "Standard" ? "3 Months" : "1 Month";
  });
  defaultState.equipment.forEach((item) => {
    if (!state.equipment.some((equipment) => equipment.name === item.name)) {
      state.equipment.push(clone(item));
    }
  });
  state.activity = Array.isArray(state.activity) ? state.activity : clone(defaultState.activity);
  state.aiMessages = state.aiMessages && typeof state.aiMessages === "object" ? state.aiMessages : {};
  const memberProfiles = {
    M001: { age: 28, gender: "Male", height: 175, weight: 78, medicalHistory: "No major concerns", emergencyContact: "+91 98765 43210", membershipStart: "2026-07-01", membershipEnd: "2026-08-01", caloriesTarget: 2200, caloriesLogged: 1680, waterTarget: 3, waterIntake: 1.8, proteinTarget: 140, carbsTarget: 240, fatTarget: 65, goal: "Build muscle", bodyFat: 18, muscleMass: 34, measurements: "Chest 40 in | Waist 32 in" },
    M002: { age: 25, gender: "Female", height: 164, weight: 61, medicalHistory: "Knee care", emergencyContact: "+91 98765 43211", membershipStart: "2026-07-03", membershipEnd: "2026-08-03", caloriesTarget: 1800, caloriesLogged: 1320, waterTarget: 2.6, waterIntake: 1.4, proteinTarget: 105, carbsTarget: 190, fatTarget: 52, goal: "Fat loss", bodyFat: 24, muscleMass: 25, measurements: "Waist 29 in | Hip 38 in" },
    M003: { age: 31, gender: "Male", height: 172, weight: 84, medicalHistory: "Shoulder mobility", emergencyContact: "+91 98765 43212", membershipStart: "2026-07-05", membershipEnd: "2026-07-15", caloriesTarget: 2100, caloriesLogged: 1450, waterTarget: 3, waterIntake: 1.2, proteinTarget: 130, carbsTarget: 210, fatTarget: 60, goal: "Strength comeback", bodyFat: 22, muscleMass: 32, measurements: "Chest 39 in | Waist 35 in" }
  };
  state.members.forEach((member) => {
    const fallback = memberProfiles[member.id] || memberProfiles.M001;
    Object.entries(fallback).forEach(([key, value]) => {
      if (member[key] === undefined || member[key] === null || member[key] === "") member[key] = value;
    });
  });

  return state;
}

function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (serverSyncReady) {
    fetch(`${apiBaseUrl}/api/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    }).catch(() => {});
  }
}

function addActivity(state, text, tag) {
  state.activity.unshift([text, tag]);
  state.activity = state.activity.slice(0, 8);
}

function currentUser() {
  const saved = localStorage.getItem("aiGymCurrentUser");
  return saved ? JSON.parse(saved) : null;
}

function fallbackUser(role = "member") {
  const emails = {
    admin: "admin@aigym.com",
    trainer: "trainer@aigym.com",
    member: "member@aigym.com"
  };
  return { email: emails[role] || emails.member, role };
}

function money(value) {
  return `INR ${Number(value).toLocaleString("en-IN")}`;
}

function metric(value, label) {
  return `<article class="metric"><strong>${value}</strong><span>${label}</span></article>`;
}

function listItem(item) {
  if (typeof item === "string") return item;
  const [text, tag] = item;
  return `<li><span>${text}</span><span class="pill">${tag}</span></li>`;
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function nextEntityId(items, prefix) {
  const highest = items.reduce((max, item) => {
    const value = Number(String(item.id || "").replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

function downloadTextFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function imageFileToDataUrl(file, size = 320) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function paymentProofToDataUrl(file, maxSize = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function memberName(state, memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Member";
}

function trainerName(state, trainerId) {
  return state.trainers.find((trainer) => trainer.id === trainerId)?.name || "Unassigned";
}

function trainerMemberCount(state, trainerId) {
  return state.members.filter((member) => member.trainerId === trainerId).length;
}

function totalRevenue(state) {
  return state.subscriptions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function activeMembers(state) {
  return state.members.filter((member) => member.status === "Active").length;
}

function pendingRenewals(state) {
  return state.subscriptions.filter((item) => item.status !== "Active").length;
}

function selectedMember(state) {
  const user = currentUser() || fallbackUser("member");
  return state.members.find((member) => member.email === user.email) || state.members[0];
}

function memberPlan(state, member = selectedMember(state)) {
  return state.plans.find((plan) => plan.name === member.plan) || { name: member.plan, price: 0, label: "Custom membership" };
}

function daysUntil(dateString) {
  const target = new Date(`${dateString}T23:59:59`);
  const today = new Date();
  return Math.max(0, Math.ceil((target - today) / 86400000));
}

function todayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function attendanceRecords(state, memberId) {
  return Array.isArray(state.attendanceLog)
    ? state.attendanceLog.filter((item) => item.memberId === memberId)
    : [];
}

function attendanceRecordForDate(state, memberId, date) {
  return attendanceRecords(state, memberId).find((item) => item.date === date);
}

function monthDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
  });
}

function renderAttendanceCalendar(state, members, title = "Attendance Calendar") {
  const dates = monthDates();
  const today = todayDateKey();
  const memberList = members.filter(Boolean);

  if (!memberList.length) {
    return "<p>No members available for attendance tracking.</p>";
  }

  const rows = memberList.map((member) => {
    const cells = dates.map((date) => {
      const record = attendanceRecordForDate(state, member.id, date);
      const isFuture = date > today;
      const day = Number(date.slice(-2));
      const status = record ? "present" : isFuture ? "future" : "absent";
      const label = record
        ? `${day}: present${record.checkOutTime ? `, out ${record.checkOutTime}` : ", not checked out"}`
        : isFuture
          ? `${day}: upcoming`
          : `${day}: absent`;

      return `<span class="attendance-day ${status}" title="${label}" aria-label="${label}">${day}</span>`;
    }).join("");
    const latest = attendanceRecords(state, member.id)[0];
    const status = latest?.date === today
      ? latest.checkOutTime ? `Out ${latest.checkOutTime}` : `In ${latest.time}`
      : "Not marked today";

    return `
      <article class="attendance-member-row-card">
        <div class="attendance-row-head">
          <strong>${member.name}</strong>
          <span>${member.id} | ${status}</span>
        </div>
        <div class="attendance-calendar-grid">${cells}</div>
      </article>
    `;
  }).join("");

  return `
    <div class="attendance-calendar-panel">
      <div class="attendance-calendar-head">
        <strong>${title}</strong>
        <span><i class="legend present"></i>Present <i class="legend absent"></i>Absent</span>
      </div>
      ${rows}
    </div>
  `;
}

function renderAttendanceSummary(state, members) {
  const today = todayDateKey();
  const presentToday = members.filter((member) => attendanceRecordForDate(state, member.id, today)).length;
  const checkedOut = members.filter((member) => attendanceRecordForDate(state, member.id, today)?.checkOutTime).length;

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Present today</span><strong>${presentToday}</strong></li>
      <li><span>Absent today</span><strong>${Math.max(0, members.length - presentToday)}</strong></li>
      <li><span>Checked out</span><strong>${checkedOut}</strong></li>
      <li><span>Total members</span><strong>${members.length}</strong></li>
    </ul>
  `;
}

function attendanceDuration(record) {
  if (!record?.checkOutTime) return "Active";
  const minutes = (value) => {
    const match = String(value).trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === "pm") hour += 12;
    return hour * 60 + Number(match[2]);
  };
  const start = minutes(record.time);
  const end = minutes(record.checkOutTime);
  if (start === null || end === null) return "Completed";
  const total = Math.max(0, end - start);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

function renderMemberAttendanceHistory(state, memberId) {
  const records = attendanceRecords(state, memberId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);
  if (!records.length) return `<div class="member-attendance-card member-attendance-history-card"><h3>Recent attendance</h3><div class="trainer-attendance-empty">No attendance records yet.</div></div>`;
  return `<div class="member-attendance-card member-attendance-history-card"><h3>Recent attendance</h3><div class="attendance-history-cards">${records.map((record) => `<article class="attendance-history-card"><div class="attendance-history-card-date"><span>DATE</span><strong>${record.date}</strong></div><div><span>CHECK IN</span><strong>${record.time || "—"}</strong></div><div><span>CHECK OUT</span><strong>${record.checkOutTime || "—"}</strong></div><div><span>HOURS</span><strong>${attendanceDuration(record)}</strong></div></article>`).join("")}</div></div>`;
}

function trainerAttendanceRecord(state, trainerId, date = todayDateKey()) {
  const normalizedDate = String(date).slice(0, 10);
  return state.trainerAttendanceLog.find((record) => record.trainerId === trainerId && String(record.date).slice(0, 10) === normalizedDate);
}

function trainerAttendanceRecords(state, trainerId) {
  return state.trainerAttendanceLog.filter((record) => record.trainerId === trainerId).sort((a, b) => b.date.localeCompare(a.date));
}

function renderTrainerAttendanceCalendar(state, trainers, title = "Trainer Attendance Calendar") {
  const dates = monthDates();
  const today = todayDateKey();
  const rows = trainers.filter(Boolean).map((trainer) => {
    const cells = dates.map((date) => {
      const record = trainerAttendanceRecord(state, trainer.id, date);
      const status = record ? "present" : date > today ? "future" : "absent";
      const day = Number(date.slice(-2));
      const label = record ? `${day}: present, in ${record.time}${record.checkOutTime ? `, out ${record.checkOutTime}` : ""}` : date > today ? `${day}: upcoming` : `${day}: absent`;
      return `<span class="attendance-day ${status}" title="${label}" aria-label="${label}">${day}</span>`;
    }).join("");
    const todayRecord = trainerAttendanceRecord(state, trainer.id, today);
    const status = todayRecord ? todayRecord.checkOutTime ? `Checked out ${todayRecord.checkOutTime}` : `Checked in ${todayRecord.time}` : "Not marked today";
    return `<article class="attendance-member-row-card"><div class="attendance-row-head"><strong>${escapeAttribute(trainer.name)}</strong><span>${trainer.id} | ${status}</span></div><div class="attendance-calendar-grid">${cells}</div></article>`;
  }).join("");
  return `<div class="attendance-calendar-panel"><div class="attendance-calendar-head"><strong>${title}</strong><span><i class="legend present"></i>Present <i class="legend absent"></i>Absent</span></div>${rows || "<p>No trainers available.</p>"}</div>`;
}

function renderTrainerAttendanceHistory(state, trainerId) {
  const records = trainerAttendanceRecords(state, trainerId).slice(0, 10);
  if (!records.length) return `<div class="invoice-empty"><strong>No attendance recorded</strong><span>Your check-in history will appear here.</span></div>`;
  return `<div class="trainer-attendance-history"><h3>Recent attendance</h3><div class="attendance-history-cards">${records.map((record) => {
    const hours = record.checkOutAt && record.checkInAt ? `${((new Date(record.checkOutAt) - new Date(record.checkInAt)) / 3600000).toFixed(1)}h` : "Active";
    return `<article class="attendance-history-card"><div class="attendance-history-card-date"><span>DATE</span><strong>${record.date}</strong></div><div><span>CHECK IN</span><strong>${record.time}</strong></div><div><span>CHECK OUT</span><strong>${record.checkOutTime || "—"}</strong></div><div><span>HOURS</span><strong>${hours}</strong></div></article>`;
  }).join("")}</div></div>`;
}

function renderTrainerOwnAttendance(state) {
  const trainer = currentTrainer(state);
  if (!trainer) return "<p>Trainer profile unavailable.</p>";
  const record = trainerAttendanceRecord(state, trainer.id);
  const monthRecords = trainerAttendanceRecords(state, trainer.id).filter((item) => item.date.slice(0, 7) === todayDateKey().slice(0, 7));
  return `<div class="trainer-attendance-status ${record ? "is-present" : "is-absent"}"><div><span>Today's status</span><strong>${record ? record.checkOutTime ? "Shift completed" : "Present" : "Not checked in"}</strong><small>${record ? `Check-in ${record.time}${record.checkOutTime ? ` · Check-out ${record.checkOutTime}` : ""}` : "Mark your attendance when you arrive at the gym."}</small></div><div class="trainer-attendance-actions"><button type="button" data-action="trainerCheckIn" ${record ? "disabled" : ""}>Check in</button><button type="button" data-action="trainerCheckOut" ${!record || record.checkOutTime ? "disabled" : ""}>Check out</button></div></div><div class="trainer-attendance-kpis"><span><strong>${monthRecords.length}</strong><small>Present this month</small></span><span><strong>${Math.max(0, monthDates().filter((date) => date <= todayDateKey()).length - monthRecords.length)}</strong><small>Absent this month</small></span><span><strong>${monthRecords.filter((item) => item.checkOutTime).length}</strong><small>Completed shifts</small></span></div>${renderTrainerAttendanceCalendar(state, [trainer], "My Monthly Attendance")}${renderTrainerAttendanceHistory(state, trainer.id)}`;
}

function renderTrainerQrAttendance(state) {
  const trainer = currentTrainer(state);
  const attendanceUrl = `${dynamicAppOrigin}/attendance.html?trainerId=${encodeURIComponent(trainer.id)}`;
  const qrUrl = `${apiBaseUrl}/api/qr?trainerId=${encodeURIComponent(trainer.id)}`;
  return `<div class="trainer-qr-attendance"><a class="qr-card qr-card-link" href="${attendanceUrl}" aria-label="Open attendance check-in for ${trainer.name}"><img class="qr-image" src="${qrUrl}" alt="QR code for ${trainer.name} attendance"><strong>Scan for trainer check-in</strong><span>${trainer.id}</span></a><div><span>QR ATTENDANCE</span><h3>Scan at the gym entrance</h3><p>Use this personal trainer QR code to check in and check out through the attendance portal.</p><a class="wide-action attendance-open-link" href="${attendanceUrl}">Open Attendance Portal</a></div></div>`;
}

function calculateBmi(member) {
  const heightMeters = Number(member.height || 0) / 100;
  return heightMeters ? (Number(member.weight || 0) / (heightMeters * heightMeters)).toFixed(1) : "0.0";
}

function currentTrainer(state) {
  const user = currentUser() || fallbackUser("trainer");
  const trainerEmailMap = {
    "trainer@aigym.com": "T001"
  };
  return state.trainers.find((trainer) => trainer.id === trainerEmailMap[user.email]) || state.trainers[0];
}

function trainerMembers(state, trainer = currentTrainer(state)) {
  return state.members.filter((member) => member.trainerId === trainer?.id);
}

function trainerWorkouts(state, trainer = currentTrainer(state)) {
  const assignedIds = new Set(trainerMembers(state, trainer).map((member) => member.id));
  return state.workouts.filter((workout) => assignedIds.has(workout.memberId));
}

function renderMemberOptions(state, selectedId = "") {
  return state.members.map((member) => `
    <option value="${member.id}" ${member.id === selectedId ? "selected" : ""}>${member.name}</option>
  `).join("");
}

function renderTrainerMemberOptions(state, selectedId = "") {
  const assigned = trainerMembers(state);
  return assigned.map((member) => `
    <option value="${member.id}" ${member.id === selectedId ? "selected" : ""}>${member.name}</option>
  `).join("");
}

function renderTrainerOptions(state, selectedId = "") {
  return state.trainers.map((trainer) => `
    <option value="${trainer.id}" ${trainer.id === selectedId ? "selected" : ""}>${trainer.name}</option>
  `).join("");
}

function renderPlanOptions(state, selectedPlan = "") {
  return state.plans.map((plan) => `
    <option value="${plan.name}" ${plan.name === selectedPlan ? "selected" : ""}>${plan.name} - ${money(plan.price)}</option>
  `).join("");
}

function renderSubscriptionPanel(state, role) {
  const userMember = selectedMember(state);
  const cards = state.plans.map((plan) => `
    <button class="plan-option ${userMember.plan === plan.name ? "active" : ""}" data-plan="${plan.name}">
      <strong>${plan.name}</strong>
      <span>${money(plan.price)} / ${plan.duration || "month"}</span>
      <small>${plan.label}</small>
    </button>
  `).join("");

  const adminRows = state.subscriptions.map((sub) => `
    <tr>
      <td>${memberName(state, sub.memberId)}</td>
      <td>${sub.plan}</td>
      <td>${money(sub.amount)}</td>
      <td><span class="pill">${sub.status}</span></td>
    </tr>
  `).join("");

  if (role === "admin") {
    return `
      <div class="subscription-status">
        <strong>${money(totalRevenue(state))}</strong>
        <span>Monthly subscription revenue</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Member</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${adminRows}</tbody>
      </table>
    `;
  }

  return `
    <div class="subscription-status">
      <strong>${userMember.plan}</strong>
      <span>${userMember.status} membership</span>
    </div>
    <div class="plan-grid">${cards}</div>
  `;
}

function paymentQrUrl(member, plan, app) {
  return `${apiBaseUrl}/api/payment-qr?${new URLSearchParams({ memberId: member.id, plan: plan.name, amount: String(plan.price), app })}`;
}

function openPaymentPortal(state, member, plan) {
  document.querySelector("[data-payment-portal]")?.remove();
  const dialog = document.createElement("dialog");
  dialog.className = "member-payment-dialog";
  dialog.dataset.paymentPortal = "true";
  const paymentAction = member.plan === plan.name ? "Renew" : "Upgrade to";
  dialog.innerHTML = `
    <form class="member-payment-portal" data-payment-form>
      <header><div><span>SECURE PAYMENT PORTAL</span><h2>${paymentAction} ${plan.name}</h2><p>${money(plan.price)} · ${plan.duration} · ${plan.label}</p></div><button type="button" data-payment-close aria-label="Close payment portal">×</button></header>
      <div class="payment-step"><b>1</b><div><strong>Choose payment method</strong><small>Select card or a supported UPI application.</small></div></div>
      <div class="payment-method-tabs"><label><input type="radio" name="method" value="UPI" checked><span>📱 UPI</span></label><label><input type="radio" name="method" value="Credit Card"><span>💳 Credit Card</span></label></div>
      <section class="payment-mode-panel" data-payment-mode="UPI">
        <div class="upi-app-grid">
          <label><input type="radio" name="upiApp" value="Google Pay" checked><span><i class="upi-brand-logo gpay-logo" aria-hidden="true"><em></em><em></em><em></em><em></em></i><b>GPay</b></span></label>
          <label><input type="radio" name="upiApp" value="PhonePe"><span><i class="upi-brand-logo phonepe-logo" aria-hidden="true">पे</i><b>PhonePe</b></span></label>
          <label><input type="radio" name="upiApp" value="BHIM"><span><i class="upi-brand-logo bhim-logo" aria-hidden="true"><em></em><em></em><em></em></i><b>BHIM</b></span></label>
          <label><input type="radio" name="upiApp" value="Paytm"><span><i class="upi-brand-logo paytm-logo" aria-hidden="true"><em>pay</em><em>tm</em></i><b>Paytm</b></span></label>
        </div>
        <div class="payment-qr-box"><img data-payment-qr src="${paymentQrUrl(member, plan, "Google Pay")}" alt="UPI payment QR code"><div><strong>Scan and pay ${money(plan.price)}</strong><span>AI Gym · aigym@upi</span><small data-selected-upi>Using Google Pay</small></div></div>
        <label class="payment-field">UPI transaction / UTR number<input name="upiReference" inputmode="numeric" placeholder="Enter the 12-digit reference after payment"></label>
      </section>
      <section class="payment-mode-panel" data-payment-mode="Credit Card" hidden>
        <div class="card-payment-preview"><span>AI GYM</span><strong>•••• •••• •••• <i data-card-last-four>0000</i></strong><small><b data-card-name>MEMBER NAME</b><b>${plan.name.toUpperCase()}</b></small></div>
        <div class="card-field-grid"><label class="payment-field full">Name on card<input name="cardName" autocomplete="cc-name" placeholder="As printed on card"></label><label class="payment-field full">Card number<input name="cardNumber" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="1234 5678 9012 3456"></label><label class="payment-field">Expiry<input name="cardExpiry" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY"></label><label class="payment-field">CVV<input name="cardCvv" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="•••"></label><label class="payment-field full">Payment reference<input name="cardReference" placeholder="Transaction reference from your bank"></label></div>
        <p class="payment-security-note">🔒 Card details are never stored. Only the last four digits and bank reference are sent for admin verification.</p>
      </section>
      <div class="payment-step"><b>2</b><div><strong>Upload payment proof</strong><small>A payment screenshot is mandatory.</small></div></div>
      <label class="payment-proof-upload"><input type="file" name="proof" accept="image/png,image/jpeg,image/webp" required><span>📤 Choose payment screenshot</span><small data-proof-name>No screenshot selected</small></label>
      <label class="payment-confirm"><input type="checkbox" name="confirm" required><span>I confirm that I completed this payment and the details are accurate.</span></label>
      <p class="payment-form-error" data-payment-error role="alert"></p>
      <footer><button type="button" class="payment-cancel" data-payment-close>Cancel</button><button type="submit" class="payment-submit" disabled>Submit payment for verification</button></footer>
    </form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-payment-form]");
  const submit = form.querySelector(".payment-submit");
  const proof = form.elements.proof;
  const error = form.querySelector("[data-payment-error]");
  const updateSubmit = () => { submit.disabled = !proof.files?.length || !form.elements.confirm.checked; };
  const setMode = mode => form.querySelectorAll("[data-payment-mode]").forEach(panel => { panel.hidden = panel.dataset.paymentMode !== mode; });
  form.querySelectorAll('input[name="method"]').forEach(input => input.addEventListener("change", () => { setMode(input.value); error.textContent = ""; }));
  form.querySelectorAll('input[name="upiApp"]').forEach(input => input.addEventListener("change", () => { form.querySelector("[data-selected-upi]").textContent = `Using ${input.value}`; form.querySelector("[data-payment-qr]").src = paymentQrUrl(member, plan, input.value); }));
  proof.addEventListener("change", () => { form.querySelector("[data-proof-name]").textContent = proof.files?.[0]?.name || "No screenshot selected"; updateSubmit(); });
  form.elements.confirm.addEventListener("change", updateSubmit);
  form.elements.cardNumber.addEventListener("input", () => { const digits = form.elements.cardNumber.value.replace(/\D/g, "").slice(0, 16); form.elements.cardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim(); form.querySelector("[data-card-last-four]").textContent = digits.slice(-4).padStart(4, "0"); });
  form.elements.cardName.addEventListener("input", () => { form.querySelector("[data-card-name]").textContent = form.elements.cardName.value.toUpperCase() || "MEMBER NAME"; });
  dialog.querySelectorAll("[data-payment-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => dialog.remove(), { once:true });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const method = new FormData(form).get("method");
    if (!proof.files?.length) { error.textContent = "Upload the payment screenshot before submitting."; return; }
    let reference = "", provider = method, lastFour = "";
    if (method === "UPI") { provider = new FormData(form).get("upiApp"); reference = form.elements.upiReference.value.trim(); if (!/^\d{8,18}$/.test(reference)) { error.textContent = "Enter a valid 8–18 digit UPI transaction reference."; return; } }
    else { const digits = form.elements.cardNumber.value.replace(/\D/g, ""); reference = form.elements.cardReference.value.trim(); lastFour = digits.slice(-4); if (!form.elements.cardName.value.trim() || digits.length < 13 || !/^\d{2}\/\d{2}$/.test(form.elements.cardExpiry.value) || !/^\d{3,4}$/.test(form.elements.cardCvv.value) || reference.length < 4) { error.textContent = "Complete all card fields and enter the bank transaction reference."; return; } }
    submit.disabled = true; submit.textContent = "Uploading proof…";
    const paymentProof = await paymentProofToDataUrl(proof.files[0]);
    const freshState = loadState();
    let payment = freshState.payments.find(item => item.memberId === member.id);
    if (!payment) { payment = { memberId:member.id, invoice:`INV-${1001 + freshState.payments.length}` }; freshState.payments.unshift(payment); }
    Object.assign(payment, { amount:plan.price, status:"Under Review", requestedPlan:plan.name, method, provider, reference, lastFour, proof:paymentProof, proofName:proof.files[0].name, submittedAt:new Date().toISOString() });
    addActivity(freshState, `${member.name} submitted ${plan.name} payment via ${provider}`, "Payment review");
    saveState(freshState); dialog.close(); renderDashboard(); window.alert("Payment proof submitted. Your plan will activate after admin verification.");
  });
  dialog.showModal();
}

function renderPlanEditor(state) {
  return state.plans.map((plan, index) => `
    <form class="dashboard-form plan-edit-form" data-action="editPlan">
      <input type="hidden" name="index" value="${index}">
      <input type="hidden" name="oldName" value="${plan.name}">
      <label>Plan name<input name="name" value="${plan.name}" required></label>
      <label>Monthly price<input name="price" type="number" min="0" step="1" value="${plan.price}" required></label>
      <label>Description<input name="label" value="${plan.label}" required></label>
      <button type="submit">Update ${plan.name}</button>
    </form>
  `).join("");
}

function renderTrainerAllocation(state) {
  const trainerCards = state.trainers.map((trainer) => {
    const assignedCount = trainerMemberCount(state, trainer.id);
    const load = Math.min(100, Math.round((assignedCount / 8) * 100));

    return `
      <article class="allocation-trainer-card">
        <div>
          <strong>${trainer.name}</strong>
          <span>${trainer.specialty}</span>
        </div>
        <b>${assignedCount}</b>
        <div class="allocation-load" aria-label="${trainer.name} allocation load">
          <span style="width: ${load}%"></span>
        </div>
      </article>
    `;
  }).join("");

  return `
    <details class="action-subcard dropdown-card allocation-card">
      <summary>Trainer Allocation</summary>
      <div class="section-heading dropdown-heading">
        <div>
          <p>Assign members to the right trainer and keep workloads balanced.</p>
        </div>
        <span class="pill">${state.members.length} members</span>
      </div>
      <div class="allocation-layout">
        <form class="dashboard-form allocation-form" data-action="assignTrainer">
          <label>Member<select name="memberId">${renderMemberOptions(state)}</select></label>
          <label>Trainer<select name="trainerId">${renderTrainerOptions(state)}</select></label>
          <button type="submit">Allocate Trainer</button>
        </form>
        <div class="allocation-trainers">${trainerCards}</div>
      </div>
    </details>
  `;
}

function renderAdminMemberForm(state) {
  const rows = state.members.map((member) => `
    <li class="admin-manage-row">
      <span><strong>${member.name}</strong><small>${member.email} · ${trainerName(state, member.trainerId)}</small></span>
      <span class="admin-row-actions">
        <button class="pill pill-button" type="button" data-action="toggleMemberStatus" data-id="${member.id}">${member.status}</button>
        <button class="pill pill-button danger" type="button" data-action="removeMember" data-id="${member.id}">Remove</button>
      </span>
    </li>
  `).join("");

  return `
    <details class="action-subcard dropdown-card">
      <summary>Member Management</summary>
      <form class="dashboard-form" data-action="addMember">
        <label>Member name<input name="name" placeholder="Example: Kavin R." required></label>
        <label>Email<input name="email" type="email" placeholder="kavin@aigym.com" required></label>
        <label>Assign trainer<select name="trainerId">${renderTrainerOptions(state)}</select></label>
        <label>Subscription<select name="plan">${renderPlanOptions(state, "Basic")}</select></label>
        <button type="submit">Add Member</button>
      </form>
      <ul class="task-list compact-admin-list admin-manage-list">${rows || "<li>No members yet</li>"}</ul>
    </details>
  `;
}

function renderAdminTrainerForm(state) {
  const rows = state.trainers.map((trainer) => `
    <li class="admin-manage-row">
      <span><strong>${trainer.name}</strong><small>${trainer.specialty} · ${trainerMemberCount(state, trainer.id)} members</small></span>
      <button class="pill pill-button danger" type="button" data-action="removeTrainer" data-id="${trainer.id}">Remove</button>
    </li>
  `).join("");

  return `
    <details class="action-subcard dropdown-card">
      <summary>Trainer Management</summary>
      <form class="dashboard-form" data-action="addTrainer">
        <label>Trainer name<input name="name" placeholder="Example: Mark Benson" required></label>
        <label>Specialty<input name="specialty" placeholder="Strength / Yoga / Boxing" required></label>
        <button type="submit">Add Trainer</button>
      </form>
      <ul class="task-list compact-admin-list admin-manage-list">${rows || "<li>No trainers yet</li>"}</ul>
    </details>
  `;
}

function renderAdminShiftSummary(state) {
  const pendingWorkouts = state.workouts.filter((workout) => !workout.done).length;
  const equipmentCount = state.equipment.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const sessionCount = state.trainers.reduce((sum, trainer) => sum + Number(trainer.sessions || 0), 0);

  return `
    <article class="card compact-admin-card">
      <h2>Shift Summary</h2>
      <div class="admin-stat-grid shift-stat-grid">
        <span><strong>${sessionCount}</strong><small>Sessions today</small></span>
        <span><strong>${pendingWorkouts}</strong><small>Open workouts</small></span>
        <span><strong>${equipmentCount}</strong><small>Equipment units</small></span>
      </div>
      <ul class="task-list compact-admin-list">
        <li><span>Floor readiness</span><span class="pill">Ready</span></li>
        <li><span>Reception status</span><span class="pill">Open</span></li>
      </ul>
    </article>
  `;
}

function renderAdminActions(state) {
  return `
    <div class="admin-action-grid">
      ${renderTrainerAllocation(state)}
      <details class="action-subcard dropdown-card plan-editor-card">
        <summary>Edit Subscription Plans</summary>
        <div class="plan-editor-grid">${renderPlanEditor(state)}</div>
      </details>
    </div>
  `;
}

function renderAdminPlanEditor(state) {
  return `
    <details class="action-subcard dropdown-card plan-editor-card">
      <summary>Edit Subscription Plans</summary>
      <div class="plan-editor-grid">${renderPlanEditor(state)}</div>
    </details>
  `;
}

function renderAdminInsights(state) {
  const equipmentRows = state.equipment.map((item) => `
    <li>
      <span>${item.name} (${item.count})</span>
      <button class="pill pill-button" type="button" data-action="removeEquipment" data-id="${item.id}">Remove</button>
    </li>
  `).join("");

  return `
    <details class="card admin-insight-card dropdown-card">
      <summary>Gym Equipment</summary>
      <form class="dashboard-form equipment-form" data-action="addEquipment">
        <label>Equipment name<input name="name" placeholder="Example: Leg Press" required></label>
        <label>Quantity<input name="count" type="number" min="1" step="1" value="1" required></label>
        <button type="submit">Add Equipment</button>
      </form>
      <ul class="task-list compact-admin-list equipment-list">
        ${equipmentRows || "<li><span>No equipment added</span><span class=\"pill\">Empty</span></li>"}
      </ul>
    </details>
  `;
}

function renderAdminPaymentsPanel(state) {
  const paid = state.payments.filter((payment) => payment.status === "Paid").length;
  const pending = state.payments.filter((payment) => payment.status === "Pending").length;
  const partial = state.payments.filter((payment) => payment.status === "Partial").length;
  const underReview = state.payments.filter((payment) => payment.status === "Under Review").length;

  return `
    <article class="card admin-insight-card">
      <h2>Payment Management</h2>
      <ul class="task-list compact-admin-list">
        <li><span>Paid payments</span><strong>${paid}</strong></li>
        <li><span>Pending payments</span><strong>${pending}</strong></li>
        <li><span>Partial payments</span><strong>${partial}</strong></li>
        <li><span>Awaiting verification</span><strong>${underReview}</strong></li>
        <li><span>Invoice mode</span><strong>GST ready</strong></li>
        <li><span>Renewal action</span><strong>Enabled</strong></li>
      </ul>
      <div class="admin-payment-list">
        ${state.payments.map((payment) => `
          <form class="dashboard-form admin-payment-row" data-action="updatePayment">
            <input type="hidden" name="memberId" value="${payment.memberId}">
            <span class="admin-payment-detail"><strong>${memberName(state, payment.memberId)}</strong><small>${payment.invoice} · ${money(payment.amount)}${payment.requestedPlan ? ` · ${payment.requestedPlan}` : ""}</small>${payment.method ? `<small>${payment.method} · ${payment.provider || ""} · Ref ${payment.reference || "Not supplied"}${payment.lastFour ? ` · •••• ${payment.lastFour}` : ""}</small>` : ""}${payment.proof ? `<a href="${payment.proof}" target="_blank" rel="noopener"><img src="${payment.proof}" alt="Payment proof from ${escapeAttribute(memberName(state, payment.memberId))}">View uploaded proof</a>` : ""}</span>
            <select name="status" aria-label="Payment status for ${escapeAttribute(memberName(state, payment.memberId))}">
              ${["Under Review", "Paid", "Pending", "Partial", "Rejected"].map((status) => `<option ${payment.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
            <button type="submit">Save</button>
          </form>
        `).join("")}
      </div>
    </article>
  `;
}

function invoiceRecipient(state, invoice) {
  return invoice.recipientType === "trainer"
    ? state.trainers.find((item) => item.id === invoice.recipientId)
    : state.members.find((item) => item.id === invoice.recipientId);
}

function invoiceTotals(invoice) {
  const subtotal = (invoice.items || []).reduce((sum, item) => sum + Number(item.amount || 0) * Number(item.quantity || 1), 0);
  const discount = Math.max(0, Number(invoice.discount || 0));
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * Math.max(0, Number(invoice.taxRate || 0)) / 100;
  return { subtotal, discount, tax, total: taxable + tax };
}

function invoiceStatusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

function invoiceReportHtml(state, invoice, logoDataUrl = "") {
  const recipient = invoiceRecipient(state, invoice) || { name: "Recipient", email: "" };
  const totals = invoiceTotals(invoice);
  const rows = (invoice.items || []).map((item, index) => `<tr><td>${index + 1}</td><td>${escapeAttribute(item.description)}</td><td>${Number(item.quantity || 1)}</td><td>${money(item.amount)}</td><td>${money(Number(item.quantity || 1) * Number(item.amount || 0))}</td></tr>`).join("");
  const brand = logoDataUrl
    ? `<img class="invoice-logo" src="${logoDataUrl}" alt="AI Gym">`
    : `<div class="brand">AI GYM</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeAttribute(invoice.number)}</title><style>body{font:14px Arial;color:#2f2925;margin:42px}header{display:flex;justify-content:space-between;border-bottom:3px solid #ff7417;padding-bottom:22px}.brand{font-size:28px;font-weight:800;color:#ff7417}.invoice-brand{display:flex;flex-direction:column;align-items:flex-start}.invoice-logo{display:block;width:230px;height:86px;object-fit:contain;object-position:left center;margin:0 0 5px}.invoice-title{text-align:right}h1{margin:0;font-size:26px}.meta,.bill{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:28px 0}.box{padding:18px;border:1px solid #ddd;border-radius:12px}.box b{display:block;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{background:#fff2e8}.totals{width:340px;margin:24px 0 24px auto}.totals div{display:flex;justify-content:space-between;padding:8px}.totals .grand{font-size:18px;font-weight:800;border-top:2px solid #ff7417}.status{display:inline-block;padding:7px 12px;border-radius:20px;background:#fff2e8;color:#d85d0e;font-weight:700}.notes{margin-top:30px;padding:18px;background:#f7f6f4;border-radius:12px}footer{margin-top:50px;border-top:1px solid #ddd;padding-top:16px;color:#777}@media(max-width:650px){body{margin:20px}.invoice-logo{width:180px;height:68px}.meta{grid-template-columns:1fr}.totals{width:100%}}@media print{body{margin:20px}.print-help{display:none}}</style></head><body><header><div class="invoice-brand">${brand}<div>Fitness Management Portal</div></div><div class="invoice-title"><h1>TAX INVOICE</h1><p>${escapeAttribute(invoice.number)}</p><span class="status">${escapeAttribute(invoice.paymentStatus)}</span></div></header><section class="meta"><div class="box"><b>Bill To</b>${escapeAttribute(recipient.name)}<br>${escapeAttribute(recipient.email || `${invoice.recipientType} ${invoice.recipientId}`)}<br>Recipient ID: ${escapeAttribute(invoice.recipientId)}</div><div class="box"><b>Invoice Details</b>Issue date: ${escapeAttribute(invoice.issueDate)}<br>Due date: ${escapeAttribute(invoice.dueDate)}<br>Issued by: AI Gym Admin<br>Type: ${escapeAttribute(invoice.recipientType)}</div></section><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Subtotal</span><b>${money(totals.subtotal)}</b></div><div><span>Discount</span><b>- ${money(totals.discount)}</b></div><div><span>Tax (${Number(invoice.taxRate || 0)}%)</span><b>${money(totals.tax)}</b></div><div class="grand"><span>Total</span><b>${money(totals.total)}</b></div></section><section class="notes"><b>Notes & payment terms</b><p>${escapeAttribute(invoice.notes || "Payment is due by the date shown above.")}</p></section><footer>This invoice was generated and issued by the AI Gym administrator on ${escapeAttribute(invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString("en-IN") : invoice.issueDate)}.</footer></body></html>`;
}

async function downloadInvoice(state, invoice) {
  let logoDataUrl = "";
  try {
      const response = await fetch(`${apiBaseUrl}/assets/ai-gym-logo-4k.png`);
    if (!response.ok) throw new Error("Logo unavailable");
    const blob = await response.blob();
    logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_error) {}
  downloadTextFile(`${invoice.number}.html`, invoiceReportHtml(state, invoice, logoDataUrl), "text/html");
}

function renderInvoiceCards(state, invoices, admin = false) {
  if (!invoices.length) return `<div class="invoice-empty"><strong>No invoices available</strong><span>${admin ? "Create the first invoice using the form above." : "Invoices issued by the admin will appear here."}</span></div>`;
  return `<div class="invoice-list">${invoices.map((invoice) => {
    const recipient = invoiceRecipient(state, invoice);
    const total = invoiceTotals(invoice).total;
    return `<article class="invoice-card"><div><span>${escapeAttribute(invoice.number)}</span><strong>${escapeAttribute(recipient?.name || invoice.recipientId)}</strong><small>${escapeAttribute(invoice.issueDate)} · Due ${escapeAttribute(invoice.dueDate)}</small></div><div><strong>${money(total)}</strong><span class="invoice-status ${invoiceStatusClass(invoice.paymentStatus)}">${escapeAttribute(invoice.paymentStatus)}</span><small>${escapeAttribute(invoice.status)}</small></div><div class="invoice-actions"><button type="button" data-action="downloadInvoice" data-id="${escapeAttribute(invoice.id)}">Download report</button>${admin && invoice.status === "Draft" ? `<button type="button" data-action="issueInvoice" data-id="${escapeAttribute(invoice.id)}">Issue invoice</button>` : ""}${admin ? `<button type="button" data-action="toggleInvoicePayment" data-id="${escapeAttribute(invoice.id)}">Mark ${invoice.paymentStatus === "Paid" ? "unpaid" : "paid"}</button>` : ""}</div></article>`;
  }).join("")}</div>`;
}

function renderAdminInvoicesPanel(state) {
  const today = todayDateKey();
  const due = new Date(); due.setDate(due.getDate() + 7);
  const recipients = [
    ...state.members.map((item) => `<option value="member:${item.id}">Member · ${escapeAttribute(item.name)} (${item.id})</option>`),
    ...state.trainers.map((item) => `<option value="trainer:${item.id}">Trainer · ${escapeAttribute(item.name)} (${item.id})</option>`)
  ].join("");
  return `<article class="card admin-insight-card invoice-admin-card"><h2>Invoice Generation</h2><p>Create the invoice as a draft, verify the totals, then issue it to the selected trainer or member.</p><form class="dashboard-form invoice-form" data-action="createInvoice"><label>Recipient<select name="recipient" required>${recipients}</select></label><label>Issue date<input type="date" name="issueDate" value="${today}" required></label><label>Due date<input type="date" name="dueDate" value="${due.toISOString().slice(0, 10)}" required></label><label class="invoice-wide">Service / item description<input name="description" placeholder="Membership fee, trainer payout, personal training package..." required></label><label>Quantity<input type="number" name="quantity" min="1" value="1" required></label><label>Rate (INR)<input type="number" name="amount" min="0" step="0.01" required></label><label>Discount (INR)<input type="number" name="discount" min="0" step="0.01" value="0"></label><label>Tax rate (%)<input type="number" name="taxRate" min="0" max="100" step="0.01" value="18"></label><label>Payment status<select name="paymentStatus"><option>Unpaid</option><option>Paid</option><option>Partial</option></select></label><label class="invoice-wide">Notes / payment terms<textarea name="notes" rows="3" placeholder="Payment instructions, service period, GST details, or internal reference"></textarea></label><button type="submit">Create draft invoice</button></form>${renderInvoiceCards(state, [...state.invoices].reverse(), true)}</article>`;
}

function recipientInvoices(state, type, id) {
  return state.invoices.filter((invoice) => invoice.status === "Issued" && invoice.recipientType === type && invoice.recipientId === id).reverse();
}

function renderAdminLibrariesPanel(state) {
  return `
    <article class="card admin-insight-card">
      <h2>Plan Libraries</h2>
      <form class="dashboard-form library-add-form" data-action="addTemplate">
        <label>Library<select name="library"><option value="dietTemplates">Diet</option><option value="workoutTemplates">Workout</option></select></label>
        <label>Template name<input name="name" placeholder="Example: Beginner Mobility" required></label>
        <button type="submit">Add Template</button>
      </form>
      <div class="library-stack">
        <section>
          <h3>Diet Plan Library</h3>
          <div class="tag-cloud editable-tags">${state.dietTemplates.map((item) => `<span>${item}<button type="button" data-action="removeTemplate" data-library="dietTemplates" data-name="${escapeAttribute(item)}" aria-label="Remove ${escapeAttribute(item)}">×</button></span>`).join("")}</div>
        </section>
        <section>
          <h3>Workout Library</h3>
          <div class="tag-cloud editable-tags">${state.workoutTemplates.map((item) => `<span>${item}<button type="button" data-action="removeTemplate" data-library="workoutTemplates" data-name="${escapeAttribute(item)}" aria-label="Remove ${escapeAttribute(item)}">×</button></span>`).join("")}</div>
        </section>
      </div>
    </article>
  `;
}

function renderAdminAiReportsPanel(state) {
  const attendanceTotal = state.members.reduce((sum, member) => sum + Number(member.attendance || 0), 0);
  const inactive = state.members.filter((member) => Number(member.attendance || 0) < 8).length;
  const busyTrainer = [...state.trainers].sort((a, b) => trainerMemberCount(state, b.id) - trainerMemberCount(state, a.id))[0];

  return `
    <article class="card admin-insight-card">
      <h2>AI Reports</h2>
      <ul class="task-list compact-admin-list">
        <li><span>Revenue graph</span><strong>${money(totalRevenue(state))}</strong></li>
        <li><span>Membership trends</span><strong>${activeMembers(state)} active</strong></li>
        <li><span>Peak gym hours</span><strong>6 PM - 8 PM</strong></li>
        <li><span>Attendance heatmap</span><strong>${attendanceTotal} visits</strong></li>
        <li><span>Inactive members</span><strong>${inactive}</strong></li>
        <li><span>Busy trainer</span><strong>${busyTrainer?.name || "Clear"}</strong></li>
      </ul>
      <div class="member-action-grid admin-report-actions">
        <button class="wide-action" type="button" data-action="exportMembersCsv">Export members CSV</button>
        <button class="wide-action" type="button" data-action="exportPaymentsCsv">Export payments CSV</button>
      </div>
    </article>
  `;
}

function renderAdminDatabasePanel() {
  const tables = ["Users", "Roles", "Members", "Trainers", "MembershipPlans", "MemberMembership", "Payments", "Attendance", "WorkoutPlans", "WorkoutAssignments", "DietPlans", "ProgressTracking", "Equipment", "Announcements", "Notifications", "Invoices", "Feedback", "ExerciseLibrary", "FoodLibrary"];

  return `
    <article class="card admin-insight-card">
      <h2>System Flow</h2>
      <ol class="flow-list">
        <li>Admin creates membership</li>
        <li>Assigns trainer</li>
        <li>Member makes payment</li>
        <li>Workout and diet assigned</li>
        <li>Attendance and renewal tracked</li>
      </ol>
      <div class="tag-cloud database-tags">${tables.map((table) => `<span>${table}</span>`).join("")}</div>
      <div class="member-action-grid admin-backup-actions">
        <button class="wide-action" type="button" data-action="exportAdminData">Download backup</button>
        <button class="wide-action danger-action" type="button" data-action="resetAdminData">Reset demo data</button>
      </div>
      <form class="dashboard-form backup-import-form" data-action="importBackup">
        <label>Restore JSON backup<input type="file" name="backup" accept="application/json,.json" required></label>
        <button type="submit">Restore Backup</button>
      </form>
    </article>
  `;
}

function renderAdminWatch(state) {
  const busiestTrainer = state.trainers
    .map((trainer) => ({ ...trainer, members: trainerMemberCount(state, trainer.id) }))
    .sort((a, b) => b.members - a.members)[0];
  const nextRenewal = state.subscriptions.find((subscription) => subscription.status !== "Active");

  return `
    <article class="card admin-insight-card">
      <h2>Admin Watch</h2>
      <div class="watch-summary">
        <strong>${busiestTrainer?.name || "No trainer"}</strong>
        <span>${busiestTrainer?.members || 0} assigned members</span>
      </div>
      <ul class="task-list compact-admin-list">
        <li><span>Renewal queue</span><span class="pill">${pendingRenewals(state)}</span></li>
        <li><span>${nextRenewal ? memberName(state, nextRenewal.memberId) : "No pending renewal"}</span><span class="pill">${nextRenewal?.status || "Clear"}</span></li>
      </ul>
    </article>
  `;
}

function renderAdminAttendancePanel(state) {
  const selectedMember = state.members.find((member) => member.id === adminAttendanceMemberId) || state.members[0];
  const selectedTrainer = state.trainers.find((trainer) => trainer.id === adminAttendanceTrainerId) || state.trainers[0];
  const selectedMembers = selectedMember ? [selectedMember] : [];
  if (selectedMember) adminAttendanceMemberId = selectedMember.id;
  if (selectedTrainer) adminAttendanceTrainerId = selectedTrainer.id;
  const trainerRecord = selectedTrainer ? trainerAttendanceRecord(state, selectedTrainer.id) : null;
  return `
    <article class="card admin-insight-card attendance-wide-card">
      <h2>Member Attendance</h2>
      <div class="dashboard-form admin-attendance-filter">
        <label>Member<select data-admin-attendance-member>${renderMemberOptions(state, selectedMember?.id)}</select></label>
      </div>
      ${selectedMember ? `<div class="admin-attendance-member-details">
        <span><small>Member ID</small><strong>${selectedMember.id}</strong></span>
        <span><small>Email</small><strong>${selectedMember.email}</strong></span>
        <span><small>Plan</small><strong>${selectedMember.plan}</strong></span>
        <span><small>Status</small><strong>${selectedMember.status}</strong></span>
        <span><small>Trainer</small><strong>${trainerName(state, selectedMember.trainerId)}</strong></span>
        <span><small>Attendance</small><strong>${selectedMember.attendance} days</strong></span>
      </div>` : ""}
      ${renderAttendanceSummary(state, selectedMembers)}
      ${renderAttendanceCalendar(state, selectedMembers, selectedMember ? `${selectedMember.name} Attendance` : "Member Attendance")}
    </article>
    <article class="card admin-insight-card attendance-wide-card admin-trainer-attendance-card">
      <div class="admin-attendance-title"><div><h2>Trainer Attendance</h2><p>Record and review trainer shifts independently from member attendance.</p></div><span class="invoice-status ${trainerRecord ? "paid" : "unpaid"}">${trainerRecord ? trainerRecord.checkOutTime ? "Shift completed" : "Present" : "Absent"}</span></div>
      <form class="dashboard-form admin-trainer-attendance-form" data-action="adminTrainerAttendance">
        <label>Trainer<select name="trainerId" data-admin-attendance-trainer>${renderTrainerOptions(state, selectedTrainer?.id)}</select></label>
        <label>Action<select name="attendanceAction"><option value="checkIn" ${trainerRecord ? "disabled" : ""}>Check in</option><option value="checkOut" ${!trainerRecord || trainerRecord.checkOutTime ? "disabled" : ""}>Check out</option></select></label>
        <button type="submit" ${trainerRecord?.checkOutTime ? "disabled" : ""}>Update attendance</button>
      </form>
      ${selectedTrainer ? `<div class="admin-attendance-member-details"><span><small>Trainer ID</small><strong>${selectedTrainer.id}</strong></span><span><small>Name</small><strong>${escapeAttribute(selectedTrainer.name)}</strong></span><span><small>Specialty</small><strong>${escapeAttribute(selectedTrainer.specialty)}</strong></span><span><small>Today</small><strong>${trainerRecord ? trainerRecord.checkOutTime ? `${trainerRecord.time} – ${trainerRecord.checkOutTime}` : `In ${trainerRecord.time}` : "Not marked"}</strong></span></div>` : ""}
      ${renderTrainerAttendanceCalendar(state, state.trainers, "All Trainer Attendance")}
      ${selectedTrainer ? renderTrainerAttendanceHistory(state, selectedTrainer.id) : ""}
    </article>
  `;
}

function renderTrainerActions(state) {
  const options = renderTrainerMemberOptions(state);
  if (!options) {
    return "<p>No members are assigned to you yet. Ask the admin to allocate members before assigning workouts.</p>";
  }

  return `
    <div class="trainer-tool-grid">
      <section class="action-subcard trainer-tool-panel">
        <h3>Assign Workout</h3>
        <form class="dashboard-form trainer-action-form" data-action="assignWorkout">
          <label>Assigned member<select name="memberId">${options}</select></label>
          <label>Workout title<input name="title" placeholder="Example: Leg strength block" required></label>
          <label>Tag<input name="tag" placeholder="45 min / Diet / Recovery" required></label>
          <button type="submit">Assign Workout</button>
        </form>
      </section>
      <section class="action-subcard trainer-tool-panel">
        <h3>Complete Session</h3>
        <form class="dashboard-form trainer-action-form" data-action="completeSession">
          <label>Session member<select name="memberId">${options}</select></label>
          <label>Session note<input name="note" placeholder="Example: Form check + progressive overload"></label>
          <button type="submit">Complete Coaching Session</button>
        </form>
      </section>
    </div>
  `;
}

function renderTrainerAssignForm(state) {
  const options = renderTrainerMemberOptions(state);
  if (!options) {
    return "<p>No members are assigned to you yet. Ask the admin to allocate members before assigning workouts.</p>";
  }

  return `
    <form class="dashboard-form trainer-action-form" data-action="assignWorkout">
      <label>Assigned member<select name="memberId">${options}</select></label>
      <label>Workout title<input name="title" placeholder="Example: Leg strength block" required></label>
      <label>Tag<input name="tag" placeholder="45 min / Diet / Recovery" required></label>
      <button type="submit">Assign Workout</button>
    </form>
  `;
}

function renderTrainerCompleteForm(state) {
  const options = renderTrainerMemberOptions(state);
  if (!options) {
    return "<p>No members are assigned to you yet.</p>";
  }

  return `
    <form class="dashboard-form trainer-action-form" data-action="completeSession">
      <label>Session member<select name="memberId">${options}</select></label>
      <label>Session note<input name="note" placeholder="Example: Form check + progressive overload"></label>
      <button type="submit">Complete Coaching Session</button>
    </form>
  `;
}

function renderTrainerMembersPanel(state) {
  const assigned = trainerMembers(state);

  if (!assigned.length) {
    return "<p>No members are currently assigned to you.</p>";
  }

  return `
    <ul class="task-list trainer-member-list">
      <li class="trainer-member-header" aria-hidden="true">
        <span>Member</span>
        <span>Progress</span>
        <span>Attendance</span>
        <span>Open work</span>
      </li>
      ${assigned.map((member) => {
        const openWorkouts = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done).length;
        return `
          <li class="trainer-member-row">
            <span class="member-identity">
              <strong>${member.name}</strong>
              <small>${member.email}</small>
            </span>
            <span>
              <strong>${member.progress}%</strong>
              <i class="progress-track"><b style="width: ${member.progress}%"></b></i>
            </span>
            <span>${member.attendance} days</span>
            <span><span class="pill">${openWorkouts}</span></span>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderTrainerFocusPanel(state) {
  const trainer = currentTrainer(state);
  const assigned = trainerMembers(state, trainer);
  const openWorkouts = trainerWorkouts(state, trainer).filter((workout) => !workout.done);
  const lowestProgress = [...assigned].sort((a, b) => a.progress - b.progress)[0];

  return `
    <div class="subscription-status">
      <strong>${trainer.name}</strong>
      <span>${trainer.specialty} coach</span>
    </div>
    <ul class="task-list compact-admin-list coach-focus-list">
      <li><span>Members to coach</span><strong>${assigned.length}</strong></li>
      <li><span>Open workout plans</span><strong>${openWorkouts.length}</strong></li>
      <li><span>Priority follow-up</span><strong>${lowestProgress?.name || "Clear"}</strong></li>
    </ul>
  `;
}

function renderTrainerDietPanel(state) {
  const member = trainerMembers(state)[0];

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Selected member</span><strong>${member?.name || "No member"}</strong></li>
      <li><span>Breakfast</span><strong>Oats + eggs</strong></li>
      <li><span>Lunch</span><strong>Rice + protein</strong></li>
      <li><span>Dinner</span><strong>Lean meal</strong></li>
      <li><span>Snacks</span><strong>Fruit + whey</strong></li>
      <li><span>Water intake</span><strong>${member?.waterTarget || 3}L</strong></li>
    </ul>
  `;
}

function renderTrainerProgressPanel(state) {
  const assigned = trainerMembers(state);
  const member = [...assigned].sort((a, b) => a.progress - b.progress)[0];

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Priority member</span><strong>${member?.name || "Clear"}</strong></li>
      <li><span>Weight</span><strong>${member?.weight || 0}kg</strong></li>
      <li><span>BMI</span><strong>${member ? calculateBmi(member) : "0.0"}</strong></li>
      <li><span>Body fat</span><strong>${member?.bodyFat || 0}%</strong></li>
      <li><span>Muscle mass</span><strong>${member?.muscleMass || 0}kg</strong></li>
      <li><span>Photos</span><strong>Before / After ready</strong></li>
    </ul>
  `;
}

function renderTrainerAttendancePanel(state) {
  const trainer = currentTrainer(state);
  const assigned = trainerMembers(state, trainer);

  return `
    <div class="member-info-card">
      <strong>${trainer.name}</strong>
      <span>Assigned member attendance visible here</span>
    </div>
    ${renderAttendanceSummary(state, assigned)}
    ${renderAttendanceCalendar(state, assigned, "Assigned Members")}
  `;
}

function renderTrainerMessagesPanel(state) {
  const assigned = trainerMembers(state);

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Member messages</span><strong>${assigned.length}</strong></li>
      <li><span>Arun Kumar</span><strong>Form check request</strong></li>
      <li><span>Gym desk</span><strong>New assessment slot</strong></li>
      <li><span>AI reminder</span><strong>Review inactive members</strong></li>
    </ul>
  `;
}

const dailyWorkoutPlans = [
  {
    title: "Lower Body Strength",
    focus: "Quads, glutes, hamstrings and calves",
    duration: "55 min",
    intensity: "Strength",
    warmup: "5 min cycle + hip, ankle and squat mobility",
    cooldown: "Slow walk, quad stretch and hamstring breathing",
    exercises: [
      { name: "Barbell Back Squat", videoId: "9y30h-HgAP8", sets: "4", reps: "6-8", rest: "120 sec", muscles: "Quads · glutes · core", steps: ["Set the bar across the upper back and brace before unracking.", "Sit between the hips while keeping the knees in line with the toes.", "Drive the floor away and finish tall without overextending the back."], avoid: "Do not let the knees collapse inward or the heels lift." },
      { name: "Romanian Deadlift", videoId: "JCXUYuzwNrM", sets: "4", reps: "8-10", rest: "90 sec", muscles: "Hamstrings · glutes · back", steps: ["Hold the bar close to the thighs with soft knees.", "Push the hips backward while keeping the spine long and ribs down.", "Stop when the hamstrings are loaded, then squeeze the glutes to stand."], avoid: "Do not turn it into a squat or let the bar drift forward." },
      { name: "Walking Lunge", videoId: "D7KaRcUTQeE", sets: "3", reps: "10 each leg", rest: "75 sec", muscles: "Glutes · quads · balance", steps: ["Step far enough forward to keep the front heel planted.", "Lower both knees under control with an upright torso.", "Push through the whole front foot and move directly into the next step."], avoid: "Avoid a narrow walking line and uncontrolled knee contact." },
      { name: "Standing Calf Raise", videoId: "gwLzBJYoWlI", sets: "4", reps: "12-15", rest: "60 sec", muscles: "Calves · ankle stability", steps: ["Place the balls of the feet securely on the platform.", "Lower the heels slowly to a comfortable stretch.", "Rise as high as possible, pause, then lower for two seconds."], avoid: "Do not bounce or roll the ankles outward." }
    ]
  },
  {
    title: "Push Power",
    focus: "Chest, shoulders and triceps",
    duration: "50 min",
    intensity: "Hypertrophy",
    warmup: "Band pull-aparts, shoulder circles and two light press sets",
    cooldown: "Doorway chest stretch and relaxed shoulder mobility",
    exercises: [
      { name: "Barbell Bench Press", videoId: "rT7DgCr-3pg", sets: "4", reps: "6-8", rest: "120 sec", muscles: "Chest · triceps · shoulders", steps: ["Plant the feet and pull the shoulder blades down and back.", "Lower the bar to the lower chest with stacked wrists.", "Press up and slightly back while keeping the upper back tight."], avoid: "Do not flare the elbows to 90 degrees or bounce the bar." },
      { name: "Dumbbell Shoulder Press", videoId: "GFblCmuEE18", sets: "3", reps: "8-10", rest: "90 sec", muscles: "Shoulders · triceps", steps: ["Sit tall with the ribs stacked over the pelvis.", "Start with forearms vertical and elbows slightly forward.", "Press overhead without shrugging, then lower under control."], avoid: "Avoid arching the lower back to finish the rep." },
      { name: "Incline Dumbbell Press", videoId: "8iPEnn-ltC8", sets: "3", reps: "10-12", rest: "75 sec", muscles: "Upper chest · shoulders", steps: ["Set the bench to a low incline and retract the shoulder blades.", "Lower the dumbbells beside the upper chest.", "Press upward while keeping the wrists over the elbows."], avoid: "Do not use an excessively steep bench angle." },
      { name: "Cable Triceps Pushdown", videoId: "2-LAMcpzODU", sets: "3", reps: "12-15", rest: "60 sec", muscles: "Triceps", steps: ["Pin the elbows beside the ribs and stand tall.", "Extend the elbows until the arms are straight.", "Pause briefly, then return without moving the upper arms."], avoid: "Do not swing the torso or let the elbows travel forward." }
    ]
  },
  {
    title: "Pull and Posture",
    focus: "Back, rear shoulders and biceps",
    duration: "50 min",
    intensity: "Controlled strength",
    warmup: "Scapular pull-downs, band rows and thoracic rotations",
    cooldown: "Lat stretch, forearm stretch and slow nasal breathing",
    exercises: [
      { name: "Lat Pulldown", videoId: "CAwf7n6Luuc", sets: "4", reps: "8-10", rest: "90 sec", muscles: "Lats · upper back · biceps", steps: ["Grip just outside shoulder width and brace the torso.", "Drive the elbows down toward the pockets.", "Pause near the upper chest, then return to a full controlled stretch."], avoid: "Do not swing backward or pull the bar behind the neck." },
      { name: "Seated Cable Row", videoId: "GZbfZ033f74", sets: "4", reps: "10-12", rest: "90 sec", muscles: "Mid-back · lats · biceps", steps: ["Sit tall with a neutral spine and soft knees.", "Pull the handle toward the lower ribs by driving the elbows back.", "Squeeze the shoulder blades, then reach forward without rounding."], avoid: "Avoid using torso momentum to complete each rep." },
      { name: "Face Pull", videoId: "rep-qVOkqgk", sets: "3", reps: "12-15", rest: "60 sec", muscles: "Rear delts · rotator cuff", steps: ["Set the rope around face height and use a neutral stance.", "Pull toward the eyebrows while separating the rope ends.", "Finish with the hands beside the ears and shoulder blades controlled."], avoid: "Do not shrug or turn the movement into a low row." },
      { name: "Dumbbell Biceps Curl", videoId: "iui51E31sX8", sets: "3", reps: "10-12", rest: "60 sec", muscles: "Biceps · forearms", steps: ["Stand tall with the upper arms beside the torso.", "Curl without moving the elbows forward.", "Squeeze at the top and lower for two to three seconds."], avoid: "Do not swing the hips or drop the weight quickly." }
    ]
  },
  {
    title: "Leg Development",
    focus: "Quads, glutes and hamstrings",
    duration: "55 min",
    intensity: "Volume",
    warmup: "8 min incline walk + knee and hip mobility",
    cooldown: "Easy cycle and lower-body stretches",
    exercises: [
      { name: "Leg Press", videoId: "IZxyjW7MPJQ", sets: "4", reps: "10-12", rest: "90 sec", muscles: "Quads · glutes", steps: ["Set the feet shoulder width and keep the whole foot on the platform.", "Lower until the hips remain firmly against the pad.", "Press evenly through both feet without locking the knees."], avoid: "Do not allow the lower back to curl away from the pad." },
      { name: "Bulgarian Split Squat", videoId: "2C-uNgKwPLE", sets: "3", reps: "8 each leg", rest: "90 sec", muscles: "Glutes · quads · balance", steps: ["Place the rear foot on a bench and establish a stable front-foot position.", "Lower the rear knee while the front knee tracks over the toes.", "Drive through the front foot and keep the pelvis level."], avoid: "Do not push primarily from the elevated rear leg." },
      { name: "Leg Extension", videoId: "YyvSfVjQeL0", sets: "3", reps: "12-15", rest: "60 sec", muscles: "Quadriceps", steps: ["Align the machine pivot with the knee joint.", "Extend smoothly and pause with the quads contracted.", "Lower slowly without letting the weight stack crash."], avoid: "Avoid kicking explosively or lifting the hips from the seat." },
      { name: "Lying Leg Curl", videoId: "1Tq3QdYUuHs", sets: "3", reps: "10-12", rest: "60 sec", muscles: "Hamstrings", steps: ["Align the knees with the machine pivot and brace the abdomen.", "Curl the pad toward the glutes without lifting the hips.", "Pause, then return through a complete controlled range."], avoid: "Do not arch the back or shorten the lowering phase." }
    ]
  },
  {
    title: "Core and Conditioning",
    focus: "Core control, stability and work capacity",
    duration: "38 min",
    intensity: "Conditioning",
    warmup: "Marching, trunk rotations and controlled breathing",
    cooldown: "Child's pose and five slow diaphragmatic breaths",
    exercises: [
      { name: "Front Plank", videoId: "pSHjTRCQxIw", sets: "3", reps: "30-45 sec", rest: "45 sec", muscles: "Core · glutes · shoulders", steps: ["Place the elbows under the shoulders and extend the legs.", "Squeeze the glutes and gently tuck the pelvis.", "Push the floor away and breathe without losing the straight line."], avoid: "Do not let the hips sag or hold the breath." },
      { name: "Dead Bug", videoId: "5qah1cTaJCk", sets: "3", reps: "8 each side", rest: "45 sec", muscles: "Deep core · coordination", steps: ["Lie down with hips and knees at 90 degrees.", "Exhale and keep the lower back gently connected to the floor.", "Extend opposite arm and leg slowly, then return without shifting the trunk."], avoid: "Stop the range before the lower back arches." },
      { name: "Mountain Climber", videoId: "nmwgirgXLYM", sets: "4", reps: "30 sec", rest: "30 sec", muscles: "Core · shoulders · cardio", steps: ["Start in a strong high-plank position.", "Drive one knee forward while the hips remain level.", "Switch feet rhythmically and keep the shoulders over the hands."], avoid: "Do not bounce the hips high or shorten the plank position." },
      { name: "Hanging Leg Raise", videoId: "Pr1ieGZ5atk", sets: "3", reps: "8-12", rest: "75 sec", muscles: "Abs · hip flexors · grip", steps: ["Hang actively with the shoulders pulled away from the ears.", "Curl the pelvis and raise the legs without swinging.", "Lower slowly until the body is stable before the next rep."], avoid: "Do not use momentum or lose shoulder control." }
    ]
  },
  {
    title: "Upper Body Athletic",
    focus: "Balanced pushing, pulling and shoulder control",
    duration: "45 min",
    intensity: "Athletic",
    warmup: "Band mobility, scapular push-ups and light rows",
    cooldown: "Chest, lat and shoulder stretches",
    exercises: [
      { name: "Pull-Up", videoId: "eGo4IYlbE5g", sets: "4", reps: "5-8", rest: "120 sec", muscles: "Back · biceps · core", steps: ["Start from an active hang with ribs controlled.", "Drive the elbows down and lift the chest toward the bar.", "Lower to full arm extension without losing shoulder tension."], avoid: "Do not kick, swing or crane the neck over the bar." },
      { name: "Push-Up", videoId: "IJ0TjnWX7CQ", sets: "4", reps: "10-15", rest: "75 sec", muscles: "Chest · triceps · core", steps: ["Set the hands slightly wider than the shoulders.", "Lower the chest while keeping head, hips and heels aligned.", "Press the floor away and finish with controlled shoulder blades."], avoid: "Do not flare the elbows or let the hips drop." },
      { name: "One-Arm Dumbbell Row", videoId: "pYcpY20QaE8", sets: "3", reps: "10 each side", rest: "75 sec", muscles: "Lats · mid-back · biceps", steps: ["Brace on the bench and keep the spine long.", "Pull the elbow toward the hip without rotating the torso.", "Lower until the shoulder blade moves forward under control."], avoid: "Avoid shrugging or twisting to lift a heavier dumbbell." },
      { name: "Dumbbell Lateral Raise", videoId: "Kl3LEzQ5Zqs", sets: "3", reps: "12-15", rest: "60 sec", muscles: "Side delts", steps: ["Hold the dumbbells with soft elbows and relaxed traps.", "Raise in the scapular plane until roughly shoulder height.", "Lead with the elbows and lower slowly."], avoid: "Do not swing or lift the hands far above the elbows." }
    ]
  },
  {
    title: "Recovery and Mobility",
    focus: "Joint mobility, tissue recovery and breathing",
    duration: "30 min",
    intensity: "Recovery",
    warmup: "Five-minute relaxed walk",
    cooldown: "Two minutes of slow nasal breathing",
    exercises: [
      { name: "Cat-Cow Mobility", videoId: "kqnua4rHVVA", sets: "2", reps: "8 slow cycles", rest: "30 sec", muscles: "Spine · core", steps: ["Start on all fours with hands under shoulders.", "Exhale while rounding the spine from pelvis to neck.", "Inhale while extending gently without forcing the lower back."], avoid: "Move segment by segment instead of rushing." },
      { name: "Hip Flexor Stretch", videoId: "7bRaX6M2nr8", sets: "2", reps: "30 sec each", rest: "20 sec", muscles: "Hip flexors · quads", steps: ["Take a half-kneeling stance and square the hips.", "Tuck the pelvis slightly before moving forward.", "Reach the same-side arm upward while breathing slowly."], avoid: "Do not arch the lower back to create more range." },
      { name: "Hamstring Stretch", videoId: "FDwpEdxZ4H4", sets: "2", reps: "30 sec each", rest: "20 sec", muscles: "Hamstrings · calves", steps: ["Extend one leg while keeping a soft knee.", "Hinge forward from the hips with a long spine.", "Hold a mild stretch and breathe instead of bouncing."], avoid: "Do not force the knee straight or round aggressively." },
      { name: "Child's Pose", videoId: "2MJGg-dUKh0", sets: "2", reps: "45 sec", rest: "20 sec", muscles: "Back · shoulders · hips", steps: ["Sit the hips toward the heels with knees comfortable.", "Reach the arms forward and relax the forehead.", "Breathe into the sides and back of the rib cage."], avoid: "Use support if the knees or shoulders feel compressed." }
    ]
  }
];

function dailyWorkoutDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todaysWorkoutPlan(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return dailyWorkoutPlans[((dayNumber % dailyWorkoutPlans.length) + dailyWorkoutPlans.length) % dailyWorkoutPlans.length];
}

function dailyWorkoutStorageKey(member) {
  return `aiGymDailyWorkout:${member.id}:${dailyWorkoutDateKey()}`;
}

function completedDailyExercises(member) {
  try {
    const saved = JSON.parse(localStorage.getItem(dailyWorkoutStorageKey(member)) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (_error) {
    return [];
  }
}

function exerciseMotionType(name) {
  const value = name.toLowerCase();
  if (value.includes("lateral raise")) return "lateral";
  if (value.includes("biceps curl")) return "curl";
  if (value.includes("pushdown")) return "pushdown";
  if (value.includes("face pull")) return "facepull";
  if (value.includes("squat") || value.includes("leg press") || value.includes("leg extension") || value.includes("leg curl")) return "squat";
  if (value.includes("deadlift") || value.includes("hamstring stretch")) return "hinge";
  if (value.includes("lunge") || value.includes("split squat")) return "lunge";
  if (value.includes("calf")) return "calf";
  if (value.includes("bench") || value.includes("shoulder press") || value.includes("incline") || value.includes("push-up")) return "press";
  if (value.includes("pull-up") || value.includes("pulldown") || value.includes("hanging")) return "pull";
  if (value.includes("row") || value.includes("face pull") || value.includes("curl") || value.includes("pushdown") || value.includes("lateral raise")) return "row";
  if (value.includes("plank") || value.includes("dead bug") || value.includes("mountain climber")) return "floor";
  return "mobility";
}

function exerciseDemoFrames(name) {
  const demos = {
    "barbell back squat": ["barbell-back-squat-start.png", "barbell-back-squat-end.png"],
    "romanian deadlift": ["romanian-deadlift-start.png", "romanian-deadlift-end.png"],
    "walking lunge": ["walking-lunge-start.png", "walking-lunge-end.png"],
    "standing calf raise": ["standing-calf-raise-start.png", "standing-calf-raise-end.png"],
    "barbell bench press": ["barbell-bench-press-start.png", "barbell-bench-press-end.png"],
    "dumbbell shoulder press": ["dumbbell-shoulder-press-start.png", "dumbbell-shoulder-press-end.png"],
    "incline dumbbell press": ["incline-dumbbell-press-start.png", "incline-dumbbell-press-end.png"],
    "cable triceps pushdown": ["cable-triceps-pushdown-start.png", "cable-triceps-pushdown-end.png"],
    "lat pulldown": ["lat-pulldown-start.png", "lat-pulldown-end.png"],
    "seated cable row": ["seated-cable-row-start.png", "seated-cable-row-end.png"],
    "face pull": ["face-pull-start.png", "face-pull-end.png"],
    "dumbbell biceps curl": ["dumbbell-biceps-curl-start.png", "dumbbell-biceps-curl-end.png"],
    "leg press": ["leg-press-start.png", "leg-press-end.png"],
    "bulgarian split squat": ["bulgarian-split-squat-start.png", "bulgarian-split-squat-end.png"],
    "leg extension": ["leg-extension-start.png", "leg-extension-end.png"],
    "lying leg curl": ["lying-leg-curl-start.png", "lying-leg-curl-end.png"],
    "front plank": ["front-plank-start.png", "front-plank-end.png"],
    "dead bug": ["dead-bug-start.png", "dead-bug-end.png"],
    "mountain climber": ["mountain-climber-start.png", "mountain-climber-end.png"],
    "hanging leg raise": ["hanging-leg-raise-start.png", "hanging-leg-raise-end.png"],
    "pull-up": ["pull-up-hang.png", "pull-up-top.png"],
    "push-up": ["push-up-down.png", "push-up-up.png"],
    "one-arm dumbbell row": ["row-down.png", "row-up.png"],
    "dumbbell lateral raise": ["lateral-raise-down.png", "lateral-raise-up.png"],
    "cat-cow mobility": ["cat-cow-start.png", "cat-cow-end.png"],
    "hip flexor stretch": ["hip-flexor-stretch-start.png", "hip-flexor-stretch-end.png"],
    "hamstring stretch": ["hamstring-stretch-start.png", "hamstring-stretch-end.png"],
    "child's pose": ["childs-pose-start.png", "childs-pose-end.png"]
  };
  return demos[name.toLowerCase()] || null;
}

function renderAiExerciseDemo(exercise) {
  const motion = exerciseMotionType(exercise.name);
  const demoFrames = exerciseDemoFrames(exercise.name);
  return `
    <section class="ai-motion-demo motion-${motion}" data-ai-motion-demo>
      <header class="ai-motion-head">
        <div><span><i></i> AI FORM DEMONSTRATION</span><strong>${exercise.name}</strong></div>
        <span class="ai-motion-status">LIVE MOTION COACH</span>
      </header>
      <div class="ai-motion-stage">
        ${demoFrames ? `
          <div class="ai-human-demo ${demoFrames[0].includes("-start.png") ? "ai-human-demo-cropped" : ""}" aria-label="Photorealistic human demonstration of ${escapeAttribute(exercise.name)}">
            <img class="ai-human-frame ai-human-frame-down" src="assets/workout-demo/${demoFrames[0]}" alt="Athlete starting ${escapeAttribute(exercise.name)}">
            <img class="ai-human-frame ai-human-frame-up" src="assets/workout-demo/${demoFrames[1]}" alt="Athlete completing ${escapeAttribute(exercise.name)}">
            <span class="ai-human-caption"><b>COACH REFERENCE</b><small>Full range · controlled tempo</small></span>
          </div>` : ""}
        <svg class="ai-motion-avatar" viewBox="0 0 720 470" role="img" aria-label="Animated AI demonstration of ${escapeAttribute(exercise.name)}">
          <defs>
            <linearGradient id="demo-shirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1cf5d"/><stop offset="1" stop-color="#9c7214"/></linearGradient>
            <linearGradient id="demo-skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d99a72"/><stop offset="1" stop-color="#9c6041"/></linearGradient>
            <filter id="demo-shadow"><feGaussianBlur stdDeviation="7"/></filter>
          </defs>
          <g class="ai-demo-grid"><path d="M80 390H640M110 340H610M145 290H575"/><path d="M170 115V405M265 90V405M360 75V405M455 90V405M550 115V405"/></g>
          <ellipse class="ai-demo-shadow" cx="360" cy="402" rx="90" ry="16"/>
          <g class="ai-demo-equipment">
            <path class="ai-demo-pullbar" d="M235 70H485"/>
            <path class="ai-demo-barbell" d="M260 170H460M250 153V187M470 153V187"/>
            <path class="ai-demo-bench" d="M265 335H475M305 335V390M435 335V390"/>
          </g>
          <g class="ai-demo-athlete">
            <g class="ai-demo-torso">
              <path class="ai-demo-body" d="M320 165Q360 140 400 165L412 272Q360 292 308 272Z"/>
              <path class="ai-demo-core" d="M335 207H385M333 229H387M330 251H390"/>
              <rect class="ai-demo-neck" x="347" y="139" width="26" height="28" rx="10"/>
              <circle class="ai-demo-head" cx="360" cy="113" r="37"/>
              <path class="ai-demo-hair" d="M326 108Q329 70 362 72Q396 74 397 111Q380 91 361 94Q341 89 326 108Z"/>
              <path class="ai-demo-face" d="M347 116h3M370 116h3M352 132q8 7 17 0"/>
            </g>
            <g class="ai-demo-arm ai-demo-arm-left"><path d="M320 174L280 235L263 300"/><circle cx="263" cy="300" r="10"/></g>
            <g class="ai-demo-arm ai-demo-arm-right"><path d="M400 174L440 235L457 300"/><circle cx="457" cy="300" r="10"/></g>
            <g class="ai-demo-leg ai-demo-leg-left"><path d="M337 270L320 330L310 395"/><path class="ai-demo-shoe" d="M310 395h-34"/></g>
            <g class="ai-demo-leg ai-demo-leg-right"><path d="M383 270L400 330L410 395"/><path class="ai-demo-shoe" d="M410 395h34"/></g>
          </g>
        </svg>
        <div class="ai-motion-readout">
          <span>AI POSE TRACKING</span>
          <strong>${exercise.muscles}</strong>
          <div><i></i><i></i><i></i><i></i><i></i></div>
        </div>
      </div>
      <div class="ai-motion-phases">
        ${exercise.steps.map((step, index) => `<div style="--phase:${index}"><span>0${index + 1}</span><p>${step}</p></div>`).join("")}
      </div>
      <footer class="ai-motion-controls">
        <div class="ai-demo-timeline" aria-hidden="true"><i></i></div>
        <button type="button" data-demo-toggle>Pause demo</button>
        <button type="button" data-demo-speed>Slow motion: Off</button>
        <span>AI DEMO VIDEO · Selected exercise</span>
      </footer>
    </section>
  `;
}

function renderDailyCoach(state, selectedIndex = 0) {
  const member = selectedMember(state);
  const plan = todaysWorkoutPlan();
  const selected = plan.exercises[selectedIndex] || plan.exercises[0];
  const completed = completedDailyExercises(member);
  const progress = Math.round((completed.length / plan.exercises.length) * 100);
  const safeSelectedIndex = Math.max(0, plan.exercises.indexOf(selected));
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return `
    <div class="daily-coach-head">
      <div>
        <span class="daily-coach-kicker">AI DAILY COACH · ${dateLabel}</span>
        <h2>${plan.title}</h2>
        <p>${plan.focus}. Personalized for ${member.goal.toLowerCase()} with controlled, pain-free form.</p>
      </div>
      <div class="daily-coach-summary">
        <span><strong>${plan.duration}</strong>Duration</span>
        <span><strong>${plan.exercises.length}</strong>Exercises</span>
        <span><strong>${progress}%</strong>Complete</span>
      </div>
    </div>
    <div class="daily-coach-progress"><i style="width:${progress}%"></i></div>
    <div class="daily-coach-layout">
      <aside class="daily-exercise-list" aria-label="Today's exercises">
        <div class="daily-routine-note"><strong>Warm-up</strong><span>${plan.warmup}</span></div>
        ${plan.exercises.map((exercise, index) => `
          <button class="daily-exercise-button ${index === safeSelectedIndex ? "active" : ""} ${completed.includes(index) ? "completed" : ""}" data-daily-exercise="${index}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div><strong>${exercise.name}</strong><small>${exercise.sets} sets · ${exercise.reps}</small></div>
            <i>${completed.includes(index) ? "✓" : "Play"}</i>
          </button>
        `).join("")}
        <div class="daily-routine-note"><strong>Cooldown</strong><span>${plan.cooldown}</span></div>
      </aside>
      <div class="daily-demo-panel">
        <div class="daily-video-shell">
          ${renderAiExerciseDemo(selected)}
        </div>
        <div class="daily-exercise-detail">
          <div class="daily-exercise-title">
            <div><span>NOW COACHING</span><h3>${selected.name}</h3><p>${selected.muscles}</p></div>
            <button class="daily-complete-button ${completed.includes(safeSelectedIndex) ? "done" : ""}" data-complete-daily="${safeSelectedIndex}">${completed.includes(safeSelectedIndex) ? "Completed ✓" : "Mark complete"}</button>
          </div>
          <div class="daily-prescription">
            <span><strong>${selected.sets}</strong>Sets</span>
            <span><strong>${selected.reps}</strong>Reps</span>
            <span><strong>${selected.rest}</strong>Rest</span>
            <span><strong>${plan.intensity}</strong>Mode</span>
          </div>
          <ol class="daily-form-steps">${selected.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
          <div class="daily-form-warning"><strong>Form check</strong><span>${selected.avoid}</span></div>
        </div>
      </div>
    </div>
    <p class="daily-coach-safety">Stop if you feel sharp pain, dizziness or unusual discomfort. Ask your assigned trainer to adjust loads or movements for injuries and medical conditions.</p>
  `;
}

function bindDailyCoach(state) {
  const panel = dashboardRoot.querySelector("[data-daily-coach]");
  if (!panel) return;
  panel.querySelectorAll("[data-daily-exercise]").forEach((button) => {
    button.addEventListener("click", () => {
      panel.innerHTML = renderDailyCoach(state, Number(button.dataset.dailyExercise || 0));
      bindDailyCoach(state);
      panel.querySelector("[data-ai-motion-demo]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  panel.querySelectorAll("[data-complete-daily]").forEach((button) => {
    button.addEventListener("click", () => {
      const member = selectedMember(state);
      const index = Number(button.dataset.completeDaily || 0);
      const completed = completedDailyExercises(member);
      const next = completed.includes(index) ? completed.filter((item) => item !== index) : [...completed, index];
      localStorage.setItem(dailyWorkoutStorageKey(member), JSON.stringify(next));
      panel.innerHTML = renderDailyCoach(state, index);
      bindDailyCoach(state);
    });
  });
  panel.querySelectorAll("[data-demo-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const demo = button.closest("[data-ai-motion-demo]");
      const paused = demo?.classList.toggle("is-paused") || false;
      button.textContent = paused ? "Play demo" : "Pause demo";
    });
  });
  panel.querySelectorAll("[data-demo-speed]").forEach((button) => {
    button.addEventListener("click", () => {
      const demo = button.closest("[data-ai-motion-demo]");
      const slow = demo?.classList.toggle("is-slow") || false;
      button.textContent = `Slow motion: ${slow ? "On" : "Off"}`;
    });
  });
}

function renderMemberActions(state) {
  const member = selectedMember(state);
  const pendingWorkouts = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done && !["Booking", "Diet"].includes(workout.tag));
  const nextWorkout = pendingWorkouts[0];
  const waterPercent = Math.min(100, Math.round((Number(member.waterIntake || 0) / Number(member.waterTarget || 1)) * 100));

  return `
    <div class="member-progress-card">
      <div>
        <strong>${member.progress}%</strong>
        <span>Goal progress</span>
      </div>
      <i class="progress-track"><b style="width: ${member.progress}%"></b></i>
    </div>
    <div class="member-progress-card compact-member-meter">
      <div>
        <strong>${member.waterIntake}L / ${member.waterTarget}L</strong>
        <span>Water intake today</span>
      </div>
      <i class="progress-track"><b style="width: ${waterPercent}%"></b></i>
    </div>
    <div class="member-action-grid">
      <button class="wide-action" data-action="completeWorkout" data-index="0" ${nextWorkout ? "" : "disabled"}>
        ${nextWorkout ? `Complete: ${nextWorkout.title}` : "No workout pending"}
      </button>
      <button class="wide-action" data-action="markAttendance">Log Gym Visit</button>
      <button class="wide-action" data-action="logWater">Add 500ml Water</button>
      <button class="wide-action" data-action="bookTrainer">Book Trainer Review</button>
      <button class="wide-action" data-action="requestDietPlan">Request Diet Update</button>
      <button class="wide-action" data-action="generateAiWorkout">AI Workout</button>
      <button class="wide-action" data-action="generateAiDiet">AI Diet</button>
    </div>
  `;
}

function renderMemberWelcomePanel(state) {
  const member = selectedMember(state);
  const trainer = state.trainers.find((item) => item.id === member.trainerId);
  const daysLeft = daysUntil(member.membershipEnd);
  const caloriesPercent = Math.min(100, Math.round((Number(member.caloriesLogged || 0) / Number(member.caloriesTarget || 1)) * 100));

  return `
    <div class="member-welcome-copy">
      <span class="pill">${member.status}</span>
      <h2>Welcome back, ${member.name.split(" ")[0]}</h2>
      <p>${member.goal} plan with ${trainer?.name || "your trainer"}. ${daysLeft} membership days left.</p>
    </div>
    <div class="member-welcome-stats">
      <span><strong>${member.attendance}</strong>Attendance days</span>
      <span><strong>${member.caloriesLogged}</strong>Calories logged</span>
      <span><strong>${daysLeft}</strong>Renewal days</span>
      <span><strong>${caloriesPercent}%</strong>Nutrition target</span>
    </div>
  `;
}

function renderMemberTrainerPanel(state) {
  const member = selectedMember(state);
  const trainer = state.trainers.find((item) => item.id === member.trainerId);
  const openReviews = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done && workout.tag === "Booking").length;

  return `
    <div class="member-info-card">
      <strong>${trainer?.name || "Trainer not assigned"}</strong>
      <span>${trainer?.specialty || "Ask admin to assign a trainer"}</span>
    </div>
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Check-in score</span><strong>${trainer?.score || 0}%</strong></li>
      <li><span>Review requests</span><strong>${openReviews}</strong></li>
      <li><span>Best next step</span><strong>${member.progress < 60 ? "Form review" : "Progress check"}</strong></li>
    </ul>
  `;
}

function renderMemberWellnessPanel(state) {
  const member = selectedMember(state);
  const plan = memberPlan(state, member);
  const pendingDiet = state.workouts.some((workout) => workout.memberId === member.id && !workout.done && workout.tag === "Diet");
  const waterPercent = Math.min(100, Math.round((Number(member.waterIntake || 0) / Number(member.waterTarget || 1)) * 100));

  return `
    <div class="member-info-card">
      <strong>Today's diet</strong>
      <span>${plan.name}: ${plan.label}</span>
    </div>
    <div class="member-meal-grid">
      <span><strong>Breakfast</strong>Oats, banana, eggs</span>
      <span><strong>Lunch</strong>Rice, dal, grilled paneer</span>
      <span><strong>Dinner</strong>Chicken bowl, salad</span>
      <span><strong>Snacks</strong>Fruit, whey, nuts</span>
    </div>
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Calories</span><strong>${member.caloriesLogged}/${member.caloriesTarget}</strong></li>
      <li><span>Protein</span><strong>${member.proteinTarget}g</strong></li>
      <li><span>Carbs / Fat</span><strong>${member.carbsTarget}g / ${member.fatTarget}g</strong></li>
      <li><span>Water</span><strong>${waterPercent}%</strong></li>
      <li><span>Nutrition status</span><strong>${pendingDiet ? "Review pending" : "On track"}</strong></li>
    </ul>
  `;
}

function renderMemberProfilePanel(state) {
  const member = selectedMember(state);
  const avatar = member.photo
    ? `<img src="${escapeAttribute(member.photo)}" alt="${escapeAttribute(member.name)} profile photo">`
    : member.name.split(" ").map((part) => part[0]).join("").slice(0, 2);

  return `
    <div class="member-profile-summary">
      <span class="member-avatar">${avatar}</span>
      <div>
        <strong>${member.name}</strong>
        <span>${member.email}</span>
      </div>
    </div>
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Age / Gender</span><strong>${member.age} / ${member.gender}</strong></li>
      <li><span>Height / Weight</span><strong>${member.height}cm / ${member.weight}kg</strong></li>
      <li><span>Medical</span><strong>${member.medicalHistory}</strong></li>
      <li><span>Emergency</span><strong>${member.emergencyContact}</strong></li>
    </ul>
    <details class="member-edit-profile dropdown-card">
      <summary>Edit Profile</summary>
      <form class="dashboard-form member-profile-form" data-action="editProfile">
        <label class="profile-photo-input">Profile photo<input name="photo" type="file" accept="image/*"></label>
        <label>Age<input name="age" type="number" min="1" max="100" value="${member.age}" required></label>
        <label>Gender<select name="gender">
          <option value="Male" ${member.gender === "Male" ? "selected" : ""}>Male</option>
          <option value="Female" ${member.gender === "Female" ? "selected" : ""}>Female</option>
          <option value="Other" ${member.gender === "Other" ? "selected" : ""}>Other</option>
        </select></label>
        <label>Height (cm)<input name="height" type="number" min="80" max="250" value="${member.height}" required></label>
        <label>Weight (kg)<input name="weight" type="number" min="20" max="250" value="${member.weight}" required></label>
        <label>Medical history<input name="medicalHistory" value="${escapeAttribute(member.medicalHistory)}" required></label>
        <label>Emergency contact<input name="emergencyContact" value="${escapeAttribute(member.emergencyContact)}" required></label>
        <button type="submit">Update Profile</button>
      </form>
    </details>
  `;
}

function renderMemberProgressPanel(state) {
  const member = selectedMember(state);

  return `
    <div class="member-progress-card">
      <div>
        <strong>${member.progress}%</strong>
        <span>${member.goal}</span>
      </div>
      <i class="progress-track"><b style="width: ${member.progress}%"></b></i>
    </div>
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Weekly weight</span><strong>${member.weight}kg</strong></li>
      <li><span>BMI</span><strong>${calculateBmi(member)}</strong></li>
      <li><span>Body fat</span><strong>${member.bodyFat}%</strong></li>
      <li><span>Muscle mass</span><strong>${member.muscleMass}kg</strong></li>
      <li><span>Measurements</span><strong>${member.measurements}</strong></li>
      <li><span>Achievement</span><strong>${member.attendance >= 20 ? "Consistency" : "Building streak"}</strong></li>
    </ul>
  `;
}

function renderMemberNotificationsPanel(state) {
  const member = selectedMember(state);
  const daysLeft = daysUntil(member.membershipEnd);
  const trainer = state.trainers.find((item) => item.id === member.trainerId);
  const openWork = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done).length;

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Membership</span><strong>${daysLeft <= 7 ? "Expiring soon" : `${daysLeft} days left`}</strong></li>
      <li><span>Trainer message</span><strong>${trainer?.name || "Trainer"}: keep form strict</strong></li>
      <li><span>Workout queue</span><strong>${openWork} open</strong></li>
      <li><span>Gym announcement</span><strong>Evening batch available</strong></li>
      <li><span>Offer</span><strong>Renewal bonus active</strong></li>
    </ul>
    <button class="wide-action" data-action="renewMembership">Renew Membership</button>
  `;
}

function renderMemberWorkoutPanel(state) {
  const member = selectedMember(state);
  const plan = todaysWorkoutPlan();
  const firstExercise = plan.exercises[0];

  return `
    <div class="member-info-card workout-detail-hero">
      <span class="workout-detail-kicker">TODAY'S PLAN</span>
      <strong>${plan.title}</strong>
      <span>${plan.duration} · ${plan.focus}</span>
    </div>
    <ul class="task-list compact-admin-list member-mini-list workout-detail-list">
      <li><span>First exercise</span><strong>${firstExercise.name}</strong></li>
      <li><span>Prescription</span><strong>${firstExercise.sets} × ${firstExercise.reps}</strong></li>
      <li><span>Completed</span><strong>${completedDailyExercises(member).length}/${plan.exercises.length}</strong></li>
      <li class="workout-detail-long"><span>Warm-up</span><strong>${plan.warmup}</strong></li>
      <li class="workout-detail-long"><span>Plan changes</span><strong>Tomorrow automatically</strong></li>
    </ul>
  `;
}

function renderMemberAttendancePanel(state) {
  const member = selectedMember(state);
  const attendanceUrl = `${dynamicAppOrigin}/attendance.html?memberId=${encodeURIComponent(member.id)}`;
  const qrUrl = `${apiBaseUrl}/api/qr?memberId=${encodeURIComponent(member.id)}`;
  const lastCheckIn = Array.isArray(state.attendanceLog)
    ? state.attendanceLog.find((item) => item.memberId === member.id)
    : null;

  return `
    <div class="member-attendance-card member-attendance-summary-card">
      <div class="member-attendance-card-head"><div><span>CHECK-IN</span><h3>Attendance access</h3></div><strong>${member.attendance} days</strong></div>
      <div class="member-attendance-summary-body">
        <a class="qr-card qr-card-link" href="${attendanceUrl}" aria-label="Open attendance check-in for ${member.name}">
          <img class="qr-image" src="${qrUrl}" alt="QR code for ${member.name} attendance check-in">
          <strong>Scan for check-in</strong>
          <span>${member.id}</span>
        </a>
        <ul class="task-list compact-admin-list member-mini-list">
          <li><span>Manual check-in</span><strong>${member.attendance} days</strong></li>
          <li><span>Last check-in</span><strong>${lastCheckIn ? `${lastCheckIn.date} ${lastCheckIn.time}` : "Not marked yet"}</strong></li>
          <li><span>Face recognition</span><strong>Future AI</strong></li>
          <li><span>Attendance history</span><strong>This month active</strong></li>
          <li><span>AI attendance analytics</span><strong>Peak: evening</strong></li>
        </ul>
      </div>
      <a class="wide-action attendance-open-link" href="${attendanceUrl}">Open Attendance Portal</a>
    </div>
    <div class="member-attendance-card member-attendance-calendar-card">
      ${renderAttendanceCalendar(state, [member], "My Calendar")}
    </div>
    ${renderMemberAttendanceHistory(state, member.id)}
  `;
}

function renderMemberPaymentsPanel(state) {
  const member = selectedMember(state);
  const payment = state.payments.find((item) => item.memberId === member.id) || { amount: memberPlan(state, member).price, status: "Pending", invoice: "Draft" };
  const daysLeft = daysUntil(member.membershipEnd);

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Current plan</span><strong>${member.plan}</strong></li>
      <li><span>Start date</span><strong>${member.membershipStart}</strong></li>
      <li><span>End date</span><strong>${member.membershipEnd}</strong></li>
      <li><span>Remaining days</span><strong>${daysLeft}</strong></li>
      <li><span>Payment status</span><strong>${payment.status}</strong></li>
      <li><span>Invoice download</span><strong>${payment.invoice}</strong></li>
    </ul>
    <button class="wide-action" data-action="renewMembership">Renew Membership</button>
  `;
}

function renderMemberAiToolsPanel(state) {
  const member = selectedMember(state);

  return `
    <ul class="task-list compact-admin-list member-mini-list">
      <li><span>Workout input</span><strong>${member.age}y / ${member.weight}kg / ${member.height}cm</strong></li>
      <li><span>Goal</span><strong>${member.goal}</strong></li>
      <li><span>Diet input</span><strong>High protein</strong></li>
      <li><span>Injury prevention</span><strong>Warm-up + stretching</strong></li>
      <li><span>Renewal prediction</span><strong>${daysUntil(member.membershipEnd) < 10 ? "Likely to renew" : "Healthy"}</strong></li>
    </ul>
    <div class="member-action-grid">
      <button class="wide-action" type="button" data-action="generateAiWorkout">Generate Workout Plan</button>
      <button class="wide-action" type="button" data-action="generateAiDiet">Generate Diet Chart</button>
    </div>
  `;
}

function buildAiFitnessReport(state, member, kind) {
  const isWorkout = kind === "workout";
  const bmi = (Number(member.weight) / ((Number(member.height) / 100) ** 2)).toFixed(1);
  const protein = Number(member.proteinTarget || Math.round(Number(member.weight) * 1.7));
  const calories = Number(member.caloriesTarget || 2000);
  const trainer = trainerName(state, member.trainerId);
  const generated = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const workoutDays = [
    ["Day 1 · Upper-body strength", "Bench press 4×6–8 · Row 4×8 · Shoulder press 3×10 · Core 3×30 sec"],
    ["Day 2 · Active recovery", "30-minute walk · Hip and shoulder mobility · Easy stretching"],
    ["Day 3 · Lower-body strength", "Squat 4×6–8 · Romanian deadlift 3×8 · Lunges 3×10 · Calf raise 3×15"],
    ["Day 4 · Recovery", "Rest · 7–9 hours sleep · Hydration target and light mobility"],
    ["Day 5 · Full-body progression", "Deadlift 3×5 · Incline press 3×10 · Pulldown 3×10 · Farmer carry 3 rounds"],
    ["Day 6 · Conditioning", "25-minute zone-2 cardio · 6 short intervals · Full-body stretch"],
    ["Day 7 · Reset", "Complete rest · Weekly measurements · Prepare for the next training block"]
  ];
  const dietDays = [
    ["Breakfast", `Oats, milk, banana and eggs · approximately ${Math.round(calories * .25)} kcal`],
    ["Mid-morning", "Fruit with curd or Greek yogurt · water"],
    ["Lunch", `Rice or roti, dal, vegetables and lean protein · approximately ${Math.round(calories * .32)} kcal`],
    ["Pre-workout", "Banana or whole-grain toast · coffee optional · 400–500 ml water"],
    ["Post-workout", `Protein-rich meal or shake · target 25–35 g protein`],
    ["Dinner", `Lean protein, vegetables and controlled carbohydrates · approximately ${Math.round(calories * .25)} kcal`],
    ["Daily targets", `${calories} kcal · ${protein} g protein · ${member.carbsTarget || 220} g carbs · ${member.fatTarget || 60} g fat · ${member.waterTarget || 3} L water`]
  ];
  return {
    kind,
    title: isWorkout ? "Personalised 7-Day Workout Plan" : "Personalised Diet & Nutrition Chart",
    fileName: `${member.name.replace(/\s+/g, "-").toLowerCase()}-${isWorkout ? "workout-plan" : "diet-chart"}.txt`,
    generated,
    member,
    trainer,
    bmi,
    rows: isWorkout ? workoutDays : dietDays,
    summary: isWorkout
      ? `A progressive plan designed for ${member.goal}, based on current ${member.progress}% goal progress and ${member.attendance} attendance days.`
      : `A high-protein nutrition structure designed for ${member.goal}, recovery and a daily target of ${calories} kcal.`,
    recommendations: isWorkout
      ? ["Warm up for 8–10 minutes before every session.", "Leave 1–2 repetitions in reserve and increase load only with clean form.", "Record weights and repetitions after each workout.", `Review the plan with ${trainer} after 7 days.`]
      : ["Distribute protein across 4–5 meals.", "Prefer minimally processed foods and include vegetables in lunch and dinner.", "Adjust portions using weekly weight, energy and performance trends.", `Discuss allergies, medical restrictions or supplements with ${trainer} or a qualified dietitian.`]
  };
}

function aiReportAsText(report) {
  return `${report.title}\nAI Gym Portal\nGenerated: ${report.generated}\n\nMEMBER PROFILE\nName: ${report.member.name}\nGoal: ${report.member.goal}\nAge: ${report.member.age}\nHeight: ${report.member.height} cm\nWeight: ${report.member.weight} kg\nBMI: ${report.bmi}\nProgress: ${report.member.progress}%\nTrainer: ${report.trainer}\n\nPLAN SUMMARY\n${report.summary}\n\nDETAILED PLAN\n${report.rows.map(([title, detail]) => `${title}\n${detail}`).join("\n\n")}\n\nGUIDANCE & SAFETY\n${report.recommendations.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\nTrack adherence, energy, sleep, pain and progress weekly. Stop exercise for sharp pain, dizziness or unusual symptoms. This generated guide is not a medical diagnosis.`;
}

function openAiFitnessReport(report) {
  document.querySelector("[data-ai-fitness-report]")?.remove();
  const dialog = document.createElement("dialog");
  dialog.className = "ai-fitness-report-dialog";
  dialog.dataset.aiFitnessReport = "true";
  dialog.innerHTML = `
    <div class="ai-report-sheet">
      <header><div><span>AI GYM · DETAILED REPORT</span><h2>${report.title}</h2><p>Generated ${report.generated}</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></header>
      <section class="ai-report-profile">
        <div><small>MEMBER</small><strong>${report.member.name}</strong></div><div><small>GOAL</small><strong>${report.member.goal}</strong></div>
        <div><small>BMI</small><strong>${report.bmi}</strong></div><div><small>PROGRESS</small><strong>${report.member.progress}%</strong></div>
        <div><small>TRAINER</small><strong>${report.trainer}</strong></div><div><small>PLAN STATUS</small><strong>Ready to follow</strong></div>
      </section>
      <section class="ai-report-summary"><h3>Plan overview</h3><p>${report.summary}</p></section>
      <section><h3>Detailed ${report.kind === "workout" ? "weekly schedule" : "daily nutrition schedule"}</h3><div class="ai-report-rows">${report.rows.map(([title, detail], index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><div><strong>${title}</strong><p>${detail}</p></div></article>`).join("")}</div></section>
      <section><h3>Professional guidance & safety</h3><ul>${report.recommendations.map(item => `<li>${item}</li>`).join("")}</ul><p class="ai-report-disclaimer">Track adherence, energy, sleep, pain and progress weekly. Stop for sharp pain, dizziness or unusual symptoms. This generated guide is not a medical diagnosis.</p></section>
      <footer><button type="button" data-report-download>Download detailed report</button><button type="button" data-report-print>Print / Save as PDF</button></footer>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector(".ai-report-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector("[data-report-download]").addEventListener("click", () => downloadTextFile(report.fileName, aiReportAsText(report), "text/plain"));
  dialog.querySelector("[data-report-print]").addEventListener("click", () => window.print());
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
}

function memberWorkouts(state, member) {
  return state.workouts.filter((workout) => workout.memberId === member.id);
}

function assistantMessages(state, member) {
  if (!state.aiMessages[member.id]) {
    state.aiMessages[member.id] = [
      {
        from: "ai",
        text: `I am your AI spotter. You are at ${member.progress}% progress with ${member.attendance} attendance days. Pick a quick prompt or ask me anything.`
      }
    ];
  }

  state.aiMessages[member.id] = state.aiMessages[member.id].filter((message) => {
    return !message.text.includes("Live OpenAI is not connected") &&
      !message.text.includes("OpenAI API error") &&
      !message.text.includes("Live Gemini is not connected");
  });

  return state.aiMessages[member.id].slice(-5);
}

function renderBodybuildingToy() {
  return `
    <span class="pet-speed-lines" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
    <span class="pet-runner" aria-hidden="true">
      <canvas class="pet-runner-canvas" data-front-runner width="224" height="276"></canvas>
      <span class="pet-3d-loader"></span>
    </span>
    <span class="pet-impact pet-impact-left" aria-hidden="true"></span>
    <span class="pet-impact pet-impact-right" aria-hidden="true"></span>
    <span class="pet-treadmill" aria-hidden="true">
      <span class="pet-treadmill-deck"></span>
      <span class="pet-treadmill-belt"></span>
      <span class="pet-treadmill-roller pet-treadmill-roller-left"></span>
      <span class="pet-treadmill-roller pet-treadmill-roller-right"></span>
      <span class="pet-speed-display"><b>8.6</b><i></i></span>
    </span>
  `;
}

function renderMemberAssistant(state) {
  const member = selectedMember(state);
  const trainer = trainerName(state, member.trainerId);
  const dailyPlan = todaysWorkoutPlan();
  const pendingCount = memberWorkouts(state, member).filter((workout) => !workout.done).length;
  const messages = assistantMessages(state, member).map((message) => `
    <li class="${message.from === "user" ? "from-user" : "from-ai"}">${message.text}</li>
  `).join("");

  return `
    <article class="member-ai-pet" data-ai-pet>
      <button class="ai-coach-backdrop" type="button" data-action="closePet" aria-label="Close AI Performance Coach"></button>
      <button class="ai-pet-toggle" type="button" data-action="togglePet" aria-label="Open AI Performance Coach" aria-expanded="false">
        ${renderBodybuildingToy()}
        <span class="ai-toy-shadow"></span>
        <span class="ai-athlete-label"><i></i>AI COACH</span>
      </button>
      <aside class="ai-panel" data-ai-pet-panel aria-hidden="true" aria-label="AI Performance Coach" inert>
        <div class="ai-panel-head">
          <div class="ai-coach-identity">
            <span class="ai-coach-mark">AI</span>
            <div><span>AI Performance Coach</span><small><i></i> Online · Personalized for ${member.name}</small></div>
          </div>
          <button class="ai-panel-close" type="button" data-action="closePet" aria-label="Close AI Performance Coach">×</button>
        </div>
        <section class="ai-session-card">
          <div><span>TODAY'S SESSION</span><strong>${dailyPlan.title}</strong><small>${dailyPlan.focus}</small></div>
          <div class="ai-session-stat"><strong>${member.progress}%</strong><span>Goal progress</span></div>
        </section>
        <div class="ai-panel-section-label"><span>Coach conversation</span><small>${pendingCount} workout${pendingCount === 1 ? "" : "s"} pending</small></div>
        <ul class="ai-chat-list" data-ai-chat>${messages}</ul>
        <div class="ai-prompt-row">
          <button type="button" data-ai-prompt="workout"><span>01</span>Today's workout</button>
          <button type="button" data-ai-prompt="form"><span>02</span>Exercise form</button>
          <button type="button" data-ai-prompt="diet"><span>03</span>Nutrition</button>
          <button type="button" data-ai-prompt="recovery"><span>04</span>Recovery</button>
          <button type="button" data-ai-prompt="progress"><span>05</span>Progress</button>
          <button type="button" data-ai-prompt="trainer"><span>06</span>Contact trainer</button>
        </div>
        <form class="ai-chat-form" data-action="askAssistant">
          <input name="question" placeholder="Ask your coach anything…" aria-label="Message AI Performance Coach" autocomplete="off" required>
          <button class="ai-chat-cancel" type="button" data-action="closePet">Cancel</button>
          <button class="ai-chat-send" type="submit" aria-label="Send message">Send</button>
        </form>
        <p class="ai-context"><span>Assigned trainer: <strong>${trainer}</strong></span><span>Membership: <strong>${member.plan}</strong></span></p>
      </aside>
    </article>
  `;
}

function assistantReply(state, member, intent, question = "") {
  const pending = memberWorkouts(state, member).filter((workout) => !workout.done);
  const nextWorkout = pending[0]?.title || "recovery mobility";
  const lowerQuestion = question.toLowerCase();
  const hasAny = (words) => words.some((word) => lowerQuestion.includes(word));

  if (hasAny(["chest pain", "faint", "dizzy", "breathing problem", "heart", "injury", "injured", "sharp pain", "medicine", "medical", "doctor", "sick", "illness"])) {
    return "For pain, injury, dizziness, chest symptoms, illness, or medical conditions, stop training and speak with a qualified doctor or physiotherapist. I can give general fitness guidance, but I cannot diagnose or replace medical care.";
  }

  if (intent === "diet" || hasAny(["diet", "food", "meal", "nutrition", "calorie", "calories", "cutting", "bulk", "bulking", "fat loss", "weight loss", "lose weight", "reduce weight", "reduce fat", "reduce belly", "belly fat", "slim", "slimming", "gain weight"])) {
    if (hasAny(["fat loss", "weight loss", "lose weight", "reduce weight", "reduce fat", "reduce belly", "belly fat", "slim", "slimming", "cutting"])) {
      return "To reduce weight, keep a small calorie deficit, eat protein in every meal, reduce sugary drinks and fried snacks, walk 8,000-10,000 steps daily, strength train 3-4 days weekly, and sleep 7-9 hours. Do not crash diet; aim for slow steady fat loss.";
    }

    return `For nutrition, build every day around protein, controlled calories, vegetables, water, and consistent meal timing. For fat loss, keep a small calorie deficit. For muscle gain, use a small surplus. Your ${member.plan} plan works best when you log meals after training.`;
  }

  if (hasAny(["protein", "whey", "creatine", "supplement", "supplements", "pre workout", "preworkout"])) {
    return "For supplements, start simple: protein from food first, whey only if you miss your target, and creatine monohydrate 3-5g daily if suitable for you. Avoid relying on fat burners. If you have kidney, liver, heart, or medical issues, ask a doctor first.";
  }

  if (intent === "recovery" || hasAny(["recovery", "rest", "sleep", "sore", "soreness", "stretch", "mobility", "overtraining"])) {
    return "For recovery, sleep 7-9 hours, hydrate well, keep protein steady, and use light mobility on sore days. Mild soreness is normal, but sharp pain is not. If performance drops for several days, reduce volume and take a proper rest day.";
  }

  if (hasAny(["cardio", "stamina", "endurance", "heart health", "steps", "running", "walking"])) {
    return "For cardio and stamina, do 20-30 minutes of zone-2 walking, cycling, or incline treadmill 3-5 times weekly. Keep it easy enough to speak in short sentences. Add intervals only after your base fitness improves.";
  }

  if (hasAny(["warmup", "warm up", "cooldown", "cool down"])) {
    return "Warm up with 5-8 minutes of light cardio, then 2-3 lighter sets of your first lift. Cool down with slow breathing and easy stretching for the muscles trained. This improves readiness without wasting energy.";
  }

  if (hasAny(["form", "technique", "posture", "squat", "bench", "deadlift", "shoulder press", "curl", "row"])) {
    return `${trainerName(state, member.trainerId)} can check your form in detail. General rule: control the weight, brace your core, use full pain-free range, and stop the set when your form breaks.`;
  }

  if (hasAny(["muscle", "hypertrophy", "bodybuilding", "strength", "strong", "arms", "biceps", "triceps", "legs", "back", "shoulders", "abs"])) {
    return `For muscle and strength, train each muscle 2 times per week, use progressive overload, and keep 1-3 reps in reserve on most sets. Start today with ${nextWorkout}, then recover properly.`;
  }

  if (hasAny(["water", "hydration", "cramp", "cramps", "electrolyte"])) {
    return "For hydration, drink water through the day and add electrolytes if you sweat heavily. Pale-yellow urine is a practical sign for most people. Cramps can come from fatigue, poor warmup, or hydration issues.";
  }

  if (intent === "progress" || lowerQuestion.includes("progress") || lowerQuestion.includes("goal")) {
    return `You are at ${member.progress}% goal progress. Complete one workout and keep your attendance streak moving to push this closer to ${Math.min(100, member.progress + 4)}%.`;
  }

  if (intent === "trainer" || lowerQuestion.includes("trainer") || lowerQuestion.includes("coach")) {
    return `${trainerName(state, member.trainerId)} is your trainer. Use Book Trainer Session if you want a form check, plan review, or a heavier strength block.`;
  }

  if (intent === "workout" || lowerQuestion.includes("workout") || lowerQuestion.includes("exercise")) {
    return `Start with ${nextWorkout}. Warm up for 8 minutes, lift with controlled reps, and finish with stretching. I will mark progress once you complete the workout.`;
  }

  if (lowerQuestion.includes("subscription") || lowerQuestion.includes("plan")) {
    const plan = state.plans.find((item) => item.name === member.plan);
    return plan ? `You are on ${plan.name}: ${money(plan.price)} per month. It includes ${plan.label}.` : `Your current plan is ${member.plan}.`;
  }

  return `I can answer fitness and health-related questions about workouts, muscle gain, fat loss, diet, protein, hydration, sleep, recovery, cardio, warmups, and safe training. For your next step, begin with ${nextWorkout} and keep the reps controlled.`;
}

async function openAIAssistantReply(state, member, intent, question = "") {
  const pending = memberWorkouts(state, member).filter((workout) => !workout.done);
  const promptText = question || intent || "fitness question";

  try {
    const response = await fetch("http://localhost:8788/api/fitness-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: promptText,
        intent,
        member,
        dashboard: {
          trainer: trainerName(state, member.trainerId),
          nextWorkout: pending[0]?.title || "recovery mobility",
          plan: member.plan
        }
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "AI proxy unavailable");
    }

    const payload = await response.json();
    return payload.answer || "AI returned an empty answer. Please ask again.";
  } catch (error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("AI proxy unavailable")) {
      return "Live AI is not connected. Run setup-groq-key.bat once, keep the Groq proxy window open, refresh this dashboard, and ask again.";
    }

    if (error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("rate limit")) {
      return "Groq is connected, but this API key has no available quota right now. Check Groq limits, use a key with quota, or wait and try again.";
    }

    return `AI API error: ${error.message}. Check your Groq API key, quota, rate limits, or model access, then ask again.`;
  }
}

function renderPrimaryRows(state, role) {
  if (role === "admin") {
    const hasMoreMembers = state.members.length > MEMBER_PREVIEW_LIMIT;
    const visibleMembers = memberListExpanded ? state.members : state.members.slice(0, MEMBER_PREVIEW_LIMIT);
    return [
      `
        <li class="member-list-header" aria-hidden="true">
          <span>Member</span>
          <span>Plan</span>
          <span>Trainer</span>
          <span>Status</span>
        </li>
      `,
      ...visibleMembers.map((member) => `
        <li class="member-detail-row">
          <span class="member-identity">
            <strong>${member.name}</strong>
            <small>${member.email}</small>
          </span>
          <span>${member.plan}</span>
          <span>${trainerName(state, member.trainerId)}</span>
          <span><span class="pill">${member.status}</span></span>
        </li>
      `),
      ...(hasMoreMembers ? [`
        <li class="member-list-toggle-row">
          <button type="button" data-action="toggleMemberList" aria-expanded="${memberListExpanded}">
            ${memberListExpanded ? "Show less" : `View all ${state.members.length} members`}
            <span aria-hidden="true">${memberListExpanded ? "↑" : "→"}</span>
          </button>
        </li>
      `] : [])
    ];
  }

  if (role === "trainer") {
    return trainerWorkouts(state)
      .filter((workout) => !workout.done)
      .slice(0, 7)
      .map((workout) => [
      `${memberName(state, workout.memberId)} - ${workout.title}`,
      workout.done ? "Done" : workout.tag
    ]);
  }

  const member = selectedMember(state);
  const rows = state.workouts
    .filter((workout) => workout.memberId === member.id)
    .map((workout) => [workout.title, workout.done ? "Done" : workout.tag || "Open"]);

  return rows.length ? rows : [["No workouts assigned yet", "Ask trainer"]];
}

function dashboardConfig(state, role) {
  const member = selectedMember(state);

  if (role === "admin") {
    const todayCheckIns = (state.attendanceLog || []).filter((item) => item.date === todayDateKey()).length;
    const retention = state.members.length
      ? Math.round(state.members.reduce((sum, item) => sum + Number(item.progress || 0), 0) / state.members.length)
      : 0;
    return {
      quick: [state.members.length, "Current members"],
      title: "Members",
      action: "Admin Controls",
      rows: renderPrimaryRows(state, role),
      metrics: [
        metric(todayCheckIns, "Today visitors"),
        metric(state.trainers.length, "Active trainers"),
        metric(`${retention}%`, "Retention rate")
      ],
      actionHtml: renderAdminActions(state)
    };
  }

  if (role === "trainer") {
    const trainer = currentTrainer(state);
    const assigned = trainerMembers(state, trainer);
    const openWorkouts = trainerWorkouts(state, trainer).filter((workout) => !workout.done).length;
    const avgProgress = assigned.length
      ? Math.round(assigned.reduce((sum, memberItem) => sum + memberItem.progress, 0) / assigned.length)
      : 0;

    return {
      quick: [assigned.length, "Assigned members"],
      title: "Open Coaching Work",
      action: "Trainer Tools",
      rows: renderPrimaryRows(state, role),
      metrics: [
        metric(assigned.reduce((sum, item) => sum + Number(item.attendance || 0), 0), "Attendance"),
        metric(trainer.sessions, "Sessions left"),
        metric(assigned.filter((item) => item.progress < 70).length, "Assessments"),
        metric(openWorkouts, "Open plans"),
        metric(`${avgProgress}%`, "Avg progress")
      ],
      actionHtml: renderTrainerActions(state)
    };
  }

  const pending = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done).length;
  const plan = memberPlan(state, member);
  return {
    quick: [member.attendance, "Day streak"],
    title: "My Plan",
    action: "Member Tools",
    rows: renderPrimaryRows(state, role),
    metrics: [
      metric(`${member.progress}%`, "Goal progress"),
      metric(member.attendance, "Attendance streak"),
      metric(pending, "Workouts left"),
      metric(`${member.waterIntake}L`, "Water intake"),
      metric(member.caloriesLogged, "Calories"),
      metric(`${daysUntil(member.membershipEnd)} days`, "Renewal")
    ],
    actionHtml: renderMemberActions(state)
  };
}

function adminInitials(name) {
  return String(name || "Member").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function renderAdminReferenceOverview(state) {
  const revenue = dashboardRoot.querySelector("[data-admin-total-revenue]");
  if (revenue) {
    revenue.dataset.baseRevenue = String(totalRevenue(state));
    revenue.textContent = money(totalRevenue(state));
  }

  const retention = dashboardRoot.querySelector("[data-admin-retention]");
  if (retention) {
    const value = state.members.length
      ? Math.round(state.members.reduce((sum, item) => sum + Number(item.progress || 0), 0) / state.members.length)
      : 0;
    retention.textContent = `${value}%`;
  }

  const recentMembers = dashboardRoot.querySelector("[data-admin-recent-members]");
  if (recentMembers) {
    recentMembers.innerHTML = state.members.slice(-6).reverse().map((member) => `
      <span title="${escapeAttribute(member.name)}">${adminInitials(member.name)}</span>
    `).join("") || "<p>No members yet</p>";
  }

  const recentCheckins = dashboardRoot.querySelector("[data-admin-recent-checkins]");
  if (recentCheckins) {
    const records = (state.attendanceLog || []).slice(0, 5);
    recentCheckins.innerHTML = records.length ? records.map((record) => `
      <div><span>${adminInitials(memberName(state, record.memberId))}</span><b>${memberName(state, record.memberId)}</b><small>${record.time || "Today"}</small></div>
    `).join("") : state.members.slice(0, 4).map((member, index) => `
      <div><span>${adminInitials(member.name)}</span><b>${member.name}</b><small>${index + 2} mins ago</small></div>
    `).join("");
  }
}

function showAdminReferenceView(view) {
  adminActiveView = view;
  dashboardRoot.querySelectorAll("[data-admin-page]").forEach((page) => page.classList.toggle("active", page.dataset.adminPage === view));
  dashboardRoot.querySelectorAll(".admin-sidebar [data-admin-view]").forEach((button) => button.classList.toggle("active", button.dataset.adminView === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupAdminReferenceUI() {
  if (!dashboardRoot.classList.contains("admin-app")) return;
  showAdminReferenceView(adminActiveView);

  dashboardRoot.querySelectorAll("[data-admin-view]").forEach((button) => {
    if (button.dataset.adminNavBound) return;
    button.dataset.adminNavBound = "true";
    button.addEventListener("click", () => showAdminReferenceView(button.dataset.adminView));
  });

  const memberSearch = dashboardRoot.querySelector("[data-member-filter]");
  const filterMembers = () => {
    const query = memberSearch?.value.trim().toLowerCase() || "";
    dashboardRoot.querySelectorAll("[data-primary-list] .member-detail-row").forEach((row) => {
      row.hidden = Boolean(query && !row.textContent.toLowerCase().includes(query));
    });
  };
  if (memberSearch && !memberSearch.dataset.filterBound) {
    memberSearch.dataset.filterBound = "true";
    memberSearch.addEventListener("input", filterMembers);
    dashboardRoot.querySelector("[data-member-filter-button]")?.addEventListener("click", filterMembers);
  }

  const globalSearch = dashboardRoot.querySelector("[data-admin-global-search]");
  if (globalSearch && !globalSearch.dataset.searchBound) {
    globalSearch.dataset.searchBound = "true";
    globalSearch.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !globalSearch.value.trim()) return;
      showAdminReferenceView("members");
      if (memberSearch) {
        memberSearch.value = globalSearch.value;
        filterMembers();
        memberSearch.focus();
      }
    });
  }

  const revenuePeriod = dashboardRoot.querySelector('[aria-label="Revenue period"]');
  const revenueChart = dashboardRoot.querySelector(".admin-bars");
  const revenueTotal = dashboardRoot.querySelector("[data-admin-total-revenue]");
  const revenueSets = {
    "This Year": {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      values: [34, 46, 42, 58, 51, 66, 48, 70, 60, 42, 88, 55],
      totalFactor: 1,
      aria: "Yearly revenue chart by month"
    },
    "This Month": {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      values: [52, 78, 61, 92],
      totalFactor: 0.28,
      aria: "Monthly revenue chart by week"
    }
  };
  const updateRevenueChart = () => {
    if (!revenuePeriod || !revenueChart || !revenueTotal) return;
    const data = revenueSets[revenuePeriod.value] || revenueSets["This Year"];
    const peak = Math.max(...data.values);
    revenueChart.dataset.period = revenuePeriod.value === "This Month" ? "month" : "year";
    revenueChart.setAttribute("aria-label", data.aria);
    revenueChart.innerHTML = data.values.map((value, index) => `
      <span class="${value === peak ? "highlight" : ""}" style="--bar:${value}%" title="${data.labels[index]}: ${value}%">
        <em>${value}%</em><i>${data.labels[index]}</i>
      </span>
    `).join("");
    const baseRevenue = Number(revenueTotal.dataset.baseRevenue || 0);
    revenueTotal.textContent = money(Math.round(baseRevenue * data.totalFactor));
  };
  if (revenuePeriod && !revenuePeriod.dataset.chartBound) {
    revenuePeriod.dataset.chartBound = "true";
    revenuePeriod.addEventListener("change", updateRevenueChart);
  }
  updateRevenueChart();

  const adminHelp = dashboardRoot.querySelector("[data-admin-help]");
  if (adminHelp && !adminHelp.dataset.helpBound) {
    adminHelp.dataset.helpBound = "true";
    adminHelp.addEventListener("click", () => {
      let dialog = document.querySelector("[data-admin-help-dialog]");
      if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.className = "admin-help-dialog";
        dialog.dataset.adminHelpDialog = "true";
        dialog.innerHTML = `
          <div class="admin-help-heading"><div><span>AI Gym Support</span><h2>Help &amp; Guidance</h2></div><button type="button" data-close-admin-help aria-label="Close help">&times;</button></div>
          <p>Use the sidebar to manage members, trainers, attendance, billing, and gym operations.</p>
          <div class="admin-help-grid">
            <section><strong>Members</strong><span>Add members, assign trainers, update plans, and review status.</span></section>
            <section><strong>Attendance</strong><span>Record check-ins, check-outs, and inspect member history.</span></section>
            <section><strong>Billing</strong><span>Update payments, subscriptions, invoices, and renewal status.</span></section>
            <section><strong>Operations</strong><span>Manage equipment, plan libraries, reports, and backups.</span></section>
          </div>
        `;
        document.body.appendChild(dialog);
        dialog.querySelector("[data-close-admin-help]")?.addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
      }
      dialog.showModal();
    });
  }

  const openMember = dashboardRoot.querySelector("[data-open-admin-section='member-management']");
  if (openMember && !openMember.dataset.openBound) {
    openMember.dataset.openBound = "true";
    openMember.addEventListener("click", () => {
      const details = dashboardRoot.querySelector("#member-management details");
      if (details) details.open = true;
      details?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function setupRoleReferenceNavigation() {
  const roleShell = document.querySelector(".role-reference-app");
  if (!roleShell || roleShell.dataset.roleNavigationBound) return;
  roleShell.dataset.roleNavigationBound = "true";
  const links = [...roleShell.querySelectorAll(".role-sidebar nav [data-role-view]")];
  const panels = [...roleShell.querySelectorAll("[data-role-panel]")];
  const showView = (view) => {
    links.forEach((item) => item.classList.toggle("active", item.dataset.roleView === view));
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.rolePanel.split(/\s+/).includes(view)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const view = link.dataset.roleView;
      showView(view);
      history.replaceState(null, "", `#${view}`);
    });
  });
  const requestedView = location.hash.slice(1);
  showView(links.some((link) => link.dataset.roleView === requestedView) ? requestedView : "overview");
}

function setupCollapsibleSidebar() {
  const shell = document.querySelector(".admin-app, .role-reference-app");
  const toggle = shell?.querySelector(".sidebar-collapse-toggle");
  if (!shell || !toggle || toggle.dataset.sidebarToggleBound) return;
  toggle.dataset.sidebarToggleBound = "true";
  const roleName = shell.dataset.dashboardRole || "dashboard";
  const storageName = `aiGymSidebarCollapsed:${roleName}`;
  const applyState = (collapsed) => {
    shell.classList.toggle("sidebar-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    const symbol = toggle.querySelector("span");
    if (symbol) symbol.textContent = collapsed ? "☰" : "×";
  };
  applyState(localStorage.getItem(storageName) === "true");
  toggle.addEventListener("click", () => {
    const collapsed = !shell.classList.contains("sidebar-collapsed");
    applyState(collapsed);
    localStorage.setItem(storageName, String(collapsed));
  });
}

function renderDashboard() {
  if (!dashboardRoot) return;

  const role = dashboardRoot.dataset.dashboardRole;
  const user = currentUser();

  if (!user || user.role !== role) {
    window.location.href = "login.html";
    return;
  }

  const state = loadState();
  const config = dashboardConfig(state, role);

  dashboardRoot.querySelector("[data-quick-value]").textContent = config.quick[0];
  dashboardRoot.querySelector("[data-quick-label]").textContent = config.quick[1];
  dashboardRoot.querySelector("[data-metrics]").innerHTML = config.metrics.join("");
  dashboardRoot.querySelector("[data-list-title]").textContent = config.title;
  dashboardRoot.querySelector("[data-primary-list]").innerHTML = config.rows.map(listItem).join("");
  const actionTitle = dashboardRoot.querySelector("[data-action-title]");
  if (actionTitle) {
    actionTitle.textContent = config.action;
  }

  const actionPanel = dashboardRoot.querySelector("[data-action-panel]");
  if (actionPanel) {
    actionPanel.innerHTML = config.actionHtml;
  }
  const trainerAllocationPanel = dashboardRoot.querySelector("[data-admin-trainer-allocation]");
  if (trainerAllocationPanel) {
    trainerAllocationPanel.innerHTML = role === "admin" ? renderTrainerAllocation(state) : "";
  }
  const planEditorPanel = dashboardRoot.querySelector("[data-admin-plan-editor]");
  if (planEditorPanel) {
    planEditorPanel.innerHTML = role === "admin" ? renderAdminPlanEditor(state) : "";
  }
  const subscriptionPanel = dashboardRoot.querySelector("[data-subscription-panel]");
  if (subscriptionPanel) {
    subscriptionPanel.innerHTML = renderSubscriptionPanel(state, role);
  }
  dashboardRoot.querySelector("[data-activity-list]").innerHTML = state.activity.map(listItem).join("");
  if (role === "admin") renderAdminReferenceOverview(state);

  const adminMemberForm = dashboardRoot.querySelector("[data-admin-member-form]");
  if (adminMemberForm) {
    adminMemberForm.innerHTML = role === "admin" ? renderAdminMemberForm(state) : "";
  }

  const adminTrainerForm = dashboardRoot.querySelector("[data-admin-trainer-form]");
  if (adminTrainerForm) {
    adminTrainerForm.innerHTML = role === "admin" ? renderAdminTrainerForm(state) : "";
  }

  const adminShiftSummary = dashboardRoot.querySelector("[data-admin-shift-summary]");
  if (adminShiftSummary) {
    adminShiftSummary.innerHTML = role === "admin" ? renderAdminShiftSummary(state) : "";
  }

  const adminInsights = dashboardRoot.querySelector("[data-admin-insights]");
  if (adminInsights) {
    adminInsights.innerHTML = role === "admin" ? renderAdminInsights(state) : "";
  }

  const adminWatch = dashboardRoot.querySelector("[data-admin-watch]");
  if (adminWatch) {
    adminWatch.innerHTML = role === "admin" ? renderAdminWatch(state) : "";
  }

  const adminAttendance = dashboardRoot.querySelector("[data-admin-attendance]");
  if (adminAttendance) {
    adminAttendance.innerHTML = role === "admin" ? renderAdminAttendancePanel(state) : "";
  }

  const adminPayments = dashboardRoot.querySelector("[data-admin-payments]");
  if (adminPayments) {
    adminPayments.innerHTML = role === "admin" ? renderAdminPaymentsPanel(state) : "";
  }

  const adminInvoices = dashboardRoot.querySelector("[data-admin-invoices]");
  if (adminInvoices) adminInvoices.innerHTML = role === "admin" ? renderAdminInvoicesPanel(state) : "";

  const adminLibraries = dashboardRoot.querySelector("[data-admin-libraries]");
  if (adminLibraries) {
    adminLibraries.innerHTML = role === "admin" ? renderAdminLibrariesPanel(state) : "";
  }

  const adminAiReports = dashboardRoot.querySelector("[data-admin-ai-reports]");
  if (adminAiReports) {
    adminAiReports.innerHTML = role === "admin" ? renderAdminAiReportsPanel(state) : "";
  }

  const adminDatabase = dashboardRoot.querySelector("[data-admin-database]");
  if (adminDatabase) {
    adminDatabase.innerHTML = role === "admin" ? renderAdminDatabasePanel(state) : "";
  }

  const trainerMembersPanel = dashboardRoot.querySelector("[data-trainer-members]");
  if (trainerMembersPanel) {
    trainerMembersPanel.innerHTML = role === "trainer" ? renderTrainerMembersPanel(state) : "";
  }

  const trainerInvoicesPanel = dashboardRoot.querySelector("[data-trainer-invoices]");
  if (trainerInvoicesPanel && role === "trainer") {
    const trainer = currentTrainer(state);
    trainerInvoicesPanel.innerHTML = renderInvoiceCards(state, recipientInvoices(state, "trainer", trainer?.id));
  }

  const trainerFocusPanel = dashboardRoot.querySelector("[data-trainer-focus]");
  if (trainerFocusPanel) {
    trainerFocusPanel.innerHTML = role === "trainer" ? renderTrainerFocusPanel(state) : "";
  }

  const trainerAssignPanel = dashboardRoot.querySelector("[data-trainer-assign]");
  if (trainerAssignPanel) {
    trainerAssignPanel.innerHTML = role === "trainer" ? renderTrainerAssignForm(state) : "";
  }

  const trainerCompletePanel = dashboardRoot.querySelector("[data-trainer-complete]");
  if (trainerCompletePanel) {
    trainerCompletePanel.innerHTML = role === "trainer" ? renderTrainerCompleteForm(state) : "";
  }

  const trainerDietPanel = dashboardRoot.querySelector("[data-trainer-diet]");
  if (trainerDietPanel) {
    trainerDietPanel.innerHTML = role === "trainer" ? renderTrainerDietPanel(state) : "";
  }

  const trainerProgressPanel = dashboardRoot.querySelector("[data-trainer-progress]");
  if (trainerProgressPanel) {
    trainerProgressPanel.innerHTML = role === "trainer" ? renderTrainerProgressPanel(state) : "";
  }

  const trainerAttendancePanel = dashboardRoot.querySelector("[data-trainer-attendance]");
  if (trainerAttendancePanel) {
    trainerAttendancePanel.innerHTML = role === "trainer" ? renderTrainerAttendancePanel(state) : "";
  }

  const trainerOwnAttendancePanel = dashboardRoot.querySelector("[data-trainer-own-attendance]");
  if (trainerOwnAttendancePanel) {
    trainerOwnAttendancePanel.innerHTML = role === "trainer" ? renderTrainerOwnAttendance(state) : "";
  }

  const trainerQrAttendancePanel = dashboardRoot.querySelector("[data-trainer-qr-attendance]");
  if (trainerQrAttendancePanel) {
    trainerQrAttendancePanel.innerHTML = role === "trainer" ? renderTrainerQrAttendance(state) : "";
  }

  const trainerCalendarHistoryPanel = dashboardRoot.querySelector("[data-trainer-calendar-history]");
  if (trainerCalendarHistoryPanel && role === "trainer") {
    const trainer = currentTrainer(state);
    trainerCalendarHistoryPanel.innerHTML = `${renderTrainerAttendanceCalendar(state, [trainer], "My Monthly Attendance")}${renderTrainerAttendanceHistory(state, trainer.id)}`;
  }

  const trainerMessagesPanel = dashboardRoot.querySelector("[data-trainer-messages]");
  if (trainerMessagesPanel) {
    trainerMessagesPanel.innerHTML = role === "trainer" ? renderTrainerMessagesPanel(state) : "";
  }

  const memberTrainerPanel = dashboardRoot.querySelector("[data-member-trainer]");
  if (memberTrainerPanel) {
    memberTrainerPanel.innerHTML = role === "member" ? renderMemberTrainerPanel(state) : "";
  }

  const memberWelcomePanel = dashboardRoot.querySelector("[data-member-welcome]");
  if (memberWelcomePanel) {
    memberWelcomePanel.innerHTML = role === "member" ? renderMemberWelcomePanel(state) : "";
  }

  const memberWellnessPanel = dashboardRoot.querySelector("[data-member-wellness]");
  if (memberWellnessPanel) {
    memberWellnessPanel.innerHTML = role === "member" ? renderMemberWellnessPanel(state) : "";
  }

  const memberProfilePanel = dashboardRoot.querySelector("[data-member-profile]");
  if (memberProfilePanel) {
    memberProfilePanel.innerHTML = role === "member" ? renderMemberProfilePanel(state) : "";
  }

  const memberProgressPanel = dashboardRoot.querySelector("[data-member-progress]");
  if (memberProgressPanel) {
    memberProgressPanel.innerHTML = role === "member" ? renderMemberProgressPanel(state) : "";
  }

  const memberNotificationsPanel = dashboardRoot.querySelector("[data-member-notifications]");
  if (memberNotificationsPanel) {
    memberNotificationsPanel.innerHTML = role === "member" ? renderMemberNotificationsPanel(state) : "";
  }

  const memberWorkoutPanel = dashboardRoot.querySelector("[data-member-workout]");
  if (memberWorkoutPanel) {
    memberWorkoutPanel.innerHTML = role === "member" ? renderMemberWorkoutPanel(state) : "";
  }

  const memberAttendancePanel = dashboardRoot.querySelector("[data-member-attendance]");
  if (memberAttendancePanel) {
    memberAttendancePanel.innerHTML = role === "member" ? renderMemberAttendancePanel(state) : "";
  }

  const memberPaymentsPanel = dashboardRoot.querySelector("[data-member-payments]");
  if (memberPaymentsPanel) {
    memberPaymentsPanel.innerHTML = role === "member" ? renderMemberPaymentsPanel(state) : "";
  }

  const memberInvoicesPanel = dashboardRoot.querySelector("[data-member-invoices]");
  if (memberInvoicesPanel && role === "member") {
    const member = selectedMember(state);
    memberInvoicesPanel.innerHTML = renderInvoiceCards(state, recipientInvoices(state, "member", member.id));
  }

  const memberAiToolsPanel = dashboardRoot.querySelector("[data-member-ai-tools]");
  if (memberAiToolsPanel) {
    memberAiToolsPanel.innerHTML = role === "member" ? renderMemberAiToolsPanel(state) : "";
  }

  const assistantPanel = document.querySelector("[data-member-ai-assistant]");
  if (assistantPanel && role === "member") {
    assistantPanel.innerHTML = renderMemberAssistant(state);
    if (memberAssistantShouldRemainOpen) {
      const pet = assistantPanel.querySelector("[data-ai-pet]");
      const panel = pet?.querySelector("[data-ai-pet-panel]");
      pet?.classList.add("open");
      pet?.querySelector(".ai-pet-toggle")?.setAttribute("aria-expanded", "true");
      panel?.setAttribute("aria-hidden", "false");
      if (panel) panel.inert = false;
    }
  }

  const dailyCoachPanel = dashboardRoot.querySelector("[data-daily-coach]");
  if (dailyCoachPanel) {
    dailyCoachPanel.innerHTML = role === "member" ? renderDailyCoach(state) : "";
  }

  bindActions(role, state);
  if (role === "member") bindDailyCoach(state);
}

document.querySelectorAll(".logout-link").forEach((link) => {
  link.addEventListener("click", () => {
    localStorage.removeItem("aiGymCurrentUser");
  });
});

function upsertSubscription(state, memberId, planName) {
  const plan = state.plans.find((item) => item.name === planName);
  const member = state.members.find((item) => item.id === memberId);
  const existing = state.subscriptions.find((item) => item.memberId === memberId);

  if (!plan || !member) return;

  member.plan = plan.name;
  member.status = "Active";

  if (existing) {
    existing.plan = plan.name;
    existing.amount = plan.price;
    existing.status = "Active";
  } else {
    state.subscriptions.push({ memberId, plan: plan.name, amount: plan.price, status: "Active" });
  }
}

function bindActions(role, state) {
  const interactionRoot = role === "member" ? document : dashboardRoot;
  const attendanceMemberSelect = dashboardRoot.querySelector("[data-admin-attendance-member]");
  attendanceMemberSelect?.addEventListener("change", () => {
    adminAttendanceMemberId = attendanceMemberSelect.value;
    renderDashboard();
  });
  const attendanceTrainerSelect = dashboardRoot.querySelector("[data-admin-attendance-trainer]");
  attendanceTrainerSelect?.addEventListener("change", () => {
    adminAttendanceTrainerId = attendanceTrainerSelect.value;
    renderDashboard();
  });

  interactionRoot.querySelectorAll("[data-ai-pet] .ai-pet-toggle").forEach((button) => {
    const pet = button.closest("[data-ai-pet]");
    const startRunning = () => pet?.classList.add("is-running");
    const resetLook = () => {
      pet?.classList.remove("is-running");
    };

    button.addEventListener("pointerenter", startRunning);
    button.addEventListener("pointerleave", resetLook);
    button.addEventListener("pointercancel", resetLook);
    button.addEventListener("focus", startRunning);
    button.addEventListener("blur", resetLook);
  });

  dashboardRoot.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      const member = selectedMember(state);
      const plan = state.plans.find(item => item.name === button.dataset.plan);
      if (plan) openPaymentPortal(state, member, plan);
    });
  });

  interactionRoot.querySelectorAll("[data-ai-prompt]").forEach((button) => {
    button.addEventListener("click", async () => {
      memberAssistantShouldRemainOpen = true;
      const member = selectedMember(state);
      const intent = button.dataset.aiPrompt;
      state.aiMessages[member.id] = assistantMessages(state, member);
      state.aiMessages[member.id].push({ from: "user", text: button.textContent });
      state.aiMessages[member.id].push({ from: "ai", text: "Thinking like your AI coach..." });
      saveState(state);
      renderDashboard();

      const freshState = loadState();
      const freshMember = selectedMember(freshState);
      freshState.aiMessages[freshMember.id] = assistantMessages(freshState, freshMember);
      freshState.aiMessages[freshMember.id].pop();
      freshState.aiMessages[freshMember.id].push({ from: "ai", text: await openAIAssistantReply(freshState, freshMember, intent, button.textContent) });
      addActivity(freshState, `AI assistant answered ${intent}`, "AI");
      saveState(freshState);
      renderDashboard();
    });
  });

  interactionRoot.querySelectorAll("form[data-action]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));

      if (form.dataset.action === "addMember") {
        if (state.members.some((member) => member.email.toLowerCase() === data.email.trim().toLowerCase())) {
          window.alert("A member with this email already exists.");
          return;
        }
        const id = nextEntityId(state.members, "M");
        state.members.push({ id, name: data.name, email: data.email, trainerId: data.trainerId, plan: "Free", status: "Trial", attendance: 0, progress: 0 });
        upsertSubscription(state, id, data.plan);
        state.payments.push({ memberId: id, amount: memberPlan(state, state.members.at(-1)).price, status: "Pending", invoice: `INV-${1001 + state.payments.length}` });
        addActivity(state, `Admin added member ${data.name}`, "Member");
      }

      if (form.dataset.action === "createInvoice") {
        const [recipientType, recipientId] = data.recipient.split(":");
        const sequence = state.invoices.reduce((max, invoice) => Math.max(max, Number(String(invoice.number || "").replace(/\D/g, "")) || 0), 2000) + 1;
        state.invoices.push({
          id: `I${String(sequence).padStart(5, "0")}`,
          number: `INV-${sequence}`,
          recipientType,
          recipientId,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          items: [{ description: data.description.trim(), quantity: Math.max(1, Number(data.quantity || 1)), amount: Math.max(0, Number(data.amount || 0)) }],
          discount: Math.max(0, Number(data.discount || 0)),
          taxRate: Math.max(0, Number(data.taxRate || 0)),
          paymentStatus: data.paymentStatus,
          status: "Draft",
          notes: data.notes?.trim() || "Payment is due by the date shown above.",
          createdAt: new Date().toISOString()
        });
        addActivity(state, `Admin created draft invoice INV-${sequence}`, "Invoice");
      }

      if (form.dataset.action === "addTrainer") {
        const id = nextEntityId(state.trainers, "T");
        state.trainers.push({ id, name: data.name, specialty: data.specialty, sessions: 0, score: 90 });
        addActivity(state, `Admin added trainer ${data.name}`, "Trainer");
      }

      if (form.dataset.action === "updatePayment") {
        const payment = state.payments.find((item) => item.memberId === data.memberId);
        if (payment) {
          payment.status = data.status;
          if (data.status === "Paid" && payment.requestedPlan) upsertSubscription(state, payment.memberId, payment.requestedPlan);
          addActivity(state, `Admin marked ${memberName(state, data.memberId)} payment ${data.status}`, "Billing");
        }
      }

      if (form.dataset.action === "addTemplate") {
        const library = ["dietTemplates", "workoutTemplates"].includes(data.library) ? data.library : "workoutTemplates";
        const name = data.name.trim();
        if (name && !state[library].some((item) => item.toLowerCase() === name.toLowerCase())) {
          state[library].push(name);
          addActivity(state, `Admin added ${name} template`, "Library");
        }
      }

      if (form.dataset.action === "adminAttendance") {
        const member = state.members.find((item) => item.id === data.memberId);
        state.attendanceLog = Array.isArray(state.attendanceLog) ? state.attendanceLog : [];
        const date = todayDateKey();
        const record = state.attendanceLog.find((item) => item.memberId === data.memberId && item.date === date);
        const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
        if (member && !record) {
          state.attendanceLog.unshift({ id: `A${String(state.attendanceLog.length + 1).padStart(4, "0")}`, memberId: member.id, date, time });
          member.attendance = Number(member.attendance || 0) + 1;
          addActivity(state, `Admin checked in ${member.name}`, "Check-in");
        } else if (member && record && !record.checkOutTime) {
          record.checkOutTime = time;
          addActivity(state, `Admin checked out ${member.name}`, "Check-out");
        } else if (member) {
          window.alert(`${member.name} is already checked out today.`);
          return;
        }
      }

      if (form.dataset.action === "adminTrainerAttendance") {
        const trainer = state.trainers.find((item) => item.id === data.trainerId);
        const existing = trainer ? trainerAttendanceRecord(state, trainer.id) : null;
        const now = new Date();
        const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(now);
        if (trainer && data.attendanceAction === "checkIn" && !existing) {
          state.trainerAttendanceLog.unshift({ id: `TA${String(state.trainerAttendanceLog.length + 1).padStart(4, "0")}`, trainerId: trainer.id, date: todayDateKey(), time, checkInAt: now.toISOString(), source: "Admin" });
          addActivity(state, `Admin checked in trainer ${trainer.name}`, "Trainer attendance");
        } else if (trainer && data.attendanceAction === "checkOut" && existing && !existing.checkOutTime) {
          existing.checkOutTime = time;
          existing.checkOutAt = now.toISOString();
          addActivity(state, `Admin checked out trainer ${trainer.name}`, "Trainer attendance");
        } else {
          window.alert("This trainer attendance action has already been completed today.");
          return;
        }
      }

      if (form.dataset.action === "importBackup") {
        const file = form.elements.backup?.files?.[0];
        if (!file) return;
        try {
          const restored = JSON.parse(await file.text());
          if (!restored || !Array.isArray(restored.members) || !Array.isArray(restored.trainers)) throw new Error("Invalid backup");
          Object.keys(state).forEach((key) => delete state[key]);
          Object.assign(state, restored);
          addActivity(state, "Admin restored a JSON backup", "System");
        } catch (_error) {
          window.alert("That file is not a valid AI Gym backup.");
          return;
        }
      }

      if (form.dataset.action === "assignTrainer") {
        const member = state.members.find((item) => item.id === data.memberId);
        const trainer = state.trainers.find((item) => item.id === data.trainerId);

        if (member && trainer) {
          member.trainerId = trainer.id;
          addActivity(state, `Admin allocated ${member.name} to ${trainer.name}`, "Trainer");
        }
      }

      if (form.dataset.action === "addEquipment") {
        const id = `E${String(state.equipment.length + 1).padStart(3, "0")}`;
        const count = Math.max(1, Number(data.count || 1));
        state.equipment.push({ id, name: data.name.trim(), count, status: "Ready" });
        addActivity(state, `Admin added ${data.name.trim()}`, "Equipment");
      }

      if (form.dataset.action === "editPlan") {
        const index = Number(data.index);
        const oldName = data.oldName;
        const plan = state.plans[index];
        const nextName = data.name.trim();
        const nextPrice = Math.max(0, Number(data.price || 0));

        if (plan && nextName) {
          plan.name = nextName;
          plan.price = nextPrice;
          plan.label = data.label.trim();

          state.members.forEach((member) => {
            if (member.plan === oldName) member.plan = nextName;
          });

          state.subscriptions.forEach((subscription) => {
            if (subscription.plan === oldName) {
              subscription.plan = nextName;
              subscription.amount = nextPrice;
            }
          });

          addActivity(state, `Admin updated ${nextName} plan`, "Billing");
        }
      }

      if (form.dataset.action === "assignWorkout") {
        const assignedIds = new Set(trainerMembers(state).map((member) => member.id));
        const member = state.members.find((item) => item.id === data.memberId);

        if (member && (role !== "trainer" || assignedIds.has(member.id))) {
          state.workouts.unshift({ memberId: data.memberId, title: data.title.trim(), tag: data.tag.trim(), done: false });
          addActivity(state, `Trainer assigned ${data.title.trim()} to ${member.name}`, "Workout");
        }
      }

      if (form.dataset.action === "completeSession") {
        const trainer = currentTrainer(state);
        const member = state.members.find((item) => item.id === data.memberId);
        const assignedIds = new Set(trainerMembers(state, trainer).map((item) => item.id));

        if (trainer && member && assignedIds.has(member.id)) {
          const pending = state.workouts.find((workout) => workout.memberId === member.id && !workout.done);
          if (pending) pending.done = true;

          trainer.sessions = Math.max(0, Number(trainer.sessions || 0) - 1);
          trainer.score = Math.min(100, Number(trainer.score || 0) + 1);
          member.attendance += 1;
          member.progress = Math.min(100, member.progress + 5);

          const note = data.note?.trim();
          addActivity(state, `${trainer.name} coached ${member.name}${note ? `: ${note}` : ""}`, "Session");
        }
      }

      if (form.dataset.action === "editProfile") {
        const member = selectedMember(state);
        const photoFile = form.elements.photo?.files?.[0];
        member.age = Math.max(1, Number(data.age || member.age));
        member.gender = data.gender;
        member.height = Math.max(80, Number(data.height || member.height));
        member.weight = Math.max(20, Number(data.weight || member.weight));
        member.medicalHistory = data.medicalHistory.trim();
        member.emergencyContact = data.emergencyContact.trim();
        if (photoFile) {
          member.photo = await imageFileToDataUrl(photoFile);
        }
        addActivity(state, `${member.name} updated profile`, "Profile");
      }

      if (form.dataset.action === "askAssistant") {
        memberAssistantShouldRemainOpen = true;
        const member = selectedMember(state);
        const question = data.question.trim();
        state.aiMessages[member.id] = assistantMessages(state, member);
        state.aiMessages[member.id].push({ from: "user", text: question });
        state.aiMessages[member.id].push({ from: "ai", text: "Thinking like your AI coach..." });
        addActivity(state, "Member asked AI assistant", "AI");
        saveState(state);
        renderDashboard();

        const freshState = loadState();
        const freshMember = selectedMember(freshState);
        freshState.aiMessages[freshMember.id] = assistantMessages(freshState, freshMember);
        freshState.aiMessages[freshMember.id].pop();
        freshState.aiMessages[freshMember.id].push({ from: "ai", text: await openAIAssistantReply(freshState, freshMember, "custom", question) });
        saveState(freshState);
        renderDashboard();
        return;
      }

      saveState(state);
      renderDashboard();
    });
  });

  interactionRoot.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "toggleMemberList") {
        memberListExpanded = !memberListExpanded;
        renderDashboard();
        return;
      }

      if (button.dataset.action === "togglePet") {
        const pet = button.closest("[data-ai-pet]");
        const isOpen = pet?.classList.toggle("open") || false;
        button.setAttribute("aria-expanded", String(isOpen));
        const panel = pet?.querySelector("[data-ai-pet-panel]");
        panel?.setAttribute("aria-hidden", String(!isOpen));
        if (panel) panel.inert = !isOpen;
        memberAssistantShouldRemainOpen = isOpen;
        if (isOpen) window.setTimeout(() => pet?.querySelector(".ai-chat-form input")?.focus(), 220);
        return;
      }

      if (button.dataset.action === "closePet") {
        memberAssistantShouldRemainOpen = false;
        const pet = button.closest("[data-ai-pet]");
        pet?.classList.remove("open");
        pet?.querySelector(".ai-pet-toggle")?.setAttribute("aria-expanded", "false");
        const panel = pet?.querySelector("[data-ai-pet-panel]");
        panel?.setAttribute("aria-hidden", "true");
        if (panel) panel.inert = true;
        return;
      }

      if (button.dataset.action === "removeEquipment") {
        const equipment = state.equipment.find((item) => item.id === button.dataset.id);
        state.equipment = state.equipment.filter((item) => item.id !== button.dataset.id);
        addActivity(state, `Admin removed ${equipment?.name || "equipment"}`, "Equipment");
      }

      if (button.dataset.action === "toggleMemberStatus") {
        const member = state.members.find((item) => item.id === button.dataset.id);
        if (member) {
          member.status = member.status === "Active" ? "Paused" : "Active";
          const subscription = state.subscriptions.find((item) => item.memberId === member.id);
          if (subscription) subscription.status = member.status;
          addActivity(state, `Admin changed ${member.name} to ${member.status}`, "Member");
        }
      }

      if (button.dataset.action === "removeMember") {
        const member = state.members.find((item) => item.id === button.dataset.id);
        if (!member || !window.confirm(`Remove ${member.name} and all linked records?`)) return;
        state.members = state.members.filter((item) => item.id !== member.id);
        state.subscriptions = state.subscriptions.filter((item) => item.memberId !== member.id);
        state.payments = state.payments.filter((item) => item.memberId !== member.id);
        state.workouts = state.workouts.filter((item) => item.memberId !== member.id);
        state.attendanceLog = (state.attendanceLog || []).filter((item) => item.memberId !== member.id);
        delete state.aiMessages?.[member.id];
        addActivity(state, `Admin removed ${member.name}`, "Member");
      }

      if (button.dataset.action === "removeTrainer") {
        const trainer = state.trainers.find((item) => item.id === button.dataset.id);
        if (!trainer) return;
        if (state.members.some((member) => member.trainerId === trainer.id)) {
          window.alert("Reassign this trainer's members before removing the trainer.");
          return;
        }
        if (!window.confirm(`Remove trainer ${trainer.name}?`)) return;
        state.trainers = state.trainers.filter((item) => item.id !== trainer.id);
        addActivity(state, `Admin removed trainer ${trainer.name}`, "Trainer");
      }

      if (button.dataset.action === "removeTemplate") {
        const library = button.dataset.library;
        if (["dietTemplates", "workoutTemplates"].includes(library)) {
          state[library] = state[library].filter((item) => item !== button.dataset.name);
          addActivity(state, `Admin removed ${button.dataset.name} template`, "Library");
        }
      }

      if (button.dataset.action === "exportMembersCsv") {
        const rows = [["ID", "Name", "Email", "Plan", "Status", "Trainer"], ...state.members.map((member) => [member.id, member.name, member.email, member.plan, member.status, trainerName(state, member.trainerId)])];
        downloadTextFile("ai-gym-members.csv", rows.map((row) => row.map(csvValue).join(",")).join("\n"), "text/csv");
        return;
      }

      if (button.dataset.action === "downloadInvoice") {
        const invoice = state.invoices.find((item) => item.id === button.dataset.id);
        if (invoice) downloadInvoice(state, invoice);
        return;
      }

      if (button.dataset.action === "trainerCheckIn") {
        const trainer = currentTrainer(state);
        if (trainer && !trainerAttendanceRecord(state, trainer.id)) {
          const now = new Date();
          const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(now);
          state.trainerAttendanceLog.unshift({ id: `TA${String(state.trainerAttendanceLog.length + 1).padStart(4, "0")}`, trainerId: trainer.id, date: todayDateKey(), time, checkInAt: now.toISOString(), source: "Trainer" });
          addActivity(state, `${trainer.name} checked in`, "Trainer attendance");
        }
      }

      if (button.dataset.action === "trainerCheckOut") {
        const trainer = currentTrainer(state);
        const record = trainer ? trainerAttendanceRecord(state, trainer.id) : null;
        if (record && !record.checkOutTime) {
          const now = new Date();
          record.checkOutTime = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(now);
          record.checkOutAt = now.toISOString();
          addActivity(state, `${trainer.name} checked out`, "Trainer attendance");
        }
      }

      if (button.dataset.action === "issueInvoice") {
        const invoice = state.invoices.find((item) => item.id === button.dataset.id);
        if (invoice) {
          invoice.status = "Issued";
          invoice.issuedAt = new Date().toISOString();
          addActivity(state, `Admin issued ${invoice.number} to ${invoiceRecipient(state, invoice)?.name || invoice.recipientId}`, "Invoice");
        }
      }

      if (button.dataset.action === "toggleInvoicePayment") {
        const invoice = state.invoices.find((item) => item.id === button.dataset.id);
        if (invoice) {
          invoice.paymentStatus = invoice.paymentStatus === "Paid" ? "Unpaid" : "Paid";
          addActivity(state, `Admin marked ${invoice.number} ${invoice.paymentStatus}`, "Invoice");
        }
      }

      if (button.dataset.action === "exportPaymentsCsv") {
        const rows = [["Member", "Invoice", "Amount", "Status"], ...state.payments.map((payment) => [memberName(state, payment.memberId), payment.invoice, payment.amount, payment.status])];
        downloadTextFile("ai-gym-payments.csv", rows.map((row) => row.map(csvValue).join(",")).join("\n"), "text/csv");
        return;
      }

      if (button.dataset.action === "exportAdminData") {
        downloadTextFile(`ai-gym-backup-${todayDateKey()}.json`, JSON.stringify(state, null, 2));
        return;
      }

      if (button.dataset.action === "resetAdminData") {
        if (!window.confirm("Reset all dashboard data to the original demo records?")) return;
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, clone(defaultState));
        addActivity(state, "Admin reset demo data", "System");
      }

      if (button.dataset.action === "bookTrainer") {
        const member = selectedMember(state);
        const alreadyPending = state.workouts.some((workout) => workout.memberId === member.id && !workout.done && workout.tag === "Booking");

        if (!alreadyPending) {
          state.workouts.unshift({ memberId: member.id, title: "Trainer review session requested", tag: "Booking", done: false });
          addActivity(state, `${member.name} booked trainer review`, "Booking");
        } else {
          addActivity(state, `${member.name} already has a trainer review open`, "Booking");
        }
      }

      if (button.dataset.action === "markAttendance") {
        const member = selectedMember(state);
        state.attendanceLog = Array.isArray(state.attendanceLog) ? state.attendanceLog : [];
        const date = todayDateKey();
        const existing = attendanceRecordForDate(state, member.id, date);
        if (!existing) {
          const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).format(new Date());
          state.attendanceLog.unshift({ id: `A${String(state.attendanceLog.length + 1).padStart(4, "0")}`, memberId: member.id, date, time });
          member.attendance += 1;
          member.progress = Math.min(100, member.progress + 2);
          addActivity(state, `${member.name} logged a gym visit`, "Check-in");
        } else {
          addActivity(state, `${member.name} is already checked in today`, "Check-in");
        }
      }

      if (button.dataset.action === "logWater") {
        const member = selectedMember(state);
        member.waterIntake = Math.min(Number(member.waterTarget || 3), Number(member.waterIntake || 0) + 0.5);
        addActivity(state, `${member.name} logged water intake`, "Water");
      }

      if (button.dataset.action === "requestDietPlan") {
        const member = selectedMember(state);
        const alreadyPending = state.workouts.some((workout) => workout.memberId === member.id && !workout.done && workout.tag === "Diet");

        if (!alreadyPending) {
          state.workouts.unshift({ memberId: member.id, title: "Diet plan update requested", tag: "Diet", done: false });
          addActivity(state, `${member.name} requested diet update`, "Diet");
        } else {
          addActivity(state, `${member.name} already has a diet request open`, "Diet");
        }
      }

      if (button.dataset.action === "completeWorkout") {
        const member = selectedMember(state);
        const pending = state.workouts.filter((workout) => workout.memberId === member.id && !workout.done && !["Booking", "Diet"].includes(workout.tag));
        const workout = pending[Number(button.dataset.index)];
        if (workout) {
          workout.done = true;
          member.attendance += 1;
          member.progress = Math.min(100, member.progress + 4);
          addActivity(state, `${member.name} completed ${workout.title}`, "Done");
        }
      }

      if (button.dataset.action === "renewMembership") {
        const member = selectedMember(state);
        const plan = state.plans.find(item => item.name === member.plan) || memberPlan(state, member);
        openPaymentPortal(state, member, plan);
        return;
      }

      if (button.dataset.action === "generateAiWorkout") {
        const member = selectedMember(state);
        const title = member.goal.toLowerCase().includes("fat") ? "AI fat loss circuit" : "AI strength progression";
        state.workouts.unshift({ memberId: member.id, title, tag: "45 min", done: false });
        addActivity(state, `AI generated workout for ${member.name}`, "AI");
        const report = buildAiFitnessReport(state, member, "workout");
        saveState(state);
        renderDashboard();
        openAiFitnessReport(report);
        return;
      }

      if (button.dataset.action === "generateAiDiet") {
        const member = selectedMember(state);
        member.caloriesLogged = Math.min(Number(member.caloriesTarget || 0), Number(member.caloriesLogged || 0) + 250);
        state.workouts.unshift({ memberId: member.id, title: "AI diet chart updated", tag: "Diet", done: false });
        addActivity(state, `AI generated diet chart for ${member.name}`, "AI");
        const report = buildAiFitnessReport(state, member, "diet");
        saveState(state);
        renderDashboard();
        openAiFitnessReport(report);
        return;
      }

      saveState(state);
      renderDashboard();
    });
  });

  if (role === "admin") setupAdminReferenceUI();
  if (role === "trainer" || role === "member") setupRoleReferenceNavigation();
  setupCollapsibleSidebar();

  if (!document.documentElement.dataset.aiCoachEscapeBound) {
    document.documentElement.dataset.aiCoachEscapeBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const pet = document.querySelector("[data-ai-pet].open");
      if (!pet) return;
      memberAssistantShouldRemainOpen = false;
      pet.classList.remove("open");
      pet.querySelector(".ai-pet-toggle")?.setAttribute("aria-expanded", "false");
      const panel = pet.querySelector("[data-ai-pet-panel]");
      panel?.setAttribute("aria-hidden", "true");
      if (panel) panel.inert = true;
      pet.querySelector(".ai-pet-toggle")?.focus();
    });
  }
}

async function hydrateStateFromServer() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/state`);
    if (!response.ok) throw new Error("State API unavailable");
    const state = await response.json();
    localStorage.setItem(storageKey, JSON.stringify(state));
    serverSyncReady = true;
    renderDashboard();
  } catch (error) {
    serverSyncReady = false;
  }
}

function setupAutoHidingDashboardHeader() {
  if (document.documentElement.dataset.dashboardHeaderScrollBound) return;
  const header = document.querySelector(".role-utility-bar, .admin-utility-bar");
  if (!header) return;

  document.documentElement.dataset.dashboardHeaderScrollBound = "true";
  let ticking = false;

  const updateHeader = () => {
    document.documentElement.classList.toggle("dashboard-header-hidden", window.scrollY > 32);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });

  updateHeader();
}

renderDashboard();
hydrateStateFromServer();
setupAutoHidingDashboardHeader();

/* Refresh server-backed attendance whenever the member returns from the check-in page. */
if (!document.documentElement.dataset.attendanceRefreshBound) {
  document.documentElement.dataset.attendanceRefreshBound = "true";
  window.addEventListener("focus", () => hydrateStateFromServer());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") hydrateStateFromServer();
  });
}
