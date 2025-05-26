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
    if(prompt[1] == word){link.className = "link link--target rainbow_text_animated"}
    return link
}

function makeStartLink(prompt, word){
    startLink = makeLink(prompt, word)
    startLink.className = "link link--disabled link--starting"
    return startLink
}


function maintainLinks(prompt){    
    if(sessionEnded(prompt)){
    disableLinks()
    saySessionEnded()
}}

function freezeScreen(){
    screen = new XMLSerializer().serializeToString(document)
    localStorage.setItem('screen', screen)
}

function showScreen(){
    document.body.innerHTML = localStorage.getItem('screen')
}

//if first session_done, then freeze screen, otherwise, show screen
function tallyScreen(prompts, i, jumpsA){
    total = jumpsA.reduce((a, b) => a + b, 0)
    renderInformation(`you finished today's prompts in ${total} jumps! <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" class="twitter-share-button" data-text="I finished today's prompts in ${total} jumps (${jumpsA[0]}/${jumpsA[1]}/${jumpsA[2]}/${jumpsA[3]}/${jumpsA[4]})" data-url="word.golf" data-show-count="false">Tweet</a><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`)
    localStorage.setItem("lastComplete", new Date())
    localStorage.setItem('total', JSON.stringify(jumpsA))
    renderPrompts(prompts,i, jumpsA, false)
    freezeScreen()
}

/*this part is very important*/
function saySessionEnded(){
    resp = sendAndReceiveXML(`end=true`)
    if(resp.hasOwnProperty('session_done')){
        tallyScreen(resp.prompts, resp.i, resp.jumpsA)
    }
    else {
    renderInformation("go from " + resp.prompt)
    renderPrompts(resp.prompts,resp.i, resp.jumpsA)
    renderLinks(resp.prompt, resp.results)
    activateLinks()
    }
}

function renderLinks(prompt, results){
    let wordspace = document.getElementById("wordspace")
    clearChildren(wordspace)
    wordspace.append(makeStartLink(prompt, results.shift()))
    results.forEach(result => wordspace.append(makeLink(prompt,result)))
    maintainLinks(prompt)
}

function ws_to_text(){
    let wordspace = document.getElementById("wordspace")
    ws_array = Array.from(wordspace.children)
    return ws_array.map(el => el.firstChild.innerText)
}

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i])
    }})
}

function postWord(word) {
    resp = sendAndReceiveXML("word=" + word)
    renderLinks(resp.prompt, resp.results)
    activateLinks()
    }
