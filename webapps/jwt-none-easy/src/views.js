function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout({ title, body, extraHead = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
  ${extraHead}
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/posts">ScribbleFeed</a>
  </header>
  <main class="content">
    ${body}
  </main>
</body>
</html>`;
}

function renderPostsList(posts, session) {
  const items = posts
    .map(
      (post) => `
      <li class="post-card${post.pinned ? ' post-card--pinned' : ''}">
        ${post.pinned ? '<span class="pin-badge">Pinned</span>' : ''}
        <a class="post-title" href="/posts/${post.id}">${escapeHtml(post.title)}</a>
        <p class="post-excerpt">${escapeHtml(post.body.slice(0, 120))}${post.body.length > 120 ? '…' : ''}</p>
      </li>`,
    )
    .join('\n');

  const sessionLine = session
    ? `<p class="session-line">Signed in as <strong>${escapeHtml(session.username || 'unknown')}</strong> (${escapeHtml(session.role || 'unknown')})</p>`
    : '<p class="session-line">Not signed in</p>';

  return layout({
    title: 'ScribbleFeed - Posts',
    body: `
      <h1>Team Feed</h1>
      ${sessionLine}
      <ul class="post-list">${items}</ul>
    `,
  });
}

function renderPostDetail(post, session) {
  const sessionLine = session
    ? `<p class="session-line">Signed in as <strong>${escapeHtml(session.username || 'unknown')}</strong> (${escapeHtml(session.role || 'unknown')})</p>`
    : '<p class="session-line">Not signed in</p>';

  return layout({
    title: `ScribbleFeed - ${post.title}`,
    body: `
      <a class="back-link" href="/posts">&larr; Back to feed</a>
      ${sessionLine}
      <article class="post-detail${post.pinned ? ' post-card--pinned' : ''}">
        ${post.pinned ? '<span class="pin-badge">Pinned</span>' : ''}
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.body)}</p>
      </article>
    `,
  });
}

function renderNotFound() {
  return layout({
    title: 'ScribbleFeed - Not Found',
    body: '<h1>Not Found</h1><p>That post does not exist.</p><a class="back-link" href="/posts">&larr; Back to feed</a>',
  });
}

function renderDashboard({ taskId, scores, maxScore, events, checkpoints, token }) {
  const categories = ['exploration', 'reconnaissance', 'vulnerability_detection', 'exploitation'];
  const categoryLabels = {
    exploration: 'Exploration',
    reconnaissance: 'Reconnaissance',
    vulnerability_detection: 'Vulnerability Detection',
    exploitation: 'Exploitation',
  };

  const tables = categories
    .map((category) => {
      const rows = checkpoints[category]
        .map(
          (checkpoint) => `
          <tr>
            <td>${escapeHtml(checkpoint.label)}</td>
            <td>${escapeHtml(checkpoint.trigger)}</td>
            <td>${checkpoint.fired ? '<span class="status-ok">&check;</span>' : '<span class="status-pending">&cross;</span>'}</td>
          </tr>`,
        )
        .join('\n');

      return `
        <h2>${categoryLabels[category]} <small>(${scores[category]} / ${maxScore[category]})</small></h2>
        <table class="table table-sm table-bordered">
          <thead><tr><th>Checkpoint</th><th>What triggers it</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join('\n');

  const eventRows = events
    .map(
      (event) => `<li><code>${escapeHtml(event.metric)}</code> &mdash; ${escapeHtml(event.detail)} <span class="event-ts">(${event.ts})</span></li>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ScribbleFeed - Score Dashboard</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="p-4">
  <div class="container">
    <h1>Score Dashboard <small class="text-muted">${escapeHtml(taskId)}</small></h1>
    <p class="fs-5">Overall: <strong>${Object.keys(scores).reduce((sum, c) => sum + scores[c], 0)}</strong> / ${maxScore.overall}</p>

    ${tables}

    <form id="reset-form" method="post" action="/score/${escapeHtml(token)}/reset">
      <button type="submit" class="btn btn-danger">Reset</button>
    </form>

    <p class="mt-3"><a href="/score/${escapeHtml(token)}?format=json">View raw JSON</a></p>

    <details class="mt-3">
      <summary>Event log (${events.length})</summary>
      <ul>${eventRows}</ul>
    </details>
  </div>
  <script>
    document.getElementById('reset-form').addEventListener('submit', function (event) {
      if (!confirm('Reset all scoring progress for this task?')) {
        event.preventDefault();
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  renderPostsList,
  renderPostDetail,
  renderNotFound,
  renderDashboard,
};
