document.addEventListener("DOMContentLoaded", function(){
  // Page-load animation
  requestAnimationFrame(()=> document.body.classList.add('is-loaded'));

  // Smooth in-page anchors
  document.querySelectorAll("a[href^='#']").forEach(a=>{
    a.addEventListener("click",function(e){
      const href = this.getAttribute('href');
      if(!href || href==="#") return;
      const t = document.querySelector(href);
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // reveal on scroll
  const reveals = document.querySelectorAll('.reveal-on-scroll');
  if('IntersectionObserver' in window && reveals.length){
    const obs = new IntersectionObserver((entries, observer)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('reveal');
          observer.unobserve(e.target);
        }
      });
    },{threshold:0.12,rootMargin:'0px 0px -10% 0px'});
    reveals.forEach(r=>obs.observe(r));
  } else {
    // fallback
    reveals.forEach(r=>r.classList.add('reveal'));
  }

  // mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a, .main-nav a').forEach(a=>{
    const href = a.getAttribute('href');
    if(href && href.indexOf(path) !== -1){ a.classList.add('active'); }
  });



  // contact demo handler
  const form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get('name');
      const msg = document.getElementById('formMsg');
      msg.textContent = 'Cảm ơn ' + (name || 'bạn') + '. Tin nhắn đã gửi (demo).';
      form.reset();
    });
  }

  // Load more posts (reveals .hidden-post items in batches with simple fade-in)
  const loadMoreBtn = document.getElementById('loadMore');
  if(loadMoreBtn){
    loadMoreBtn.addEventListener('click', async function(){
      const BATCH = 3;
      const hidden = Array.from(document.querySelectorAll('.post.hidden-post'));
      if(hidden.length){
        const toReveal = hidden.slice(0, BATCH);
        toReveal.forEach(el=>{
          // prepare for animation: start hidden (opacity 0, slight translate)
          el.style.opacity = '0';
          el.style.transform = 'translateY(10px)';
          el.classList.remove('hidden-post');
          // force a layout then animate in
          requestAnimationFrame(()=>{
            el.style.transition = 'opacity .36s ease, transform .36s ease';
            el.style.opacity = '1';
            el.style.transform = 'none';
          });
        });
        // hide button if no more hidden posts
        const remaining = document.querySelectorAll('.post.hidden-post');
        if(remaining.length === 0) this.style.display = 'none';
        // scroll to first revealed
        if(toReveal[0]) toReveal[0].scrollIntoView({behavior:'smooth',block:'start'});
      } else {
        // fallback: fetch posts.json and append up to BATCH items
        try{
          const res = await fetch('/data/posts.json');
          if(res.ok){
            const posts = await res.json();
            const grid = document.querySelector('.blog-grid');
            const existing = new Set(Array.from(document.querySelectorAll('.post h3')).map(h=>h.textContent.trim()));
            let appended = 0;
            for(const p of posts){
              if(appended >= BATCH) break;
              if(existing.has(p.title)) continue;
              const article = document.createElement('article');
                article.className = 'post';
                article.innerHTML = `<img src="${p.image}" alt="${p.title}"><h3>${p.title}</h3><p class="meta">${p.date} • ${p.read_time}</p><p>${p.excerpt}</p><a href="blog/${p.id}.html" class="link-underline" data-id="${p.id}">Xem thêm</a>`;
              article.style.opacity = '0';
              article.style.transform = 'translateY(10px)';
              grid.appendChild(article);
              requestAnimationFrame(()=>{ article.style.transition = 'opacity .36s ease, transform .36s ease'; article.style.opacity='1'; article.style.transform='none'; });
              appended++;
            }
            if(appended < 1) this.style.display = 'none';
            if(appended > 0){
              // scroll to the first of the appended items
              const postsList = grid.querySelectorAll('.post');
              if(postsList && postsList.length) postsList[postsList.length - appended].scrollIntoView({behavior:'smooth',block:'start'});
            }
          }
        }catch(err){/* ignore */}
      }
    });
  }

  // Theme toggle (light/dark) — persisted in localStorage
  (function(){
    const THEME_KEY = 'theme';
    const toggle = document.getElementById('themeToggle');
    if(!toggle) return;
    function applyTheme(theme){
      if(theme === 'dark'){
        document.documentElement.setAttribute('data-theme','dark');
        toggle.setAttribute('aria-pressed','true');
        toggle.title = 'Chuyển sang chế độ sáng';
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggle.setAttribute('aria-pressed','false');
        toggle.title = 'Chuyển sang chế độ tối';
      }
    }
    let theme = localStorage.getItem(THEME_KEY);
    if(!theme){
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(theme);
    toggle.addEventListener('click', function(){
      const currentIsDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = currentIsDark ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  })();

});

// --- Modal handling for post details (delegated) ---
(function(){
  const modal = document.getElementById('postModal');
  if(!modal) return;
  const panel = modal.querySelector('.modal-panel');
  const titleEl = modal.querySelector('#modalTitle');
  const metaEl = modal.querySelector('.modal-meta');
  const imgEl = modal.querySelector('.modal-post-image');
  const bodyEl = modal.querySelector('.modal-body');
  let lastActiveTrigger = null;

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    // clear content (optional)
    //bodyEl.innerHTML = '';
    document.body.style.overflow = '';
    // restore main visibility to assistive tech
    try{ const main = document.querySelector('main'); if(main) main.removeAttribute('aria-hidden'); }catch(e){}
    // restore focus to trigger if available
    try{ if(lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') lastActiveTrigger.focus(); }catch(e){}
    lastActiveTrigger = null;
  }

  function openModalWithPost(post){
    titleEl.textContent = post.title || '';
    metaEl.textContent = (post.date ? post.date : '') + (post.read_time ? (' • '+post.read_time) : '');
    if(post.image){ imgEl.src = post.image; imgEl.alt = post.title || ''; imgEl.style.display = '' } else { imgEl.style.display='none' }
    bodyEl.innerHTML = post.content || '';
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // hide main content from assistive tech
    try{ const main = document.querySelector('main'); if(main) main.setAttribute('aria-hidden','true'); }catch(e){}
    // move focus to the first focusable element inside modal (close button)
    setTimeout(()=>{ const closeBtn = panel.querySelector('.modal-close'); if(closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus(); else panel.focus && panel.focus(); }, 120);
  }

  // helper to safely escape text for injection
  function escapeHtml(text){ return text ? String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

  // show a full-page inline detail view when modal/fetch/navigation fail
  function showInlineDetail(post){
    if(document.querySelector('.inline-post-detail')) return; // already open
    const main = document.querySelector('main');
    if(main){ try{ main.setAttribute('aria-hidden','true'); main.style.display='none'; }catch(e){} }
    const container = document.createElement('div');
    container.className = 'inline-post-detail';
    container.innerHTML = `<div class="detail-inner">
        <button class="detail-back btn" aria-label="Trở lại">← Trở lại</button>
        <h1 class="detail-title">${escapeHtml(post.title || '')}</h1>
        <p class="meta detail-meta">${escapeHtml(post.date || '')}</p>
        ${post.image ? '<img class="detail-image" src="'+escapeHtml(post.image)+'" alt="'+escapeHtml(post.title||'')+'"/>' : ''}
        <div class="detail-body">${post.content || '<p>Không có nội dung.</p>'}</div>
      </div>`;
    document.body.appendChild(container);
    const back = container.querySelector('.detail-back');
    back.addEventListener('click', function(){ try{ container.remove(); if(main){ main.removeAttribute('aria-hidden'); main.style.display=''; } if(lastActiveTrigger && lastActiveTrigger.focus) lastActiveTrigger.focus(); }catch(e){} });
    // focus on back button
    setTimeout(()=> back.focus && back.focus(), 80);
  }

  async function fetchAndShow(id){
    try{
      // first: try the posts.json file (several relative paths)
      let res = null;
      const tryPaths = ['data/posts.json','./data/posts.json','/data/posts.json'];
      for(const p of tryPaths){
        try{ res = await fetch(p); if(res && res.ok) break; }catch(err){ res = null; }
      }
      if(res && res.ok){
        const posts = await res.json();
        const p = posts.find(x=>x.id===id);
        if(p) { openModalWithPost(p); return; }
      }

      // second: try fetching the post page and extracting content
      if(lastActiveTrigger && lastActiveTrigger.href){
        try{
          const resp = await fetch(lastActiveTrigger.href);
          if(resp && resp.ok){
            const text = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const article = doc.querySelector('article.post') || doc.querySelector('.post') || doc.querySelector('main article') || doc.querySelector('main');
            if(article){
              const img = article.querySelector('img');
              const heading = article.querySelector('h1, h2, h3');
              const meta = article.querySelector('.meta');
              // build a reasonable content block from the article HTML (exclude 'Xem thêm' links if present)
              // prefer paragraphs inside the article
              let content = '';
              const paras = article.querySelectorAll('p');
              if(paras && paras.length){ paras.forEach(p=>{ content += '<p>'+p.innerHTML+'</p>'; }); }
              else { content = article.innerHTML; }
              const postObj = {
                title: heading ? heading.textContent.trim() : (doc.title || ''),
                date: meta ? meta.textContent.trim() : '',
                image: img ? img.getAttribute('src') : '',
                content: content
              };
              openModalWithPost(postObj);
              return;
            }
          }
        }catch(err){ /* continue to next fallback */ }
      }

      // third: extract content from the current page's article element (closest to the trigger)
      if(lastActiveTrigger){
        const currentArticle = lastActiveTrigger.closest && lastActiveTrigger.closest('article.post');
        if(currentArticle){
          const img = currentArticle.querySelector('img');
          const heading = currentArticle.querySelector('h3, h2, h1');
          const meta = currentArticle.querySelector('.meta');
          let content = '';
          const paras = currentArticle.querySelectorAll('p');
          if(paras && paras.length){ paras.forEach(p=>{ content += '<p>'+p.innerHTML+'</p>'; }); }
          else { content = currentArticle.innerHTML; }
          openModalWithPost({ title: heading ? heading.textContent.trim() : '', date: meta ? meta.textContent.trim() : '', image: img ? img.getAttribute('src') : '', content });
          return;
        }
      }

      // final fallback: show inline detail view built from the trigger if navigation isn't possible
      if(lastActiveTrigger && lastActiveTrigger.href){
        const art = lastActiveTrigger.closest && lastActiveTrigger.closest('article.post');
        const heading = art && (art.querySelector('h3') || art.querySelector('h2') || art.querySelector('h1')) ? (art.querySelector('h3') || art.querySelector('h2') || art.querySelector('h1')).textContent.trim() : (lastActiveTrigger.textContent || '');
        const img = art && art.querySelector && art.querySelector('img') ? art.querySelector('img').getAttribute('src') : '';
        const paras = art ? Array.from(art.querySelectorAll('p')).map(p=>'<p>'+p.innerHTML+'</p>').join('') : '<p>Nội dung chi tiết không khả dụng.</p>';
        showInlineDetail({ title: heading, date: (art && art.querySelector('.meta') ? art.querySelector('.meta').textContent.trim() : ''), image: img, content: paras, href: lastActiveTrigger.href });
      }
    }catch(e){
      if(lastActiveTrigger && lastActiveTrigger.href){
        const art = lastActiveTrigger.closest && lastActiveTrigger.closest('article.post');
        const heading = art && (art.querySelector('h3') || art.querySelector('h2') || art.querySelector('h1')) ? (art.querySelector('h3') || art.querySelector('h2') || art.querySelector('h1')).textContent.trim() : (lastActiveTrigger.textContent || '');
        const img = art && art.querySelector && art.querySelector('img') ? art.querySelector('img').getAttribute('src') : '';
        const paras = art ? Array.from(art.querySelectorAll('p')).map(p=>'<p>'+p.innerHTML+'</p>').join('') : '<p>Nội dung chi tiết không khả dụng.</p>';
        showInlineDetail({ title: heading, date: (art && art.querySelector('.meta') ? art.querySelector('.meta').textContent.trim() : ''), image: img, content: paras, href: lastActiveTrigger.href });
      }
    }
  }

  // delegate clicks on blog grid links
  document.addEventListener('click', function(e){
    const a = e.target.closest && e.target.closest('a.link-underline[data-id]');
    if(!a) return;
    // allow ctrl/cmd/middle click to open in new tab
    if(e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    const id = a.getAttribute('data-id');
    if(!id) return;
    // remember trigger to restore focus when modal closes
    lastActiveTrigger = a;
    fetchAndShow(id);
  });

  // close handlers
  modal.addEventListener('click', function(e){ if(e.target && e.target.getAttribute('data-close') === 'true') closeModal(); });
  document.addEventListener('keydown', function(e){ 
    const open = modal.getAttribute('aria-hidden') === 'false';
    if(!open) return;
    if(e.key === 'Escape') return closeModal();
    if(e.key === 'Tab'){
      // simple focus trap inside modal
      const focusable = Array.from(modal.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]'))
        .filter(el => el.tabIndex >= 0 && el.offsetParent !== null);
      if(focusable.length === 0){ e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length -1];
      if(e.shiftKey){ // backwards
        if(document.activeElement === first || modal === document.activeElement) { e.preventDefault(); last.focus(); }
      } else { // forwards
        if(document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });
})();

/* Certificate image modal (open on click, close on backdrop/ESC) */
(function(){
  const modal = document.getElementById('imageModal');
  if(!modal) return;
  const img = modal.querySelector('#imageModalImg');
  const title = modal.querySelector('#imageModalLabel');
  const caption = modal.querySelector('#imageModalCaption');
  let lastTrigger = null;

  document.addEventListener('click', function(e){
    const btn = e.target.closest && e.target.closest('.cert-thumb');
    if(!btn) return;
    e.preventDefault();
    lastTrigger = btn;
    const src = btn.getAttribute('data-src') || (btn.querySelector('img') && btn.querySelector('img').src);
    const cap = btn.getAttribute('data-caption') || (btn.querySelector('.cert-caption') && btn.querySelector('.cert-caption').textContent.trim());
    const titleText = btn.getAttribute('data-title') || '';
    if(src){ img.src = src; img.alt = btn.querySelector('img') ? btn.querySelector('img').alt : ''; }
    title.textContent = titleText;
    caption.textContent = cap || '';
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    try{ document.querySelector('main').setAttribute('aria-hidden','true'); }catch(e){}
    setTimeout(()=> { const cb = modal.querySelector('.modal-close'); if(cb && cb.focus) cb.focus(); }, 120);
  });

  modal.addEventListener('click', function(e){
    if(e.target && e.target.getAttribute('data-close') === 'true') close();
  });

  function close(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    try{ document.querySelector('main').removeAttribute('aria-hidden'); }catch(e){}
    if(lastTrigger && lastTrigger.focus) lastTrigger.focus();
    lastTrigger = null;
  }

  document.addEventListener('keydown', function(e){
    if(modal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape'){ close(); }
  });
})();
