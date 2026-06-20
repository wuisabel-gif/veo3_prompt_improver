const apiKey = document.getElementById("apiKey");
const creativeModel = document.getElementById("creativeModel");
const backendUrl = document.getElementById("backendUrl");
const saveBtn = document.getElementById("saveBtn");
const saved = document.getElementById("saved");

chrome.storage.local.get(["apiKey", "creativeModel", "backendUrl"]).then(s => {
  apiKey.value = s.apiKey || "";
  creativeModel.value = s.creativeModel || "gemini-2.5-flash";
  backendUrl.value = s.backendUrl || "";
});

saveBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiKey: apiKey.value.trim(),
    creativeModel: creativeModel.value.trim() || "gemini-2.5-flash",
    backendUrl: backendUrl.value.trim()
  });
  saved.hidden = false;
  setTimeout(() => { saved.hidden = true; }, 1600);
});
