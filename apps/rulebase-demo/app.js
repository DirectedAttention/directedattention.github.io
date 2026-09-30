"use strict";

const ruleBaseFileNames = [
    "digraph.txt"
];

const ruleBaseUrlInput = document.getElementById("ruleBaseUrl");
const ruleBaseStatus = document.getElementById("ruleBaseStatus");
const sentenceInput = document.getElementById("sentenceInput");
const processButton = document.getElementById("processButton");
const output = document.getElementById("output");

let loadTimer = null;
let loadSequence = 0;

ruleBaseUrlInput.addEventListener("input", function () {
    clearTimeout(loadTimer);

    const urlText = ruleBaseUrlInput.value.trim();

    if (urlText.length === 0) {
        loadSequence++;
        ruleBaseStatus.textContent = "";
        return;
    }

    loadTimer = setTimeout(function () {
        inspectRuleBaseUrl(urlText);
    }, 500);
});

ruleBaseUrlInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") {
        return;
    }

    event.preventDefault();
    clearTimeout(loadTimer);

    const urlText = ruleBaseUrlInput.value.trim();

    if (urlText.length === 0) {
        loadSequence++;
        ruleBaseStatus.textContent = "";
        return;
    }

    inspectRuleBaseUrl(urlText);
});

processButton.addEventListener("click", function () {
    const sentence = sentenceInput.value.trim();

    if (sentence.length === 0) {
        output.textContent = "No sentence entered.";
        return;
    }

    output.textContent = "No RuleBase loaded.";
});

async function inspectRuleBaseUrl(urlText) {
    const requestNumber = ++loadSequence;

    let folderUrl = null;

    try {
        folderUrl = new URL(urlText);
    } catch {
        ruleBaseStatus.textContent = "Error: invalid URL.";
        return;
    }

    if (folderUrl.protocol !== "http:" && folderUrl.protocol !== "https:") {
        ruleBaseStatus.textContent = "Error: invalid URL.";
        return;
    }

    if (!folderUrl.pathname.endsWith("/")) {
        folderUrl.pathname += "/";
    }

    const reports = [];
    let foundListedFile = false;
    let allListedFilesMissing = true;

    try {
        for (const fileName of ruleBaseFileNames) {
            const fileUrl = new URL(fileName, folderUrl);
            const response = await fetch(fileUrl.href, { cache: "no-store" });

            if (requestNumber !== loadSequence) {
                return;
            }

            if (response.status === 404) {
                continue;
            }

            allListedFilesMissing = false;

            if (!response.ok) {
                ruleBaseStatus.textContent = "Error: URL not found.";
                return;
            }

            foundListedFile = true;

            const text = await response.text();

            if (requestNumber !== loadSequence) {
                return;
            }

            const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const firstNewLine = normalizedText.indexOf("\n");
            const firstLine =
                firstNewLine === -1
                    ? normalizedText
                    : normalizedText.substring(0, firstNewLine);

            if (firstLine.length > 64 || !firstLine.includes("=>")) {
                reports.push(fileName + ": wrong format");
                continue;
            }

            const lineCount = countLines(normalizedText);

            if (lineCount < 100) {
                reports.push(fileName + ": " + lineCount.toString() + " lines");
            } else {
                reports.push(fileName + ": 100+ lines");
            }
        }

        if (requestNumber !== loadSequence) {
            return;
        }

        if (allListedFilesMissing) {
            const folderResponse = await fetch(folderUrl.href, { cache: "no-store" });

            if (requestNumber !== loadSequence) {
                return;
            }

            if (!folderResponse.ok) {
                ruleBaseStatus.textContent = "Error: URL not found.";
                return;
            }

            ruleBaseStatus.textContent = "";
            return;
        }

        if (!foundListedFile) {
            ruleBaseStatus.textContent = "";
            return;
        }

        ruleBaseStatus.textContent = reports.join("\n");
    } catch {
        if (requestNumber !== loadSequence) {
            return;
        }

        ruleBaseStatus.textContent = "Error: URL not found.";
    }
}

function countLines(text) {
    if (text.length === 0) {
        return 0;
    }

    const parts = text.split("\n");

    if (parts[parts.length - 1] === "") {
        return parts.length - 1;
    }

    return parts.length;
}
