function disableLinks(){
    links = document.getElementsByClassName("link")
    links = Array.from(links)
    links.map(link => link.classList.add("link--disabled"))
}

function clearChildren(element){
    while (element.lastChild) {
        element.removeChild(element.lastChild);
    }
}

function ws_to_text(){
    let wordspace = document.getElementById("wordspace")
    ws_array = Array.from(wordspace.children)
    return ws_array.map(el => el.firstChild.innerText)
}

//Checks if the middle element is the target.
function sessionEnded(prompt){
    ws_texts = ws_to_text()
    return ws_texts[10] == prompt[1]
}

function freezeScreen(){
    screen = new XMLSerializer().serializeToString(document)
    localStorage.setItem('screen', screen)
}

function showScreen(){
    document.body.innerHTML = localStorage.getItem('screen')
    console.log("Screen restored from localStorage")
}

//activates links on the page
function activateLinks(){
    ws_texts = ws_to_text()
    ws_array.map(function(el, i){el.onclick = function() {
        postWord(ws_texts[i])
    }})
}