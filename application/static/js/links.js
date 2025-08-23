const USE_ANIMATIONS = false;
const MIDDLE_IDX = 10;
const HELP_FOCUS_MS = 3000;
const POST_DEBOUNCE_MS = 50;

let _postThrottledTimer = null;
let _postPendingArgs = null;
let _postRunning = false;
//request animation frame after 2 frames.
async function postWordAndYield(word, clickedElem) {
   _postRunning = true;
   try {
    postWord(word, clickedElem);
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
   }
   finally {
    _postRunning = false;
   }
}
function tryPostWord(word, clickedElem) {
    if (_postRunning) return;

    _postPendingArgs = [word, clickedElem]
    if (_postThrottledTimer) clearTimeout(_postThrottledTimer);
    _postThrottledTimer = setTimeout(async () => {
        const [word, clickedElem] = _postPendingArgs;
        _postPendingArgs = null;
        _postThrottledTimer = null;
        if (_postRunning) return;
        try {
            await postWordAndYield(word, clickedElem);
        }
        catch (err) {
            console.error('postWord error:', err);
            _postRunning = false;
        }
    }, POST_DEBOUNCE_MS);
}


//transform is from top-left corner.
let HELP_STEPS = [
    {
        id: 1,
        prompt: ['fruit', 'porch'],
        result: 'fruit',
        message: "<p>word.golf is played <br> with neighbor words</p>",
        focus: 'orchard',
        transform: [50, 85]
    },
    {
        id: 2,
        prompt: ['fruit', 'porch'],
        result: 'fruit',
        message: '<p style="text-align: right">We show you <br> the neighbors <br> for one word...</p>',
        transform: [55, 80],
    },
    {
        id: 3,
        prompt: ['fruit', 'porch'],
        result: 'fruit',
        message: '<p>... your goal <br> is to get <br> to another</p>',
        transform: [30, 80],
    },
    {
        id: 4,
        prompt: ['fruit', 'porch'],
        result: 'fruit',
        message: '<p>Click a word to <br> jump to it</p>',
        focus: 'orchard',
        transform: [50, 75],
        startSocket: 'top',
        endSocket: 'bottom',
    },
    {
        id: 5,
        prompt: ['fruit', 'porch'],
        result: 'fruit',
        message: '<p> for this pair, <br> we want to get to <span class="link--help-target">porch</span></p>'
    },
    {
        id: 6,
        prompt: ['fruit', 'porch'],
        result: 'orchard',
        message: '<p>picking <span class="link--help-target">house</span> <br> will get us closer</p>',
        focus: 'house',
        transform: [40, 80],
        startSocket: 'top',
        endSocket: 'auto',
    },
    {
        id: 7,
        prompt: ['fruit', 'porch'],
        result: 'house',
        message: "<p>once you're close enough, <br> the <span class='rainbow_text'>target</span> appears!</p>",
        focus: 'porch',
        transform: [50, 75],
        startSocket: 'bottom',
        endSocket: 'top',
    }
];

function defocusAll(){
    const links = Array.from(document.getElementsByClassName("link"));
    links.forEach((link, index) => {
        link.classList.remove("link--target", "link--unfocused");
        link.classList.add("link--disabled");
        // link.onclick = null;
    });
}

function focusLink(targetText) {
    const links = Array.from(document.getElementsByClassName("link"));
    links.forEach(link => {
        const text = link.innerText.trim();
        if (text === targetText) {
            link.classList.remove("link--disabled0");
            link.classList.add("link--target");
            if(link.id !== "rainbow_text_animated") {
                link.id = 'link--target';
            }
        }
    });
}

//@Parent: postWord
function renderLinks(prompt, results, i, session_done = false) {
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
    addHelpFocuses(prompt)
    if (promptEnded(prompt) || session_done) {
        renderScore(1)
        reportSessionEnded(session_done)
    }
    cueLinkPromptOnHover('.link--starting', '.prompt-start-word');
}

//keep track of the current index, ensure that the help_steps are shown in order.
helpStepId = 0;

