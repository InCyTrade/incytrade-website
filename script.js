// InCyTrade site script — mobile nav toggle and scroll reveal.
// No dependencies, no build step, no analytics/tracking of any kind.
// Cookie consent is handled separately by cookie-consent-config.js
// (vanilla-cookieconsent, vendored in vendor/cookieconsent/).

(function () {
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");

  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    // Escape closes the mobile menu and returns focus to the toggle,
    // same expectation as any other disclosure widget.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });
  }

  // The hero's narrowing figures resolve on load rather than sitting there as
  // static text: 40,000 identities in the estate, down to the few hundred
  // inside the current window, down to the handful worth hardening. Each step
  // waits for the one before it, so the sequence reads as a filter running.
  // Values live in the HTML, so with JS off or reduced motion on, the final
  // numbers are simply there.
  function runSignalStrip() {
    var strip = document.querySelector(".signal-strip");
    if (!strip) return;

    var cells = strip.querySelectorAll(".signal-num");
    var arrows = strip.querySelectorAll(".signal-arrow");
    if (!cells.length) return;

    var finals = [];
    cells.forEach(function (el) {
      var value = parseInt(el.textContent.replace(/[^0-9]/g, ""), 10);
      finals.push(value);
      // Reserve the final width up front so nothing shifts while counting.
      el.style.display = "inline-block";
      el.style.minWidth = el.textContent.trim().length + "ch";
    });

    strip.classList.add("is-live");

    var step = function (index) {
      if (index >= cells.length) {
        strip.classList.add("is-settled");
        return;
      }

      var el = cells[index];
      var from = index === 0 ? 0 : finals[index - 1];
      var to = finals[index];
      var duration = index === 0 ? 900 : 650;
      var start = null;

      var frame = function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var current = Math.round(from + (to - from) * eased);
        el.textContent = current.toLocaleString("en-US");

        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }

        el.textContent = to.toLocaleString("en-US");
        el.classList.add("is-set");

        if (arrows[index]) arrows[index].classList.add("is-shown");
        setTimeout(function () {
          step(index + 1);
        }, 180);
      };

      el.classList.add("is-counting");
      requestAnimationFrame(frame);
    };

    step(0);
  }

  // ---- Hero correlation visual -------------------------------------------
  // A tape that never stops, an access-telemetry lane underneath it, and the
  // occasional moment where a private access event is followed by a move in
  // the price. Purely decorative and aria-hidden: it restates the headline.
  function runCorrelationViz(animate) {
    var canvas = document.getElementById("corrCanvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;

    var PRICE = "#cfdce6";
    var ALERT = "rgba(111, 159, 208, 0.85)";
    var CORR = "#2ec4b6";
    var GRID = "rgba(255, 255, 255, 0.045)";

    var SPEED = 34;          // px per second the tape travels left
    var STEP = 4;            // px between price samples
    var LANE = 62;           // height of the telemetry lane, scaled on resize

    var points = [];         // {x, v} with v in 0..1, newest last
    var alerts = [];         // {x, corr, age, fired}
    var level = 0.5;
    var drift = 0;
    var nextAlertIn = 0.9;
    var alertCount = 0;
    var beat = 0;
    var PULSE = 2500;   // one detection every two and a half seconds
    var FLASH = 1.25;   // how long a single detection stays on screen
    var flashes = [];   // {alert, age}
    var sinceSample = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      W = Math.max(rect.width, 1);
      H = Math.max(rect.height, 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      LANE = Math.max(38, Math.min(62, H * 0.2));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sample() {
      // Random walk, gently pulled back to the middle, plus whatever drift a
      // correlated event has injected.
      var shock = (Math.random() - 0.5) * 0.038;
      level += shock + drift + (0.5 - level) * 0.020;
      drift *= 0.90;
      level = Math.max(0.10, Math.min(0.90, level));
      points.push({ x: W + STEP, v: level });
    }

    function spawnAlert() {
      // every fourth access event is the one that lines up, so the pattern
      // is always visible in frame rather than left to chance
      alertCount++;
      var corr = alertCount % 4 === 0;
      alerts.push({ x: W + 6, corr: corr, age: 0, fired: !corr, seed: Math.random() });
      nextAlertIn = 0.65 + Math.random() * 1.5;
    }

    function spawnFlash() {
      var live = [];
      for (var i = 0; i < alerts.length; i++) {
        var a = alerts[i];
        if (a.corr && a.x > 24 && a.x < W - 24 && tapeYAt(a.x) !== null) live.push(a);
      }
      if (!live.length) return;
      flashes.push({ alert: live[Math.floor(Math.random() * live.length)], age: 0 });
    }

    function advance(dt) {
      beat += dt * 1000;
      if (beat >= PULSE) { beat -= PULSE; spawnFlash(); }
      for (var fi = flashes.length - 1; fi >= 0; fi--) {
        flashes[fi].age += dt;
        if (flashes[fi].age > FLASH) flashes.splice(fi, 1);
      }
      var dx = SPEED * dt;
      var i;

      for (i = 0; i < points.length; i++) points[i].x -= dx;
      for (i = 0; i < alerts.length; i++) {
        alerts[i].x -= dx;
        alerts[i].age += dt;
        // The tell: the move lands a beat after the private access event.
        if (!alerts[i].fired && alerts[i].age > 0.85) {
          alerts[i].fired = true;
          drift += (Math.random() < 0.5 ? -1 : 1) * 0.022;
        }
      }

      while (points.length && points[0].x < -STEP * 2) points.shift();
      while (alerts.length && alerts[0].x < -40) alerts.shift();

      sinceSample += dx;
      while (sinceSample >= STEP) {
        sinceSample -= STEP;
        sample();
      }

      nextAlertIn -= dt;
      if (nextAlertIn <= 0) spawnAlert();
    }

    // the height of the tape at a given x, interpolated between samples
    function tapeYAt(x) {
      if (points.length < 2) return null;
      if (x < points[0].x || x > points[points.length - 1].x) return null;
      for (var i = 1; i < points.length; i++) {
        if (points[i].x >= x) {
          var a = points[i - 1], b = points[i];
          var f = (x - a.x) / Math.max(b.x - a.x, 0.001);
          return priceY(a.v + (b.v - a.v) * f);
        }
      }
      return null;
    }

    function priceY(v) {
      var top = 18;
      var bottom = H - LANE - 10;
      return bottom - v * (bottom - top);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      var laneTop = H - LANE;

      // horizon lines
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      for (var g = 1; g <= 3; g++) {
        var y = Math.round((laneTop - 10) * (g / 4)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, Math.round(laneTop) + 0.5);
      ctx.lineTo(W, Math.round(laneTop) + 0.5);
      ctx.stroke();

      if (points.length > 1) {
        // area under the tape
        var grad = ctx.createLinearGradient(0, 0, 0, laneTop);
        grad.addColorStop(0, "rgba(46, 196, 182, 0.20)");
        grad.addColorStop(1, "rgba(46, 196, 182, 0)");
        ctx.beginPath();
        ctx.moveTo(points[0].x, laneTop - 10);
        for (var a = 0; a < points.length; a++) ctx.lineTo(points[a].x, priceY(points[a].v));
        ctx.lineTo(points[points.length - 1].x, laneTop - 10);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // the tape itself
        ctx.beginPath();
        ctx.moveTo(points[0].x, priceY(points[0].v));
        for (var b = 1; b < points.length; b++) ctx.lineTo(points[b].x, priceY(points[b].v));
        ctx.strokeStyle = PRICE;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.stroke();

        // the live edge
        var last = points[points.length - 1];
        var lx = Math.min(last.x, W - 1);
        var ly = priceY(last.v);
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fillStyle = PRICE;
        ctx.fill();
      }

      // telemetry lane
      for (var c = 0; c < alerts.length; c++) {
        var al = alerts[c];
        if (al.x < -20 || al.x > W + 20) continue;
        var x = Math.round(al.x) + 0.5;
        var h = al.corr ? LANE - 16 : 9 + (al.seed || 0) * 12;

        ctx.beginPath();
        ctx.moveTo(x, H - 12);
        ctx.lineTo(x, H - 12 - h);
        ctx.strokeStyle = al.corr ? CORR : ALERT;
        ctx.lineWidth = al.corr ? 2 : 1.4;
        ctx.stroke();

        if (!al.corr) continue;

        // tie the access event to the move that followed it
        ctx.save();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = "rgba(46, 196, 182, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, H - 12 - h);
        ctx.lineTo(x, 14);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, H - 12 - h, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = CORR;
        ctx.fill();

        if (al.age < 2.6) {
          var fade = Math.max(0, 1 - al.age / 2.6);
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(x, H - 12 - h, 3.2 + (1 - fade) * 9, 0, Math.PI * 2);
          ctx.strokeStyle = CORR;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // the detections: a dot is born where the dashed line crosses the tape,
      // flares, and is gone. Nothing sits on the tape between beats.
      for (var d = 0; d < flashes.length; d++) {
        var fl = flashes[d];
        var fx = fl.alert.x;
        if (fx < 4 || fx > W - 4) continue;
        var cross = tapeYAt(fx);
        if (cross === null) continue;

        var ft = fl.age;
        var grow = Math.min(ft / 0.09, 1);
        var out = ft < 0.4 ? 1 : Math.max(0, 1 - (ft - 0.4) / (FLASH - 0.4));
        var ring = Math.min(ft / 0.7, 1);
        var cx = Math.round(fx) + 0.5;

        ctx.globalAlpha = 0.4 * (1 - ring) * out;
        ctx.beginPath();
        ctx.arc(cx, cross, 5 + ring * 22, 0, Math.PI * 2);
        ctx.fillStyle = CORR;
        ctx.fill();

        ctx.globalAlpha = 0.85 * (1 - ring) * out;
        ctx.beginPath();
        ctx.arc(cx, cross, 5 + ring * 22, 0, Math.PI * 2);
        ctx.strokeStyle = CORR;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.globalAlpha = out;
        ctx.save();
        ctx.shadowColor = CORR;
        ctx.shadowBlur = 10 + 18 * (1 - ring);
        ctx.beginPath();
        ctx.arc(cx, cross, 4.6 * grow, 0, Math.PI * 2);
        ctx.fillStyle = CORR;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    function seed(seconds) {
      var dt = 1 / 30;
      for (var i = 0; i < seconds * 30; i++) advance(dt);
    }

    resize();
    seed(W / SPEED + 2);

    if (!animate) {
      draw();
      return;
    }

    var running = true;
    var last = null;

    function frame(now) {
      if (!running) return;
      if (last === null) last = now;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      advance(dt);
      draw();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        last = null;
        requestAnimationFrame(frame);
      }
    });

    if ("IntersectionObserver" in window) {
      var vis = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !running) {
            running = true;
            last = null;
            requestAnimationFrame(frame);
          } else if (!entry.isIntersecting) {
            running = false;
          }
        });
      }, { threshold: 0 });
      vis.observe(canvas);
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        points = [];
        alerts = [];
        flashes = [];
        resize();
        seed(W / SPEED + 2);
        if (!animate) draw();
      }, 150);
    });
  }

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    var revealTargets = document.querySelectorAll(
      ".section-head, .layer-card, .module-card, .team-card, .timeline-item"
    );

    revealTargets.forEach(function (el) {
      el.classList.add("reveal");
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---- "Why now?" floating note -------------------------------------------
  // The answer types itself out, which is the whole point of the format: it
  // reads as something being told to you rather than another block of copy.
  // The full sentence also sits in the DOM for screen readers from the start,
  // so nobody has to wait for an animation to read it.
  function initWhyNow() {
    var root = document.getElementById("whynow");
    var fab = document.getElementById("whynowFab");
    var panel = document.getElementById("whynowPanel");
    var closeBtn = document.getElementById("whynowClose");
    var target = document.getElementById("whynowText");
    var teaser = document.getElementById("whynowTeaser");
    if (!root || !fab || !panel || !target) return;

    var full = panel.querySelector(".whynow-sr").textContent.trim();
    var timer = null;
    var typed = false;

    function type() {
      if (prefersReducedMotion) {
        target.textContent = full;
        return;
      }
      var i = 0;
      root.classList.add("is-typing");
      timer = setInterval(function () {
        // a few characters per tick keeps a long paragraph from dragging
        i = Math.min(i + 2, full.length);
        target.textContent = full.slice(0, i);
        if (i >= full.length) {
          clearInterval(timer);
          timer = null;
          root.classList.remove("is-typing");
        }
      }, 18);
    }

    function open() {
      panel.hidden = false;
      root.classList.add("is-open");
      root.classList.remove("is-hinting");
      fab.setAttribute("aria-expanded", "true");
      if (!typed) {
        typed = true;
        type();
      }
      closeBtn.focus();
    }

    function close() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        target.textContent = full;
        root.classList.remove("is-typing");
      }
      panel.hidden = true;
      root.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }

    fab.addEventListener("click", function () {
      if (root.classList.contains("is-open")) {
        close();
      } else {
        open();
      }
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && root.classList.contains("is-open")) close();
    });

    // show the label once shortly after load, so the circle is not a mystery
    if (teaser && !prefersReducedMotion) {
      setTimeout(function () {
        if (root.classList.contains("is-open")) return;
        root.classList.add("is-hinting");
        setTimeout(function () {
          root.classList.remove("is-hinting");
        }, 5000);
      }, 2500);
    }
  }

  initWhyNow();

  runCorrelationViz(!prefersReducedMotion);

  if (prefersReducedMotion) return;

  if ("IntersectionObserver" in window) {
    var strip = document.querySelector(".signal-strip");
    if (strip) {
      var stripObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              stripObserver.unobserve(entry.target);
              runSignalStrip();
            }
          });
        },
        { threshold: 0.4 }
      );
      stripObserver.observe(strip);
    }
  } else {
    runSignalStrip();
  }
})();
