const welcome = (() => {
  try { return JSON.parse(sessionStorage.getItem("aiGymTrialWelcome") || "null"); }
  catch { return null; }
})();

if (welcome && new URLSearchParams(window.location.search).get("trial") === "activated") {
  const endDate = new Date(welcome.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  document.querySelector("#thankYouMessage").textContent = `${welcome.tenantName} has been created successfully. Your seven-day free trial is now active until ${endDate}.`;
  const detail = document.querySelector("#thankYouDetail");
  const action = document.querySelector("#thankYouAction");
  let seconds = 5;
  const update = () => { detail.textContent = `Redirecting to your Admin Dashboard in ${seconds} second${seconds === 1 ? "" : "s"}…`; };
  update();
  action.textContent = "Open Admin Dashboard now";
  action.href = welcome.redirect || "admin-dashboard.html";
  const timer = setInterval(() => {
    seconds -= 1;
    update();
    if (seconds <= 0) {
      clearInterval(timer);
      sessionStorage.removeItem("aiGymTrialWelcome");
      window.location.href = welcome.redirect || "admin-dashboard.html";
    }
  }, 1000);
}
