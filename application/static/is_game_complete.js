const MS_DAY = 86400000
let date = localStorage.getItem('current_date') || null;

if (date === null || date !== data['date']) {
    // if the date is not set or does not match today, reset the game
    localStorage.setItem('current_prompt', 0);
    localStorage.setItem('jumpsA', '');
    localStorage.setItem('results', '');
    localStorage.setItem('jumps', 0);
}

if(data['date'] == date){
    showScreen()
}