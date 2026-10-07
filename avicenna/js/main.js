document.documentElement.classList.add('js');
(function(){
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)||/static/.test(location.search)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(e){io.observe(e)});
})();
if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('svg').forEach(function(s){s.pauseAnimations&&s.pauseAnimations()})}
