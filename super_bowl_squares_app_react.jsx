const { useState, useMemo } = React;

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

function App() {
  // THE RELIABLE BRIDGE: Check both possible library names


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
  }, [teamsAssigned, rowTeam, colTeam, rowDigits, colDigits, gridOwners, buyerById, scores]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Super Bowl Squares</h1>
            <p className="text-slate-600 text-sm">$1 per square • Hard cap: 100 squares • Patriots vs Seahawks</p>
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
          {/* Sales Card */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Buy Squares</h2>
                <p className="text-slate-600 text-sm">Enter your name and quantity.</p>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-sm">Remaining</div>
                <div className="text-4xl md:text-5xl font-bold tabular-nums">{remaining}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3 border text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-tight">Sold</div>
                <div className="text-xl font-bold tabular-nums">{soldSquares} / 100</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border text-center">
                <div className="text-slate-500 text-xs uppercase font-bold tracking-tight">Pot</div>
                <div className="text-xl font-bold tabular-nums">${totalCollected}</div>
              </div>
            </div>

            <form onSubmit={addBuyer} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={first} onChange={(e) => setFirst(e.target.value)} disabled={!canBuy} className="w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100" placeholder="First" />
                <input value={last} onChange={(e) => setLast(e.target.value)} disabled={!canBuy} className="w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100" placeholder="Last" />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Quantity</label>
                  <input type="number" min={1} max={Math.max(1, remaining)} value={qty} onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))} disabled={!canBuy} className="w-full px-3 py-2 rounded-xl border bg-white disabled:bg-slate-100" />
                </div>
                <button type="submit" disabled={!canBuy} className="px-6 py-2 rounded-xl bg-slate-900 text-white shadow-sm disabled:opacity-40 font-semibold">Add</button>
              </div>
              {error ? <div className="text-xs text-red-600 text-center font-medium">{error}</div> : null}
            </form>

            <div className="mt-6 space-y-2">
              <button onClick={assignSquaresRandomly} disabled={!canAssignSquares} className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-sm disabled:opacity-40 font-bold text-sm">1) Admin: Assign Squares</button>
              <button onClick={assignTeamsAndNumbers} disabled={!canAssignTeams} className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-sm disabled:opacity-40 font-bold text-sm">2) Admin: Assign Teams</button>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Purchase History</h3>
              <div className="max-h-56 overflow-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr><th className="text-left p-2">Name</th><th className="text-center p-2">Qty</th><th className="text-right p-2">Grid</th></tr>
                  </thead>
                  <tbody>
                    {buyers.length === 0 ? <tr><td colSpan="3" className="p-4 text-center text-slate-400">No sales yet</td></tr> : 
                    buyers.map((b) => (<tr key={b.id} className="border-b last:border-0"><td className="p-2 font-medium">{b.first} {b.last}</td><td className="p-2 text-center">{b.qty}</td><td className="p-2 text-right font-bold">{b.initials}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Grid Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Squares Board</h2>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200"></span><span className="text-slate-500 font-medium">Rows: {teamsAssigned ? rowTeam : "???"}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200"></span><span className="text-slate-500 font-medium">Cols: {teamsAssigned ? colTeam : "???"}</span></div>
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto pb-4">
              <div className="inline-block border-2 border-slate-100 p-2 rounded-3xl bg-slate-50/50">
                <div className="flex">
                  <div className="w-10 h-10 md:w-12 md:h-12" />
                  {Array.from({ length: 10 }).map((_, c) => (
                    <div key={`top-${c}`} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center m-0.5 rounded-lg border bg-white shadow-sm font-bold text-indigo-600">{teamsAssigned ? colDigits[c] : "?"}</div>
                  ))}
                </div>
                {Array.from({ length: 10 }).map((_, r) => (
                  <div key={`row-${r}`} className="flex">
                    <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center m-0.5 rounded-lg border bg-white shadow-sm font-bold text-emerald-600">{teamsAssigned ? rowDigits[r] : "?"}</div>
                    {Array.from({ length: 10 }).map((_, c) => {
                      const owner = gridOwners?.[r]?.[c] ? buyerById.get(gridOwners[r][c]) : null;
                      return <div key={`cell-${r}-${c}`} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center m-0.5 rounded-lg border font-bold text-xs shadow-sm transition-all ${owner ? "bg-white text-slate-800 border-slate-200" : "bg-slate-100/50 text-slate-300 border-transparent"}`}>{owner ? owner.initials : ""}</div>;
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scoring Box */}
              <div className="bg-slate-50 rounded-2xl border p-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">Quarter Scoring (Admin)</h3>
                <div className="space-y-3">
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                    <div key={q} className="bg-white rounded-xl border p-3 shadow-sm">
                      <div className="text-xs font-bold text-slate-400 mb-2">{q} Final Scores</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-slate-400 ml-1">PATRIOTS</label><input value={scores[q].Patriots} onChange={(e) => setQuarterScore(q, "Patriots", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-sm font-bold" placeholder="0" /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 ml-1">SEAHAWKS</label><input value={scores[q].Seahawks} onChange={(e) => setQuarterScore(q, "Seahawks", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-sm font-bold" placeholder="0" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-slate-50 rounded-2xl border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Winners Summary</h3>
                  <span className="text-xs font-bold text-emerald-600 italic">Good Luck Everyone! 🍀</span>
                </div>
                <div className="space-y-3">
                  {["Q1", "Q2", "Q3", "Q4"].map((q, i) => {
                    const w = winners[i];
                    return (
                      <div key={q} className="bg-white rounded-xl border p-3 shadow-sm flex justify-between items-center">
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase">{q} Winner</div><div className="text-sm font-bold">{w ? `${w.buyer.first} ${w.buyer.last}` : "Pending..."}</div></div>
                        <div className="text-right">{w && <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{w.rowDigit} - {w.colDigit}</div>}</div>
                      </div>
                    );
                  })}
                  
                 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
