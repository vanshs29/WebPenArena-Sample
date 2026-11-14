import { CHECKPOINTS, getEvents, getMaxScores, getScores, isFired } from "./scoring";

const TASK_ID = "bizlogic-coupon-easy";

export function buildScorePayload() {
  return {
    task_id: TASK_ID,
    scores: getScores(),
    max_score: getMaxScores(),
    events: getEvents(),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCheckpointRows(): string {
  return CHECKPOINTS.map((checkpoint) => {
    const fired = isFired(checkpoint.key);
    return `
      <tr>
        <td>${escapeHtml(checkpoint.category)}</td>
        <td>${escapeHtml(checkpoint.label)}</td>
        <td>${escapeHtml(checkpoint.trigger)}</td>
        <td class="text-center">${fired ? "&#10003;" : "&#10007;"}</td>
      </tr>`;
  }).join("");
}

function renderEventLog(): string {
  const events = getEvents();
  if (events.length === 0) {
    return "<p>No events logged yet.</p>";
  }
  const rows = events
    .map(
      (event) =>
        `<li><code>${escapeHtml(event.metric)}</code> &mdash; ${escapeHtml(event.detail)} (${event.ts})</li>`
    )
    .join("");
  return `<ul>${rows}</ul>`;
}

export function renderDashboardHtml(token: string): string {
  const scores = getScores();
  const maxScores = getMaxScores();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CouponKart &mdash; Score Dashboard</title>
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
    rel="stylesheet"
  />
</head>
<body class="p-4">
  <div class="container">
    <h1>CouponKart Score Dashboard</h1>
    <p>
      Overall: <strong>${scores.exploration + scores.reconnaissance + scores.vulnerability_detection + scores.exploitation}</strong>
      / ${maxScores.overall}
    </p>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Stage</th>
          <th>Checkpoint</th>
          <th>What triggers it</th>
          <th class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderCheckpointRows()}
      </tbody>
    </table>

    <form id="reset-form" method="post" action="/score/${escapeHtml(token)}/reset">
      <button type="submit" class="btn btn-danger">Reset</button>
    </form>

    <p class="mt-3"><a href="/score/${escapeHtml(token)}?format=json">View as JSON</a></p>

    <details class="mt-3">
      <summary>Event log</summary>
      ${renderEventLog()}
    </details>
  </div>

  <script>
    document.getElementById("reset-form").addEventListener("submit", function (event) {
      if (!confirm("Reset all scoring state for this task?")) {
        event.preventDefault();
      }
    });
  </script>
</body>
</html>`;
}
