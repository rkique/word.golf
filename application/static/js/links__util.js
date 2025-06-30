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
    if (ws_texts.length < 21) {
        return false
    }
    middle_idx = Math.floor(ws_texts.length / 2)
    let isSessionOver = ws_texts[middle_idx] == prompt[1]
    return isSessionOver

}
