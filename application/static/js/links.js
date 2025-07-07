const USE_ANIMATIONS = false;
let HELP_STEPS = [
    {
        id: 1,
        prompt: ['outside', 'layer'],
        result: 'outside',
        message: "<p>Click a word to jump to it.</p>",
        focus: 'beneath',
        transform: [20, 60],
        startSocket: 'top',
        endSocket: 'auto',
    },
    {
        id: 2,
        prompt: ['outside', 'layer'],
        result: 'beneath',
        message: "<p>We want to get to <span class='link--help-target'>layer</span>, so choose the most similar word.</p>",
        focus: 'surface',
        transform: [30, 37],
        startSocket: 'top',
        endSocket: 'auto',
    },
    {
        id: 3,
        prompt: ['outside', 'layer'],
        result: 'surface',
        message: "<p>Good job! Click <span class='link--help-target'>layer</span> to complete the prompt.</p>",
        focus: 'layer',
        transform: [20, 40],
        startSocket: 'top',
        endSocket: 'auto',
    },
    {
        id: 4,
        prompt: ['cellphone', 'fluff'],
        result: 'cellphone',
        message: "<p>Choose carefully - two jumps is all you need.</p>",
        focus: 'airtime',
        transform: [30, 50],
        startSocket: 'left',
        endSocket: 'auto',
    },
    {
        id: 5,
        prompt: ['cellphone', 'fluff'],
        result: 'airtime',
        message: "<p>Five prompts per day, the best score is 10. </p>",
        focus: 'fluff',
        transform: [10, 20],
        startSocket: 'bottom',
        endSocket: 'top',
    }
];

function focusLink(startText, targetText) {
    const links = Array.from(document.getElementsByClassName("link"));
    // let middleWords = [...new Set(HELP_STEPS.map(step => step.result))];
    // console.log(middleWords)
    links.forEach(link => {
        const text = link.innerText.trim();
        if (text == startText) {
            link.classList.add("link--help-target");
        }
        if (text === targetText) {
            // link.style.outlineOffset = "2px";
            link.id = "link--target";
            link.classList.add("link--target")
            link.classList.remove("link--unfocused");
        } else if (links.indexOf(link) !== 10) {
            link.style.outline = "";
            link.style.outlineOffset = "";
            link.classList.add("link--unfocused");
        }
    });
}

//@Parent: postWord
function renderLinks(prompt, results, i, debug_session_done = false) {
    // console.log('[renderLinks] Rendering links for prompt:', prompt, 'with results:', results);
    // console.log(debug_session_done);
    // console.log(i);
    let wordspace = document.getElementById("wordspace")
    clearChildren(wordspace)
    let middleIndex = Math.floor(results.length / 2)
    results.forEach((result, idx) => {
        if (idx === middleIndex) {
            wordspace.append(makeStartLink(prompt, result))
        } else {
            wordspace.append(makeLink(prompt, result))
        }
    })
    addDoneFocus(prompt, results, i)
    addHelpFocuses(prompt, results)
    if (sessionEnded(prompt) || debug_session_done) {
        disableLinks()

        reportSessionEnded(debug_session_done)
    }
}

let activeLeaderLines = [];

function clearAllLeaderLines() {
    activeLeaderLines.forEach(line => line.remove());
    activeLeaderLines = [];
}

function showHelpPopup(message, transform, startSocket, endSocket) {
    if (window.matchMedia && window.matchMedia("(max-width: 992px)").matches) {
        let info = document.getElementById("info-box");
        info.style.display = "flex";
        info.innerHTML = `${message}`;
        const x = window.innerWidth * (transform[0] / 100);
        const y = window.innerHeight * (transform[1] / 100);
        info.style.left = `${x}px`;
        info.style.top = `${y}px`;
        if (startSocket) {
            const waitForElements = () => {
                info = document.getElementById('info-box');
                const target = document.getElementById('link--target');
                if (info && target) {
                    const line = new LeaderLine(info, target, {
                        startSocket: startSocket,
                        endSocket: endSocket,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                        path: 'arc',
                        startPlug: 'behind',
                        endPlug: 'arrow3',
                        endPlugSize: 2.1,
                        size: 2.1,
                        dash: false,
                        outline: false
                    });
                    activeLeaderLines.push(line);
                } else {
                    requestAnimationFrame(waitForElements);
                }
            };
            waitForElements();
        }
    } else {
        document.getElementById("information").innerHTML =
            `${message}`;
    }
}

