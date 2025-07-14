window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-TRFQ36MDX8');

function changeColorMode() {
  currentMode = localStorage.getItem('darkMode')
  if (currentMode == 'true') { localStorage.setItem('darkMode', 'false'); }
  else { (localStorage.setItem('darkMode', 'true')) }
  syncColorMode()
}

function syncGraph(){
    jumpsArray = JSON.parse(localStorage.getItem('jumpsArray') || null);
    // if (jumpsArray !== null) generateLineGraph(jumpsArray);
}
function syncColorMode() {
  document.documentElement.style.setProperty('--failure', 'rgb(140, 0, 0)');
  document.documentElement.style.setProperty('--success', 'rgb(0, 70, 0)');
  currentMode = localStorage.getItem('darkMode')
  if (currentMode == 'true') {
  document.documentElement.style.setProperty('--banner-perfect', '#00cfc0');
  document.documentElement.style.setProperty('--banner-impressive', '#1a9d34');
  document.documentElement.style.setProperty('--banner-great', '#2a61cc');
  document.documentElement.style.setProperty('--banner-good', '#a1a735');
  document.documentElement.style.setProperty('--banner-closecall', '#b23a2e');
  document.documentElement.style.setProperty('--0', '#f2f0e9');                  // light background
  document.documentElement.style.setProperty('--2', '#eae7dd');                 // slightly darker paper
  document.documentElement.style.setProperty('--4', '#a89f93');                 // light frame bg
  document.documentElement.style.setProperty('--c', '#3c3836');                 // main text (dark gray-brown)
  document.documentElement.style.setProperty('--hover-color', '#504945');       // dark hover
  document.documentElement.style.setProperty('--emphasis-color', '#bfa500');    // golden yellow (muted)
  document.documentElement.style.setProperty('--border-color', '#b5b3a4');      // light neutral border
  document.documentElement.style.setProperty('--logo-color', '#6d625c');        // cool brown-gray
  document.documentElement.style.setProperty('--text-color', '#4a4540');        // standard text (dark taupe)
  document.documentElement.style.setProperty('--background-color', '#fdfbf7');  // primary bg
  document.documentElement.style.setProperty('--grayed-out-background', '#edeae2');  // card / inactive bg
  document.documentElement.style.setProperty('--grayed-out-color', '#a89f93');       // soft gray-brown
  document.documentElement.style.setProperty('--grayed-out-color-help-target', '#8c8479'); // medium gray-brown
  document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#cfcbbf');   // pale inactive element
  }
  else {
    document.documentElement.style.setProperty('--banner-perfect', '#22ffed');
    document.documentElement.style.setProperty('--banner-impressive', '#00d92f');
    document.documentElement.style.setProperty('--banner-great', '#2889ff');
    document.documentElement.style.setProperty('--banner-good', 'rgb(192, 202, 52)');
    document.documentElement.style.setProperty('--banner-closecall', '#d41b11');
    document.documentElement.style.setProperty('--0', '#181818');                  // ~neutral black (less brown than #1d2021)
    document.documentElement.style.setProperty('--2', '#222222');                 // slightly lighter than --0, less earthy
    document.documentElement.style.setProperty('--4', '#3a3a3a');                 // neutral bg1
    document.documentElement.style.setProperty('--c', '#e0dccc');                 // desaturated light beige
    document.documentElement.style.setProperty('--hover-color', '#f0ece0');       // light hover (pale sand)
    document.documentElement.style.setProperty('--emphasis-color', '#f1cd50');    // toned-down Gruvbox yellow
    document.documentElement.style.setProperty('--border-color', '#5c5c5c');      // subtle neutral border
    document.documentElement.style.setProperty('--logo-color', '#c8c2b2');        // cooler off-white
    document.documentElement.style.setProperty('--text-color', '#c6bca4');        // warm gray-beige
    document.documentElement.style.setProperty('--background-color', '#181818');  // consistent with --0
    document.documentElement.style.setProperty('--grayed-out-background', '#2a2a2a');  // more neutral bg2
    document.documentElement.style.setProperty('--grayed-out-color', '#837e74');       // softer comment tone
    document.documentElement.style.setProperty('--grayed-out-color-help-target', '#9c9584'); // near-muted beige
    document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#434343');   // neutral bg3
  }
  // syncGraph()
  //PlotHistory(sessionHistory)
}
syncColorMode()