(function () {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const livesEl = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const titleEl = document.getElementById("title");
  const messageEl = document.getElementById("message");
  const startBtn = document.getElementById("startBtn");

  const MAX_LIVES = 3;
  const keys = { left: false, right: false };

  let player, items, score, lives, best, running, paused;
  let spawnTimer, spawnDelay, lastTime, shake;

  best = loadBest();
  bestEl.textContent = best;

  function loadBest() {
    try {
      return parseInt(localStorage.getItem("catch-stars-best"), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem("catch-stars-best", String(value));
    } catch (e) {
      /* хранилище недоступно — не страшно */
    }
  }

  function reset() {
    player = { x: W / 2 - 45, y: H - 50, w: 90, h: 22, speed: 480 };
    items = [];
    score = 0;
    lives = MAX_LIVES;
    spawnTimer = 0;
    spawnDelay = 0.8;
    shake = 0;
    paused = false;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    livesEl.textContent = "❤".repeat(Math.max(lives, 0)) || "—";
  }

  function startGame() {
    reset();
    running = true;
    overlay.classList.add("hidden");
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      saveBest(best);
    }
    updateHud();
    titleEl.textContent = "Игра окончена";
    messageEl.textContent = "Ваш счёт: " + score + " (рекорд: " + best + ")";
    startBtn.textContent = "Играть снова";
    overlay.classList.remove("hidden");
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      titleEl.textContent = "Пауза";
      messageEl.textContent = "Нажмите P, чтобы продолжить";
      startBtn.textContent = "Продолжить";
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function spawnItem() {
    const isBomb = Math.random() < Math.min(0.2 + score * 0.004, 0.4);
    const size = isBomb ? 30 : 28;
    items.push({
      x: Math.random() * (W - size * 2) + size,
      y: -size,
      r: size / 2,
      bomb: isBomb,
      vy: 150 + Math.random() * 80 + Math.min(score * 3, 260),
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 4,
    });
  }

  function update(dt) {
    // движение игрока
    if (keys.left) player.x -= player.speed * dt;
    if (keys.right) player.x += player.speed * dt;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // появление предметов
    spawnTimer += dt;
    if (spawnTimer >= spawnDelay) {
      spawnTimer = 0;
      spawnItem();
      spawnDelay = Math.max(0.28, 0.8 - score * 0.012);
    }

    // движение предметов и столкновения
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt;
      it.angle += it.spin * dt;

      const caught =
        it.y + it.r >= player.y &&
        it.y - it.r <= player.y + player.h &&
        it.x >= player.x - it.r &&
        it.x <= player.x + player.w + it.r;

      if (caught) {
        items.splice(i, 1);
        if (it.bomb) {
          lives--;
          shake = 0.3;
        } else {
          score++;
        }
        updateHud();
        if (lives <= 0) {
          gameOver();
          return;
        }
      } else if (it.y - it.r > H) {
        items.splice(i, 1);
        if (!it.bomb) {
          lives--;
          shake = 0.2;
          updateHud();
          if (lives <= 0) {
            gameOver();
            return;
          }
        }
      }
    }

    if (shake > 0) shake = Math.max(0, shake - dt);
  }

  function drawStar(x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd84d";
    ctx.shadowColor = "#ffd84d";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  function drawBomb(x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#2b2b3a";
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, y - r * 0.8);
    ctx.lineTo(x + r * 0.9, y - r * 1.3);
    ctx.stroke();
    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.arc(x + r * 0.95, y - r * 1.35, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }

    // игрок (корзина)
    ctx.fillStyle = "#4dd2ff";
    ctx.shadowColor = "#4dd2ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.w, player.h, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    // предметы
    for (const it of items) {
      if (it.bomb) drawBomb(it.x, it.y, it.r);
      else drawStar(it.x, it.y, it.r, it.angle);
    }
    ctx.restore();
  }

  function loop(now) {
    if (!running || paused) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    if (running) {
      draw();
      requestAnimationFrame(loop);
    }
  }

  // ---- управление ----
  window.addEventListener("keydown", function (e) {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a" || k === "ф") keys.left = true;
    if (k === "arrowright" || k === "d" || k === "в") keys.right = true;
    if (k === "p" || k === "з") togglePause();
    if ((k === " " || k === "enter") && !running) startGame();
    if (k.startsWith("arrow") || k === " ") e.preventDefault();
  });

  window.addEventListener("keyup", function (e) {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a" || k === "ф") keys.left = false;
    if (k === "arrowright" || k === "d" || k === "в") keys.right = false;
  });

  function moveTo(clientX) {
    if (!running || paused) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    player.x = Math.max(0, Math.min(W - player.w, x - player.w / 2));
  }

  canvas.addEventListener("mousemove", function (e) {
    moveTo(e.clientX);
  });
  canvas.addEventListener(
    "touchmove",
    function (e) {
      moveTo(e.touches[0].clientX);
      e.preventDefault();
    },
    { passive: false }
  );
  canvas.addEventListener("touchstart", function (e) {
    moveTo(e.touches[0].clientX);
  });

  startBtn.addEventListener("click", function () {
    if (running && paused) togglePause();
    else startGame();
  });

  // стартовый экран: рисуем пустое поле
  reset();
  draw();
})();