function addDoneFocus(prompt, results, i) {
    const targetWord = prompt[1];
    const idx = results.indexOf(targetWord);
    // console.log("I am in add Done Focus");
    // console.log("target_word: ", targetWord, "index: ", idx);
    // console.log("Here is the prompt boxes");
    // console.log(document.querySelectorAll('#prompts .prompt-box .prompt'));
    if (idx !== -1) {
        const promptBoxes = document.querySelectorAll('#prompts .prompt-box .prompt');
        // promptBoxes[i].style.color = "orange";

        if (promptBoxes[i]) {
            promptBoxes[i].querySelectorAll('.prompt-word').forEach(el => {
                // el.style.border = "1px solid orange";
            });
        }
    }
}

/* makes and renders links */
function makeLink(prompt, word) {
    let link = document.createElement("button");
    let span = document.createElement("span")
    span.innerText = word;
    link.appendChild(span)
    link.className = "link"
    if (prompt[1] == word) {
        link.id = 'rainbow_text_animated'
        link.className = "link link--target"
    }
    return link
}

function makeStartLink(prompt, word) {
    startLink = makeLink(prompt, word)
    startLink.className = "link link--disabled link--starting"
    return startLink
}

function switchToLoggedIn() {
    document.getElementById('guest-buttons').style.display = 'none';
    document.getElementById('logged_in-buttons').style.display = 'flex';
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'logout';
    logoutBtn.className = 'switch switch--outlined';
    logoutBtn.onclick = renderLogout;
    document.getElementById('logged_in-buttons').appendChild(logoutBtn);
}

function renderSessionDone(resp) {
    renderFinish(resp)
    prompts = resp.prompts
    jumpsArray = resp.jumpsArray
    start_target = prompts[4]
    renderPrompts(jumpsArray, resp.startTargetIdxs, start_target, true)
    let is_logged_in = Boolean(localStorage.getItem('logged_in'));
    console.log("I am in tally screen here is logged in");
    console.log(is_logged_in);
    if (is_logged_in) {
        switchToLoggedIn();
    }
}

function arrayEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}
function addHelpFocuses(prompt, results) {
    clearAllLeaderLines()
    middleIdx = Math.floor(results.length / 2)
    for (const step of HELP_STEPS) {
        //[Check] if prompt is equal to the help prompt.

            if (arrayEqual(prompt, step.prompt) && results[middleIdx] === step.result) {
                showHelpPopup(step.message, step.transform, step.startSocket, step.endSocket);
                focusLink(step.result, step.focus);
                break;
            }
        }
}

// //@Parent: postWord
// function renderLinks(prompt, results, i, debug_session_done = false) {
//     // console.log('[renderLinks] Rendering links for prompt:', prompt, 'with results:', results);
//     let wordspace = document.getElementById("wordspace")
//     clearChildren(wordspace)
//     let middleIndex = Math.floor(results.length / 2)
//     results.forEach((result, idx) => {
//         if (idx === middleIndex) {
//             wordspace.append(makeStartLink(prompt, result))
//         } else {
//             wordspace.append(makeLink(prompt, result))
//         }
//     })
//     addDoneFocus(prompt, results, i)
//     addHelpFocuses(prompt, results)
//     if(sessionEnded(prompt) || debug_session_done){
//     disableLinks()
//     reportSessionEnded(debug_session_done)
//     }
// }

function saveWordspace() {
    const wordspace = document.getElementById("wordspace");
    if (wordspace) {
        localStorage.setItem("wordspace", wordspace.innerHTML);
    }
}

function showWordspace() {
    const wordspace = document.getElementById("wordspace");
    const saved = localStorage.getItem("wordspace");
    if (wordspace && saved) {
        wordspace.innerHTML = saved;
    }
}

function clearPrompts() {
    const promptWords = document.querySelectorAll('.prompt-box .prompt .prompt-word');
    promptWords.forEach(el => el.remove());
}

