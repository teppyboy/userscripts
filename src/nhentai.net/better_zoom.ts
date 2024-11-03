// ==UserScript==
// @name        nhentai - Better Zoom
// @namespace   tretrauit-dev
// @match       *://nhentai.net/g/*
// @grant       none
// @version     1.0.2
// @author      tretrauit
// @description Better Zoom for nhentai
// @run-at      document-idle
// @homepageURL https://github.com/tretrauit/userscripts
// @supportURL  https://github.com/tretrauit/userscripts/-/issues
// @downloadURL https://tretrauit.me/userscripts/nhentai.net/better_zoom.user.js
// ==/UserScript==

let currentZoomLevel = 100;
const zoomStep = 20;
// If the Zoom level is not defined then we create a style for it
const definedZoomLevels: number[] = [100];
const imageContainer = document.querySelector("#image-container");
if (imageContainer === null) {
    throw new Error("Couldn't find the image container");
}
// biome-ignore lint/suspicious/noExplicitAny: The image has a width property
const defaultWidth = (imageContainer.children[0].children[0] as any).width as number;

// Replace Zoom button with our own implementation
const ogZoomElement: Element | null = document.querySelector(".zoom-buttons");
if (ogZoomElement === null) {
    throw new Error("Couldn't find the original zoom buttons");
}
const ogZoomHtml: string = ogZoomElement.innerHTML;
// biome-ignore lint/complexity/noForEach: It doesn't work.
document.querySelectorAll(".zoom-buttons").forEach((element) => {
    element.remove();
});
const newZoomElement = document.createElement("div");
newZoomElement.className = "zoom-buttons";
newZoomElement.innerHTML = ogZoomHtml;

// Functions
function addZoomLevelIfNotExists(zoomLevel: number) {
    if (!definedZoomLevels.includes(zoomLevel)) {
        const style = document.createElement("style");
        style.innerHTML = `html.reader #image-container.fit-horizontal.zoom-${zoomLevel} img {
            max-width: ${zoomLevel}%
        }`;
        document.head.appendChild(style);
        definedZoomLevels.push(zoomLevel);
    }
}
function setZoomText(zoomLevel: number) {
    // biome-ignore lint/complexity/noForEach: It doesn't work stop complaining biome
    document.querySelectorAll(".box.zoom-level").forEach((element) => {
        element.children[0].textContent = `${zoomLevel / 100}`;
    });
}
function setZoomContainer(zoomLevel: number) {
    const imageContainer = document.querySelector("#image-container");
    if (imageContainer === null) {
        throw new Error("Couldn't find the image container");
    }
    // biome-ignore lint/suspicious/noExplicitAny: Image
    (imageContainer.children[0].children[0] as any).width = Math.round(defaultWidth * (zoomLevel / 100));
    imageContainer.className = `fit-horizontal full-height zoom-${zoomLevel}`;
    setZoomText(zoomLevel);
}
function zoomOut() {
    if (currentZoomLevel <= 20) {
        return;
    }
    currentZoomLevel -= zoomStep;
    addZoomLevelIfNotExists(currentZoomLevel);
    setZoomContainer(currentZoomLevel);
}
function zoomIn() {
    currentZoomLevel += zoomStep;
    addZoomLevelIfNotExists(currentZoomLevel);
    setZoomContainer(currentZoomLevel);
}
function setCustomPercentage() {
    let result = prompt("Enter a custom zoom level (in percentage) (e.g. 100 or 100%)\nNote that if you type 0.XX then it'll get converted to XX%", `${currentZoomLevel}`);
    if (result === null) {
        return;
    }
    if (result.endsWith("%")) {
        result = result.slice(0, -1);
    }
    let resNum = Number.parseFloat(result);
    if (Number.isNaN(resNum)) {
        alert("Invalid number");
        return;
    }
    if (resNum < 1) {
        resNum *= 100;
    }
    currentZoomLevel = resNum;
    addZoomLevelIfNotExists(currentZoomLevel);
    setZoomContainer(currentZoomLevel);
}
// Observe for changes in the image container
// By using Observer we don't need to hook the buttons which change the image page anymore
const observer = new MutationObserver(() => {
    setZoomContainer(currentZoomLevel);
});
observer.observe(imageContainer, {childList: true, subtree: true});
for (const element of Array.from(document.getElementsByClassName("reader-buttons-right"))) {
    const cloned = newZoomElement.cloneNode(true);
    // Insert events into the cloned element
    cloned.childNodes[0].addEventListener("click", zoomOut);
    cloned.childNodes[1].addEventListener("dblclick", setCustomPercentage);
    cloned.childNodes[2].addEventListener("click", zoomIn);
    element.insertBefore(cloned, element.firstChild);
};
// Cleanup
newZoomElement.remove();