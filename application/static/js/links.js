const USE_ANIMATIONS = false;
const HELP_STEPS = [
            {
                prompt: ['outside', 'layer'],
                result: 'outside',
                message: "Click a word to jump to it.",
                focus: 'beneath',
                transform: [20,60],
                startSocket: 'top',
                endSocket: 'auto',
            },
            {
                prompt: ['outside', 'layer'],
                result: 'beneath',
                message: "We want to get to 'layer', so choose the most similar word.",
                focus: 'surface',
                transform: [30,37],
                startSocket: 'top',
                endSocket: 'auto',
            },
            {
                prompt: ['outside', 'layer'],
                result: 'surface',
                message: "Good job! Click the goal word to complete the prompt.",
                focus: 'layer',
                transform: [20,40],
                startSocket: 'top',
                endSocket: 'auto',
            },
            {
                prompt: ['mercury', 'razor'],
                result: 'mercury',
                message: "Choose carefully! You only need two jumps.",
                focus: 'toothpaste',
                transform: [30,50],
                startSocket: 'left',
                endSocket: 'auto',
            },
            {
                prompt: ['mercury', 'razor'],
                result: 'toothpaste',
                message: "Five prompts per day, the best score is 10.",
                focus: 'razor',
                transform: [10,20],
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
        if (text == startText){
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
        const waitForElements = () => {
            info = document.getElementById('info-box');
            const target = document.getElementById('link--target');
            if (info && target) {
                const line = new LeaderLine(info, target, {
                    startSocket: startSocket,
                    endSocket: endSocket,
                    // startSocketGravity: [-192, -172],
                    // endSocketGravity: [192, 172], 
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
    } else {
        document.getElementById("information").innerHTML =
            `<p class='info-box'>${message}</p>`;
    }
}

/* makes and renders links */
function makeLink(prompt,word) {
    let link = document.createElement("button");
    let span = document.createElement("span")
    span.innerText = word;
    link.appendChild(span)
    link.className = "link"
    if(prompt[1] == word) 
        {
            link.className = "link link--target rainbow_text_animated"
        }
    return link
}

function makeStartLink(prompt, word){
    startLink = makeLink(prompt, word)
    startLink.className = "link link--disabled link--starting"
    return startLink
}

function tallyScreen(prompts, i, jumpsA){
    renderFinish(jumpsA)    
    renderPrompts(prompts,i, jumpsA, false)
}
function arrayEqual(a, b) {
    return Array.isArray(a) && Array.isArray(b) &&
           a.length === b.length &&
           a.every((val, index) => val === b[index]);
}
function addHelpFocuses(prompt, results){
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

//@Parent: postWord
function renderLinks(prompt, results, debug_session_done = false) {
    // console.log('[renderLinks] Rendering links for prompt:', prompt, 'with results:', results);
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
    addHelpFocuses(prompt, results)
    if(sessionEnded(prompt) || debug_session_done){
    disableLinks()
    reportSessionEnded(debug_session_done)
    }
}

//@Parent: maintainLinks
function reportSessionEnded(debug_session_done) {
    if (localStorage.getItem('is_help') == "true") {
        resp = sendAndReceiveXML(`help_end=true`)
    } else {
        resp = sendAndReceiveXML(`end=true`)
    }
    console.log('[reportSessionEnded] Response:', resp);
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    //If user has completed all prompts
    if (resp.hasOwnProperty('help_session_done')){
        renderHelpFinish()
    }
    else if (resp.hasOwnProperty('session_done') || debug_session_done){
        localStorage.setItem("lastComplete", data["date"])
        tallyScreen(resp.prompts, resp.i, resp.jumpsA)
    }
    else {
    renderToFrom(resp.prompt, resp.jumps);
    renderLinks(resp.prompt, resp.results)
    // console.log('[reportSessionEnded] Rendering prompts..')
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    }
}

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i], el);
    }})
}

function postWord(word, clickedElem, use_animations=USE_ANIMATIONS) {

    const resp = sendAndReceiveXML("word=" + word);

    // let still_in_help = localStorage.getItem('is_help') === 'true';
    // if (!still_in_help) {
    let prev_words = [];
    prev_words = JSON.parse(localStorage.getItem('previous_words'));
    if (!prev_words) prev_words = [];
    prev_words.push(word);
    // update the previous words in localStorage
    localStorage.setItem('previous_words', JSON.stringify(prev_words));
    // }

    if (!use_animations) {
        renderToFrom(resp.prompt, resp.jumps);
        renderLinks(resp.prompt, resp.results);
        //renderPrompts unless finished.
        if (word !== resp.prompt[1]) {
        renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
        }
        activateLinks()
    } else {
        const wordspace = document.getElementById("wordspace");
        function renderXMLAfterAnimation(word, resp) {
            // console.log('[postWord] resp')
            // console.log(resp);
            prompts = resp.prompts;
            prompt_idx = resp.i;
            jumpsA = resp.jumpsA;
            jumps = resp.jumps;
            // console.log(`[postWord] prompts: ${prompts}, prompt_idx: ${prompt_idx}, jumpsA: ${jumpsA}, jumps: ${jumps}`);
            renderLinks(resp.prompt, resp.results);
            // console.log('[postWord] Rendering prompts..')
            if (word !== resp.prompt[1]) {
                renderPrompts(prompts, prompt_idx, jumpsA, jumps);
            }
            activateLinks();
        }
        animateToCenter(clickedElem, wordspace, renderXMLAfterAnimation, word, resp);
    }
}
