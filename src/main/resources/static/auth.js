const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const registerForm = document.querySelector("#registerForm");
const registerMessage = document.querySelector("#registerMessage");

const users = {
  "admin@aigym.com": {
    password: "admin123",
    role: "admin",
    redirect: "admin-dashboard.html"
  },
  "trainer@aigym.com": {
    password: "trainer123",
    role: "trainer",
    redirect: "trainer-dashboard.html"
  },
  "member@aigym.com": {
    password: "member123",
    role: "member",
    redirect: "member-dashboard.html"
  }
};

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
      localStorage.setItem("aiGymCurrentUser", JSON.stringify({ email: user.email, role: user.role, token: user.token }));
      window.location.href = user.redirect;
    } catch (error) {
      const user = users[email];

      if (!user || user.password !== password) {
        setMessage(loginMessage, error.message || "Invalid email or password.");
        return;
      }

      localStorage.setItem("aiGymCurrentUser", JSON.stringify({ email, role: user.role }));
      window.location.href = user.redirect;
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#registerName").value.trim();
    const email = document.querySelector("#registerEmail").value.trim().toLowerCase();
    const password = document.querySelector("#registerPassword").value;

    try {
      const user = await postJson("/api/register", { name, email, password });
      localStorage.setItem("aiGymCurrentUser", JSON.stringify({ email: user.email, role: user.role }));
      window.location.href = user.redirect;
    } catch (error) {
      setMessage(registerMessage, error.message || "Registration failed.");
    }
  });
}
