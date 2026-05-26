/* Linguistic Agents — Shared Site JavaScript
   Minimal visual behavior only.
   No content generation.
*/

(function () {
  "use strict";

  function setFooterYear() {
    const yearElements = document.querySelectorAll("[data-current-year]");
    const currentYear = new Date().getFullYear().toString();

    yearElements.forEach(function (element) {
      element.textContent = currentYear;
    });
  }

  function markExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]');

    links.forEach(function (link) {
      const linkHost = new URL(link.href).host;
      const pageHost = window.location.host;

      if (linkHost !== pageHost) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function addHoverToneToCards() {
    const cards = document.querySelectorAll(".la-card");

    cards.forEach(function (card) {
      card.addEventListener("pointerenter", function () {
        card.classList.add("is-hovered");
      });

      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-hovered");
      });
    });
  }

  function enableMobileNav() {
    const button = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav-menu]");

    if (!button || !nav) {
      return;
    }

    button.addEventListener("click", function () {
      const isOpen = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", (!isOpen).toString());
      nav.classList.toggle("is-open", !isOpen);
    });
  }

  function initializeSite() {
    setFooterYear();
    markExternalLinks();
    addHoverToneToCards();
    enableMobileNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSite);
  } else {
    initializeSite();
  }
})();