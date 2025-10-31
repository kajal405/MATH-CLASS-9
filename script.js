/* script.js - theme switcher, collapsibles, reveal on scroll, search, quiz autograde, progress save */

(() => {
  // ========== THEME SWITCHER ==========
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('mm_theme') || 'colorful';
  applyTheme(savedTheme);

  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-theme');
      applyTheme(t);
      localStorage.setItem('mm_theme', t);
    });
  });

  function applyTheme(name) {
    root.classList.remove('theme-colorful','theme-professional','theme-dark');
    if (name === 'colorful') root.classList.add('theme-colorful');
    if (name === 'professional') root.classList.add('theme-professional');
    if (name === 'dark') root.classList.add('theme-dark');
  }

  // ========== COLLAPSIBLE CHAPTERS ==========
  document.querySelectorAll('.chapter').forEach(section => {
    const header = section.querySelector('.chapter-header');
    const expanded = header.getAttribute('aria-expanded') === 'true';
    if (!expanded) section.setAttribute('aria-hidden','true');
    header.addEventListener('click', () => toggle(section, header));
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(section, header); }
    });
  });

  function toggle(section, header) {
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!isExpanded));
    if (isExpanded) section.setAttribute('aria-hidden','true');
    else section.removeAttribute('aria-hidden');
  }

  // ========== REVEAL ON SCROLL ==========
  const observer = new IntersectionObserver(entries => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        ent.target.classList.add('visible');
        observer.unobserve(ent.target);
      }
    });
  }, {threshold: 0.12});
  document.querySelectorAll('.animate').forEach(el => observer.observe(el));

  // ========== SMOOTH SCROLL for TOC links ==========
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
  });

  // ========== SEARCH (simple keyword search over data-keywords + headings) ==========
  const search = document.getElementById('searchInput');
  search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      document.querySelectorAll('.chapter').forEach(c => c.style.display = '');
      return;
    }
    document.querySelectorAll('.chapter').forEach(c => {
      const text = (c.getAttribute('data-keywords') || '') + ' ' + (c.textContent || '');
      const visible = text.toLowerCase().includes(q);
      c.style.display = visible ? '' : 'none';
    });
  });

  // ========== QUIZ AUTOGRADER & MODEL ANSWERS ==========
  // Model answers: short canonical forms (for auto-check)
  const modelAnswers = {
    sets: ["a set is a well-defined collection of distinct objects", "3", "(a ∪ b)' = a' ∩ b'", "5", "{a}"],
    taxation: ["taxation is system by which government collects money", "gst", "equity is fairness", "direct tax is paid by the person on whom it is imposed", "tax payable = taxable income × tax rate"],
    geometry: ["a² + b² = c²", "110° and 70°", "equilateral isosceles scalene", "πr²", "5"],
    realnumbers: ["irrational", "1/3", "surd is an irrational root like √3", "0.125", "rational"],
    algebra: ["x² + 6x + 9", "(x-3)(x+3)", "a coefficient multiplies a variable", "3x² + 2x + 1", "(x-y)(x² + xy + y²)"],
    mensuration: ["πr²h", "d1 × d2 / 2", "6a²", "0.02", "πrl"],
    trigonometry: ["opp/hyp", "1", "sec", "5", "surveying"],
    statistics: ["mean is sum of observations divided by n", "take average of two middle values", "bimodal", "survey", "6"],
    probability: ["1/2", "1/6", "sample space", "subset", "practice regularly"],
    lineareq: ["4", "ax + by = c", "substitution", "slope (m)", "substitute and check"]
  };

  // helpers
  function normalize(s) {
    if (!s) return "";
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // grading function: keyword + numeric tolerant checks
  function gradeChapter(chapter, form) {
    const model = modelAnswers[chapter] || [];
    const inputs = Array.from(form.querySelectorAll('input[name]'));
    let score = 0;
    const details = [];
    inputs.forEach((input, i) => {
      const user = normalize(input.value);
      const mod = normalize(model[i] || "");
      let ok = false;
      if (!user) ok = false;
      else if (mod === "") ok = false;
      else {
        // numeric-ish
        if (/^[0-9\.\-\/]+$/.test(mod) || mod.includes('π') || mod.includes('√')) {
          if (user.includes(mod) || mod.includes(user)) ok = true;
          else {
            const un = parseFloat(user), mn = parseFloat(mod);
            if (!isNaN(un) && !isNaN(mn) && Math.abs(un - mn) < 1e-6) ok = true;
          }
        } else {
          // keyword matching: check some keywords from model appear in user answer
          const tokens = mod.split(' ').filter(t => t.length>2);
          const matches = tokens.filter(t => user.includes(t));
          if (user === mod || matches.length >= Math.max(1, Math.floor(tokens.length/2))) ok = true;
        }
      }
      if (ok) { score++; details.push({i:i+1,ok:true}); }
      else details.push({i:i+1,ok:false,user:input.value,model:model[i]||''});
    });
    return {score, total:inputs.length, details};
  }

  // attach submit & show answer events
  document.querySelectorAll('.quiz').forEach(form => {
    form.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const chapter = form.getAttribute('data-chapter');
      const resultEl = document.getElementById('result-' + chapter);
      if (!resultEl) return;

      if (action === 'show') {
        const model = modelAnswers[chapter] || [];
        resultEl.innerHTML = '<strong>Model answers:</strong><ol>' + model.map(m => `<li>${escapeHtml(m)}</li>`).join('') + '</ol>';
      } else if (action === 'submit') {
        const res = gradeChapter(chapter, form);
        resultEl.innerHTML = `Score: <strong>${res.score} / ${res.total}</strong>`;
        // save progress
        saveProgress(chapter, res);
        const wrong = res.details.filter(d => !d.ok);
        if (wrong.length) {
          const box = document.createElement('div');
          box.className = 'quiz-review';
          box.innerHTML = '<details><summary>Review incorrect answers</summary><ul>' + wrong.map(w => `<li>Q${w.i}: Your: <em>${escapeHtml(w.user)}</em> — Model: <em>${escapeHtml(w.model)}</em></li>`).join('') + '</ul></details>';
          resultEl.appendChild(box);
        } else {
          const good = document.createElement('div');
          good.className = 'quiz-good';
          good.textContent = 'Great! All answers look good or match model keywords.';
          resultEl.appendChild(good);
        }
      }
    });
  });

  // ========== SAVE/LOAD QUIZ PROGRESS (localStorage) ==========
  function saveProgress(chapter, result) {
    const key = 'mm_progress_' + chapter;
    const payload = {score: result.score, total: result.total, timestamp: Date.now()};
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch(e) {}
  }
  function loadProgress() {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('mm_progress_')) {
        const chapter = k.replace('mm_progress_','');
        const data = JSON.parse(localStorage.getItem(k));
        const el = document.getElementById('result-' + chapter);
        if (el && data) el.innerHTML = `Saved: ${data.score} / ${data.total} (on ${new Date(data.timestamp).toLocaleString()})`;
      }
    });
  }
  loadProgress();

  // Clear progress button
  const clearBtn = document.getElementById('clearProgress');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('mm_progress_')) localStorage.removeItem(k); });
    document.querySelectorAll('.quiz-result').forEach(el => el.textContent = '');
    alert('Saved quiz progress cleared.');
  });

  // ========== EXPORT / SPLIT STUBS ==========
  const exportBtn = document.getElementById('exportZip');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    alert('I can generate a downloadable ZIP of the files. Tell me "export zip" and I will prepare it for you.');
  });
  const splitBtn = document.getElementById('splitPages');
  if (splitBtn) splitBtn.addEventListener('click', () => {
    alert('I can split this single page into separate HTML files for each chapter. Tell me "split into pages" to proceed.');
  });

  // ========== Accessibility: focus first expanded header on load ==========
  document.addEventListener('DOMContentLoaded', () => {
    const first = document.querySelector('.chapter [aria-expanded="true"]');
    if (first) first.focus();
  });

})();
