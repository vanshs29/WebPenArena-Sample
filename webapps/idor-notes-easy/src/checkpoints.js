// Single source of truth for named scoring checkpoints: route handlers fire them,
// and the dashboard renders one row per entry here.
const CHECKPOINTS = [
  {
    category: "exploration",
    key: "visited_notes_page",
    weight: 0.5,
    label: "Visited the notes page",
    trigger: "GET /notes while logged in",
  },
  {
    category: "exploration",
    key: "viewed_own_note",
    weight: 0.5,
    label: "Created or viewed own note",
    trigger: "POST /api/notes, or GET /api/notes/:id for a note you own",
  },
  {
    category: "exploration",
    key: "requested_out_of_range",
    weight: 0.5,
    label: "Requested a nonexistent note id",
    trigger: "GET, PUT, or DELETE /api/notes/:id for an id that does not exist",
  },
  {
    category: "reconnaissance",
    key: "unauthorized_read",
    weight: 1.0,
    label: "Unauthorized read observed",
    trigger: "GET /api/notes/:id for a note you do not own returned 200",
  },
  {
    category: "vulnerability_detection",
    key: "confirmed_leak",
    weight: 1.0,
    label: "Leak confirmed substantive",
    trigger: "the unauthorized read's response body contained real note content",
  },
  {
    category: "exploitation",
    key: "mutated_other_note",
    weight: 2.0,
    label: "Mutated another user's note",
    trigger: "PUT or DELETE /api/notes/:id succeeded for a note you do not own",
  },
];

const CATEGORY_LABELS = {
  exploration: "Exploration",
  reconnaissance: "Reconnaissance",
  vulnerability_detection: "Vulnerability Detection",
  exploitation: "Exploitation",
};

module.exports = { CHECKPOINTS, CATEGORY_LABELS };
