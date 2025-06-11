USE_ANIMATIONS = false

/* makes and renders links */

function makeLink(prompt,word) {
    let link = document.createElement("button");
    let span = document.createElement("span")
    span.innerText = word;
    /*if (word.length < 20){span.style.fontSize = "1.5em"}
    if (word.length < 12){span.style.fontSize = "2.5em"}
    if (word.length < 10){span.style.fontSize = "3em"}
    if (word.length < 8){span.style.fontSize = "3.75em"}*/
    link.appendChild(span)
    link.className = "link"
    if(prompt[1] == word) 
        {
            link.className = "link link--target rainbow_text_animated"
            // console.log("I GOT TO THE TARGET WORD FINALLY");
            // so this is where makeLink is called 
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
    // total = jumpsA.reduce((a, b) => a + b, 0)
    localStorage.setItem("lastComplete", data["date"])
    // localStorage.setItem('total', JSON.stringify(jumpsA))
    renderPrompts(prompts,i, jumpsA, false)
    // 
    window.addEventListener('DOMContentLoaded', () => {
        fetch("https://word-golf-backend.onrender.com", {
            method: "GET",
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            
        });
    });
    freezeScreen()
}

//@Parent: postWord
function renderLinks(prompt, results, debug_session_done = false) {
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
    if(sessionEnded(prompt) || debug_session_done){
    disableLinks()
    checkSessionEnded(debug_session_done)
    }
}

//@Parent: maintainLinks
function checkSessionEnded(debug_session_done){
    resp = sendAndReceiveXML(`end=true`)
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    //If user has completed all prompts
    if(resp.hasOwnProperty('session_done') || debug_session_done){
        tallyScreen(resp.prompts, resp.i, resp.jumpsA)
    }
    else {
    renderToFrom(resp.prompt);
    renderLinks(resp.prompt, resp.results)
    console.log('[checkSessionEnded] Rendering prompts..')
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    }
}

// function postWord(word) {
//     console.log('postWord called with word:', word)
//     resp = sendAndReceiveXML("word=" + word)
//     renderLinks(resp.prompt, resp.results)
//     renderPrompts(resp.prompts,resp.i, resp.jumpsA, resp.jumps)
//     activateLinks()
// }

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i], el);
    }})
}

function postWord(word, clickedElem, use_animations=USE_ANIMATIONS) {
    const resp = sendAndReceiveXML("word=" + word);
    if (!use_animations) {
        renderLinks(resp.prompt, resp.results)
        if (word !== resp.prompt[1]) {
        renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
        }
        activateLinks()
    } else {
        const wordspace = document.getElementById("wordspace");
        function sendXMLAfterAnimation(word, resp) {
            console.log('resp')
            console.log(resp);
            prompts = resp.prompts;
            prompt_idx = resp.i;
            jumpsA = resp.jumpsA;
            jumps = resp.jumps;
            console.log(`[postWord] prompts: ${prompts}, prompt_idx: ${prompt_idx}, jumpsA: ${jumpsA}, jumps: ${jumps}`);
            renderLinks(resp.prompt, resp.results);
            console.log('[postWord] Rendering prompts..')
            if (word !== resp.prompt[1]) {
                renderPrompts(prompts, prompt_idx, jumpsA, jumps);
            }
            activateLinks();
        }
        animateToCenter(clickedElem, wordspace, sendXMLAfterAnimation, word, resp);
    }
}