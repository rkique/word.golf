function clearBoxes() {
    // get all .word-tally-box elements inside .prompt-box
    const wordTallyBoxes = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    for (let box of wordTallyBoxes) {
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

function updateInnerTextSmooth(elem, newText, animate) {
    if (animate) {
        const container = elem.closest('.word-tally-box');
        if (!container) return;
        elem.style.maxWidth = 'none';
        const currentWidth = elem.scrollWidth;
        elem.style.maxWidth = currentWidth + 'px';
        requestAnimationFrame(() => {
            elem.innerText = newText;
            requestAnimationFrame(() => {
                const newWidth = elem.scrollWidth;
                // Apply new max-width with transition
                elem.style.maxWidth = newWidth + 'px';
                savePrompts();
            });
        });
    } else {
        elem.innerText = newText;
    }
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

function renderWord(word, row, column, animate=true) {
    let wordTallyContainers = document.querySelectorAll('#prompts .prompt-box .word-tally-box');
    const wordTallyContainer = wordTallyContainers[row * 6 + column]
    // Get the last .tally child of wordTallyContainer and modify it
    let tallies = wordTallyContainer.querySelectorAll('.tally');
    if (tallies.length > 0) {
        promptWord = tallies[tallies.length - 1];
        promptWord.classList.add('prompt-word');
        // promptWord.innerText = word;
        updateInnerTextSmooth(promptWord, word, animate)
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


function clearAllPromptWords(end) {
    
    const promptWords = document.querySelectorAll('.prompt-word');
    console.log("[clearAllPrompts] Before clearing", promptWords);
    if (end == false) {
        promptWords.forEach(word => word.remove());
    } else {
        promptWords.forEach(word => word.classList.remove('prompt-word'));
        promptWords.forEach(word => updateInnerTextSmooth(word, ''));
    }
    console.log("[clearAllPrompts] After clearing", promptWords);
}

function savePrompts() {
    // if (localStorage.getItem('is_help') === 'true') { return; }
    // const prompts = document.getElementById('prompts');
    // if (prompts) {
    //     console.log('[savePrompts] saving prompts')
    //     localStorage.setItem('prompts', prompts.outerHTML);
    // }
}

function setPrompts() {
    // if (localStorage.getItem('is_help') === 'true') { return false; }
    // if (localStorage.getItem('_prompts')) {
    //     console.log('[setPrompts] setting prompts from _prompts backup.');
    //     const container = document.getElementById('prompts');
    //     _prompts = localStorage.getItem('_prompts');
    //     container.outerHTML = _prompts
    //     localStorage.setItem('prompts', _prompts)
    //     localStorage.removeItem('_prompts')
    //     return true;
    // }
    // const savedPrompts = localStorage.getItem('prompts');
    // if (savedPrompts) {
    //     console.log('[setPrompts] setting prompts from last save.')
    //     const container = document.getElementById('prompts');
    //     container.outerHTML = savedPrompts;
    //     return true
    // } else {
    //     return false
    // }
}

function tallyPrompts(prompts, jumpsArray, current_jumps) {
    let targets = prompts.map(arr => arr[1]);
    ct = jumpsArray.length;
    tallyStarts(targets);
    tallyAllPrompts(ct, current_jumps)
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
function renderPrompts(jumpsArray, idxs, start_target, end = false) {
    console.log(
        '[renderPrompts] jumpsArray:', jumpsArray, typeof jumpsArray,
        'idxs:', idxs, typeof idxs,
        'start_target:', start_target, typeof start_target,
        'end', end
    );
    clearAllPromptWords(end);
    if (!end) {
        const [start_idx, target_idx] = idxs
        const [start, target] = start_target
        renderTallies(jumpsArray);
        renderWord(start, ...start_idx)
        renderWord(target, ...target_idx, animate=false)
    }
    
}