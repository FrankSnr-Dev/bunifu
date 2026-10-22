(function(){
  var $=function(id){return document.getElementById(id)};
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tgl=$('tgl'),links=$('links');
  if(tgl&&links){
    tgl.addEventListener('click',function(){var o=links.classList.toggle('open');tgl.setAttribute('aria-expanded',o)});
  }
  var hdr=document.querySelector('header'),prog=$('prog');
  function onScroll(){
    var h=document.documentElement,y=window.pageYOffset||h.scrollTop,max=h.scrollHeight-h.clientHeight;
    if(prog)prog.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';
    if(hdr)hdr.classList.toggle('stuck',y>10);
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  var D={
    b2b:{e:'Pipeline & demand',h:'A steady pipeline of qualified leads.',p:'For software, professional services and contractors, we join search, content, paid ads and email follow-up into one demand engine that fills your sales calendar.',c:['SEO & AI search','Paid media','Thought leadership','Email & CRM'],f:[['Lead quality','We score every lead against your ideal client.'],['Sales handover','Leads arrive with context and a next step.'],['Review cycle','Full results review every 90 days.']]},
    b2c:{e:'Reach & footfall',h:'More customers, in the shop and online.',p:'For retail, property, hospitality and education, we reach people on the platforms they use daily and move them to WhatsApp, a call or a visit.',c:['Social media','Local search','WhatsApp follow-up','Short video'],f:[['Local reach','Targeting by county, town and neighbourhood.'],['Quick replies','WhatsApp flows answer enquiries in minutes.'],['Seasonal pushes','Campaigns planned around paydays and holidays.']]},
    d2c:{e:'Online sales',h:'A store that sells while you sleep.',p:'For brands that sell direct, we build the shop, connect M-Pesa checkout and run the ads, email and retargeting that bring buyers back.',c:['Online shop build','M-Pesa checkout','Retargeting ads','Email flows'],f:[['Checkout','Fast mobile checkout with M-Pesa and cards.'],['Repeat buyers','Automated follow-ups after every order.'],['Ad spend','Budget shifts to the products that sell.']]}
  };
  var tabs=[].slice.call(document.querySelectorAll('.tab')),ready=false;
  function show(k){
    var d=D[k],pn=$('panel');
    tabs.forEach(function(t){var on=t.dataset.k===k;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1});
    pn.setAttribute('aria-labelledby','t-'+k);
    $('pe').textContent=d.e;$('ph').textContent=d.h;$('pp').textContent=d.p;
    pn.classList.remove('swap');void pn.offsetWidth;if(ready)pn.classList.add('swap');
    var pc=$('pc');pc.innerHTML='';
    d.c.forEach(function(x){var li=document.createElement('li');li.textContent=x;pc.appendChild(li)});
    var f=$('pf');f.innerHTML='';
    d.f.forEach(function(r){var w=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=r[0];s.textContent=r[1];w.appendChild(b);w.appendChild(s);f.appendChild(w)});
  }
  if(tabs.length&&$('panel')){
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){show(t.dataset.k)});
      t.addEventListener('keydown',function(e){
        var j=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1;
        if(j<0)return;j=(j+tabs.length)%tabs.length;tabs[j].focus();show(tabs[j].dataset.k);
      });
    });
    show('b2b');ready=true;
  }

  var f=$('f'),out=$('out'),brief=$('brief'),cp=$('cp');
  if(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var v=function(id){return $(id).value.trim()||'-'};
      brief.textContent='Name: '+v('n')+'\nBusiness: '+v('c')+'\nContact: '+v('e')+'\nMain need: '+v('s')+'\nGoal: '+v('m');
      out.classList.add('show');
    });
    cp.addEventListener('click',function(){
      function sel(){var r=document.createRange();r.selectNodeContents(brief);var s=getSelection();s.removeAllRanges();s.addRange(r);cp.textContent='Selected, press copy'}
      try{navigator.clipboard.writeText(brief.textContent).then(function(){cp.textContent='Copied'},sel)}catch(x){sel()}
    });
  }

  if(!reduce&&'IntersectionObserver' in window){
    var sel='.head>*,.pt,.prob,.pivot,.tabs,.panel,.step,.node,.svc,.scroll,.case,.note,.contact-grid>*,.fgrid>*,.cta .wrap>*';
    var els=[].slice.call(document.querySelectorAll(sel)).filter(function(el){return !el.closest('.hero')});
    els.forEach(function(el){
      var i=[].indexOf.call(el.parentNode.children,el);
      el.style.setProperty('--d',Math.min(i,5)*0.09+'s');
      el.classList.add('rv');
    });
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});
    },{threshold:0.12,rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(el){io.observe(el)});
    var nums=[].slice.call(document.querySelectorAll('.stat b'));
    if(nums.length){
      setTimeout(function(){
        var t0=null;nums.forEach(function(n){n.textContent='0'});
        (function tick(t){
          if(!t0)t0=t;var p=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-p,3);
          nums.forEach(function(n){n.textContent=Math.round(+n.dataset.to*e)});
          if(p<1)requestAnimationFrame(tick);
        })(performance.now());
      },700);
    }
  }
  /* hero pointer glow */
  var hero=document.querySelector('.hero');
  if(hero&&!reduce){
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      hero.style.setProperty('--gx',(e.clientX-r.left)+'px');
      hero.style.setProperty('--gy',(e.clientY-r.top)+'px');
    });
  }

  /* growth engine: click or tab through the steps */
  var nodes=[].slice.call(document.querySelectorAll('.engine .node')),detail=$('detail'),eb=$('engbar');
  if(nodes.length&&detail){
    var E=[
      {h:'Audience intelligence',p:'We study who is searching, scrolling and buying in your market, then rank audiences by how closely they match your best customers.',l:['Customer and competitor research','Audience segments ranked by fit','A shortlist of the best first opportunities']},
      {h:'Personal engagement',p:'Each audience gets messages written for them, on the channel they use, with a clear next step such as a call, a WhatsApp chat or a purchase.',l:['Message map for each audience','Landing pages and WhatsApp flows','Email follow-up that nurtures every lead']},
      {h:'Content creation',p:'We turn your knowledge into posts, videos, carousels and pages in your brand voice, reviewed by a strategist before anything goes live.',l:['A monthly content calendar','On-brand creatives and short video','Blog and landing page copy']},
      {h:'Smart posting',p:'Content goes out where and when your audience is online, and we track which posts bring enquiries rather than only likes.',l:['Scheduling across your channels','Captions and hashtags for each platform','Weekly engagement and enquiry tracking']},
      {h:'Paid amplification',p:'We test audiences and creatives with small budgets, then put more money behind the ads that bring customers and pause the rest.',l:['Google, Meta, TikTok and LinkedIn campaigns','Creative and audience testing','Budget moved weekly toward what pays back']}
    ];
    var cur=0,timer=null,auto=!reduce;
    function pick(i,user){
      cur=i;
      nodes.forEach(function(n,j){n.classList.toggle('on',j===i);n.setAttribute('aria-pressed',j===i)});
      var d=E[i];detail.classList.remove('swap');void detail.offsetWidth;detail.classList.add('swap');
      detail.innerHTML='';
      var a=document.createElement('div'),h3=document.createElement('h3'),p=document.createElement('p');
      h3.textContent=d.h;p.textContent=d.p;a.appendChild(h3);a.appendChild(p);
      var ul=document.createElement('ul');d.l.forEach(function(t){var li=document.createElement('li');li.textContent=t;ul.appendChild(li)});
      detail.appendChild(a);detail.appendChild(ul);
      if(user){auto=false;clearInterval(timer);if(eb){eb.style.transition='none';eb.style.width='0'}}
      else if(eb&&!reduce){eb.style.transition='none';eb.style.width='0';void eb.offsetWidth;eb.style.transition='width 4s linear';eb.style.width='100%'}
    }
    nodes.forEach(function(n,i){
      n.tabIndex=0;n.setAttribute('role','button');
      n.addEventListener('click',function(){pick(i,true)});
      n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i,true)}});
    });
    pick(0,false);
    if(auto){timer=setInterval(function(){pick((cur+1)%nodes.length,false)},4000)}
  }

  /* services filter */
  var fc=$('fchips'),cards=[].slice.call(document.querySelectorAll('.services .svc'));
  if(fc&&cards.length){
    var cats=['All'];
    cards.forEach(function(c){var t=c.querySelector('.tag').textContent.trim();c.dataset.cat=t;if(cats.indexOf(t)<0)cats.push(t)});
    cats.forEach(function(c,i){
      var b=document.createElement('button');b.type='button';b.className='fchip';b.textContent=c;b.setAttribute('aria-pressed',i===0);
      b.addEventListener('click',function(){
        [].forEach.call(fc.children,function(x){x.setAttribute('aria-pressed',x===b)});
        cards.forEach(function(card){card.classList.toggle('gone',c!=='All'&&card.dataset.cat!==c)});
      });
      fc.appendChild(b);
    });
  }

  /* growth estimator */
  var cb=$('c-b');
  if(cb){
    var fmt=function(n){return Math.round(n).toLocaleString('en-KE')};
    var ids=['c-b','c-c','c-r','c-v'],cur2={l:0,c:0,v:0,x:0},raf=null;
    function paint(o){
      $('r-l').textContent=fmt(o.l);
      $('r-c').textContent=o.c<10?o.c.toFixed(1):fmt(o.c);
      $('r-v').textContent='KES '+fmt(o.v);
      $('r-x').textContent='KES '+o.x.toFixed(1);
    }
    function calc(){
      var b=+$('c-b').value,cpl=+$('c-c').value,r=+$('c-r').value,v=+$('c-v').value;
      ids.forEach(function(id){var el=$(id);el.style.setProperty('--p',((el.value-el.min)/(el.max-el.min)*100)+'%')});
      $('o-b').textContent='KES '+fmt(b);$('o-c').textContent='KES '+fmt(cpl);$('o-r').textContent=r+'%';$('o-v').textContent='KES '+fmt(v);
      var leads=b/cpl,cust=leads*r/100,rev=cust*v,t={l:leads,c:cust,v:rev,x:rev/b};
      if(reduce){paint(t);return}
      var from={l:cur2.l,c:cur2.c,v:cur2.v,x:cur2.x},t0=null;cancelAnimationFrame(raf);
      (function step(ts){
        if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/400),e=1-Math.pow(1-p,3);
        cur2={l:from.l+(t.l-from.l)*e,c:from.c+(t.c-from.c)*e,v:from.v+(t.v-from.v)*e,x:from.x+(t.x-from.x)*e};
        paint(cur2);if(p<1)raf=requestAnimationFrame(step);
      })(performance.now());
    }
    ids.forEach(function(id){$(id).addEventListener('input',calc)});
    calc();
  }
})();
