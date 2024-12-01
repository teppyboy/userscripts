// ==UserScript==
// @name        TSA+
// @match       *://tsa.hust.edu.vn/*
// @namespace   tretrauit-dev
// @icon        https://tsa.hust.edu.vn/static/media/logo-square.d162284b.svg
// @grant       none
// @version     1.1.1
// @author      tretrauit
// @description 18:56:28 16/5/2024
// @homepageURL https://github.com/teppyboy/userscripts
// @supportURL  https://github.com/tretrauit/userscripts/-/issues
// @downloadURL https://tretrauit.me/userscripts/tsa.hust.edu.vn/tsaplus.user.js
// ==/UserScript==

function getElementByInnerText(element, text) {
    return Array.from(element.querySelectorAll("*")).find((e) => e.innerText === text);
}

// Replace console functions with our own.
// biome-ignore lint/complexity/noStaticOnlyClass: console replacement (in SessionStorage) since TSA disabled it fuck.
class console {
    static log(...args) {
        const log = sessionStorage.getItem("tsaplus.console.log") || "";
        sessionStorage.setItem("tsaplus.console.log", `${log}${args.toString()}\n`);
    }
    static info(...args) {
        const log = sessionStorage.getItem("tsaplus.console.info") || "";
        sessionStorage.setItem("tsaplus.console.info", `${log}${args.toString()}\n`);
    }
    static warn(...args) {
        const log = sessionStorage.getItem("tsaplus.console.warn") || "";
        sessionStorage.setItem("tsaplus.console.warn", `${log}${args.toString()}\n`);
    }
    static error(...args) {
        const log = sessionStorage.getItem("tsaplus.console.error") || "";
        sessionStorage.setItem("tsaplus.console.error", `${log}${args.toString()}\n`);
    }
}
unsafeWindow.console = console;

async function injectTestInfo() {
    console.log("Fetching all exam info...");
    const rsp = await fetch("https://api-hust.khaothi.online/my/apiv1/exams/list?getAllExam=true", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("authen_access_token")}`
        }
    });
    const rspData = await rsp.json();
    if (rspData.code != 200) {
        console.error("Failed to get exam list");
        return;
    }
    const exams = rspData.data.exams;
    for (const exam of exams) {
        console.log("Injecting info for exam", exam.name);
        // Get target header first to prevent unnecessary requests
        const targetHeader = getElementByInnerText(document.body, exam.name);
        if (targetHeader === undefined) {
            continue;
        }
        // Get exam info
        const examInfoRsp = await fetch(`https://api-hust.khaothi.online/my/apiv1/exam-plan/get-test-sites?exam_id=${exam.id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("authen_access_token")}`
            }
        });
        const examInfo = await examInfoRsp.json();
        if (examInfo.code != 200) {
            console.error(`Failed to get exam info for exam ${exam.name}`);
            continue;
        }
        const waveInfo = {};
        const genericInfo = {
            contestants: 0,
            capacity: 0
        };
        for (const testSite of examInfo.data.test_sites) {
            if (testSite.name.startsWith("Đợt")) {
                const wave = testSite.name.split(" ")[1];
                if (!waveInfo[wave]) {
                    waveInfo[wave] = {
                        contestants: 0,
                        capacity: 0
                    }
                }
                waveInfo[wave].contestants += testSite.count_test_taker;
                if (testSite.max_test_taker === 0) {
                    waveInfo[wave].capacity += testSite.count_test_taker;
                } else {
                    waveInfo[wave].capacity += testSite.max_test_taker;
                }
            } else {
                genericInfo.contestants += testSite.count_test_taker;
                if (testSite.max_test_taker === 0) {
                    genericInfo.capacity += testSite.count_test_taker;
                } else {
                    genericInfo.capacity += testSite.max_test_taker;
                }
            }
        }
        // Inject info into page
        const targetBox = targetHeader.parentElement;
        const targetBody = targetBox.children[1];
        if (Object.keys(waveInfo).length > 0) {
            console.log("Injecting wave info for exam", exam.name);
            for (const [waveName, wave] of Object.entries(waveInfo)) {
                const element = targetBody.children[0].lastElementChild.cloneNode(true);
                element.children[0].children[0].innerText = `Số thí sinh đăng ký đợt ${waveName}:`;
                element.children[0].children[1].innerText = `${wave.contestants}/${wave.capacity}`;
                targetBody.children[0].appendChild(element);
            }
        } else {
            console.log("Injecting generic info for exam", exam.name);
            const element = targetBody.children[0].lastElementChild.cloneNode(true);
            element.children[0].children[0].innerText = "Số thí sinh đăng ký:";
            element.children[0].children[1].innerText = `${genericInfo.contestants}/${genericInfo.capacity}`;
            targetBody.children[0].appendChild(element);
        }
    }
}

// Hijack XHR with ours.
let firstAuth = true;
const OrigXHR = unsafeWindow.XMLHttpRequest;
function xhrResponseCallback(xhr) {
    console.log(xhr.responseURL);
    if (xhr.responseURL.includes("https://api-hust.khaothi.online/my/apiv1/user/info") && firstAuth) {
        console.log("Authen token refreshed");
        injectTestInfo().then().catch((e) => console.error(e));
        firstAuth = false;
    }
}
class XMLHttpRequest extends OrigXHR {
    constructor(...args) {
        super(...args);
        this.onload = () => {
            xhrResponseCallback(this);
        };
    }
    send(...args) {
        super.send(...args);
    }
}
unsafeWindow.XMLHttpRequest = XMLHttpRequest;

// Inject callback to button
setTimeout(() => {
    const buttonDiv = getElementByInnerText(document.body, "Xem tất cả kỳ thi");
    if (buttonDiv === undefined) {
        console.error("Failed to find button");
    }
    const button = buttonDiv.children[0];
    button.addEventListener("click", () => {
        setTimeout(async () => {
            await injectTestInfo();
        }, 100);
    });
}, 1000);