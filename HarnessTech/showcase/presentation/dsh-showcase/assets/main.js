(function () {
  'use strict';

  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var progressBar = document.getElementById('progressBar');

  /* ---------- 进度条 ---------- */
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.width = (ratio * 100).toFixed(2) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---------- 封面计数 ---------- */
  function animateCounters() {
    document.querySelectorAll('.stat .num').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var start = null;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1400, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 场景内动画 ---------- */
  function stagger(nodes, cls, step) {
    nodes.forEach(function (n, i) {
      setTimeout(function () { n.classList.add(cls); }, i * step);
    });
  }

  var animators = {
    s1: function () {
      stagger(Array.prototype.slice.call(document.querySelectorAll('#stackDemo .stack-layer')), 'landed', 170);
    },
    s2: function () {
      stagger(Array.prototype.slice.call(document.querySelectorAll('#timeline .tl-node')), 'lit', 280);
    },
    s3: function () {
      var events = [
        ['turn/start', '{"turn":1}'],
        ['user/message', '"修一下登录页的样式"'],
        ['assistant/message', '"我先看一下文件…"'],
        ['tool/call', 'read_file("login.tsx")'],
        ['tool/result', '1.2k tokens'],
        ['assistant/message', '"改这三处样式…"'],
        ['step/end', '{"turn":1,"step":1}']
      ];
      var msgs = [
        ['user', '修一下登录页的样式'],
        ['assistant', '我先看一下文件…'],
        ['tool', 'read_file → 1.2k tokens'],
        ['assistant', '改这三处样式…']
      ];
      var evBox = document.getElementById('evStream');
      var msgBox = document.getElementById('msgView');
      events.forEach(function (pair) {
        var div = document.createElement('div');
        div.className = 'ev-line';
        div.textContent = pair[0] + '  ' + pair[1];
        evBox.appendChild(div);
      });
      msgs.forEach(function (pair) {
        var div = document.createElement('div');
        div.className = 'msg-line';
        var role = document.createElement('span');
        role.className = 'role';
        role.textContent = '[' + pair[0] + '] ';
        div.appendChild(role);
        div.appendChild(document.createTextNode(pair[1]));
        msgBox.appendChild(div);
      });
      stagger(Array.prototype.slice.call(evBox.children), 'lit', 170);
      setTimeout(function () {
        stagger(Array.prototype.slice.call(msgBox.children), 'lit', 300);
      }, events.length * 170 + 400);
    },
    s5: function () {
      stagger(Array.prototype.slice.call(document.querySelectorAll('#pyramid .pyr-layer')), 'lit', 220);
    }
  };

  /* ---------- IntersectionObserver：reveal + 场景动画（各触发一次） ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var scene = entry.target;
      var reveals = scene.querySelectorAll('.reveal');
      reveals.forEach(function (r, i) {
        setTimeout(function () { r.classList.add('in'); }, i * 120);
      });
      if (!scene.dataset.animated) {
        scene.dataset.animated = '1';
        var fn = animators[scene.id];
        if (fn) setTimeout(fn, 350);
        if (scene.id === 's0') setTimeout(animateCounters, 300);
      }
    });
  }, { threshold: 0.55 });
  scenes.forEach(function (s) { io.observe(s); });

  /* ---------- 场景 4：执行世界切换 ---------- */
  var world = document.getElementById('worldDemo');
  var worldName = document.getElementById('worldName');
  var btnLocal = document.getElementById('btnLocal');
  var btnSandbox = document.getElementById('btnSandbox');
  var chips = Array.prototype.slice.call(document.querySelectorAll('#chips .chip'));

  function pulseChips() {
    chips.forEach(function (c, i) {
      setTimeout(function () {
        c.classList.add('moving');
        setTimeout(function () { c.classList.remove('moving'); }, 600);
      }, i * 220);
    });
  }
  function setWorld(sandbox) {
    world.classList.toggle('sandbox', sandbox);
    worldName.textContent = sandbox ? '远程沙箱' : '本地';
    btnLocal.classList.toggle('active', !sandbox);
    btnSandbox.classList.toggle('active', sandbox);
    pulseChips();
  }
  btnLocal.addEventListener('click', function () { setWorld(false); });
  btnSandbox.addEventListener('click', function () { setWorld(true); });

  /* ---------- 自动播放（录屏模式） ---------- */
  var autoplayBtn = document.getElementById('autoplayBtn');
  var playing = false;
  var timer = null;
  var current = 0;

  function nearestSceneIndex() {
    var best = 0;
    var bestDist = Infinity;
    scenes.forEach(function (s, i) {
      var d = Math.abs(s.getBoundingClientRect().top);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }
  function stepPlay() {
    current = nearestSceneIndex();
    if (current >= scenes.length - 1) { stopPlay(); return; }
    scenes[current + 1].scrollIntoView({ behavior: 'smooth' });
  }
  function startPlay() {
    playing = true;
    autoplayBtn.classList.add('on');
    autoplayBtn.textContent = '停止播放';
    timer = setInterval(stepPlay, 5600);
    stepPlay();
  }
  function stopPlay() {
    playing = false;
    autoplayBtn.classList.remove('on');
    autoplayBtn.textContent = '自动播放';
    if (timer) { clearInterval(timer); timer = null; }
  }
  autoplayBtn.addEventListener('click', function () {
    if (playing) { stopPlay(); } else { startPlay(); }
  });
  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, function () {
      if (playing) stopPlay();
    }, { passive: true });
  });
})();
