const baseUrl = process.env.APP_URL || "http://localhost:5600";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function run() {
  const home = await fetch(`${baseUrl}/`);
  console.log(`GET / -> ${home.status}`);

  const state = await request("/api/state");
  console.log(`GET /api/state -> ${state.status}`);

  const login = await request("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@aigym.com", password: "admin123" })
  });
  console.log(`POST /api/login -> ${login.status} (${login.body.role || login.body.message})`);

  const qr = await fetch(`${baseUrl}/api/qr?memberId=M001`);
  console.log(`GET /api/qr?memberId=M001 -> ${qr.status} (${qr.headers.get("content-type")})`);

  if (process.env.TEST_ATTENDANCE === "1") {
    const attendance = await request("/api/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ memberId: "M001" })
    });
    console.log(`POST /api/attendance/check-in -> ${attendance.status} (${attendance.body.message})`);

    const checkout = await request("/api/attendance/check-out", {
      method: "POST",
      body: JSON.stringify({ memberId: "M001" })
    });
    console.log(`POST /api/attendance/check-out -> ${checkout.status} (${checkout.body.message})`);
  }

  if (process.env.TEST_REGISTER === "1") {
    const uniqueEmail = `smoke.${Date.now()}@example.com`;
    const register = await request("/api/register", {
      method: "POST",
      body: JSON.stringify({ name: "Smoke Test", email: uniqueEmail, password: "test123" })
    });
    console.log(`POST /api/register -> ${register.status} (${register.body.role || register.body.message})`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
