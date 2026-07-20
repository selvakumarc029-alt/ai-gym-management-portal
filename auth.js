const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const registerForm = document.querySelector("#registerForm");
const registerMessage = document.querySelector("#registerMessage");

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function setMessage(element, text) {
  if (!element) return;
  element.textContent = text;
  element.classList.add("show");
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
    const password = document.querySelector("#loginPassword").value;

    try {
      const user = await postJson("/api/login", { email, password });
      localStorage.setItem("aiGymCurrentUser", JSON.stringify({ email: user.email, name: user.name, role: user.role, token: user.token, tenantId: user.tenantId, tenantName: user.tenantName }));
      window.location.href = user.redirect;
    } catch (error) {
      setMessage(loginMessage, error.message || "Invalid email or password.");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#registerName").value.trim();
    const email = document.querySelector("#registerEmail").value.trim().toLowerCase();
    const phone = document.querySelector("#registerPhone").value.trim();
    const gymName = document.querySelector("#registerGymName").value.trim();
    const gymAddress = document.querySelector("#registerGymAddress").value.trim();

    try {
      const lead = await postJson("/api/leads", { name, email, phone, gymName, gymAddress });
      const requestedPlan = new URLSearchParams(window.location.search).get("plan") || "starter";
      window.location.href = `subscription-checkout.html?leadId=${encodeURIComponent(lead.leadId)}&plan=${encodeURIComponent(requestedPlan)}`;
    } catch (error) {
      setMessage(registerMessage, error.message || "Registration failed.");
    }
  });
}
