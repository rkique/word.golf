HELP_FINISH_DELAY_MS = 500
START_GAME_DELAY_MS = 1500

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
function renderToFrom(start_target) {
    // console.log("renderToFrom called with start_target:");
    let information = /** @type {HTMLElement} */ (document.getElementById("information"));
    clearChildren(information);
    let promptInfoEl = makePromptInfo(start_target);
    information.append(promptInfoEl);
}


function update_database_with_finish(totalJumps, last_complete) {
    let words_selected = JSON.parse((localStorage.getItem('previous_words') || null))
    let jumpsA = JSON.parse((localStorage.getItem('jumpsA') || null));
    jumpsA = jumpsA.map(jump => parseInt(jump, 10));
    let last_jumps = parseInt(localStorage.getItem('jumps') || 0);
    jumpsA.push(last_jumps);
    localStorage.setItem('jumpsA', JSON.stringify(jumpsA));
    // for testing purposes only, delete this line in production
    // last_complete = new Date(last_complete);
    // last_complete.setDate(last_complete.getDate() + 4);

    const data = {
        total_jumps: totalJumps,
        last_complete: last_complete, // should be "YYYY-MM-DD"
        words_selected: words_selected,
        jumpsA: jumpsA,
    };

    fetch(window.backendURL + '/update_finish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // <-- Required for auth cookies
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Database updated successfully:', data);
        })
        .catch((error) => {
            console.error('Error updating database:', error);
        });
}

function displayHelpFinish(innerHTML) {
    const modalEl = document.getElementById('modal');
    const modalText = document.getElementById('modalText');
    modalText.innerHTML = innerHTML;
    modalEl.style.display = 'flex';
}

