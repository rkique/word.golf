function clearBoxes() {
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    for (let box of promptBoxes) {
        clearChildren(box);
    }
}

function clearLastTallyContainer(ct) {
    promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    const box = promptBoxes[ct - 1];
    if (box.children[5].classList.contains('word-tally-container')) {
        clearChildren(box.children[5]);
    }
}

//given a collection of (promptBox -> promptTallyContainer -> array(wordOrTally))
// does something.
function tallyAllPrompts(ct) {
    promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    promptBoxes = Array.from(promptBoxes).slice(0, ct)
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            word.innerText = ''
            word.classList.remove("prompt-word");
            word.classList.add("tally");
        });
    }
    promptBoxes.forEach((box, idx) => {
        const promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            word.style.border = '1px solid var(--grayed-out-color)';
            word.style.color = 'var(--grayed-out-color)';
        });
    });
    // }
}

//given a collection of (promptBox -> promptTallyContainer -> array(wordOrTally))
//updates the start prompt-word to tally.
function tallyStarts(targets) {
    promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            if (word.innerText !== "" && !targets.includes(word.innerText)) {
                word.innerText = ''
                word.classList.remove("prompt-word");
                word.classList.add("tally");
            }
        });
    }
}

function updateInnerTextSmooth(elem, newText) {
    const container = elem.closest('.word-tally-container');
    if (!container) return;
    elem.style.maxWidth = 'none';
    const currentWidth = elem.scrollWidth;
    elem.style.maxWidth = currentWidth + 'px';

    requestAnimationFrame(() => {
        // console.log(`[updateInnerTextSmooth] replacing ${elem.innerText} with ${newText}`)
        elem.innerText = newText;
        requestAnimationFrame(() => {
            const newWidth = elem.scrollWidth;
            // Apply new max-width with transition
            elem.style.maxWidth = newWidth + 'px';
            savePrompts();
        });
    });
}

//Updates existing prompts with new start and target. 
//Adds tally in correct place but does not resolve 
function fillPrompt(promptBox, start, target, score, current_jumps) {
    if (promptBox.children.length === 0) {
        for (let i = 0; i < 6; i++) {
            let div = document.createElement("div");
            div.className = 'word-tally-container'
            promptBox.appendChild(div);
        }
    }
    // console.log(`makeSpacedPromptTag: start=${start}, target=${target}, score=${score}`);
    //here idx is used to set the prompt-word div
    let idx = score < 0.2 ? 0 : score < 0.27 ? 1 :
        score < 0.35 ? 2 : score < 0.42 ? 3 : 4;
    let wordTallyContainers = promptBox.children;
    let wordTallyContainer = wordTallyContainers[idx]
    let promptWord;
    //when no prompt-word exists (but tallys can)
    const promptWords = Array.from(wordTallyContainer.children).filter(child => child.classList.contains('prompt-word'));
    if (promptWords.length === 0) {
        promptWord = document.createElement("div");
        promptWord.className = 'prompt-word'
        // promptWord.innerText = start;
        wordTallyContainer.appendChild(promptWord)
        updateInnerTextSmooth(promptWord, start);
    }
    //add a .tally to wordTallyContainer.
    else {
        let tallyDiv = document.createElement("div");
        tallyDiv.className = 'tally';
        wordTallyContainer.appendChild(tallyDiv);
    }

    targetTallyContainer = promptBox.children[5];
    //if 6th child has no promptWords, set targetTallyContainer with the target text.
    if (targetTallyContainer.children.length === 0) {
        targetPromptWord = document.createElement("div");
        targetPromptWord.className = 'prompt-word'
        // targetPromptWord.innerText = target;
        targetTallyContainer.appendChild(targetPromptWord)
        updateInnerTextSmooth(targetPromptWord, target)
    }
    //clear other tallyContainers on write.
    for (let i = 0; i < 6; i++) {
        if (i !== idx && i !== 5) {
            let wordTallyContainer = promptBox.children[i]
            for (promptOrTally of wordTallyContainer.children) {
                // promptOrTally.innerText = ''
                updateInnerTextSmooth(promptOrTally, '')
            }
        }
    }
}

function savePrompts() {
    if (localStorage.getItem('is_help') === 'true') { return; }
    const prompts = document.getElementById('prompts');
    if (prompts) {
        console.log('[savePrompts] saving prompts')
        localStorage.setItem('prompts', prompts.outerHTML);
    }
}

//return whether prompts have been restored.
function setPrompts() {
    if (localStorage.getItem('is_help') === 'true') { return false; }
    if (localStorage.getItem('_prompts')) {
        console.log('[setPrompts] setting prompts from _prompts backup.');
        const container = document.getElementById('prompts');
        _prompts = localStorage.getItem('_prompts');
        container.outerHTML = _prompts
        localStorage.setItem('prompts', _prompts)
        localStorage.removeItem('_prompts')
        return true;
    }
    const savedPrompts = localStorage.getItem('prompts');
    if (savedPrompts) {
        console.log('[setPrompts] setting prompts from last save.')
        const container = document.getElementById('prompts');
        container.outerHTML = savedPrompts;
        return true
    } else {
        return false
    }
}

function tallyPrompts(prompts, jumpsArray, current_jumps) {
    let targets = prompts.map(arr => arr[1]);
    ct = jumpsArray.length;
    tallyStarts(targets);
    tallyAllPrompts(ct, current_jumps)
}

function renderPrompts(prompts, jumpsArray, current_jumps, start_target, is_reload = false, score = null) {
    if (!prompts || !jumpsArray || !start_target) {
        console.warn('[renderPrompts] Missing required arguments:', {
            prompts,
            jumpsArray,
            start_target
        });
    } else {
        // console.log('[renderPrompts] args:', { prompts, jumpsArray, current_jumps, start_target, is_reload, score });
    }
    if (is_reload) {
        console.log('is_reload true')
        if (setPrompts()) {
            return //exit
        }
    }
    let promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    tallyPrompts(prompts, jumpsArray, current_jumps)
    if (ct < prompts.length && promptBoxes[ct]) {
        let [start, target] = start_target || prompts[ct];
        const current_score = score || 0;
        fillPrompt(promptBoxes[ct], start, target, current_score, current_jumps);
    }
    for (let j = ct + 1; j < promptBoxes.length; j++) {
        promptBoxes[j].className = 'prompt-box';
        promptBoxes[j].style.color = 'var(--grayed-out-color)';
        promptBoxes[j].innerHTML = '';
    }
}