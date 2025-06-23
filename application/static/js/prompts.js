//[start, target], jumps, cos
function makeSpacedPromptTag(promptBox, start, target, score) {
    console.log(promptBox)
    let div = document.createElement("div");
    div.className = "prompt"
    //here i is used to enumerate div flex
    for (let i = 0; i < 6; i++) {
        let cell = document.createElement("div");
        if (i === 5) {
            // Find first existing innerText child in promptBox equal to target, delete it and readd it.
            const existing = Array.from(promptBox.children).find(child => child.innerText === target);
            if (existing) {
                alert(`readding target ${target}`)
                promptBox.removeChild(existing);
                cell.innerText = target;
                cell.className = "prompt-word";
                cell.style.border = "1px solid var(--text-color)";
            } else {
                cell.innerText = target;
                cell.className = "prompt-word";
                cell.style.border = "1px solid var(--text-color)";
            }
        }
        div.appendChild(cell);
    }
    //here idx is used to set the prompt-word div
    let idx = score < 0.2 ? 0 : score < 0.27 ? 1 :
            score < 0.35 ? 2 : score < 0.45 ? 3 : 4;
    const existing = Array.from(promptBox.children).find(child => child.innerText === start);
    if (existing) {
        alert(`readding start ${start}`)
        promptBox.removeChild(existing);
        cell.innerText = start;
        cell.className = "prompt-word";
        cell.style.border = "1px solid var(--text-color)";
    } else {
        div.children[idx].innerText = start;
        div.children[idx].className = "prompt-word";
        div.children[idx].style.border = "1px solid var(--text-color)";
    }
    return div;
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

function renderPrompts(promptTexts, i, jumpsA, current_jumps, start_target = null, score = null) {

    // console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`);
    // get all prompt-box elements
    const promptBoxes = document.querySelectorAll('#prompts .prompt-box');

    // update "done" prompts
    const done = promptTexts.slice(0, i);
    done.forEach((promptText, idx) => {
        // alert(`updating prompt box ${idx}`)
        promptBoxes[idx].style.borderLeft = '1px solid var(--grayed-out-color)';
        promptBoxes[idx].style.background = "none";
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
            currentTag = makeSpacedPromptTag(promptBoxes[i], start, target, current_score);
        }
        else {
            currentTag = makeSpacedPromptTag(promptBoxes[i],current[0], current[1], current_score)
        }

        // current_jumps = current_jumps || 0;
        promptBoxes[i].style.borderLeft = '2px solid var(--text-color)';
        // const currentTag = makePromptTag(current, current_jumps);
        // promptBoxes[i].innerHTML = '';
        // promptBoxes[i].style.background = "var(--grayed-out-color)";
        promptBoxes[i].appendChild(currentTag);
    }

    // clear remaining boxes
    for (let j = i + 1; j < promptBoxes.length; j++) {
        // alert(`clearing prompt box ${j}`)
        promptBoxes[j].className = 'prompt-box';
        promptBoxes[j].style.color = 'var(--grayed-out-color)';
        // promptBoxes[i].style.borderLeft = '1px solid var(--grayed-out-color)';

        // promptBoxes[j].innerHTML = '';
    }
}