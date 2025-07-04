function clearBoxes() {
    // // get all prompt-box elements
    // const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    // for (let box of promptBoxes) {
    //     clearChildren(box);
    // }
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

//add a .prompt-word to a tally contaner.
//the tally containers themselves are always reprsenting the jumpsArray
//the .prompt-word class overrides the tally container class.

//renderTallies(jumpsArray){}
//addStartWord()
//addTargetWord()

//prompt-word class overriding tally class.
//


//given a promptBox and prompt-tally-container, updates the correct one with tallyDiv.
function renderTallies(jumpsArray) {
    change_idx = null
    //adding tallyDivs.
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    jumpsArray.forEach((row, row_idx) => {
        row.forEach((tally_count, col_idx) => {
            let wordTallyContainer = wordTallyContainers[row_idx * 6 + col_idx]
            while (wordTallyContainer.querySelectorAll('.tally').length != tally_count){
                let tallyDiv = document.createElement("div");
                tallyDiv.className = 'tally';
                wordTallyContainer.appendChild(tallyDiv);
                change_idx = [row_idx, col_idx]
            }
        });
    });
    return change_idx;
}

function renderWord(word, row, column) {
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    const wordTallyContainer = wordTallyContainers[row * 6 + column]
    // Get the last .tally child of wordTallyContainer and modify it
    let tallies = wordTallyContainer.querySelectorAll('.tally');
    if (tallies.length > 0) {
        promptWord = tallies[tallies.length - 1];
        promptWord.classList.add('prompt-word');
        promptWord.innerText = word;
        wordTallyContainer.appendChild(promptWord);
    } else { alert(`no tallies at ${row} ${column}`)}
}


// Given a promptBox and prompt-tally-container, removes one tally from the correct cell.
function removeTallyDiv(row, column) {
    promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    promptBox = promptBoxes[row];
    wordTallyContainer = promptBox.children[column];
    tallies = wordTallyContainer.querySelectorAll('.tally');
    console.log(`[removeTallyDiv] has ${tallies.length} at ${row} ${column}`)
    if (tallies.length > 0){
    wordTallyContainer.removeChild(tallies[tallies.length - 1]);
    console.log("[removeTallyDiv] after removing: ", wordTallyContainer);
    return [row, column];
    }
}



function clearAllPromptWords() {
    const promptWords = document.querySelectorAll('.prompt-word');
    promptWords.forEach(word => word.remove());
}

//Updates existing prompts with new start and target. 
//Adds tally in correct place but does not resolve 
function fillPrompt(promptBox, start, target, score, current_jumps) {
    if (promptBox.children.length != 6) {
        for (let i = 0; i < 6; i++) {
            let div = document.createElement("div");
            div.className = 'word-tally-container'
            promptBox.appendChild(div);
        }
    }
    // console.log(`makeSpacedPromptTag: start=${start}, target=${target}, score=${score}`);
    //here idx is used to set the prompt-word div
    idx = simToIndex(score)
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


function lastNonzeroRow(jumpsArray) {
    for (let i = jumpsArray.length - 1; i >= 0; i--) {
        if (jumpsArray[i].some(val => val !== 0)) {
            return i; 
        }
    }
    return -1 //last valid index.
}

function addTallyContainers(promptBox){
    if (promptBox.children.length === 0){
    for (let i = 0; i < 6; i++) {
        let div = document.createElement("div");
        div.className = 'word-tally-container'
        promptBox.appendChild(div);
    }
}
}
/**
 * @param {Array} jumpsArray
 * @param {[[number, number], [number, number]]} idxs 
 * @param {[string, string]} start_target
 */
function renderPrompts(jumpsArray, idxs, start_target) {
    console.log(
        '[renderPrompts] jumpsArray:', jumpsArray, typeof jumpsArray,
        'idxs:', idxs, typeof idxs,
        'start_target:', start_target, typeof start_target
    );
    clearAllPromptWords();
    const [start_idx, target_idx] = idxs
    const [start, target] = start_target
    renderTallies(jumpsArray);
    renderWord(start, ...start_idx)
    renderWord(target, ...target_idx)
}