(() => {
  const current = (() => { try { return JSON.parse(localStorage.getItem("aiGymCurrentUser") || "null"); } catch { return null; } })();
  if (!current?.token || current.role === "member") return;
  const host = document.querySelector(".admin-utility-bar, .role-utility-bar, main>header");
  if (!host) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "shared-profile-button";
  button.innerHTML = `<span>${String(current.name || current.role).split(/\s+/).map(part => part[0]).join("").slice(0,2).toUpperCase()}</span><em>Edit profile</em>`;
  host.appendChild(button);

  const dialog = document.createElement("dialog");
  dialog.className = "shared-profile-dialog";
  dialog.innerHTML = `<form><header><div><small>ACCOUNT SETTINGS</small><h2>Edit Profile</h2></div><button type="button" data-profile-close aria-label="Close">×</button></header><div class="shared-profile-photo"><span data-profile-preview></span><label>Choose photo<input type="file" name="photoFile" accept="image/*"></label></div><div class="shared-profile-grid"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" readonly></label><label>Phone number<input name="phone" type="tel" placeholder="+91 98765 43210"></label><label>Role<input name="role" readonly></label><label class="full">Address<textarea name="address" rows="3" placeholder="Street, city, state and PIN code"></textarea></label><label class="full">About<textarea name="bio" rows="3" placeholder="A short professional introduction"></textarea></label></div><p data-profile-message></p><footer><button type="button" data-profile-close>Cancel</button><button class="save" type="submit">Save profile</button></footer></form>`;
  document.body.appendChild(dialog);
  let profile = null;
  const preview = dialog.querySelector("[data-profile-preview]");
  const setPreview = value => { preview.innerHTML = value ? `<img src="${value}" alt="Profile photo">` : String(profile?.name || current.name || "U").split(/\s+/).map(part => part[0]).join("").slice(0,2).toUpperCase(); };
  const load = async () => {
    const response = await fetch("/api/me", { headers: { Authorization: `Bearer ${current.token}` } });
    if (!response.ok) throw new Error("Unable to load profile.");
    profile = await response.json();
    ["name","email","phone","role","address","bio"].forEach(key => { dialog.querySelector(`[name="${key}"]`).value = profile[key] || ""; });
    setPreview(profile.photo);
  };
  button.addEventListener("click", async () => { dialog.showModal(); dialog.querySelector("[data-profile-message]").textContent = ""; try { await load(); } catch (error) { dialog.querySelector("[data-profile-message]").textContent = error.message; } });
  dialog.querySelectorAll("[data-profile-close]").forEach(item => item.addEventListener("click", () => dialog.close()));
  dialog.querySelector('[name="photoFile"]').addEventListener("change", event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPreview(reader.result); reader.readAsDataURL(file); });
  dialog.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget; const save = form.querySelector(".save"); const message = form.querySelector("[data-profile-message]"); save.disabled = true; message.textContent = "Saving…";
    const payload = Object.fromEntries(new FormData(form)); delete payload.photoFile; const image = preview.querySelector("img"); if (image?.src.startsWith("data:image/")) payload.photo = image.src;
    try { const response = await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${current.token}`}, body:JSON.stringify(payload) }); const saved = await response.json(); if (!response.ok) throw new Error(saved.message || "Unable to save profile."); current.name = saved.name; localStorage.setItem("aiGymCurrentUser", JSON.stringify(current)); button.querySelector("span").textContent = saved.name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase(); message.textContent = "Profile updated successfully."; setTimeout(() => dialog.close(), 700); } catch(error) { message.textContent = error.message; } finally { save.disabled = false; }
  });
})();
