/**
 * Creates a prompt header e.g. go from "vigor" to "workout"
 * @param {string} prompt
 * @returns {HTMLParagraphElement}
 */
function makePromptInfo(start_target) {
    let p = document.createElement("p");
    p.innerHTML = `go from <span class="link--starting">${start_target[0]}</span> to <span class="link--starting">${start_target[1]}</span>`;
    return p;
}

/**
 * @param {string} prompt
 * @returns {void}
 */
function renderToFrom(start_target){
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    clearChildren(information);
    let promptInfoEl = makePromptInfo(start_target);
    information.append(promptInfoEl);
}

function renderFinish(jumpsA, streak) {
    gameOverModalEl = document.getElementById('gameOverModal')
    gameOverModalEl.style.display = 'flex';
    gameOverText = document.getElementById('gameOverText')
    // total = jumpsA.reduce((a, b) => a + b, 0)
    // get the 
    let stored = localStorage.getItem('jumpsA') || null;
    let jumps_array;
    console.log(stored);

    if (stored) {
        jumps_array = stored
            ? stored.split(',').map(s => parseInt(s.trim(), 10)) 
            : [];
    } else {
        jumps_array = [];
    }

    let sum = jumps_array.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);

    let jumps = parseInt(localStorage.getItem('jumps')) || 0;

    const currentDate = localStorage.getItem('current_date');

    const storedDate = localStorage.getItem('lastComplete');

    let reset = true;

    let same_day = false;

    if (storedDate) {

        const storedTime = new Date(storedDate).getTime();

        const currentTime = new Date(currentDate).getTime();

        console.log("here is stored date");
        console.log(storedDate);
        console.log("here is current date");
        console.log(currentDate)
        console.log("here is stored time")
        console.log(storedTime)
        console.log("here is current time")
        console.log(currentTime)

        const diffInMs = currentTime - storedTime;

        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays < 0 || diffInDays >= 2) {
            reset = true;
        } else {
            reset = false;
        }

        if (diffInDays == 0) {
            same_day = true;
        }

        console.log(`Difference in days: ${diffInDays}`);
    } else {
        console.log('No stored date found.');
    }

    // check if yesterday was the correct day 

    let str = parseInt(localStorage.getItem('streak')) || 1;

    if (!same_day) {
        if (!reset) {
            localStorage.setItem('streak', str + 1);
        } else {
            localStorage.setItem('streak', 1);
        }
    }

    let new_str = parseInt(localStorage.getItem('streak')) || 1;

    gameOverText.innerHTML = `You completed today's word.golf in ${sum + jumps} jumps. Streak: ${new_str} days.`
}