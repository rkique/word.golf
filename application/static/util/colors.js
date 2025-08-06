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

function getCSSVariable(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name);
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
  document.documentElement.style.setProperty('--background-tint', 'rgba(0, 0, 0, 0.15)');
  document.documentElement.style.setProperty('--4green', '#ebdbb2');
  document.documentElement.style.setProperty('--banner-perfect', '#00cfc0');
  document.documentElement.style.setProperty('--banner-impressive', '#1a9d34');
  document.documentElement.style.setProperty('--banner-great', '#2a61cc');
  document.documentElement.style.setProperty('--banner-good', '#a1a735');
  document.documentElement.style.setProperty('--banner-closecall', '#b23a2e');
  document.documentElement.style.setProperty('--soft-check', '#98971a');
  document.documentElement.style.setProperty('--0', '#f2f0e9');                  // light background
  document.documentElement.style.setProperty('--1', '#eeebe3');                 // between --0 and --2
  document.documentElement.style.setProperty('--2', '#dfd8c0ff');                 // slightly darker paper
  document.documentElement.style.setProperty('--4', '#cebba3ff');                 // light frame bg
  document.documentElement.style.setProperty('--c', '#3c3836');                 // main text (dark gray-brown)
  document.documentElement.style.setProperty('--hover-color', '#080808');       // dark hover (fg3)
  document.documentElement.style.setProperty('--emphasis-color', '#d79921');    // yellow (highlight)
  document.documentElement.style.setProperty('--border-color', '#bdae93');      // bg3
  document.documentElement.style.setProperty('--logo-color', '#7c6f64');        // fg4 (cool brown-gray)
  document.documentElement.style.setProperty('--text-color', '#5a524eff');        // standard text (fg1)
  document.documentElement.style.setProperty('--background-color', '#f9f5d7');  // primary bg (bg0_h)
  document.documentElement.style.setProperty('--grayed-out-background', '#e1d2b3ff');  // card/inactive (bg2)
  document.documentElement.style.setProperty('--grayed-out-color', '#928374');       // soft gray (gray)
  document.documentElement.style.setProperty('--grayed-out-color-help-target', '#a89984'); // fg4
  document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#c0b49cff');   // bg1 (softest)
  }
  else {
    document.documentElement.style.setProperty('--background-tint', 'rgba(0, 0, 0, 0.3)');
    document.documentElement.style.setProperty('--banner-perfect', '#22ffed');
    document.documentElement.style.setProperty('--banner-impressive', '#00d92f');
    document.documentElement.style.setProperty('--banner-great', '#2889ff');
    document.documentElement.style.setProperty('--banner-good', 'rgb(192, 202, 52)');
    document.documentElement.style.setProperty('--banner-closecall', '#d41b11');
    document.documentElement.style.setProperty('--soft-check', '#647035ff');
    document.documentElement.style.setProperty('--soft-failure', '#3c1d1dff');
    document.documentElement.style.setProperty('--0', '#181818');                  // ~neutral black (less brown than #1d2021)
    document.documentElement.style.setProperty('--1', '#1d1d1d');                 // between --0 and --2
    document.documentElement.style.setProperty('--2', '#222222');                 // slightly lighter than --0, less earthy
    document.documentElement.style.setProperty('--4', '#413f3a');                 // neutral bg1
    document.documentElement.style.setProperty('--c', '#e0dccc');                 // desaturated light beige
    document.documentElement.style.setProperty('--hover-color', '#f0ece0');       // light hover (pale sand)
    document.documentElement.style.setProperty('--emphasis-color', '#f1cd50');    // toned-down Gruvbox yellow
    document.documentElement.style.setProperty('--border-color', '#5c5c5c');      // subtle neutral border
    document.documentElement.style.setProperty('--logo-color', '#c8c2b2');        // cooler off-white
    document.documentElement.style.setProperty('--text-color', '#c6bca4');        // warm gray-beige
    document.documentElement.style.setProperty('--background-color', '#181818');  // consistent with --0
    document.documentElement.style.setProperty('--grayed-out-background', '#252525');  // more neutral bg2
    document.documentElement.style.setProperty('--grayed-out-color', '#837e74');       // softer comment tone
    document.documentElement.style.setProperty('--grayed-out-color-help-target', '#9c9584'); // near-muted beige
    document.documentElement.style.setProperty('--grayed-out-color-unfocused', '#434343');   // neutral bg3
    document.documentElement.style.setProperty('--4green', '#222724');
  }
  // syncGraph()
  //PlotHistory(sessionHistory)
}
syncColorMode()