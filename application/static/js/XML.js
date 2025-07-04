let previous_response_text = []

// Check if this is correct or not 
function editSession(jumpsAValue, jumpsValue, result_value, i, prompt_text) {
    let xhttp = new XMLHttpRequest(); 
    xhttp.open("POST", "/editsession", false); 
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); 

    let message = `edit=true&jumpsArray=${encodeURIComponent(JSON.stringify(jumpsAValue))}&jumps=${encodeURIComponent(jumpsValue)}&result=${encodeURIComponent(JSON.stringify(result_value))}&i=${encodeURIComponent(i)}&prompt=${encodeURIComponent(JSON.stringify(prompt_text))}`; 
    
    xhttp.send(message); 

    if (xhttp.status === 200) {
        
        return xhttp.responseText; 
    } else {
        console.error("Error:", xhttp.status); 
        return null; 
    }
}


function simToIndex(score){
    const thresholds = [0.2, 0.27, 0.35, 0.42];
    let idx = thresholds.findIndex(t => score < t);
    idx = idx === -1 ? thresholds.length : idx;
    return idx;
}

// //updates jumpsA with most recent score. 
// function updateJumpsA(jumpsA, score){
//     const lastWordIdx = simToIndex(score)
//     let zeroRowIdx = jumpsA.findIndex(row => row.every(val => val === 0));
//     let insertIdx = Math.max(0, zeroRowIdx === -1 ? jumpsA.length : zeroRowIdx - 1);
//     jumpsA[insertIdx][lastWordIdx] += 1
//     return jumpsA
// }

function lastNonzeroRow(jumpsArray) {
    for (let i = jumpsArray.length - 1; i >= 0; i--) {
        if (jumpsArray[i].some(val => val !== 0)) {
            return i; 
        }
    }
    return -1 //last valid index.
}

function sendAndReceiveXML(message) {
    // alert(`[sendAndReceiveXML] Sending message: ${message}`);
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.withCredentials = true;
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(message);
    resp = {}
    if (xhttp.responseText.startsWith("help_session_done")) {
        j = JSON.parse(xhttp.responseText.substring(17));
        j['help_session_done'] = 1
        console.log("[help_session_done] Session is done, returning jumps and results")
        return j
    }
    if (xhttp.responseText.startsWith("session_done"))
    {
        j = JSON.parse(xhttp.responseText.substring(12));
        j['session_done'] = 1
        console.log("[session_done] Session is done, returning jumps and results")
        return j
    }
    else {
        try {
            response_text = JSON.parse(xhttp.responseText);
            jumpsArray = response_text["jumpsArray"]; 
            results = response_text["results"]; 
            prompts = response_text["prompts"]; 
            current_prompt = lastNonzeroRow(jumpsArray)
            let jumps = jumpsArray[current_prompt].reduce((a, b) => a + b, 0);
            if (jumps >= 14) { // cap it at 12 current jumps
                let resp = sendAndReceiveXML(`end=true`);
                // resp.jumpsA = updateJumpsA(resp.jumpsA, resp.previous_words[-1], resp.score)
                // _ = send_game_data_to_backend(resp, `end=true`);
                // clearLastTallyContainer(resp.jumpsArray.length);
                return resp;
            } else {
                return response_text;
            }     
        } catch (e) {
            alert('Error in backend. Please check logs.')
            console.log(e)
        }
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
        }
    };
}
