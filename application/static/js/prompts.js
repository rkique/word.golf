//[start, target], jumps, cos


function clearBoxes() {
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    for (let box of promptBoxes) {
        clearChildren(box);
    }
}

//given a collection of (promptBox -> promptTallyContainer -> array(wordOrTally))
// does something.
function tallyAllPrompts(promptBoxes, current_jumps) {
    console.log(`[tallyAllPrompts] current_jumps ${current_jumps}`)
    // if (current_jumps >= 12){
    //     for (let box of promptBoxes) {
    //         let prompts = box.querySelectorAll('.prompt');
    //         prompts.forEach(prompt => {
    //         let sixthChild = prompt.children[5];
    //         if (sixthChild) {
    //             sixthChild.innerText = "";
    //             sixthChild.classList.add('no-border')
    //         }
    //         });
    //     }
    // }
    // else {
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            updateInnerTextSmooth(word, '')
            word.classList.remove("prompt-word");
            word.classList.add("tally");
        });
    }
    // }
}

//given a collection of (promptBox -> promptTallyContainer -> array(wordOrTally))
//updates .prompt-word to .tally when it does not contain target.
function tallyNonTargetPrompts(promptBoxes, targets) {
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            if (word.innerText !== "" && !targets.includes(word.innerText)) {
                word.classList.remove("prompt-word");
                word.classList.add("tally");
                updateInnerTextSmooth(word, '')
            }
        });
    }
}

function updateInnerTextSmooth(elem, newText) {
  const container = elem.closest('.word-tally-container');
  if (!container) return;
  elem.style.maxWidth = 'none';
  const currentWidth = elem.offsetWidth;
  elem.style.maxWidth = currentWidth + 'px';

  requestAnimationFrame(() => {
    elem.innerText = newText;
    requestAnimationFrame(() => {
      const newWidth = elem.scrollWidth;
      // Apply new max-width with transition
      elem.style.maxWidth = newWidth + 'px';
    });
  });
}

//todo: we want to edit an existing promptTag.
function fillPrompt(promptBox, start, target, score, current_jumps) {
    // console.log(`fillPrompt: start=${start}, target=${target}, score=${score}`);
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
    if (promptWords.length === 0){
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
    if(targetTallyContainer.children.length === 0){
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


// function makeDonePromptTag(start_target, jumps) {
//     // Use makeSpacedPromptTag with start at idx 0 and finish at idx 5
//     let spacedTag = makeSpacedPromptTag(start_target, 0); // score=0 puts start at idx 0
//     spacedTag.className += " prompt--done";
//     return spacedTag;
// }

function serializePrompts(jumpsA) {
  if(localStorage.getItem('is_help') === 'true'){
    return;
  }
  const promptsEl = document.getElementById('prompts');
  const completedCount = jumpsA.length;
  for (let i = 0; i < completedCount; i++) {
    const key = `prompt${i + 1}`;
    const existing = localStorage.getItem(key);
    const child = promptsEl.children[i];
    if (
      child &&
      !existing &&
      child.querySelectorAll('.prompt-word').length === 0
    ) {
      localStorage.setItem(key, child.outerHTML);
    }
  }
  // Step 2: Restore any saved prompt HTML if it's missing in DOM
  for (let i = 0; i < completedCount; i++) {
    const key = `prompt${i + 1}`;
    const saved = localStorage.getItem(key);
    const child = promptsEl.children[i];
    //replaces promptsEl.child with temp.innerHTML
    if (saved && child) {
      const temp = document.createElement('div');
      temp.innerHTML = saved;
      promptsEl.replaceChild(temp.firstElementChild, child);
      console.log(`Restored prompt ${i + 1} from localStorage.`);
    }
  }
}

function renderPrompts(promptTexts, i, jumpsA, current_jumps, start_target = null, score = null) {
    // alert(`[renderPrompts] promptTexts ${promptTexts} start_target: ${start_target}`);
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    targets = promptTexts.map(arr => arr[1]);
    tallyNonTargetPrompts(promptBoxes, targets);
    const done = promptTexts.slice(0, i);
    tallyAllPrompts(Array.from(promptBoxes).slice(0, i), current_jumps);
    done.forEach((promptText, idx) => {
        const promptWords = promptBoxes[idx].querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            word.style.border = '1px solid var(--grayed-out-color)';
            word.style.color = 'var(--grayed-out-color)';
        });
    });

    // update current prompt
    if (i < promptTexts.length && promptBoxes[i]) {
        let current = promptTexts[i];
        let currentTag;
        let current_score = 0
        if (start_target && score) {
            start = start_target[0]
            target = start_target[1]
            current_score = score
            // alert(`filling ${start} to ${target}`)
            fillPrompt(promptBoxes[i], start, target, current_score, current_jumps);
        }
        else {
            fillPrompt(promptBoxes[i], current[0], current[1], current_score, current_jumps)
        }
    }

    console.log(`clearing prompt boxes ${i+1} to ${promptBoxes.length}`)
    // clear remaining boxes
    for (let j = i + 1; j < promptBoxes.length; j++) {
        promptBoxes[j].className = 'prompt-box';
        promptBoxes[j].style.color = 'var(--grayed-out-color)';
        // promptBoxes[i].style.borderLeft = '1px solid var(--grayed-out-color)';
        promptBoxes[j].innerHTML = '';
    }
    serializePrompts(jumpsA)
}