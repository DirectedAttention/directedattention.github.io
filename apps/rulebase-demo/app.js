"use strict";

let ruleBaseLoaded = false;

const ruleBaseUrlInput = document.getElementById("ruleBaseUrl");
const loadRuleBaseButton = document.getElementById("loadRuleBaseButton");
const ruleBaseStatus = document.getElementById("ruleBaseStatus");
const sentenceInput = document.getElementById("sentenceInput");
const processButton = document.getElementById("processButton");
const output = document.getElementById("output");

loadRuleBaseButton.addEventListener("click", function () {
    const urlText = ruleBaseUrlInput.value.trim();

    ruleBaseLoaded = false;

    if (urlText.length === 0) {
        ruleBaseStatus.textContent = "No RuleBase loaded. Enter a RuleBase URL.";
        return;
    }

    try {
        new URL(urlText);
    } catch {
        ruleBaseStatus.textContent = "Rejected: invalid URL.";
        return;
    }

    ruleBaseStatus.textContent =
        "Rejected: no RuleBase format is currently accepted.";
});

processButton.addEventListener("click", function () {
    const sentence = sentenceInput.value.trim();

    if (sentence.length === 0) {
        output.textContent = "No sentence entered.";
        return;
    }

    if (!ruleBaseLoaded) {
        output.textContent = "No RuleBase loaded.";
        return;
    }

    output.textContent = "Processing is not available yet.";
});
