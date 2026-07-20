const params = new URLSearchParams(window.location.search);
const memberId = params.get("memberId") || "";
const trainerId = params.get("trainerId") || "";
const isTrainer = Boolean(trainerId);
const entityId = trainerId || memberId;
const intro = document.querySelector("#attendanceIntro");
const memberIdLabel = document.querySelector("#attendanceMemberId");
const button = document.querySelector("#markAttendanceButton");
const checkoutButton = document.querySelector("#checkoutButton");
const message = document.querySelector("#attendanceMessage");
const portalStatus = document.querySelector("#portalAttendanceStatus");
const portalTime = document.querySelector("#portalAttendanceTime");
const portalPresent = document.querySelector("#portalPresentCount");
const portalAbsent = document.querySelector("#portalAbsentCount");
const portalCompleted = document.querySelector("#portalCompletedCount");
const apiBaseUrl = window.location.port === "5600" ? "" : "http://localhost:5600";
const currentUser = (() => { try { return JSON.parse(localStorage.getItem("aiGymCurrentUser") || "null"); } catch { return null; } })();
const authHeaders = { "Authorization": `Bearer ${currentUser?.token || ""}` };

function localTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

memberIdLabel.textContent = entityId || "Missing";
document.querySelector(".attendance-member-card span").textContent = isTrainer ? "Trainer ID" : "Member ID";
document.querySelector(".attendance-back-link").href = isTrainer ? "trainer-dashboard.html#attendance" : "member-dashboard.html";

function showMessage(text, type = "info") {
  message.textContent = text;
  message.dataset.type = type;
}

function updatePortalOverview(state, record) {
  const today = localTodayDateKey();
  const month = today.slice(0, 7);
  const log = (isTrainer ? state.trainerAttendanceLog : state.attendanceLog) || [];
  const records = log.filter((item) => (isTrainer ? item.trainerId === trainerId : item.memberId === memberId) && String(item.date).slice(0, 7) === month);
  const elapsedDays = Number(today.slice(-2));
  portalStatus.textContent = !record ? "Not checked in" : record.checkOutTime ? "Shift completed" : "Present";
  portalTime.textContent = !record ? "Mark your arrival to begin" : `Check-in ${record.time}${record.checkOutTime ? ` · Check-out ${record.checkOutTime}` : ""}`;
  portalPresent.textContent = records.length;
  portalAbsent.textContent = Math.max(0, elapsedDays - records.length);
  portalCompleted.textContent = records.filter((item) => item.checkOutTime).length;
}

async function loadMember() {
  if (!entityId) {
    intro.textContent = "This QR code does not include an attendance ID.";
    button.disabled = true;
    checkoutButton.disabled = true;
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/state`, { headers: authHeaders });
    if (response.status === 401 || response.status === 403) { window.location.href = "login.html"; return; }
    const state = await response.json();
    const member = isTrainer ? state.trainers.find((item) => item.id === trainerId) : state.members.find((item) => item.id === memberId);

    if (!member) {
      intro.textContent = `${isTrainer ? "Trainer" : "Member"} not found. Please ask the gym desk to issue a new QR code.`;
      button.disabled = true;
      checkoutButton.disabled = true;
      return;
    }

    const today = localTodayDateKey();
    const log = isTrainer ? state.trainerAttendanceLog : state.attendanceLog;
    const record = Array.isArray(log)
      ? log.find((item) => (isTrainer ? item.trainerId === trainerId : item.memberId === memberId) && item.date === today)
      : null;

    updatePortalOverview(state, record);

    intro.textContent = `Welcome ${member.name}. Use check-in when you enter and checkout when you leave.`;
    if (record?.checkOutTime) {
      button.disabled = true;
      checkoutButton.disabled = true;
      showMessage(`Today complete: ${record.time} to ${record.checkOutTime}.`, "success");
    } else if (record) {
      button.disabled = true;
      checkoutButton.disabled = false;
      showMessage(`Checked in at ${record.time}. Checkout when you leave.`, "info");
    }
  } catch (error) {
    intro.textContent = "Attendance server is not reachable.";
    button.disabled = true;
    checkoutButton.disabled = true;
  }
}

button.addEventListener("click", async () => {
  button.disabled = true;
  showMessage("Marking attendance...");

  try {
    const response = await fetch(`${apiBaseUrl}/api/attendance/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(isTrainer ? { trainerId } : { memberId })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Unable to mark attendance.");

    showMessage(data.message, data.alreadyCheckedIn ? "info" : "success");
    button.textContent = data.alreadyCheckedIn ? "Already Checked In" : "Attendance Marked";
    checkoutButton.disabled = false;
    await loadMember();
  } catch (error) {
    button.disabled = false;
    showMessage(error.message || "Unable to mark attendance.", "error");
  }
});

checkoutButton.addEventListener("click", async () => {
  checkoutButton.disabled = true;
  showMessage("Marking checkout...");

  try {
    const response = await fetch(`${apiBaseUrl}/api/attendance/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(isTrainer ? { trainerId } : { memberId })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Unable to mark checkout.");

    showMessage(data.message, data.alreadyCheckedOut ? "info" : "success");
    checkoutButton.textContent = data.alreadyCheckedOut ? "Already Checked Out" : "Checkout Marked";
    button.disabled = true;
    await loadMember();
  } catch (error) {
    checkoutButton.disabled = false;
    showMessage(error.message || "Unable to mark checkout.", "error");
  }
});

loadMember();