function removeBubbleAssetClasses(element) {
    const classesToRemove = Array.from(element.classList).filter(className => 
        /^bubble-asset-\d+$/.test(className)
    );
    classesToRemove.forEach(className => {
        element.classList.remove(className);
    });
}
function addHelpFocuses(prompt){
    console.log('prompt is', prompt)
    if(arrayEqual(prompt, ["fruit", "porch"])){
        let info = document.getElementById("info-box");
        info.style.display = "flex";
        removeBubbleAssetClasses(info)
        switch (helpStepId) {
            case 1:
            info.classList.add('bubble-asset-5')
            break;
            case 2:
            info.classList.add('bubble-asset-13');
            break;
            case 3:
            info.classList.add('bubble-asset-6');
            break;
            case 4:
            info.classList.add('bubble-asset-10');
            break;
            case 5:
            info.classList.add('bubble-asset-13');
            break;
            case 6:
            info.classList.add('bubble-asset-12');
            break;
            case 7:
            info.classList.add('bubble-asset-9');
            break;
            case 8:
            info.classList.add('bubble-asset-11');
            break;
            default:
            info.classList.add('bubble-asset-10');
            break;
        }
        if([1,2,3,5].includes(helpStepId)){
            showTransientHelpPopup(helpStepId);
        }
        else if (helpStepId > 0 && helpStepId <= 7) {
            showArrowHelpPopup(helpStepId);
        }
        helpStepId++;
    }
}

let activeHapticAnimations = [];

function clearAllHapticAnimations() {
    // Remove haptic touch animations from all elements
    const hapticElements = document.querySelectorAll('.haptic-touch');
    hapticElements.forEach(element => {
        element.classList.remove('haptic-touch');
    });
    activeHapticAnimations = [];
}

let helpTimeout = null;
let helpClickHandler = null;

function showTransientHelpPopup(id){
    // console.log('showTransientHelpPopup called with id:', id);
    let info = document.getElementById("info-box");
    let helpStep = HELP_STEPS.filter(x => x.id === id)[0];
    clearAllHapticAnimations();
    defocusAll();
    
    // Clear any existing timeout and click handler
    if (helpTimeout) {
        clearTimeout(helpTimeout);
        helpTimeout = null;
    }
    if (helpClickHandler) {
        document.removeEventListener('click', helpClickHandler);
        helpClickHandler = null;
    }
    
    //pulse the fruit container
    if(id == 2){
        const fruitPromptWord = document.querySelector('.tally.prompt-start-word.prompt-word');
        fruitPromptWord.classList.add('animate-scale');
    }
    //pulse the porch container
    else if (id == 3){
        const porchPromptWord = document.querySelector('.tally.prompt-target-word.prompt-word');
        if (porchPromptWord) {
            porchPromptWord.classList.add('animate-scale');
        }
    }
    info.style.display = "flex";
    info.innerHTML = `${helpStep.message}`;
    if (helpStep.transform) {
        setResponsivePosition(info, helpStep.transform)
    }
    
    // Create click handler to advance to next step
    helpClickHandler = function(event) {
        // Clear timeout and click handler
        if (helpTimeout) {
            clearTimeout(helpTimeout);
            helpTimeout = null;
        }
        document.removeEventListener('click', helpClickHandler);
        helpClickHandler = null;
        
        // Advance to next step
        addHelpFocuses(helpStep.prompt);
    };
    
    // Add click listener to advance on user click
    document.addEventListener('click', helpClickHandler);
    
    // Set timeout as fallback (user can click to advance faster)
    helpTimeout = setTimeout(() => {
        // Remove click handler since timeout fired
        if (helpClickHandler) {
            document.removeEventListener('click', helpClickHandler);
            helpClickHandler = null;
        }
        helpTimeout = null;
        addHelpFocuses(helpStep.prompt);
    }, HELP_FOCUS_MS);
}

function setResponsivePosition(info, transform){
    const BOTTOM_MARGIN_PX = 65;
    
    // Force display temporarily to measure dimensions
    const originalDisplay = info.style.display;
    const originalVisibility = info.style.visibility;
    info.style.display = 'block';
    info.style.visibility = 'hidden'; // Hide while measuring
    
    // Get actual element dimensions including bubble pseudo-element
    const rect = info.getBoundingClientRect();
    const elementHeight = rect.height;
    
    // Restore original display state
    info.style.visibility = originalVisibility;
    info.style.display = originalDisplay;
    
    if (window.matchMedia && window.matchMedia("(max-width: 992px)").matches) {
        const x = transform[0];
        let y = transform[1];
        
        // Calculate max Y where element bottom = screen height - margin
        // Since transform: translate(-50%, -50%), center should be at: screenHeight - margin - (elementHeight/2)
        const maxCenterY = window.innerHeight - BOTTOM_MARGIN_PX - (elementHeight / 2);
        const maxYPercent = (maxCenterY / window.innerHeight) * 100;
        y = maxYPercent;
        
        info.style.left = `${x}%`;
        info.style.top = `${y}%`;
    } 
    //
    else {
        // console.log(`width is ${window.innerWidth}, height is ${window.innerHeight}`)
        const x = window.innerWidth * (0.6 + ((transform[0] / 100) * 0.4))
        let y = window.innerHeight * (transform[1] / 100);
        
        // Calculate max Y where element bottom = screen height - margin
        // Since transform: translate(-50%, -50%), center should be at: screenHeight - margin - (elementHeight/2)
        const maxCenterY = window.innerHeight - BOTTOM_MARGIN_PX - (elementHeight / 2);
        y = Math.min(y, maxCenterY);
        
        info.style.left = `${x}px`;
        info.style.top = `${y}px`;
    }
}

