//[start, target], jumps, cos


function clearBoxes() {
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    for (let box of promptBoxes) {
        clearChildren(box);
    }
}

//with qualification that if finish no.
function tallyAllPrompts(promptBoxes, targets) {
    let promptCount = 0;
    if (promptBoxes.length > 0 && promptBoxes[0]) {
        const prompts = promptBoxes[0].querySelectorAll('.prompt');
        promptCount = prompts ? prompts.length : 0;
    }
    if (promptCount >= 12){
        //for each prompt child of promptBox, set the sixth child border to none and clear the innerText
        for (let box of promptBoxes) {
            let prompts = box.querySelectorAll('.prompt');
            prompts.forEach(prompt => {
            let sixthChild = prompt.children[5];
            if (sixthChild) {
                sixthChild.innerText = "";
                sixthChild.classList.add('no-border')
            }
            });
        }
    }
    else {
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            word.innerText = "";
            word.classList.remove("prompt-word");
            word.classList.add("tally");
        });
    }
    }
}

function tallyNonTargetPrompts(promptBoxes, targets) {
    for (let box of promptBoxes) {
        let promptWords = box.querySelectorAll('.prompt-word');
        promptWords.forEach(word => {
            if (word.innerText !== "" && !targets.includes(word.innerText)) {
                word.classList.remove("prompt-word");
                word.classList.add("tally");
                word.innerText = "";
            }
        });
    }
}

function updateInnerTextSmooth(elem, newText) {
    // Force layout measurement before changing text
  elem.style.maxWidth = (elem.scrollWidth) +  'px';
  requestAnimationFrame(() => {
    // Change the text
    elem.innerText = newText;
    // Wait for text layout to update
    requestAnimationFrame(() => {
      // Animate to new width
      const newWidth = (elem.scrollWidth)+ 'px';
      elem.style.maxWidth = newWidth;
    });
  });
}

//todo: we want to edit an existing promptTag.
function fillPrompt(promptBox, start, target, score) {
    console.log(`fillPrompt: start=${start}, target=${target}, score=${score}`);
    if (promptBox.children.length === 0) {
        for (let i = 0; i < 6; i++) {
            let div = document.createElement("div");
            promptBox.appendChild(div);
        }
    }
    console.log(`makeSpacedPromptTag: start=${start}, target=${target}, score=${score}`);
    //here idx is used to set the prompt-word div
    let idx = score < 0.2 ? 0 : score < 0.27 ? 1 :
            score < 0.35 ? 2 : score < 0.42 ? 3 : 4;
    children = promptBox.children;
    let cell = children[idx];
    updateInnerTextSmooth(cell, start);
    cell.className = "prompt-word";
    targetBox = promptBox.children[5];
    if(targetBox.innerText !== target){
        updateInnerTextSmooth(targetBox, target)
        targetBox.className = "prompt-word";
    }
    for (let i = 0; i < 6; i++) {
        if (i !== idx){
        let cell = document.createElement("div");
        promptBox.children[i] = cell;
        }
    }
}

function makePromptTag(start_target, jumps) {
    let div = document.createElement("div");
    div.className = "prompt";
    let pWord = document.createElement("p");
    pWord.className = "prompt-word";
    pWord.style.display = "inline-block";
    pWord.innerText = start_target[1];
    div.appendChild(pWord);

    let pJumps = document.createElement("p");
    pJumps.className = "prompt-jumps";
    pJumps.style.display = "inline-block";
    if (window.innerWidth >= 992) {
        pJumps.classList.add("prompt-num-large");
    }
    pJumps.innerText = jumps !== null ? jumps : "";
    div.appendChild(pJumps);

    return div;
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
  if (!promptsEl) {
    console.warn('Element #prompts not found.');
    return;
  }
  const completedCount = jumpsA.length;
  for (let i = 0; i < completedCount; i++) {
    const key = `prompt${i + 1}`;
    const existing = localStorage.getItem(key);
    // Step 1: Save completed prompt if not already stored
    const child = promptsEl.children[i];
    if (child && !existing) {
      localStorage.setItem(key, child.outerHTML);
      console.log(`Saved prompt ${i + 1} to localStorage.`);
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
    serializePrompts(jumpsA)
    if(jumpsA.length >= 5){
        return;
    }
    // console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`);
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');
    targets = promptTexts.map(arr => arr[1]);
    tallyNonTargetPrompts(promptBoxes, targets);
    const done = promptTexts.slice(0, i);
    tallyAllPrompts(Array.from(promptBoxes).slice(0, i), targets);
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
        if (start_target && score != 0) {
            start = start_target[0]
            target = start_target[1]
            current_score = score
            fillPrompt(promptBoxes[i], start, target, current_score);
        }
        else {
            fillPrompt(promptBoxes[i], current[0], current[1], current_score)
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
}