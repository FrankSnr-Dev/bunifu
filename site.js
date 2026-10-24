(function(){
  var $=function(id){return document.getElementById(id)};
  var WA=document.body.getAttribute('data-wa')||'254722822256';
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var yr=$('yr');if(yr)yr.textContent=new Date().getFullYear();

  /* mobile menu */
  var tgl=$('tgl'),links=$('links');
  if(tgl&&links){
    tgl.addEventListener('click',function(){var o=links.classList.toggle('open');tgl.setAttribute('aria-expanded',o)});
  }

  /* header shadow and scroll progress */
  var hdr=document.querySelector('header'),prog=$('prog');
  function onScroll(){
    var h=document.documentElement,y=window.pageYOffset||h.scrollTop,max=h.scrollHeight-h.clientHeight;
    if(prog)prog.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';
    if(hdr)hdr.classList.toggle('stuck',y>10);
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* reveal on scroll */
  var rv=[].slice.call(document.querySelectorAll('.head,.svc,.step,.why-grid>div,.cc,.post-card,.split>div,.sidecard,details,.audit-grid>div,.contact-grid>div,.prose>*,.more-posts,.cta .wrap>*'));
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(el){
      var sibs=el.parentNode?[].slice.call(el.parentNode.children).filter(function(c){return rv.indexOf(c)>-1}):[el];
      el.style.transitionDelay=Math.min(sibs.indexOf(el),5)*70+'ms';
      el.classList.add('rv');io.observe(el);
    });
  }else{document.documentElement.classList.remove('js')}

  /* videos: respect reduced motion, pause when off screen */
  var vids=[].slice.call(document.querySelectorAll('video.loopvid'));
  if(reduce){vids.forEach(function(v){v.removeAttribute('autoplay');v.pause()})}
  else if('IntersectionObserver' in window){
    var vo=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){})}else v.pause()})},{threshold:.05});
    vids.forEach(function(v){vo.observe(v)});
  }

  /* copy buttons */
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-copy'),done=function(ok){b.textContent=ok?'Copied':'Select and copy';setTimeout(function(){b.textContent='Copy'},1800)};
      try{navigator.clipboard.writeText(t).then(function(){done(true)},function(){pick(b);done(false)})}catch(x){pick(b);done(false)}
    });
  });
  function pick(b){var v=b.parentNode.querySelector('.v');if(!v)return;var r=document.createRange();r.selectNodeContents(v);var s=getSelection();s.removeAllRanges();s.addRange(r)}

  /* free audit form: builds a WhatsApp message the visitor sends themselves */
  var form=$('aform');
  if(form){
    var sel=$('f-svc'),ready=$('ready');
    try{var want=new URLSearchParams(location.search).get('service');
      if(want){for(var i=0;i<sel.options.length;i++){if(sel.options[i].text===want)sel.selectedIndex=i}}}catch(e){}
    var bad=function(id,msg){$(id).textContent=msg;return !msg};
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var n=$('f-name').value.trim(),p=$('f-phone').value.trim();
      var ok1=bad('e-name',n?'':'Enter your name so we know who to reply to.');
      var ok2=bad('e-phone',/\d{9,}/.test(p.replace(/\D/g,''))?'':'Enter a phone number with at least 9 digits.');
      if(!(ok1&&ok2)){(!ok1?$('f-name'):$('f-phone')).focus();return}
      var lines=['Hello Bunifu Digital Agency, I would like a free audit.','','Name: '+n,'Phone: '+p,'Needs help with: '+sel.value];
      var biz=$('f-biz').value.trim(),msg=$('f-msg').value.trim();
      if(biz)lines.push('Business: '+biz);
      if(msg)lines.push('Notes: '+msg);
      var text=lines.join('\n');
      $('preview').textContent=text;
      $('wa-send').href='https://wa.me/'+WA+'?text='+encodeURIComponent(text);
      form.hidden=true;ready.hidden=false;
    });
    $('edit').addEventListener('click',function(){ready.hidden=true;form.hidden=false;$('f-name').focus()});
  }
})();
