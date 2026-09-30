"use strict";

// Ordered from highest to lowest priority.
// More Agentic Form files can be added here later.
const agenticFormFileNames = [
    "digraph.txt"
];

// These hosts are always accepted.
// Additional approved hosts are read from whitelist.txt.
const hardcodedAllowedHosts = new Set([
    "linguisticagents.com",
    "www.linguisticagents.com"
]);

const NOT_IN_SYSTEM = "Not in the system";
const FORMAT_ISSUES = "Format issues";

const ruleBaseUrlInput = document.getElementById("ruleBaseUrl");
const ruleBaseStatus = document.getElementById("ruleBaseStatus");
const sentenceInput = document.getElementById("sentenceInput");
const processButton = document.getElementById("processButton");
const output = document.getElementById("output");

let loadTimer = null;
let loadSequence = 0;
let topLevelSymbol = null;
let agentConnected = false;

setAgentConnected(false);

ruleBaseUrlInput.addEventListener("input", function () {
    clearTimeout(loadTimer);
    setAgentConnected(false);

    const urlText = ruleBaseUrlInput.value.trim();

    if (urlText.length === 0) {
        loadSequence++;
        topLevelSymbol = null;
        ruleBaseStatus.textContent = "";
        return;
    }

    loadTimer = setTimeout(function () {
        inspectAgenticFormUrl(urlText);
    }, 500);
});

ruleBaseUrlInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") {
        return;
    }

    event.preventDefault();
    clearTimeout(loadTimer);
    setAgentConnected(false);

    const urlText = ruleBaseUrlInput.value.trim();

    if (urlText.length === 0) {
        loadSequence++;
        topLevelSymbol = null;
        ruleBaseStatus.textContent = "";
        return;
    }

    inspectAgenticFormUrl(urlText);
});

processButton.addEventListener("click", function () {
    const sentence = sentenceInput.value.trim();

    if (sentence.length === 0) {
        output.textContent = "No sentence entered.";
        return;
    }

    output.textContent = "No processor loaded.";
});

async function inspectAgenticFormUrl(urlText) {
    const requestNumber = ++loadSequence;
    topLevelSymbol = null;

    let folderUrl = null;

    try {
        folderUrl = new URL(urlText);
    } catch {
        showNotInSystem(requestNumber);
        return;
    }

    if (folderUrl.protocol !== "http:" && folderUrl.protocol !== "https:") {
        showNotInSystem(requestNumber);
        return;
    }

    const allowedHosts = await getAllowedHosts();

    if (requestNumber !== loadSequence) {
        return;
    }

    if (!allowedHosts.has(folderUrl.hostname.toLowerCase())) {
        showNotInSystem(requestNumber);
        return;
    }

    if (!folderUrl.pathname.endsWith("/")) {
        folderUrl.pathname += "/";
    }

    const reports = [];
    let foundAnyListedFile = false;
    let foundAnyRule = false;
    let selectedTopLevelSymbol = null;

    try {
        for (const fileName of agenticFormFileNames) {
            const fileUrl = new URL(fileName, folderUrl);
            const response = await fetch(fileUrl.href, { cache: "no-store" });

            if (requestNumber !== loadSequence) {
                return;
            }

            if (response.status === 404) {
                continue;
            }

            if (!response.ok) {
                showNotInSystem(requestNumber);
                return;
            }

            foundAnyListedFile = true;

            const fileText = await response.text();

            if (requestNumber !== loadSequence) {
                return;
            }

            const normalizedText =
                fileText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            const firstRuleLine = findFirstRuleLine(normalizedText);

            if (firstRuleLine === null) {
                continue;
            }

            foundAnyRule = true;

            if (!isValidRuleLine(firstRuleLine)) {
                showFormatIssues(requestNumber);
                return;
            }

            if (selectedTopLevelSymbol === null) {
                selectedTopLevelSymbol = getRuleLeftSide(firstRuleLine);
            }

            const lineCount = countLines(normalizedText);

            if (lineCount < 100) {
                reports.push(fileName + ": " + lineCount.toString() + " lines");
            } else {
                reports.push(fileName + ": 100+ lines");
            }
        }
    } catch {
        showNotInSystem(requestNumber);
        return;
    }

    if (requestNumber !== loadSequence) {
        return;
    }

    if (!foundAnyListedFile || !foundAnyRule || selectedTopLevelSymbol === null) {
        showNotInSystem(requestNumber);
        return;
    }

    topLevelSymbol = selectedTopLevelSymbol;
    setAgentConnected(true);

    reports.push("Top level: " + topLevelSymbol);
    ruleBaseStatus.textContent = reports.join("\n");
}

async function getAllowedHosts() {
    const allowedHosts = new Set(hardcodedAllowedHosts);

    try {
        const response = await fetch("/apps/rulebase-demo/whitelist.txt", { cache: "no-store" });

        if (!response.ok) {
            return allowedHosts;
        }

        const text = await response.text();
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (const line of lines) {
            const host = line.trim().toLowerCase();

            if (host.length === 0 || host.startsWith("#")) {
                continue;
            }

            allowedHosts.add(host);
        }
    } catch {
        // The hardcoded list remains usable even if whitelist.txt cannot be read.
    }

    return allowedHosts;
}

function findFirstRuleLine(text) {
    const lines = text.split("\n");

    for (const line of lines) {
        if (line.includes("=>")) {
            return line;
        }
    }

    return null;
}

function isValidRuleLine(line) {
    if (line.length > 64) {
        return false;
    }

    const separatorIndex = line.indexOf("=>");

    if (separatorIndex < 0) {
        return false;
    }

    const left = line.substring(0, separatorIndex).trim();
    const right = line.substring(separatorIndex + 2).trim();

    return left.length > 0 && right.length > 0;
}

function getRuleLeftSide(line) {
    const separatorIndex = line.indexOf("=>");
    return line.substring(0, separatorIndex).trim();
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

function setAgentConnected(isConnected) {
    agentConnected = isConnected;
    sentenceInput.disabled = !isConnected;
    processButton.disabled = !isConnected;

    if (isConnected) {
        sentenceInput.placeholder = "Type a sentence here.";
    } else {
        sentenceInput.placeholder = "Connect an Agentic Form first.";
    }
}

function showNotInSystem(requestNumber) {
    if (requestNumber !== loadSequence) {
        return;
    }

    topLevelSymbol = null;
    setAgentConnected(false);
    ruleBaseStatus.textContent = NOT_IN_SYSTEM;
}

function showFormatIssues(requestNumber) {
    if (requestNumber !== loadSequence) {
        return;
    }

    topLevelSymbol = null;
    setAgentConnected(false);
    ruleBaseStatus.textContent = FORMAT_ISSUES;
}
