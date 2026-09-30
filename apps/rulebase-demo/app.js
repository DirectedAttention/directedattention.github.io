"use strict";

// Local files that SYSTEM knows how to read from an Agentic Form folder.
// The list will grow slowly as the format grows.
const localFileNames = [
    "digraph.txt",
    "api.txt"
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
let provider = null;

setAgentConnected(false);

ruleBaseUrlInput.addEventListener("input", function () {
    clearTimeout(loadTimer);
    setAgentConnected(false);

    const urlText = ruleBaseUrlInput.value.trim();

    if (urlText.length === 0) {
        loadSequence++;
        topLevelSymbol = null;
        provider = null;
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
        provider = null;
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
    provider = null;
    setAgentConnected(false);

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

    const loadedFiles = await readLocalFiles(
        folderUrl,
        requestNumber);

    if (loadedFiles === null) {
        return;
    }

    if (requestNumber !== loadSequence) {
        return;
    }

    const digraphText = loadedFiles.get("digraph.txt");

    if (digraphText === undefined) {
        showNotInSystem(requestNumber);
        return;
    }

    const digraphResult = inspectDigraphFile(digraphText);

    if (digraphResult.formatIssue) {
        showFormatIssues(requestNumber);
        return;
    }

    if (digraphResult.topLevelSymbol === null) {
        showNotInSystem(requestNumber);
        return;
    }

    topLevelSymbol = digraphResult.topLevelSymbol;

    const apiText = loadedFiles.get("api.txt");

    if (apiText !== undefined) {
        const providerResult = inspectProviderFile(
            apiText,
            allowedHosts);

        if (providerResult.formatIssue) {
            showFormatIssues(requestNumber);
            return;
        }

        provider = providerResult.provider;
    }

    setAgentConnected(true);

    const reports = [];

    if (digraphResult.lineCount < 100) {
        reports.push(
            "digraph.txt: " +
            digraphResult.lineCount.toString() +
            " lines");
    } else {
        reports.push("digraph.txt: 100+ lines");
    }

    reports.push("Top level: " + topLevelSymbol);

    if (provider !== null) {
        reports.push("Provider: " + provider.url);
        reports.push("Variables: " + provider.variables.join(", "));
    }

    ruleBaseStatus.textContent = reports.join("\n");
}

async function readLocalFiles(folderUrl, requestNumber) {
    const loadedFiles = new Map();

    try {
        for (const fileName of localFileNames) {
            const fileUrl = new URL(fileName, folderUrl);
            const response = await fetch(
                fileUrl.href,
                { cache: "no-store" });

            if (requestNumber !== loadSequence) {
                return null;
            }

            if (response.status === 404) {
                continue;
            }

            if (!response.ok) {
                showNotInSystem(requestNumber);
                return null;
            }

            const text = await response.text();

            if (requestNumber !== loadSequence) {
                return null;
            }

            loadedFiles.set(
                fileName,
                normalizeLines(text));
        }
    } catch {
        showNotInSystem(requestNumber);
        return null;
    }

    return loadedFiles;
}

function inspectDigraphFile(text) {
    const firstRuleLine = findFirstRuleLine(text);

    if (firstRuleLine === null) {
        return {
            topLevelSymbol: null,
            lineCount: countLines(text),
            formatIssue: false
        };
    }

    if (!isValidRuleLine(firstRuleLine)) {
        return {
            topLevelSymbol: null,
            lineCount: countLines(text),
            formatIssue: true
        };
    }

    return {
        topLevelSymbol: getRuleLeftSide(firstRuleLine),
        lineCount: countLines(text),
        formatIssue: false
    };
}

function inspectProviderFile(text, allowedHosts) {
    const lines = text.split("\n");

    if (lines.length === 0 || lines[0].trim().length === 0) {
        return {
            provider: null,
            formatIssue: true
        };
    }

    const endpoint = parseProviderUrl(lines[0].trim());

    if (endpoint === null) {
        return {
            provider: null,
            formatIssue: true
        };
    }

    if (!allowedHosts.has(endpoint.hostname.toLowerCase())) {
        return {
            provider: null,
            formatIssue: true
        };
    }

    const variables = [];

    for (let index = 1; index < lines.length; index++) {
        const name = lines[index].trim();

        if (name.length === 0) {
            continue;
        }

        variables.push(name);
    }

    return {
        provider: {
            url: endpoint.href,
            variables: variables
        },
        formatIssue: false
    };
}

function parseProviderUrl(text) {
    try {
        const directUrl = new URL(text);

        if (directUrl.protocol !== "http:" &&
            directUrl.protocol !== "https:") {
            return null;
        }

        return directUrl;
    } catch {
        try {
            const implicitHttpsUrl =
                new URL("https://" + text);

            return implicitHttpsUrl;
        } catch {
            return null;
        }
    }
}

async function callProvider(values) {
    if (provider === null) {
        throw new Error("No Provider connected.");
    }

    const requestUrl = new URL(provider.url);

    for (const variableName of provider.variables) {
        if (!Object.prototype.hasOwnProperty.call(
            values,
            variableName)) {
            continue;
        }

        requestUrl.searchParams.set(
            variableName,
            values[variableName]);
    }

    return fetch(requestUrl.href, {
        method: "GET",
        cache: "no-store"
    });
}

async function getAllowedHosts() {
    const allowedHosts =
        new Set(hardcodedAllowedHosts);

    try {
        const response = await fetch(
            "/apps/rulebase-demo/whitelist.txt",
            { cache: "no-store" });

        if (!response.ok) {
            return allowedHosts;
        }

        const text = await response.text();
        const lines = normalizeLines(text).split("\n");

        for (const line of lines) {
            const host = line.trim().toLowerCase();

            if (host.length === 0 ||
                host.startsWith("#")) {
                continue;
            }

            allowedHosts.add(host);
        }
    } catch {
        // The hardcoded list remains usable even if
        // whitelist.txt cannot be read.
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

    const left =
        line.substring(0, separatorIndex).trim();

    const right =
        line.substring(separatorIndex + 2).trim();

    return left.length > 0 && right.length > 0;
}

function getRuleLeftSide(line) {
    const separatorIndex = line.indexOf("=>");

    return line
        .substring(0, separatorIndex)
        .trim();
}

function normalizeLines(text) {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
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
        sentenceInput.placeholder =
            "Type a sentence here.";
    } else {
        sentenceInput.placeholder =
            "Connect an Agentic Form first.";
    }
}

function showNotInSystem(requestNumber) {
    if (requestNumber !== loadSequence) {
        return;
    }

    topLevelSymbol = null;
    provider = null;
    setAgentConnected(false);
    ruleBaseStatus.textContent = NOT_IN_SYSTEM;
}

function showFormatIssues(requestNumber) {
    if (requestNumber !== loadSequence) {
        return;
    }

    topLevelSymbol = null;
    provider = null;
    setAgentConnected(false);
    ruleBaseStatus.textContent = FORMAT_ISSUES;
}
