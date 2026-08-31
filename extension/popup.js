const welcomeScreen = document.getElementById("welcome-screen");
const requirementScreen = document.getElementById("requirement-screen");

const startButton = document.getElementById("start-btn");
const analyzeButton = document.getElementById("analyze-btn");
const uploadBrdButton = document.getElementById("upload-brd");
const uploadDocButton = document.getElementById("upload-doc");

const requirementInput = document.getElementById("requirement-input");
const documentInput = document.getElementById("document-input");
const fileNameDisplay = document.getElementById("file-name");

let selectedFileName = "";

document.body.addEventListener(
	"wheel",
	(e) => {
		e.stopPropagation();
	},
	{ passive: false },
);

const showRequirementScreen = () => {
	if (!welcomeScreen || !requirementScreen) {
		return;
	}

	welcomeScreen.classList.remove("active");
	requirementScreen.classList.add("active");
	requirementScreen.setAttribute("aria-hidden", "false");
};

const openDocumentPicker = () => {
	if (documentInput instanceof HTMLInputElement) {
		documentInput.click();
	}
};

if (startButton) {
	startButton.addEventListener("click", showRequirementScreen);
}

if (uploadBrdButton) {
	uploadBrdButton.addEventListener("click", openDocumentPicker);
}

if (uploadDocButton) {
	uploadDocButton.addEventListener("click", openDocumentPicker);
}

if (documentInput instanceof HTMLInputElement) {
	documentInput.addEventListener("change", () => {
		const selectedFile = documentInput.files?.[0];
		selectedFileName = selectedFile?.name ?? "";

		if (fileNameDisplay) {
			fileNameDisplay.textContent = selectedFileName || "No file selected";
		}
	});
}

if (analyzeButton) {
	analyzeButton.addEventListener("click", async () => {
		if (!(requirementInput instanceof HTMLTextAreaElement)) {
			return;
		}

		const requirement = requirementInput.value.trim();

		if (!requirement) {
			alert("Enter project requirements");
			return;
		}

		try {
			await chrome.storage.sync.set({
				projectRequirement: requirement,
				uploadedDocumentName: selectedFileName,
				copilotAutoOpen: true,
				updatedAt: Date.now(),
			});

			chrome.tabs.create({
				url: "https://github.com",
			});
		} catch (error) {
			console.error("Failed to persist requirement and navigate to GitHub", error);
			alert("Unable to continue. Please try again.");
			return;
		}

		window.close();
	});
}
