rem this is a quickstart script that opens localhost:5000 and the server
set FLASK_APP=app.py
set FLASK_DEBUG=1
start "" http://localhost:8080/
flask run --port=8080
cmd /k


@REM snippet to clear site data

// Clear localStorage & sessionStorage
localStorage.clear();
sessionStorage.clear();
// Delete all cookies for this site
document.cookie.split(";").forEach(c=>{
  document.cookie = c.replace(/^ +/,"")
    .replace(/=.*/,"=;expires="+ new Date(0).toUTCString() +";path=/");
});
// Clear Cache Storage
if ('caches' in window) {
  caches.keys()
    .then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .catch(()=>{});
}
alert("Site data cleared");
