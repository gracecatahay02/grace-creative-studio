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

const trackerHeading = trackerPanel.querySelector("h2");
if (trackerHeading) {
  trackerHeading.textContent = "My submissions";
}

requestList.replaceChildren();

const receiptNotice = document.createElement("p");
receiptNotice.className = "muted";
receiptNotice.textContent =
  "Receipts appear here during this visit only. " +
  "Contact Grace for updates on your design.";
requestList.append(receiptNotice);

submitButton.disabled = false;
submitButton.textContent = "Submit";

const notice = submitButton.nextElementSibling;
if (notice) {
  notice.textContent =
    "Upload up to 20 images, maximum 25 GB combined. " +
    "For larger images or videos up to 1 hours, " +
    "paste a shared Google Drive link.";
}

const feedback = document.createElement("p");
feedback.className = "muted";
feedback.setAttribute("role", "status");
feedback.setAttribute("aria-live", "polite");
form.append(feedback);

let submitting = false;

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (submitting || !form.reportValidity()) return;

  if (
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(location.hostname)
  ) {
    feedback.textContent =
      "Please open the published Netlify website to submit.";
    return;
  }

  const data = new FormData(form);
  data.set("form-name", "design-request");

  const image = data.get("reference-image");

  if (image instanceof File && image.size > 5 * 1024 * 1024) {
    feedback.textContent =
      "Your image is too large. Choose an image under 5 MB.";
    return;
  }

  const projectTitle = String(data.get("title") || "Design request");

  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  feedback.textContent = "Sending your request. Please wait.";

  try {
    const response = await fetch("/", {
      method: "POST",
      body: data
    });

    if (!response.ok) {
      throw new Error("Submission failed");
    }

    const card = document.createElement("article");
    card.className = "request-card";

    const title = document.createElement("h3");
    title.textContent = projectTitle;

    const status = document.createElement("p");
    status.textContent =
      "Submitted — awaiting review. " +
      new Date().toLocaleString();

    card.append(title, status);
    requestList.append(card);

    form.reset();

const successMessage =
  "🎉 Congratulations! Your project request has been submitted successfully. " +
  "Grace will review your brief and contact you soon.";

feedback.textContent = successMessage;
alert(successMessage);
  } catch {
    feedback.textContent =
      "We could not confirm your submission. " +
      "Your details are still here. " +
      "Check your connection or contact Grace before retrying.";
  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
});

showPanel("new");