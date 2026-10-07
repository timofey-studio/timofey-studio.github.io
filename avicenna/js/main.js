document.documentElement.classList.add('js');
(function(){
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)||/static/.test(location.search)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(e){io.observe(e)});
})();
if(matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('svg').forEach(function(s){s.pauseAnimations&&s.pauseAnimations()})}

/* просмотр фото крупно: ссылки с data-lb, листание стрелками, Esc закрывает */
(function(){
  var links=[].slice.call(document.querySelectorAll('[data-lb]'));if(!links.length)return;
  var box=document.createElement('div');box.className='lb';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Просмотр фото');
  box.innerHTML='<figure><img alt=""><figcaption></figcaption></figure><button class="x" aria-label="Закрыть"><i class="ph ph-x"></i></button><button class="prev" aria-label="Назад"><i class="ph ph-arrow-left"></i></button><button class="next" aria-label="Дальше"><i class="ph ph-arrow-right"></i></button>';
  document.body.appendChild(box);
  var img=box.querySelector('img'),cap=box.querySelector('figcaption'),group=[],i=0,back=null;
  function show(n){i=(n+group.length)%group.length;var a=group[i],t=a.querySelector('img');img.classList.add('swap');
    setTimeout(function(){img.src=a.href;img.alt=t?t.alt:'';cap.textContent=(t?t.alt.replace(/,? ?\d+ из \d+$/,''):'')+(group.length>1?'  ·  '+(i+1)+' из '+group.length:'');img.classList.remove('swap')},120);
    box.querySelector('.prev').hidden=box.querySelector('.next').hidden=group.length<2}
  function open(a){back=a;group=links.filter(function(l){return l.dataset.lb===a.dataset.lb});show(group.indexOf(a));box.classList.add('open');document.body.style.overflow='hidden';box.querySelector('.x').focus()}
  function close(){box.classList.remove('open');document.body.style.overflow='';back&&back.focus()}
  links.forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();open(a)})});
  box.addEventListener('click',function(e){if(e.target===box||e.target.closest('.x'))close();else if(e.target.closest('.prev'))show(i-1);else if(e.target.closest('.next'))show(i+1)});
  document.addEventListener('keydown',function(e){if(!box.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
})();

/* меню для телефона: собираем из тех же ссылок, что в шапке */
(function(){
  var head=document.querySelector('header.nav'),btn=head&&head.querySelector('.burger');if(!btn)return;
  var panel=document.createElement('div');panel.className='mnav';panel.id='mnav';
  var nav=document.createElement('nav');nav.setAttribute('aria-label','Меню');
  head.querySelectorAll('.links a').forEach(function(a,i){var c=a.cloneNode(true);c.insertAdjacentHTML('beforeend','<i class="ph ph-arrow-right" aria-hidden="true"></i>');c.style.transitionDelay=(60+i*40)+'ms';nav.appendChild(c)});
  var cta=document.createElement('div');cta.className='m-cta';
  var book=head.querySelector('.btn'),tel=head.querySelector('.tlink');
  if(book)cta.appendChild(book.cloneNode(true));
  if(tel){cta.appendChild(tel.cloneNode(true));cta.insertAdjacentHTML('beforeend','<small>Пн-пт 9:00-16:00 · звонок или MAX</small>')}
  var soc=document.querySelectorAll('.top .msg a.soc');if(soc.length){var row=document.createElement('div');row.className='m-soc';soc.forEach(function(a){row.appendChild(a.cloneNode(true))});cta.appendChild(row)}
  panel.appendChild(nav);panel.appendChild(cta);document.body.appendChild(panel);
  btn.setAttribute('aria-controls','mnav');btn.setAttribute('aria-expanded','false');
  function set(o){
    if(o)document.documentElement.style.setProperty('--mtop',Math.max(0,head.getBoundingClientRect().bottom)+'px');
    document.body.classList.toggle('menu-open',o);btn.setAttribute('aria-expanded',o);btn.setAttribute('aria-label',o?'Закрыть меню':'Меню');
    btn.innerHTML=o?'<i class="ph ph-x"></i>':'<i class="ph ph-list"></i>';
  }
  btn.addEventListener('click',function(){set(!document.body.classList.contains('menu-open'))});
  panel.addEventListener('click',function(e){if(e.target.closest('a'))set(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('menu-open')){set(false);btn.focus()}});
  addEventListener('resize',function(){if(innerWidth>980)set(false)});
})();

/* форма записи — макет: проверяем поля, но пока никуда не отправляем */
(function(){
  var f=document.getElementById('zapis');if(!f)return;
  document.querySelectorAll('[data-svc]').forEach(function(a){a.addEventListener('click',function(){var s=f.querySelector('select');if(s)s.value=a.dataset.svc;setTimeout(function(){f.querySelector('textarea').focus()},500)})});
  function err(el,msg){var w=el.closest('.field'),e=w?w.querySelector('.err'):f.querySelector('[data-for="'+el.name+'"]');if(w)w.classList.toggle('bad',!!msg);if(e)e.textContent=msg||'';return !msg}
  f.addEventListener('submit',function(e){e.preventDefault();
    var ok=err(f.name,f.name.value.trim()?'':'Напишите, как к вам обращаться');
    ok=err(f.phone,f.phone.value.replace(/\D/g,'').length>=10?'':'Проверьте номер: нужно 10 или 11 цифр')&&ok;
    ok=err(f.consent,f.consent.checked?'':'Без согласия мы не можем принять заявку')&&ok;
    var st=f.querySelector('.fstatus');
    if(!ok){st.className='fstatus';st.textContent='';return}
    st.className='fstatus ok';st.textContent='Это макет формы: заявка пока никуда не отправляется. Чтобы записаться сейчас, позвоните +7 996 898-16-20.';
  });
})();
