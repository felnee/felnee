(function(){
  try{
    // prevent transition flashes until we've applied the correct theme
    document.documentElement.classList.add('no-transitions');
    var theme = localStorage.getItem('theme');
    if(!theme){ if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'; }
    if(theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
    // remove the helper class after DOM is ready (short timeout to ensure CSS applied)
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ document.documentElement.classList.remove('no-transitions'); }, 40); });
  }catch(e){ /* silent */ }
})();
