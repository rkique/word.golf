function makePromptTag(promptText, jumps=null) {
    let p = document.createElement("p");
    p.className = "prompt"
    p.innerText = promptText
    if (jumps !== null) {
        let span = document.createElement("span");
        span.className = "prompt-jumps";
        span.innerText = " " + jumps;
        p.appendChild(span);
    }
    return p
}

function makeDonePromptTag(promptText, jumps) {
    let pTag = makePromptTag(promptText,jumps)
    pTag.className = "prompt prompt--done"
    return pTag
}

//Current jumps should always have a value, even if it's 0
function renderPrompts(promptTexts, i, jumpsA, current_jumps){
    let prompts = document.getElementById("prompts")
    clearChildren(prompts)
    console.log(`renderPrompts: ${promptTexts}, i: ${i}, jumpsA: ${jumpsA}`)
    done = promptTexts.slice(0,i)
    done.map((promptText, i) => prompts.append(makeDonePromptTag(promptText, jumpsA[i])))

    if (i < 5){
        if (i == 0) {
            current_jumps = current_jumps || 0
            current = promptTexts[0]
            todo = promptTexts.slice(1)
        }
        else {
            current = promptTexts[i]
            todo = promptTexts.slice(i + 1)
        }
        prompts.append(makePromptTag(current, current_jumps))
        todo.map(promptText => prompts.append(makePromptTag(promptText)))
    }
}
