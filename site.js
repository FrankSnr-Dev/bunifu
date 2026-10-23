(function(){
  var $=function(id){return document.getElementById(id)};
  var WA='254722822256';
  var yr=$('yr');if(yr)yr.textContent=new Date().getFullYear();
  var tgl=$('tgl'),links=$('links');
  if(tgl&&links){tgl.addEventListener('click',function(){var o=links.classList.toggle('open');tgl.setAttribute('aria-expanded',o)})}
  document.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-copy'),done=function(ok){b.textContent=ok?'Copied':'Select and copy';setTimeout(function(){b.textContent='Copy'},1800)};
      try{navigator.clipboard.writeText(t).then(function(){done(true)},function(){pick(b);done(false)})}catch(x){pick(b);done(false)}
    });
  });
  function pick(b){var v=b.parentNode.querySelector('.v');if(!v)return;var r=document.createRange();r.selectNodeContents(v);var s=getSelection();s.removeAllRanges();s.addRange(r)}
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