//@Parent: maintainLinks
function reportSessionEnded(debug_session_done) {
    if (localStorage.getItem('is_help') == "true") {
        resp = sendAndReceiveXML(`help_end=true`)
        // _ = send_game_data_to_backend(resp, `help_end=true`);
    } else {
        resp = sendAndReceiveXML(`end=true`)
        // _ = send_game_data_to_backend(resp, `end=true`);
    }
    // console.log('[reportSessionEnded] Response:', resp);
    
    //If user has completed all prompts
    if (resp.hasOwnProperty('help_session_done')) {
        runAfterBannerDisappears(() => {renderHelpFinish()})
        renderPrompts(resp.jumpsArray, resp.startTargetIdxs, resp.prompts[0], end=true)
    }
    else if (resp.hasOwnProperty('session_done') || debug_session_done) {
        // alert('received session_done')
        renderSessionDone(resp)
        localStorage.setItem("lastComplete", data["date"])
    }
    else {
        renderLinks(resp.prompt, resp.results)
        // console.log('[reportSessionEnded] Rendering prompts..')
        let start_target = resp.prompts[resp.i]
        renderPrompts(resp.jumpsArray, resp.startTargetIdxs, start_target)
        activateLinks()
    }
}

//activates links on the page
function activateLinks() {
    ws_texts = ws_to_text()
    ws_array.map(function (el, i) {
        el.onclick = function () {
            postWord(ws_texts[i], el);
        }
    })
}

function showBanner(text, color) {
  // Remove existing banner if present
  const oldBanner = document.getElementById('promptEndBanner');
  if (oldBanner) oldBanner.remove();

  // Create banner
  const banner = document.createElement('div');
  banner.classList.add('promptEndBanner');
  banner.innerText = text;
  Object.assign(banner.style, {  });
  banner.classList.add(color)
  document.body.appendChild(banner);

  // Optional: fade out after 2 seconds
  setTimeout(() => {
    banner.style.transition = 'opacity 0.8s ease';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 800);
  }, 600);
}

function postWord(word, clickedElem, use_animations = USE_ANIMATIONS) {
    let resp = sendAndReceiveXML("word=" + word);
    let current_prompt = lastNonzeroRow(resp.jumpsArray)
    let jumps = resp.jumpsArray[current_prompt].reduce((a, b) => a + b, 0) - 1;
    console.log("[postWord] jumpsArray: ", resp.jumpsArray);
    if (jumps >= 13) { // cap it at 12 current jumps
        resp = sendAndReceiveXML(`end=true`);
        removeTallyDiv(current_prompt, 5);
        alert("I AM AT 12 jumps -> should skip now!!!");
    }
    console.log("[postWord] jumps: ", jumps);
    console.log("[postWord] current_prompt: ", current_prompt);
    if (!use_animations) {
        // check if we are at the ending page now (for when we have 12 jumps):
        if (jumps >= 13 && current_prompt === 4) {
            renderLinks(resp.prompt, resp.results, resp.i, true);
            return;
        } else {
            renderLinks(resp.prompt, resp.results, resp.i);
        }
        // console.log('word:', word, 'resp.prompt[1]:', resp.prompt[1], 'jumps:', resp.jumps);
        //This is the source of nearly all renderPrompt calls.
        if (word !== resp.prompt[1]) {
            let start_target = [word, resp.prompt[1]]
            let score = resp.score;
            if (jumps >= 13) {
                start_target = resp.prompt;
                score = 0;
                showBanner("skipped :(", "banner");
            }
            renderPrompts(resp.jumpsArray, resp.startTargetIdxs, start_target);
        }
        else {
            // console.log(`[showBanner] ${jumps}`)
            if (jumps <= 2) showBanner("perfect!", "banner-perfect");
            else if (jumps <= 3) showBanner("superb!", "banner-impressive");
            else if (jumps <= 5) showBanner("great", "banner-great");
            else if (jumps <= 7) showBanner("good...", "banner-good");
            else if (jumps <= 9) showBanner("close call", "banner-closecall");
        }
        activateLinks()
    }
    /////////// ANIMATE_CODE (XML in callback) ///////////
    // } else {
    //     const wordspace = document.getElementById("wordspace");
    //     function renderXMLAfterAnimation(word, resp) {
    //         prompts = resp.prompts;
    //         prompt_idx = resp.i;
    //         jumpsArray = resp.jumpsArray;
    //         jumps = resp.jumps;
    //         // console.log(`[postWord] prompts: ${prompts}, prompt_idx: ${prompt_idx}, jumpsArray: ${jumpsArray}, jumps: ${jumps}`);
    //         renderLinks(resp.prompt, resp.results, resp.i);
    //         // console.log('[postWord] Rendering prompts..')
    //         if (word !== resp.prompt[1]) {
    //             let start_target = [word, resp.prompt[1]]
    //             renderPrompts(prompts, jumpsArray, jumps, start_target = start_target);
    //         }
    //         activateLinks();
    //     }
    //     animateToCenter(clickedElem, wordspace, renderXMLAfterAnimation, word, resp);
    // }
}
