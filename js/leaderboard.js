/**
 * Chungee – Thapathali Edition
 * Leaderboard (localStorage-based)
 */

const KEY = 'chungee_scores';

function getScores() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch (e) {
    console.error('chungee: getScores failed', e);
    return [];
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(filter) {
  const list = document.getElementById('lb-list');
  if (!list) return;

  let scores = getScores();
  if (filter && filter !== 'all') {
    scores = scores.filter(s => s.mode && s.mode.toLowerCase() === filter);
  }

  if (scores.length === 0) {
    list.innerHTML = '<div class="empty-lb">No scores yet. <a href="game.html" style="color:var(--primary)">Play a game</a> to appear here! 🏆</div>';
    return;
  }

  list.innerHTML = scores.slice(0, 20).map((entry, i) => {
    const rankClass = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'other';
    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    return `
      <div class="lb-entry">
        <div class="lb-rank ${rankClass}">${rankEmoji}</div>
        <div class="lb-info">
          <div class="lb-player">${escapeHtml(entry.name || 'Unknown')}</div>
          <div class="lb-meta">${escapeHtml(entry.mode || 'Classic')} · ${escapeHtml(entry.date || '')}</div>
        </div>
        <div class="lb-score">
          ${Number(entry.score) || 0}
          <div class="lb-combo">x${Number(entry.combo) || 0} combo · ${Number(entry.kicks) || 0} kicks</div>
        </div>
      </div>
    `;
  }).join('');
}

// Tab switching
document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    render(tab.dataset.mode);
  });
});

// Clear button
const clearBtn = document.getElementById('btn-clear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear all scores? This cannot be undone.')) {
      try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
      render('all');
    }
  });
}

render('all');
