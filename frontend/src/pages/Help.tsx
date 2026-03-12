import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="w-32 shrink-0 text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-600">{children}</span>
    </div>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">How to use this site</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* What is this */}
        <Section title="What is this?">
          <p className="text-sm text-gray-600 leading-relaxed">
            A searchable archive of{" "}
            <a
              href="https://www.youtube.com/@CrackingTheCryptic"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Cracking the Cryptic
            </a>{" "}
            logic puzzle videos. Filter by rule type, difficulty, solve time, and more to find
            exactly the kind of puzzle you want to solve next.
          </p>
        </Section>

        {/* Filters */}
        <Section title="Filtering and searching">
          <div className="divide-y divide-gray-100">
            <Row label="Search">
              Type any part of a puzzle title or setter name. Results update instantly.
            </Row>
            <Row label="Rules">
              Click one or more rule tags (Arrow, Thermo, Renban…) to filter. With multiple rules
              selected, toggle <strong>All (AND)</strong> to require every rule, or{" "}
              <strong>Any (OR)</strong> to match at least one.
            </Row>
            <Row label="Difficulty">
              Easy / Medium / Hard / Brutal — estimated from solve duration and title keywords.
              Multiple difficulty levels can be selected at once.
            </Row>
            <Row label="Solve time">
              Filter to puzzles that fit your available time: ≤30 min, 30–60 min, 60–90 min, or 90+
              min.
            </Row>
            <Row label="Has puzzle link">
              Show only videos that have an associated SudokuPad link so you can solve along (or
              solve it blind before watching).
            </Row>
            <Row label="Setter">
              Filter to puzzles by a specific constructor, chosen from the dropdown at the bottom of
              the sidebar.
            </Row>
            <Row label="Watchlist only">Show only puzzles you've saved to your watchlist.</Row>
          </div>
        </Section>

        {/* Sort */}
        <Section title="Sorting">
          <p className="text-sm text-gray-600 mb-2">Use the dropdown in the header to sort by:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>
              <strong>Date</strong> — newest or oldest first
            </li>
            <li>
              <strong>Most viewed</strong> — most popular videos first
            </li>
            <li>
              <strong>Solve time</strong> — shortest or longest solves first
            </li>
            <li>
              <strong>Difficulty</strong> — easiest or hardest first
            </li>
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            The <strong>↑ / ↓</strong> button next to the dropdown flips the direction.
          </p>
        </Section>

        {/* Watch vs Solve */}
        <Section title="Watch vs. Solve">
          <div className="divide-y divide-gray-100">
            <Row label="Watch">Opens the YouTube video from the beginning.</Row>
            <Row label="Solve">
              Opens the YouTube video starting at the moment the solve begins — skipping the rules
              explanation. Only shown when a puzzle link is available.
            </Row>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Why no direct link to the puzzle grid?</strong> We deliberately route through
              YouTube rather than linking directly to SudokuPad. Cracking the Cryptic depends on
              YouTube views to sustain the channel. Even a few seconds of watch time supports them.
            </p>
          </div>
        </Section>

        {/* Personal tracking */}
        <Section title="Personal tracking">
          <p className="text-sm text-gray-600 mb-3">
            Everything is saved in your browser — no account needed, nothing is sent anywhere.
          </p>
          <div className="divide-y divide-gray-100">
            <Row label="★ Favorite">Mark puzzles you love or want to remember.</Row>
            <Row label="Save / Saved">
              Add to your watchlist — puzzles you want to solve later. Filter to just these with
              "Watchlist only" in the sidebar.
            </Row>
            <Row label="Completed">
              Mark a puzzle as solved. Use <strong>Hide completed</strong> (above the grid) to
              remove finished puzzles from view and focus on what's next.
            </Row>
          </div>
        </Section>

        {/* Random */}
        <Section title="Random puzzle">
          <p className="text-sm text-gray-600 leading-relaxed">
            Click <strong>Random</strong> in the header to pick a random puzzle from whatever
            filters are currently active. Set filters first to get a surprise within a specific
            style — for example, a random Hard Thermo puzzle.
          </p>
        </Section>

        {/* Sharing */}
        <Section title="Sharing a filtered view">
          <p className="text-sm text-gray-600 leading-relaxed">
            Every combination of filters is reflected in the URL. Copy the address bar and share it
            — whoever opens the link will see exactly the same filtered results.
          </p>
        </Section>

        {/* Stats */}
        <Section title="Stats page">
          <p className="text-sm text-gray-600 leading-relaxed">
            Click <strong>Stats</strong> in the header to see your personal dashboard: total puzzles
            completed, average solve time, completions by month, difficulty distribution, and the
            rule types you've solved most.
          </p>
        </Section>

        {/* Difficulty */}
        <Section title="How difficulty is estimated">
          <p className="text-sm text-gray-600 mb-3">
            Difficulty is a 0–10 heuristic, not a ground truth — treat it as a rough guide.
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            {[
              { label: "Easy", range: "0 – 2.9", cls: "bg-green-100 text-green-700" },
              { label: "Medium", range: "3.0 – 5.4", cls: "bg-yellow-100 text-yellow-700" },
              { label: "Hard", range: "5.5 – 7.4", cls: "bg-orange-100 text-orange-700" },
              { label: "Brutal", range: "7.5 – 10", cls: "bg-red-100 text-red-700" },
            ].map(({ label, range, cls }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                  {label}
                </span>
                <span className="text-gray-500">{range}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            Primary signal: solve duration (video length minus puzzle-start timestamp from YouTube
            chapters). Title keywords like "brutal" or "easy" shift the score ±2 points.
          </p>
        </Section>

        {/* Feedback */}
        <Section title="Feedback">
          <p className="text-sm text-gray-600 leading-relaxed">
            Missing a puzzle? Wrong rule tag? Found a bug? Use the{" "}
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSd8dru84uSsy8eMWLn2Jz44mhbOxp6cn3lAVyO1f_kq4kwrrA/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Feedback form
            </a>{" "}
            to let us know.
          </p>
        </Section>
      </div>
    </div>
  );
}
