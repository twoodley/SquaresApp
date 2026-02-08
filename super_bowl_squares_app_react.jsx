const { useState, useMemo } = React;

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
    if (!f || !l) { setError("Please enter both first and last name."); return; }
    if (q > remaining) { setError(`Only ${remaining} squares left.`); return; }
    const id = Date.now() + Math.random().toString();
    const buyer = { id, first: f, last: l, qty: q, initials: makeInitials(f, l) };
    setBuyers((prev) => [...prev, buyer]);
    setFirst(""); setLast(""); setQty(1);
  }

  function resetAll() {
    setBuyers([]); setAssigned(false); setGridOwners(emptyGrid());
    setTeamsAssigned(false); setRowTeam(null); setColTeam(null);
    setRowDigits([]); setColDigits([]);
    setScores({ Q1: { Patriots: "", Seahawks: "" }, Q2: { Patriots: "", Seahawks: "" }, Q3: { Patriots: "", Seahawks: "" }, Q4: { Patriots: "", Seahawks: "" } });
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
    setScores((prev) => ({ ...prev, [q]: { ...prev[q], [teamKey]: value }, }));
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
    const b = buyerById.get(buyerId);
    return b ? { quarter: q, buyer: b, rowTeam, colTeam, rowDigit: rowScoreDigit, colDigit: colScoreDigit } : null;
  }

  const winners = useMemo(() => {
    return ["Q1", "Q2", "Q3", "Q4"].map((q) => winnerForQuarter(q));
  }, [teamsAssigned, rowTeam, colTeam, rowDigits, colDigits, gridOwners, buyerById, scores]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Super Bowl Squares</h1>
            <p className="text-slate-600">Patriots vs Seahawks • $1 per square</p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 rounded-xl bg-white shadow-sm border hover:bg-slate-50">Reset Game</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h2 className="text-lg font-bold mb-4">Buy Squares ({remaining} left)</h2>
            <form onSubmit={addBuyer} className="space-y-3">
              <input placeholder="First" value={first} onChange={e => setFirst(e.target.value)} className="w-full border p-2 rounded-lg" />
              <input placeholder="Last" value={last} onChange={e => setLast(e.target.value)} className="w-full border p-2 rounded-lg" />
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full border p-2 rounded-lg" />
              <button type="submit" className="w-full bg-slate-900 text-white p-2 rounded-lg font-bold">Add Purchase</button>
            </form>
            <div className="mt-4 space-y-2">
              <button onClick={assignSquaresRandomly} disabled={!canAssignSquares} className="w-full bg-emerald-600 text-white p-2 rounded-lg font-bold disabled:opacity-50">1. Randomly Assign Squares</button>
              <button onClick={assignTeamsAndNumbers} disabled={!canAssignTeams} className="w-full bg-indigo-600 text-white p-2 rounded-lg font-bold disabled:opacity-50">2. Assign Teams & Numbers</button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-5 overflow-auto">
            <h2 className="text-lg font-bold mb-4">The Grid</h2>
            <div className="inline-block border p-2 bg-slate-100 rounded-xl">
               <div className="flex">
                  <div className="w-10 h-10" />
                  {Array.from({ length: 10 }).map((_, c) => (
                    <div key={c} className="w-10 h-10 flex items-center justify-center border bg-white font-bold">{teamsAssigned ? colDigits[c] : ""}</div>
                  ))}
               </div>
               {Array.from({ length: 10 }).map((_, r) => (
                  <div key={r} className="flex">
                    <div className="w-10 h-10 flex items-center justify-center border bg-white font-bold">{teamsAssigned ? rowDigits[r] : ""}</div>
                    {Array.from({ length: 10 }).map((_, c) => {
                      const ownerId = gridOwners?.[r]?.[c];
                      const owner = ownerId ? buyerById.get(ownerId) : null;
                      return <div key={c} className="w-10 h-10 flex items-center justify-center border bg-white text-xs">{owner ? owner.initials : ""}</div>;
                    })}
                  </div>
               ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5">
           <h2 className="text-lg font-bold mb-4">Quarterly Scoring</h2>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                <div key={q} className="border p-3 rounded-xl bg-slate-50">
                   <p className="font-bold border-b mb-2">{q}</p>
                   <input placeholder="Pats" value={scores[q].Patriots} onChange={e => setQuarterScore(q, "Patriots", e.target.value)} className="w-full border mb-1 p-1 rounded" />
                   <input placeholder="Hawks" value={scores[q].Seahawks} onChange={e => setQuarterScore(q, "Seahawks", e.target.value)} className="w-full border p-1 rounded" />
                   <p className="mt-2 text-xs font-bold text-indigo-600">{winnerForQuarter(q) ? `Winner: ${winnerForQuarter(q).buyer.first}` : "No winner yet"}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