function daysSinceStartDate(startDateStr = '2025-05-31', storageKey = 'current_date') {
    const currentDateStr = localStorage.getItem(storageKey);
    if (!currentDateStr) return null;

    const startDate = new Date(startDateStr);
    const currentDate = new Date(currentDateStr);
    const diffMs = currentDate - startDate;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function renderFinish(jumpsA) {
    const totalJumps = jumpsA.reduce((sum, jumps) => sum + jumps, 0);

    const currentDate = new Date(localStorage.getItem('current_date'));
    const lastCompleteDate = new Date(localStorage.getItem('lastComplete'));
    const diffInDays = Math.floor((currentDate - lastCompleteDate) / (1000 * 60 * 60 * 24)) || Infinity;

    const isSameDay = diffInDays === 0;
    const shouldResetStreak = diffInDays >= 2;

    const currentStreak = parseInt(localStorage.getItem('streak')) || 1;
    const newStreak = isSameDay ? currentStreak : shouldResetStreak ? 1 : currentStreak + 1;
    localStorage.setItem('streak', newStreak);
    update_database_with_finish(totalJumps, currentDate);
    const daily_idx = daysSinceStartDate();
    // Display finish modal for user.
    is_logged_in = localStorage.getItem('logged_in') === 'true';
    displayFinishModal(daily_idx, totalJumps, newStreak, is_logged_in);
}

/* Clears the modal, localStorage, and renders links*/
function startGame() {
    document.getElementById('modal').style.display = 'none';
    localStorage.setItem('is_help', 'false');
    localStorage.removeItem('jumps');
    localStorage.removeItem('jumpsA');
    localStorage.removeItem('prompt');
    localStorage.removeItem('prompts');
    localStorage.removeItem('results');
    resp = sendAndReceiveXML('redirect=true');
    renderLinks(resp.prompt, resp.results)
    renderToFrom(resp.prompt);
    // console.log('[reportSessionEnded] Rendering prompts..')
    renderPrompts(resp.prompts, resp.i, resp.jumpsA, resp.jumps)
    activateLinks()
    //stash
}

//we will use this to build displayable prompts for each word.
function buildPromptSequences(prompts, jumps, previousWords) {
    const slices = jumps.map(jump => jump - 1);
    const sequences = [];
    let wordIndex = 0;
    for (let i = 0; i < 5; i++) {
        const [start, target] = prompts[i];
        const linkCount = slices[i];
        const links = previousWords.slice(wordIndex, wordIndex + linkCount);
        sequences.push([start, ...links, target]);
        wordIndex += (linkCount + 1);
    }
    return sequences;
}

function generateLineGraph(scores) {
    prompts = JSON.parse(localStorage.getItem('prompts'));
    jumps = JSON.parse(localStorage.getItem('jumpsA'));
    previousWords = JSON.parse(localStorage.getItem('previous_words'))
    localStorage.setItem('jumpsA', JSON.stringify(scores));
    sequences = buildPromptSequences(prompts, jumps, previousWords);
    const graphContainer = document.getElementById("scoresGraph");
    if (!graphContainer) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const axisLineColor = rootStyles.getPropertyValue('--border-color') || '#cccccc';
    y = scores.map(score => score > 6 ? 6 : score);
    // const trace = {
    //     x: scores.map((_, i) => i + 1),
    //     y: y,
    //     type: 'scatter',
    //     mode: 'markers+lines',
    //     line: {
    //         color: rootStyles.getPropertyValue('--hover-color'),
    //     }
    // };
    const commonAxisStyle = {
        visible: false,
        showline: false,
        linecolor: axisLineColor,
        linewidth: 1,
        mirror: true
    };
    const layout = {
        margin: { t: 40, l: 10, r: 10, b: 10 },  // Tight margins
        cliponaxis: false,
        height: window.innerHeight * 0.5,
        width: window.innerWidth * 0.5,
        dragmode: false,
        xaxis: {
        ...commonAxisStyle,
        range: [0, scores.length + 1],  // Dynamically accommodates # of scores
        },
        yaxis: {
        ...commonAxisStyle,
        range: [-0.5, Math.max(...y) + 2],
        },
        plot_bgcolor: rootStyles.getPropertyValue('--background-color'),
        paper_bgcolor: rootStyles.getPropertyValue('--background-color'),
        font: {
            family: '"Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        annotations: [
        ]
    };

    const config = {
        displayModeBar: false,
        displaylogo: false,
        responsive: false,
        scrollZoom: false,
        doubleClick: false,
        staticPlot: true,
    };
    let thresholds = [2, [2, 3], [3, 5], [5, 6], 6];

    const shapes = [];
    for (let i = 0; i < scores.length; i++) {
    }

    Plotly.newPlot(graphContainer, [], layout, config).then(() => {

        let i = 0;
        const interval = setInterval(() => {
            if (i >= scores.length) { clearInterval(interval); return; }
            let text = `${scores[i]}`;
            if (y[i] <= thresholds[0]) {
                annotationStyle = {
                    textcolor: '#ADD8FF',  // Flawless (light blue)
                    bordercolor: '#ADD8FF',
                    bgcolor: '#001a33'
                };
                text = `<b>FLAWLESS</b>`;
            } else if (y[i] > thresholds[1][0] && y[i] <= thresholds[1][1]) {
                annotationStyle = {
                    textcolor: '#00FF00',  // Great (green)
                    bordercolor: '#00FF00',
                    bgcolor: '#002200'
                };
                text = `GREAT`;
            } else if (y[i] > thresholds[2][0] && y[i] <= thresholds[2][1]) {
                annotationStyle = {
                    textcolor: '#00BFFF',  // Good (blue)
                    bordercolor: '#00BFFF',
                    bgcolor: '#001a33'
                };
                text = `GOOD`;
            } else if (y[i] > thresholds[3][0] && y[i] <= thresholds[3][1]) {
                annotationStyle = {
                    textcolor: '#FF3333',  // Miss (red)
                    bordercolor: '#FF3333',
                    bgcolor: '#330000'
                };
                text = `MISS`;
            } else if (y[i] >= thresholds[4]) {
                annotationStyle = {
                    textcolor: '#880000',  // Darker Miss
                    bordercolor: '#990000',
                    bgcolor: '#1a0000'
                };
                text = `MISS`;
            }
        text = ''
        //ADD SHAPE
        let shape = null;
        let yVal = y[i];
        let centerX = i + 1;
        let centerY = yVal;
        console.log(`[generateLineGraph] i: ${i}, yVal: ${yVal}, centerX: ${centerX}, centerY: ${centerY}`);
        // Upside down Triangle
        if (yVal <= thresholds[0]) {
            shape = {
                type: 'path',
                path: `M ${centerX - 0.2},${centerY + 0.7} L ${centerX + 0.2},${centerY + 0.7} L ${centerX },${centerY} Z`,
                fillcolor: '#6699ff',
                opacity: 0.4,
                line: {
                    width: 0
                }
                // line: { 
                //     color: '#557788',
                //     width: 8,
                //  }
            };
        } else if (yVal > thresholds[1][0] && yVal <= thresholds[1][1]) {
            shape = {
                type: 'path',
                path: `
                    M ${centerX},${centerY + 0.25}
                    L ${centerX + 0.07},${centerY + 0.07}
                    L ${centerX + 0.25},${centerY}
                    L ${centerX + 0.07},${centerY - 0.07}
                    L ${centerX},${centerY - 0.25}
                    L ${centerX - 0.07},${centerY - 0.07}
                    L ${centerX - 0.25},${centerY}
                    L ${centerX - 0.07},${centerY + 0.07}
                    Z
                `,
                fillcolor: '#002200',
                opacity: 1,
                line: {
                    color: '#008800',
                    width: 2,
                }
            };
        } else if (yVal > thresholds[2][0] && yVal <= thresholds[2][1]) {
            shape = {
                type: 'circle',
                xref: 'x',
                yref: 'y',
                x0: centerX - 0.2,
                y0: centerY - 0.2,
                x1: centerX + 0.2,
                y1: centerY + 0.2,
                fillcolor: '#001a33',
                opacity: 1,
                line: { width: 0 }
            };
        } else if (yVal > thresholds[3][0] && yVal <= thresholds[3][1]) {
            shape = {
                type: 'path',
                path: `
                    M ${centerX - 0.1},${centerY - 0.1} 
                    L ${centerX + 0.1},${centerY + 0.7}
                    M ${centerX + 0.1},${centerY - 0.3} 
                    L ${centerX - 0.1},${centerY + 0.7}
                `,
                line: {
                    color: '#FF3333',
                    width: 12
                },
                opacity: 0.4
            };
        }
        shapes.push(shape);
        //ADD ANNOTATION
            const newAnnotation = {
                x: i + 1,
                y: y[i],
                text: text,
                xanchor: 'center',
                yanchor: 'bottom',
                showarrow: true,
                arrowhead: 5,
                ax: 0,
                ay: 0,
                font: {
                    family: '"Ubuntu", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    color: annotationStyle.textcolor,
                    size: 21,
                    fontWeight: 'bold',
                },
                // bgcolor: annotationStyle.bgcolor,
                // bordercolor: annotationStyle.bordercolor,
                // borderwidth: 1,
                opacity: 1
            };

            layout.annotations.push(newAnnotation);
            const sequence = sequences[i];
            (function(index, seq) {
                for (let j = 0; j < seq.length; j++) {
                    setTimeout(() => {
                        layout.annotations.push({
                            x: index + 1,
                            y: y[index] - 1 - j * 0.65,
                            text: seq[j],
                            showarrow: false,
                            xanchor: 'left',
                            yanchor: 'center',
                            font: {
                                size: 16,
                                color: rootStyles.getPropertyValue('--hover-color')
                            },
                            opacity: 0.7
                        });
                        Plotly.relayout(graphContainer, { annotations: layout.annotations });
                    }, j * 30);
                }
            })(i, sequence);
            layout.shapes = shapes;
            Plotly.relayout(graphContainer, { annotations: layout.annotations });
            i++;
        }, 200); // Adjust speed here
    });

}


function displayFinishModal(daily_idx, totalJumps, currentStreak, is_user = false) {
    const modalFinish = document.getElementById(is_user ? 'modal-finish-user' : 'modal-finish-guest');
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.daily-idx').innerHTML = daily_idx;
    modalFinish.querySelector('.streak').innerHTML = currentStreak;
    modalFinish.style.display = "flex";
    if (is_user) {
        jumpsArray = JSON.parse(localStorage.getItem('jumpsA') || null);
        generateLineGraph(jumpsArray);
    }
}

function renderHelpFinish() {
    help_finish_text = `Good luck!`;

    setTimeout(() => {
        displayHelpFinish(help_finish_text);
        setTimeout(startGame, START_GAME_DELAY_MS);
    }, HELP_FINISH_DELAY_MS);
}