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
    let xhttp = new XMLHttpRequest();
    xhttp.open("POST", '/', false);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    
    xhttp.send(message);
    resp = {}
    if (message.startsWith('end')) {
        let prompt_count = parseInt(localStorage.getItem('current_prompt')) || 0;
        localStorage.setItem('current_prompt', prompt_count + 1);
    }
    if (xhttp.responseText.startsWith("session_done"))
    {
        j = JSON.parse(xhttp.responseText.substring(12));
        j['session_done'] = 1
        return j
    }
    else {
        try {      
            response_text = JSON.parse(xhttp.responseText);
            // console.log("here is the flag")
            // console.log(flag)
            localStorage.setItem('jumps', JSON.parse(xhttp.responseText)["jumps"]);
            localStorage.setItem('jumpsA', JSON.parse(xhttp.responseText)["jumpsA"]);
            localStorage.setItem('results', JSON.parse(xhttp.responseText)["results"]);

            return JSON.parse(xhttp.responseText);
        } catch (e) {
            
            alert(xhttp.responseText)
        }
    }
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
        }
    };
}
