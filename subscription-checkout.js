const params = new URLSearchParams(window.location.search);
const leadId = params.get("leadId") || "";
const plan = params.get("plan") || "starter";
const message = document.querySelector("#checkoutMessage");
const button = document.querySelector("#confirmPayment");

document.querySelector("#subscriptionQr").src = `/api/subscription-qr?leadId=${encodeURIComponent(leadId)}&plan=${encodeURIComponent(plan)}`;

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "Activating your trial…";
  message.textContent = "";
  try {
    const response = await fetch("/api/activate-trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, plan }) });
    const account = await response.json();
    if (!response.ok) throw new Error(account.message || "Unable to activate the trial.");
    localStorage.setItem("aiGymCurrentUser", JSON.stringify({ email: account.email, name: account.name, role: account.role, token: account.token, tenantId: account.tenantId, tenantName: account.tenantName, trialEndsAt: account.trialEndsAt }));
    sessionStorage.setItem("aiGymTrialWelcome", JSON.stringify({ tenantName: account.tenantName, trialEndsAt: account.trialEndsAt, redirect: account.redirect }));
    window.location.href = "thank-you.html?trial=activated";
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
    button.textContent = "I have completed payment";
  }
});
