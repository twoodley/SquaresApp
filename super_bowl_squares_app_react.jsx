const { useState, useMemo } = React;
const { QRCodeCanvas } = qrcode;

// Super Bowl Squares: Patriots vs Seahawks
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
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [qty, setQty] = useState(1);
  const [buyers, setBuyers] = useState([]);
  const [error, setError] = useState("");
  const [assigned, setAssigned] = useState(false);
  const [gridOwners, setGridOwners] = useState(emptyGrid());
  const [teamsAssigned, setTeamsAssigned] = useState(false);
  const [rowTeam, setRowTeam] = useState(null);
  const [colTeam, setColTeam] = useState(null);
  const [rowDigits, setRowDigits] = useState([]);
  const [colDigits, setColDigits] = useState([]);
  const [scores, setScores] = useState({
    Q1: { Patriots: "", Seahawks: "" },
    Q2: { Patriots: "", Seahawks: "" },
    Q3: { Patriots: "", Seahawks: "" },
    Q4: { Patriots: "", Seahawks: "" },
  });

  const soldSquares = useMemo(() => buyers.reduce((s, b) => s + Number(b.qty || 0), 0), [buyers]);
  const remaining = MAX_SQUARES - soldSquares;
  const totalCollected = soldSquares;

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
    if (!f || !l) { setError("Please enter names."); return; }
    if (q > remaining) { setError(`Only ${remaining} left.`); return; }
    const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const buyer = { id, first: f, last: l, qty: q, initials: makeInitials(f, l) };
    setBuyers((prev) => [...prev, buyer]);
    setFirst(""); setLast(""); setQty(1);
  }

  function resetAll() {
    setBuyers([]); setAssigned(false); setGridOwners(emptyGrid());
    setTeamsAssigned(false); setRowTeam(null); setColTeam(null);
    setRowDigits([]); setColDigits([]);
    setScores({
      Q1: { Patriots: "", Seahawks: "" }, Q2: { Patriots: "", Seahawks: "" },
      Q3: { Patriots: "", Seahawks: "" }, Q4: { Patriots: "", Seahawks: "" },
    });
    setError("");
  }

  function assignSquaresRandomly() {
    if (!canAssignSquares) return;
    const pool = [];
    for (const b of buyers) { for (let i = 0; i < b.qty; i++) pool.push(b.id); }
    const shuffled = shuffle(pool);
    const next = emptyGrid();
    let k = 0;
    for (let r = 0; r < GRID_SIZE; r++) { for (let c = 0; c < GRID_SIZE; c++) { next[r][c] = shuffled[k++]; } }
    setGridOwners(next); setAssigned(true);
  }

  function assignTeamsAndNumbers() {
    if (!canAssignTeams) return;
    const [t1, t2] = shuffle(TEAMS);
    setRowTeam(t1); setColTeam(t2);
    setRowDigits(shuffle([...Array(10)].map((_, i) => i)));
    setColDigits(shuffle([...Array(10)].map((_, i) => i)));
    setTeamsAssigned(true);
  }

  function setQuarterScore(q, teamKey, value) {
    setScores((prev) => ({ ...prev, [q]: { ...prev[q], [teamKey]: value } }));
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
    const buyerId = gridOwners?.[r]?.[c];
    return buyerId ? { buyer: buyerById.get(buyerId) } : null;
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
            <p className="text-slate-600">Patriots vs Seahawks • $1 per square</p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 rounded-2xl bg-white border">Reset</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buying Section */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h2 className="text-lg font-semibold">Buy Squares ({remaining} left)</h2>
            <form onSubmit={addBuyer} className="mt-4 space-y-3">
              <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First" className="w-full border p-2 rounded-xl" />
              <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last" className="w-full border p-2 rounded-xl" />
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full border p-2 rounded-xl" />
              <button type="submit" className="w-full bg-slate-900 text-white p-2 rounded-xl">Add Purchase</button>
            </form>
            <div className="mt-4 space-y-2">
              <button onClick={assignSquaresRandomly} disabled={!canAssignSquares} className="w-full bg-emerald-600 text-white p-2 rounded-xl disabled:opacity-40">1) Assign Squares</button>
              <button onClick={assignTeamsAndNumbers} disabled={!canAssignTeams} className="w-full bg-indigo-600 text-white p-2 rounded-xl disabled:opacity-40">2) Assign Teams</button>
            </div>
          </div>

          {/* Grid Board */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-5 overflow-auto">
            <div className="inline-block">
              <div className="flex">
                <div className="w-12 h-12" />
                {Array.from({ length: 10 }).map((_, c) => (
                  <div key={c} className="w-12 h-12 flex items-center justify-center border bg-slate-50 font-semibold">{teamsAssigned ? colDigits[c] : ""}</div>
                ))}
              </div>
              {Array.from({ length: 10 }).map((_, r) => (
                <div key={r} className="flex">
                  <div className="w-12 h-12 flex items-center justify-center border bg-slate-50 font-semibold">{teamsAssigned ? rowDigits[r] : ""}</div>
                  {Array.from({ length: 10 }).map((_, c) => {
                    const owner = gridOwners?.[r]?.[c] ? buyerById.get(gridOwners[r][c]) : null;
                    return <div key={c} className="w-12 h-12 flex items-center justify-center border font-semibold">{owner ? owner.initials : ""}</div>;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scoring and Winners Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-2xl border p-4">
            <h3 className="font-semibold mb-4">Quarter Scoring</h3>
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <div key={q} className="bg-white rounded-2xl border p-3 mb-3">
                <div className="font-semibold">{q}</div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input value={scores[q].Patriots} onChange={(e) => setQuarterScore(q, "Patriots", e.target.value)} placeholder="Pats" className="border p-2 rounded-xl" />
                  <input value={scores[q].Seahawks} onChange={(e) => setQuarterScore(q, "Seahawks", e.target.value)} placeholder="Hawks" className="border p-2 rounded-xl" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-2xl border p-4">
            <h3 className="font-semibold mb-4">Winners Summary</h3>
            <div className="space-y-3">
              {["Q1", "Q2", "Q3", "Q4"].map((q, i) => {
                const w = winners[i];
                return (
                  <div key={q} className="bg-white rounded-2xl border p-3 flex justify-between items-center">
                    <span className="font-semibold">{q}</span>
                    <span className="font-bold">{w ? `${w.buyer.first} ${w.buyer.last}` : "—"}</span>
                  </div>
                );
              })}
              
              {/* --- QR CODE OUTSIDE THE LOOP --- */}
              <div className="mt-6 flex flex-col items-center border-t pt-6">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Scan for Live Board 📱</p>
                <div className="bg-white p-2 rounded-xl shadow-sm border">
                  <QRCodeCanvas 
                    value="https://twoodley.github.io/SquaresApp/" 
                    size={128}
                    level={"H"} 
                  />
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
