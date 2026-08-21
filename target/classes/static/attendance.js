const params = new URLSearchParams(window.location.search);
const memberId = params.get("memberId") || "";
const intro = document.querySelector("#attendanceIntro");
const memberIdLabel = document.querySelector("#attendanceMemberId");
const button = document.querySelector("#markAttendanceButton");
const checkoutButton = document.querySelector("#checkoutButton");
const message = document.querySelector("#attendanceMessage");
const apiBaseUrl = window.location.port === "5600" ? "" : "http://localhost:5600";

function localTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

memberIdLabel.textContent = memberId || "Missing";

function showMessage(text, type = "info") {
  message.textContent = text;
  message.dataset.type = type;
}

async function loadMember() {
  if (!memberId) {
    intro.textContent = "This QR code does not include a member ID.";
    button.disabled = true;
    checkoutButton.disabled = true;
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/state`);
    const state = await response.json();
    const member = state.members.find((item) => item.id === memberId);

    if (!member) {
      intro.textContent = "Member not found. Please ask the gym desk to issue a new QR code.";
      button.disabled = true;
      checkoutButton.disabled = true;
      return;
    }

    const today = localTodayDateKey();
    const record = Array.isArray(state.attendanceLog)
      ? state.attendanceLog.find((item) => item.memberId === memberId && item.date === today)
      : null;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Unable to mark attendance.");

    showMessage(data.message, data.alreadyCheckedIn ? "info" : "success");
    button.textContent = data.alreadyCheckedIn ? "Already Checked In" : "Attendance Marked";
    checkoutButton.disabled = false;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Unable to mark checkout.");

    showMessage(data.message, data.alreadyCheckedOut ? "info" : "success");
    checkoutButton.textContent = data.alreadyCheckedOut ? "Already Checked Out" : "Checkout Marked";
    button.disabled = true;
  } catch (error) {
    checkoutButton.disabled = false;
    showMessage(error.message || "Unable to mark checkout.", "error");
  }
});

loadMember();