function hasActiveHelpTimeout() {
    return helpTimeout !== null;
}


// function showClickHelpPopup(id){
//     console.log('showClickHelpPopup called with id:', id);
//     let helpStep = HELP_STEPS.filter(x => x.id === id)[0];
//     let info = document.getElementById("info-box");
//     info.style.display = "flex";
//     info.innerHTML = `${helpStep.message}`;
//     if (helpStep.transform) {
//         const x = window.innerWidth * (helpStep.transform[0] / 100);
//         const y = window.innerHeight * (helpStep.transform[1] / 100);
//         info.style.left = `${x}px`;
//         info.style.top = `${y}px`;
//     }

//     const handleClick = () => {

//         document.removeEventListener('click', handleClick);
//         showArrowHelpPopup(id+1);
//     };

//     document.addEventListener('click', handleClick);
// }
function addHapticTouchAnimation(targetElement) {
    // Add haptic touch animation class
    targetElement.classList.add('haptic-touch');
    
    // // Remove the animation class after it completes
    // setTimeout(() => {
    //     targetElement.classList.remove('haptic-touch');
    // }, 600);
}

function showArrowHelpPopup(id) {
    clearAllHapticAnimations()
    let helpStep = HELP_STEPS.filter(x => x.id === id)[0];
    message = helpStep.message;
    transform = helpStep.transform;
    defocusAll();
    focusLink(helpStep.focus);
    
    let info = document.getElementById("info-box");
    info.style.display = "flex";
    info.innerHTML = `${message}`;

    if (helpStep.focus) {
        const addHapticAfterDOM = () => {
            let targetBtn = document.getElementById('link--target');
            if(!targetBtn){
                targetBtn = document.getElementById('rainbow_text_animated');
            }
            const target = targetBtn?.querySelector('span');
            if (target) {
                addHapticTouchAnimation(target);
            } else {
                requestAnimationFrame(addHapticAfterDOM);
            }
        };
        addHapticAfterDOM();
    }
    setResponsivePosition(info, helpStep.transform)
}

