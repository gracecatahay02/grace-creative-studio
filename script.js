const TRACKER_URL =
  "https://script.google.com/macros/s/AKfycbwmMsBWRDZ6jAa7rKwiKHhMYSZkGO5s7fAfrolzOprxnSFpsJLDtdG8AUGa9yYufK6N/exec";

const WEBHOOK_KEY = "PASTE_WEBHOOK_KEY_HERE";

const form = document.querySelector("#request-form");
const submitButton = form.querySelector(".submit-button");
const newTab = document.querySelector("#new-tab");
const trackerTab = document.querySelector("#tracker-tab");
const newPanel = document.querySelector("#new-panel");
const trackerPanel = document.querySelector("#tracker-panel");
const requestList = document.querySelector("#request-list");

function showPanel(panel) {
  const showNew = panel === "new";
  newPanel.hidden = !showNew;
  trackerPanel.hidden = showNew;
  newTab.classList.toggle("active", showNew);
  trackerTab.classList.toggle("active", !showNew);
  newTab.setAttribute("aria-pressed", String(showNew));
  trackerTab.setAttribute("aria-pressed", String(!showNew));
}

newTab.addEventListener("click", () => showPanel("new"));
trackerTab.addEventListener("click", () => showPanel("tracker"));

trackerTab.textContent = "My submissions";

const heading = trackerPanel.querySelector("h2");
if (heading) heading.textContent = "My submissions";

requestList.replaceChildren();

const receiptNotice = document.createElement("p");
receiptNotice.className = "muted";
receiptNotice.textContent =
  "Confirmed submissions appear here during this visit. " +
  "Contact Grace for design updates.";
requestList.append(receiptNotice);

form.querySelectorAll('input[type="file"]').forEach(input => {
  input.disabled = true;
});

const imageHelp = document.querySelector("#reference-images")
  ?.closest("label")?.nextElementSibling;

if (imageHelp) {
  imageHelp.textContent =
    "Upload your images to Google Drive and paste the shared " +
    "folder link in Reference / folder links below.";
}

const notice = submitButton.nextElementSibling;
if (notice) {
  notice.textContent =
    "For images and videos, paste shared Google Drive links. " +
    "Make sure Grace has permission to open them.";
}

const feedback = document.createElement("p");
feedback.className = "muted";
feedback.setAttribute("role", "status");
feedback.setAttribute("aria-live", "polite");
form.append(feedback);

submitButton.disabled = false;
submitButton.textContent = "Submit design request";

let submitting = false;
let pendingSubmission = null;

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (submitting || !form.reportValidity()) return;

  if (!WEBHOOK_KEY || WEBHOOK_KEY === "PASTE_WEBHOOK_KEY_HERE") {
    feedback.textContent =
      "Tracker setup is incomplete. Please contact Grace.";
    return;
  }

  const fields = new FormData(form);
  const data = {};

  for (const [name, value] of fields.entries()) {
    if (typeof value === "string") data[name] = value;
  }

  data.links = [
    data.links,
    data["video-link"] ? "Video: " + data["video-link"] : ""
  ].filter(Boolean).join("\n");

  delete data["video-link"];
  delete data["form-name"];

  const fingerprint = JSON.stringify(data);

  // Reuse the same ID when retrying unchanged details.
  if (!pendingSubmission ||
      pendingSubmission.fingerprint !== fingerprint) {
    pendingSubmission = {
      fingerprint,
      body: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        data
      }
    };
  }

  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  feedback.textContent = "Sending your request. Please wait.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const endpoint = new URL(TRACKER_URL);
    endpoint.searchParams.set("key", WEBHOOK_KEY);

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: JSON.stringify(pendingSubmission.body),
      signal: controller.signal,
      redirect: "follow",
      credentials: "omit"
    });

    const result = (await response.text()).trim();

    if (!response.ok || result !== "OK") {
      throw new Error("Tracker did not confirm receipt.");
    }

    const card = document.createElement("article");
    card.className = "request-card";

    const title = document.createElement("h3");
    title.textContent = data.title || "Design request";

    const status = document.createElement("p");
    status.textContent =
      "Received — awaiting review. " +
      new Date().toLocaleString();

    const reference = document.createElement("p");
    reference.textContent =
      "Submission ID: " + pendingSubmission.body.id;

    card.append(title, status, reference);
    requestList.append(card);

    pendingSubmission = null;
    form.reset();

    feedback.textContent =
      "🎉 Your request has been saved to Grace’s tracker! " +
      "Grace will review your brief and contact you soon.";
  } catch (error) {
    feedback.textContent =
      "We could not confirm your submission. " +
      "Your details are still here. Contact Grace to check " +
      "the tracker before retrying.";
    console.error("Submission confirmation failed:", error);
  } finally {
    clearTimeout(timeout);
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Submit design request";
  }
});

showPanel("new");
