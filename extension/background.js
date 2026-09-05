const DEFAULT_BASE_URL = "http://localhost:5173";

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Gitlas background worker initialized.");

  // Seed the dev-server URL so the popup works on first launch.
  const existing = await chrome.storage.sync.get(["gitlas.baseUrl"]);
  if (!existing?.["gitlas.baseUrl"]) {
    await chrome.storage.sync.set({ "gitlas.baseUrl": DEFAULT_BASE_URL });
  }
});
