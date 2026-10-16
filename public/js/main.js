(function () {
  // mobile nav
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainnav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // scroll reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // quote form(s)
  document.querySelectorAll('form[data-quote]').forEach(function (form) {
    var msg = form.querySelector('.msg');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Sending...';
      msg.className = 'msg';
      fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, j: j }; });
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          msg.className = 'msg ok';
          msg.textContent = "Thanks! We got your request and will be in touch within 24-48 hours. Need it sooner? Call (207) 899-6084.";
        } else {
          msg.className = 'msg err';
          msg.textContent = (res.j && res.j.error) || 'Something went wrong. Please call (207) 899-6084.';
        }
      }).catch(function () {
        msg.className = 'msg err';
        msg.textContent = 'Network problem. Please call (207) 899-6084.';
      }).then(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
    });
  });

  // gallery: filter + lightbox (gallery page only)
  var grid = document.getElementById('gallery-grid');
  if (grid && window.GALLERY) {
    var cats = ['All'];
    window.GALLERY.forEach(function (g) { if (cats.indexOf(g.cat) < 0) cats.push(g.cat); });
    var bar = document.getElementById('filters');
    var current = 'All';
    function render() {
      grid.innerHTML = '';
      window.GALLERY.filter(function (g) { return current === 'All' || g.cat === current; }).forEach(function (g) {
        var f = document.createElement('figure');
        f.innerHTML = '<img loading="lazy" src="/images/' + g.img + '" alt="' + g.alt.replace(/"/g, '&quot;') + '"><figcaption>' + g.cap + '</figcaption>';
        f.addEventListener('click', function () { open(g); });
        grid.appendChild(f);
      });
    }
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c; if (c === current) b.className = 'on';
      b.addEventListener('click', function () {
        current = c;
        Array.prototype.forEach.call(bar.children, function (x) { x.className = x.textContent === c ? 'on' : ''; });
        render();
      });
      bar.appendChild(b);
    });
    var lb = document.getElementById('lightbox');
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('p');
    function open(g) { lbImg.src = '/images/' + g.img; lbImg.alt = g.alt; lbCap.textContent = g.cap; lb.classList.add('on'); }
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'BUTTON') lb.classList.remove('on'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('on'); });
    render();
  }
})();