function addDoneFocus(prompt, results, i) {
    const targetWord = prompt[1];
    const idx = results.indexOf(targetWord);
    if (idx !== -1) {
        const promptBoxes = document.querySelectorAll('#prompts .prompt-box .prompt');
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
    startLink.className = "link link--starting"
    return startLink
}

async function renderLogout(){
    try {
        const res = await fetch("/logout", {
            method: "POST",
            credentials: "include", // to store cookies sent by backend (make sure all requests to backend have this)
            headers: {
                'Content-Type': 'application/json'  // Ensure this matches what the server expects
            },
            body: JSON.stringify({
                date: new Date().toISOString().split('T')[0]
            })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.removeItem('logged_in');
            const loginWelcome = document.getElementById('login-welcome');
            const logged_in_buttons = document.getElementById('logged_in-buttons');
            loginWelcome.style.display = 'none';
            logged_in_buttons.style.display = 'none';
            const logoutButton = document.getElementById('guest-buttons');
            logoutButton.style.display = 'flex';
            
            // // Change the profile text back to sign in
            // const profileSwitchContainer = document.querySelector('.switchContainer[onclick="renderProfile()"] p');
            // if (profileSwitchContainer) {
            //     profileSwitchContainer.textContent = 'profile';
            // }
            
            window.location.href = '/';
        } else {
            alert("Logout failed:", data);
        }
    } catch (err) {
        console.log("Error during logout:", err);
    }
    // }
}


function switchToLoggedIn() {
    // document.getElementById('guest-buttons').style.display = 'none';
    // document.getElementById('logged_in-buttons').style.display = 'flex';
    // const logoutBtn = document.createElement('button');
    // logoutBtn.textContent = 'logout';
    // logoutBtn.className = 'switch switch--outlined';
    // logoutBtn.onclick = renderLogout;
    // document.getElementById('logged_in-buttons').appendChild(logoutBtn);
}

function renderSessionDone(resp) {
    runAfterBannerDisappears(() => renderFinish(resp));
    prompts = resp.prompts
    jumpsArray = resp.jumpsArray
    start_target = prompts[4]
    previous_words = resp.previous_words
    disablePrompts() //on reload, this does not set anything. so behavior after not right. 
    localStorage.setItem('finished', 'true')
    renderPrompts(jumpsArray, resp.wordsArray, resp.startTargetIdxs, start_target, 0, true, true)
    // let is_logged_in = Boolean(localStorage.getItem('logged_in'));
    // if (is_logged_in) {
    //     switchToLoggedIn();
    // }
}


/**
 * @param {Array} a
 * @param {Array} b
 * @returns {boolean}
 */
function arrayEqual(a, b){
    if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++){
        if (!arrayEqual(a[i], b[i])) return false;
    }
    return true;
}


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
function reportSessionEnded(session_done) {
    const isHelp = localStorage.getItem('is_help') === "true";
    resp = sendAndReceiveXML(`${isHelp ? 'help_end' : 'end'}=true`);
    console.log('reportSessionEnded resp: ', resp)
    if (resp.hasOwnProperty('end')) {
        renderLinks(resp.prompt, resp.results)
        let start_target = resp.prompts[resp.i]
        renderPrompts(resp.jumpsArray, resp.wordsArray, resp.startTargetIdxs, start_target, 0, end=true)
    }
    else if (resp.hasOwnProperty('help_session_done')) {
        runAfterBannerDisappears(() => {renderHelpFinish()})
        renderPrompts(resp.jumpsArray, resp.wordsArray, resp.startTargetIdxs, resp.prompts[0], 0, end=true)
        let promptBox = document.querySelectorAll('#prompts .prompt-box')[1]
        promptBox.children[5].children[0].classList.remove('prompt-target-word');
        promptBox.children[5].children[0].classList.remove('prompt-word');
        disableLinks()
    }
    else if (resp.hasOwnProperty('session_done') || session_done) {
        renderSessionDone(resp)
        disableLinks()
    }
    else {
        console.log('[helpSessionEnd]')
        renderLinks(resp.prompt, resp.results)
        let start_target = resp.prompts[resp.i]
        renderPrompts(resp.jumpsArray, resp.wordsArray, resp.startTargetIdxs, start_target)
        activateLinks()
    }
}

//activates links on the page
function activateLinks() {
    ws_texts = ws_to_text()
    ws_array.map(function (el, i) {
        if (i !== MIDDLE_IDX) {
            el.onclick = function () {
                tryPostWord(ws_texts[i], el);
            }
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
    setTimeout(() => banner.remove(), 900);
  }, 700);
}

function postWord(word, clickedElem, use_animations = USE_ANIMATIONS) {
    let resp = sendAndReceiveXML("word=" + word);
    if (localStorage.getItem('is_help') !== "true") {
        localStorage.setItem('in_progress', 'true');
        }
    let promptIdx = lastNonzeroRow(resp.jumpsArray)
    let jumps = resp.jumpsArray[promptIdx].reduce((a, b) => a + b, 0) - 1;
    if (jumps > 5) {
        // document.getElementById("skip-button").style.display = "block";
    }
    if (jumps >= 13) { 
        resp = sendAndReceiveXML(`end=true`);
        // console.log("Jumps greater than 13");
    }
    if (!use_animations) {
        if (jumps >= 13 && promptIdx === 4) {
            renderLinks(resp.prompt, resp.results, resp.i, true);
            return;
        } else {
            renderLinks(resp.prompt, resp.results, resp.i);
        }
        //IMPORTANT: nearly all renderPrompt calls come from here.
        if (word !== resp.prompt[1]) {
            let start_target = [word, resp.prompt[1]]
            let score = resp.score;
            if (jumps >= 13) {
                start_target = resp.prompt;
                score = 0;
                showBanner("skipped :(", "banner");
            }
            renderPrompts(resp.jumpsArray, resp.wordsArray, resp.startTargetIdxs, start_target, resp.score);
        }
        else {
            if (jumps <= 2) showBanner("perfect!", "banner-perfect");
            else if (jumps <= 3) showBanner("superb!", "banner-impressive");
            else if (jumps <= 5) showBanner("great", "banner-great");
            else if (jumps <= 7) showBanner("good...", "banner-good");
            else if (jumps <= 12) showBanner("close call", "banner-closecall");
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
