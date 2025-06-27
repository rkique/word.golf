const MS_DAY = 86400000
let date = localStorage.getItem('current_date') || null;

if (date === null || date !== data['date']) {
    // if the date is not set or does not match today, reset the game
    // Clear all localStorage except for 'streak', 'lastComplete', and 'is_help'
    const keepKeys = ['streak', 'lastComplete', 'is_help'];
    Object.keys(localStorage).forEach(key => {
        if (!keepKeys.includes(key)) {
            localStorage.removeItem(key);
        }
    });
}
