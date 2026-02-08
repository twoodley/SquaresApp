import React, { useMemo, useState } from "react";

// Super Bowl Squares: Patriots vs Seahawks
// - Buyers enter first/last name + quantity (max total 100)
// - Admin assigns squares randomly once 100 sold
// - Then admin assigns teams to rows/cols randomly + random 0-9 digits on each axis
// - Admin can enter Q1–Q4 scores; app determines quarter winner by last digit

const TEAMS = ["New England Patriots", "Seattle Seahawks"];
const GRID_SIZE = 10;
const MAX_SQUARES = 100;

function makeInitials(first, last) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  return `${(f[0] || "?").toUpperCase()}${(l[0] || "?").toUpperCase()}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function lastDigit(score) {
  if (score === "" || score === null || score === undefined) return null;
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.abs(Math.trunc(n)) % 10;
}

function emptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

export default function App() {
  // Purchases
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [qty, setQty] = useState(1);
  const [buyers, setBuyers] = useState([]); // {id, first, last, qty, initials}
  const [error, setError] = useState("");

  // Squares assignment
  const [assigned, setAssigned] = useState(false);
  const [gridOwners, setGridOwners] = useState(emptyGrid()); // stores buyerId

  // Teams + numbers assignment
  const [teamsAssigned, setTeamsAssigned] = useState(false);
  const [rowTeam, setRowTeam] = useState(null);
  const [colTeam, setColTeam] = useState(null);
  const [rowDigits, setRowDigits] = useState([]); // perm of 0-9
  const [colDigits, setColDigits] = useState([]); // perm of 0-9

  // Quarter scores + winners
  const [scores, setScores] = useState({
    Q1: { Patriots: "", Seahawks: "" },
    Q2: { Patriots: "", Seahawks: "" },
    Q3: { Patriots: "", Seahawks: "" },
    Q4: { Patriots: "", Seahawks: "" },
  });

  const soldSquares = useMemo(() => buyers.reduce((s, b) => s + Number(b.qty || 0), 0), [buyers]);
  const remaining = MAX_SQUARES - soldSquares;
  const totalCollected = soldSquares; // $1 per square

  const buyerById = useMemo(() => {
    const m = new Map();
    for (const b of buyers) m.set(b.id, b);
    return m;
  }, [buyers]);

  const canBuy = !assigned && remaining > 0;
  const canAssignSquares = !assigned && soldSquares === MAX_SQUARES;
  const canAssignTeams = assigned && !teamsAssigned;

  function addBuyer(e) {
    e.preventDefault();
    setError("");
    if (!canBuy) return;

    const f = first.trim();
    const l = last.trim();
    const q = Number(qty);

    if (!f || !l) {
      setError("Please enter both first and last name.");
      return;
    }
    if (!Number.isInteger(q) || q < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (q > remaining) {
      setError(`Only ${remaining} squares left. Reduce quantity.`);
      return;
    }

    const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const buyer = { id, first: f, last: l, qty: q, initials: makeInitials(f, l) };
    setBuyers((prev) => [...prev, buyer]);
    setFirst("");
    setLast("");
    setQty(1);
  }

  function resetAll() {
    setBuyers([]);
    setAssigned(false);
    setGridOwners(emptyGrid());
    setTeamsAssigned(false);
    setRowTeam(null);
    setColTeam(null);
    setRowDigits([]);
    setColDigits([]);
    setScores({
      Q1: { Patriots: "", Seahawks: "" },
      Q2: { Patriots: "", Seahawks: "" },
      Q3: { Patriots: "", Seahawks: "" },
      Q4: { Patriots: "", Seahawks: "" },
    });
    setError("");
  }

  function assignSquaresRandomly() {
    if (!canAssignSquares) return;

    // Build a 100-length list of buyerIds repeated by qty, shuffle, then fill 10x10.
    const pool = [];
    for (const b of buyers) {
      for (let i = 0; i < b.qty; i++) pool.push(b.id);
    }
    if (pool.length !== MAX_SQUARES) {
      setError("You must sell exactly 100 squares before assigning.");
      return;
    }

    const shuffled = shuffle(pool);
    const next = emptyGrid();
    let k = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        next[r][c] = shuffled[k++];
      }
    }
    setGridOwners(next);
    setAssigned(true);
    setError("");
  }

  function assignTeamsAndNumbers() {
    if (!canAssignTeams) return;

    const [t1, t2] = shuffle(TEAMS);
    setRowTeam(t1);
    setColTeam(t2);

    setRowDigits(shuffle([...Array(10)].map((_, i) => i)));
    setColDigits(shuffle([...Array(10)].map((_, i) => i)));

    setTeamsAssigned(true);
  }

  function setQuarterScore(q, teamKey, value) {
    setScores((prev) => ({
      ...prev,
      [q]: { ...prev[q], [teamKey]: value },
    }));
  }

  function winnerForQuarter(q) {
    if (!teamsAssigned) return null;

    const pats = lastDigit(scores[q].Patriots);
    const hawks = lastDigit(scores[q].Seahawks);
    if (pats === null || hawks === null) return null;

    const rowTeamIsPats = rowTeam === TEAMS[0];
    const rowScoreDigit = rowTeamIsPats ? pats : hawks;
    const colScoreDigit = rowTeamIsPats ? hawks : pats;

    const r = rowDigits.indexOf(rowScoreDigit);
    const c = colDigits.indexOf(colScoreDigit);
    if (r < 0 || c < 0) return null;

    const buyerId = gridOwners?.[r]?.[c] ?? null;
    if (!buyerId) return null;
    const b = buyerById.get(buyerId);
    if (!b) return null;

    return {
      quarter: q,
      rowDigit: rowScoreDigit,
      colDigit: colScoreDigit,
      rowTeam,
      colTeam,
      square: { r, c },
      buyer: b,
    };
  }

  const winners = useMemo(() => {
    return ["Q1", "Q2", "Q3", "Q4"].map((q) => winnerForQuarter(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsAssigned, rowTeam, colTeam, rowDigits, colDigits, gridOwners, buyerById, scores]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Super Bowl Squares</h1>
            <p className="text-slate-600">$1 per square • Hard cap: 100 squares • Patriots vs Seahawks</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAll}
              className="px-4 py-2 rounded-2xl bg-white shadow-sm border hover:bg-slate-50"
              title="Start over (clears buyers, squares, and scores)"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Buy Squares</h2>
                <p className="text-slate-600 text-sm">Enter your name and how many squares you want.</p>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-sm">Remaining</div>
                <div className="text-4xl md:text-5xl font-bold tabular-nums">{remaining}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3 border">
                <div className="text-slate-500 text-xs">Sold</div>
                <div className="text-xl font-semibold tabular-nums">{soldSquares} / 100</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border">
                <div className="text-slate-500 text-xs">Collected</div>
                <div className="text-xl font-semibold tabular-nums">${totalCollected}</div>
              </div>
            </div>

            <form onSubmit={addBuyer} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">First name</label>
                  <input
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    disabled={!canBuy}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Last name</label>
                  <input
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    disabled={!canBuy}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100"
                    placeholder="Last"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-sm text-slate-600">Squares</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, remaining)}
                    value={qty}
                    onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={!canBuy}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100"
                  />
                  <div className="text-xs text-slate-500 mt-1">Max you can buy now: {remaining}</div>
                </div>

                <button
                  type="submit"
                  disabled={!canBuy}
                  className="px-4 py-2 rounded-2xl bg-slate-900 text-white shadow-sm disabled:opacity-40"
                >
                  Add Purchase
                </button>
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </form>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={assignSquaresRandomly}
                disabled={!canAssignSquares}
                className="px-4 py-2 rounded-2xl bg-emerald-600 text-white shadow-sm disabled:opacity-40"
                title={
                  canAssignSquares
                    ? "Randomly assign all 100 squares"
                    : "Sell all 100 squares before assigning"
                }
              >
                1) Admin: Randomly Assign Squares
              </button>

              <button
                onClick={assignTeamsAndNumbers}
                disabled={!canAssignTeams}
                className="px-4 py-2 rounded-2xl bg-indigo-600 text-white shadow-sm disabled:opacity-40"
                title={
                  canAssignTeams
                    ? "Randomly assign teams to rows/columns and generate 0–9 digits"
                    : !assigned
                    ? "Assign squares first"
                    : "Teams already assigned"
                }
              >
                2) Admin: Assign Teams + Random Numbers
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700">Purchases</h3>
              <div className="mt-2 max-h-56 overflow-auto rounded-2xl border">
                {buyers.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">No purchases yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-right p-2">Squares</th>
                        <th className="text-right p-2">Initials on grid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((b) => (
                        <tr key={b.id} className="border-t">
                          <td className="p-2">{b.first} {b.last}</td>
                          <td className="p-2 text-right tabular-nums">{b.qty}</td>
                          <td className="p-2 text-right font-semibold">{b.initials}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-2">Once squares are assigned, buying is locked.</div>
            </div>
          </div>

          {/* Board */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Squares Board</h2>
                <p className="text-slate-600 text-sm">
                  {assigned
                    ? teamsAssigned
                      ? "Teams and numbers assigned. Ready for scoring."
                      : "Squares assigned. Next: assign teams + numbers."
                    : "Board will fill after 100 squares are sold and assigned."}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Columns (Top):</span>
                  <span className="font-semibold">{teamsAssigned ? colTeam : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Rows (Left):</span>
                  <span className="font-semibold">{teamsAssigned ? rowTeam : "—"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              <div className="inline-block">
                {/* Top header */}
                <div className="flex">
                  <div className="w-12 h-12" />
                  {Array.from({ length: GRID_SIZE }).map((_, c) => (
                    <div
                      key={`top-${c}`}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border bg-slate-50 font-semibold tabular-nums"
                      title={teamsAssigned ? `${colTeam} digit` : "Digits appear after teams/numbers assigned"}
                    >
                      {teamsAssigned ? colDigits[c] : ""}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {Array.from({ length: GRID_SIZE }).map((_, r) => (
                  <div key={`row-${r}`} className="flex">
                    <div
                      className="w-12 h-12 flex items-center justify-center rounded-xl border bg-slate-50 font-semibold tabular-nums"
                      title={teamsAssigned ? `${rowTeam} digit` : "Digits appear after teams/numbers assigned"}
                    >
                      {teamsAssigned ? rowDigits[r] : ""}
                    </div>
                    {Array.from({ length: GRID_SIZE }).map((_, c) => {
                      const ownerId = gridOwners?.[r]?.[c];
                      const owner = ownerId ? buyerById.get(ownerId) : null;
                      return (
                        <div
                          key={`cell-${r}-${c}`}
                          className="w-12 h-12 flex items-center justify-center rounded-xl border font-semibold"
                          title={owner ? `${owner.first} ${owner.last} (${owner.initials})` : "Unassigned"}
                        >
                          {owner ? owner.initials : ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl border p-4">
                <h3 className="font-semibold">Quarter Scoring (Admin)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Enter final score at end of each quarter. Winner is the square matching the last digit of each team’s score.
                </p>

                <div className="mt-4 space-y-4">
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                    <div key={q} className="bg-white rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{q}</div>
                        <div className="text-xs text-slate-500">
                          {teamsAssigned ? "Digits are live" : "Assign teams + numbers first"}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-600">Patriots</label>
                          <input
                            value={scores[q].Patriots}
                            onChange={(e) => setQuarterScore(q, "Patriots", e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-xl border bg-white"
                            placeholder="e.g., 14"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Seahawks</label>
                          <input
                            value={scores[q].Seahawks}
                            onChange={(e) => setQuarterScore(q, "Seahawks", e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-xl border bg-white"
                            placeholder="e.g., 17"
                          />
                        </div>
                      </div>

                      <div className="mt-3 text-sm">
                        {(() => {
                          const w = winnerForQuarter(q);
                          if (!teamsAssigned) return <span className="text-slate-500">Winner: —</span>;
                          if (!w) return <span className="text-slate-500">Winner: — (enter valid scores)</span>;
                          return (
                            <div className="flex flex-col gap-1">
                              <div>
                                <span className="text-slate-500">Winning square:</span>{" "}
                                <span className="font-semibold">{w.rowTeam} {w.rowDigit}</span>
                                <span className="text-slate-500"> and </span>
                                <span className="font-semibold">{w.colTeam} {w.colDigit}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Winner:</span>{" "}
                                <span className="font-semibold">{w.buyer.first} {w.buyer.last}</span>
                                <span className="text-slate-500"> (shown on grid as </span>
                                <span className="font-semibold">{w.buyer.initials}</span>
                                <span className="text-slate-500">)</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border p-4">
                <h3 className="font-semibold">Winners Summary</h3>
                <p className="text-sm text-slate-600 mt-1">Quick view of each quarter winner (full name).</p>

                <div className="mt-4 space-y-3">
                  {["Q1", "Q2", "Q3", "Q4"].map((q, i) => {
                    const w = winners[i];
                    return (
                      <div key={`sum-${q}`} className="bg-white rounded-2xl border p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{q}</div>
                          <div className="text-xs text-slate-500">
                            Pats: {scores[q].Patriots || "—"} • Hawks: {scores[q].Seahawks || "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {w ? `${w.buyer.first} ${w.buyer.last}` : "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {w ? `${w.rowTeam} ${w.rowDigit} / ${w.colTeam} ${w.colDigit}` : teamsAssigned ? "Enter scores" : "Assign teams + numbers"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Note: Grid shows only initials (first + last initial). Winners display full names.
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-xs text-slate-500">
          Admin flow: sell 100 → assign squares → assign teams + digits → enter quarter scores.
        </footer>
      </div>
    </div>
  );
}
