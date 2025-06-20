let previous_response_text = []

// Check if this is correct or not 
function editSession(jumpsAValue, jumpsValue, result_value, i, prompt_text) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", "/editsession", false); 
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    let message = `edit=true&jumpsA=${encodeURIComponent(JSON.stringify(jumpsAValue))}&jumps=${encodeURIComponent(jumpsValue)}&result=${encodeURIComponent(JSON.stringify(result_value))}&i=${encodeURIComponent(i)}&prompt=${encodeURIComponent(JSON.stringify(prompt_text))}`;
    
    xhttp.send(message);

    if (xhttp.status === 200) {
        
        return xhttp.responseText;
    } else {
        console.error("Error:", xhttp.status);
        return null;
    }
}

function sendAndReceiveXML(message) {
    // alert(`[sendAndReceiveXML] Sending message: ${message}`);
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send(message);
    resp = {}
    console.log(`[sendAndReceiveXML] Response from ${message}: `, xhttp.responseText);
    // if (message.startsWith('end')) 
    //     {
    //     let prompt_count = parseInt(localStorage.getItem('prompt_idx')) || 0;
    //     localStorage.setItem('prompt_idx', prompt_count + 1);
    //     }
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
            // console.log("here is the flag")
            // console.log(flag)
            jumps = response_text["jumps"];
            jumpsA = response_text["jumpsA"];
            results = response_text["results"];
            prompts = response_text["prompts"];
            current_prompt = response_text["i"];
            localStorage.setItem('jumps', jumps)
            localStorage.setItem('jumpsA', JSON.stringify(jumpsA))
            localStorage.setItem('results', JSON.stringify(results)) // probably the issue 
            localStorage.setItem('prompts', JSON.stringify(prompts))
            localStorage.setItem('prompt_idx', current_prompt)
            console.log(response_text)
            return response_text;
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
