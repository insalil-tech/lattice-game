const { useState, useEffect } = React;

// ─── CONFIG — paste your real values here before uploading to GitHub ──────────
const SUPA_URL = "https://fgtodhowicfiytlscppp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG9kaG93aWNmaXl0bHNjcHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODk1OTcsImV4cCI6MjEwMTA2NTU5N30.i_KL6pbolA8MxTzBWLP7F2IKK659BZShSJFUu1xt9k8";
const ADMIN_PASSWORD = "lattice2025";
const ANALYTICS_ON = SUPA_URL.indexOf("supabase") !== -1;

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function dbGet(table, params) {
  try {
    const q = Object.entries(params||{}).map(([k,v])=>`${k}=eq.${v}`).join("&");
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${q}`, {
      headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` }
    });
    return await r.json();
  } catch(e) { return null; }
}
async function dbPost(table, body) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, Prefer:"return=minimal" },
      body: JSON.stringify(body)
    });
  } catch(e) {}
}

// ─── Seeded RNG (fallback puzzles only) ──────────────────────────────────────
function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ s >>> 15, 1 | s);
    s ^= s + Math.imul(s ^ s >>> 7, 61 | s);
    return ((s ^ s >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i=a.length-1; i>0; i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function dateToSeed(d) { return (d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate())*6271; }

// ─── Fallback puzzles (used if Supabase unavailable) ─────────────────────────
const FALLBACK = [
  { clue:"Four hidden links — can you find them all?", groups:[
    {label:"Things that orbit Earth",    emoji:"🛸",items:["Moon","ISS","Hubble","GPS Satellite"]},
    {label:"Parts of a flower",          emoji:"🌸",items:["Petal","Stamen","Pistil","Sepal"]},
    {label:"Named after scientists",     emoji:"🔬",items:["Watt","Newton","Kelvin","Hertz"]},
    {label:"Things with a nucleus",      emoji:"⚛️",items:["Atom","Cell","Comet","Galaxy"]},
  ]},
  { clue:"Sixteen words. Four connections. Go!", groups:[
    {label:"Things that glow in the dark",  emoji:"✨",items:["Firefly","Anglerfish","Radium","Glow Worm"]},
    {label:"Animals that regrow body parts",emoji:"🦎",items:["Starfish","Axolotl","Planarian","Salamander"]},
    {label:"Things that conduct electricity",emoji:"⚡",items:["Copper","Saltwater","Graphite","Iron"]},
    {label:"Layers of Earth",               emoji:"🌍",items:["Crust","Mantle","Outer Core","Inner Core"]},
  ]},
  { clue:"Some of these links will surprise you!", groups:[
    {label:"Animals that change sex",      emoji:"🧬",items:["Clownfish","Oyster","Wrasse","Parrotfish"]},
    {label:"Types of cloud",               emoji:"☁️",items:["Cumulus","Stratus","Cirrus","Nimbus"]},
    {label:"Things humans share with chimps",emoji:"🐒",items:["Fingerprints","Blood Types","Opposable Thumbs","Laughter"]},
    {label:"Parts of the eye",             emoji:"👁️",items:["Retina","Cornea","Iris","Pupil"]},
  ]},
  { clue:"Four groups hiding in plain sight!", groups:[
    {label:"Things that reflect light",  emoji:"🪞",items:["Mirror","Moon","Snow","Water"]},
    {label:"Bones in the human arm",     emoji:"🦴",items:["Humerus","Radius","Ulna","Carpals"]},
    {label:"Things made of carbon",      emoji:"💎",items:["Diamond","Graphite","Coal","Charcoal"]},
    {label:"Moons of Saturn",            emoji:"🪐",items:["Titan","Enceladus","Mimas","Rhea"]},
  ]},
  { clue:"Can you find all four hidden links?", groups:[
    {label:"Animal defence mechanisms",  emoji:"🦔",items:["Camouflage","Venom","Quills","Ink"]},
    {label:"Things that cause rust",     emoji:"🔩",items:["Water","Oxygen","Salt","Acid"]},
    {label:"Types of rock",              emoji:"🪨",items:["Igneous","Sedimentary","Metamorphic","Pumice"]},
    {label:"Parts of a neuron",          emoji:"🧠",items:["Axon","Dendrite","Synapse","Myelin"]},
  ]},
];
const COLORS = ["#3498DB","#2ECC71","#E67E22","#9B59B6"];
const SEL = "#5C6BC0";

function preparePuzzle(puzzleData, date) {
  const rng = mkRng(dateToSeed(date));
  const colorOrder = shuffle([0,1,2,3], rng);
  const groups = puzzleData.groups.map((g,i)=>({...g, color:COLORS[colorOrder[i]]}));
  const cards  = shuffle(groups.flatMap((g,gi)=>g.items.map(item=>({item,groupIdx:gi}))), rng);
  return { clue:puzzleData.clue, groups, cards };
}

function getFallback(date) {
  const rng = mkRng(dateToSeed(date));
  return preparePuzzle(FALLBACK[Math.floor(rng()*FALLBACK.length)], date);
}

const dateFmt = d => d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const fsize   = len => len>12?10:len>8?11.5:13;
const fmt     = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const mean    = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const colors=["#E74C3C","#F1C40F","#2ECC71","#3498DB","#9B59B6","#E67E22","#FF69B4"];
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:300}}>
      {Array.from({length:48},(_,i)=>{
        const l=Math.random()*100,dl=Math.random()*1.5,dr=2+Math.random()*2,c=colors[i%colors.length],s=7+Math.random()*9;
        return <div key={i} style={{position:"absolute",left:`${l}%`,top:"-20px",width:s,height:s,background:c,borderRadius:Math.random()>.5?"50%":"2px",animation:`cf ${dr}s ${dl}s linear infinite`}}/>;
      })}
      <style>{`@keyframes cf{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────
function AdminView({onClose}) {
  const [pw,setPw]     = useState("");
  const [auth,setAuth] = useState(false);
  const [rows,setRows] = useState(null);
  const [loading,setLoading] = useState(false);
  const attempt = () => pw===ADMIN_PASSWORD ? setAuth(true) : alert("Wrong password");

  useEffect(()=>{
    if (!auth) return;
    setLoading(true);
    dbGet("events").then(data=>{ setRows(data); setLoading(false); });
  },[auth]);

  if (!auth) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
      <div style={{background:"var(--color-background-primary)",borderRadius:16,padding:28,width:290,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>🔐</div>
        <h3 style={{margin:"0 0 10px",color:"var(--color-text-primary)"}}>Admin</h3>
        <input type="password" placeholder="Password" value={pw}
          onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid var(--color-border-tertiary)",fontSize:14,marginBottom:12,boxSizing:"border-box",background:"var(--color-background-secondary)",color:"var(--color-text-primary)"}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:"1.5px solid var(--color-border-tertiary)",background:"transparent",cursor:"pointer",color:"var(--color-text-secondary)"}}>Cancel</button>
          <button onClick={attempt} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#3498DB",color:"#fff",cursor:"pointer",fontWeight:600}}>Enter</button>
        </div>
      </div>
    </div>
  );

  const events  = Array.isArray(rows) ? rows : [];
  const starts  = events.filter(e=>e.event==="start");
  const completes = events.filter(e=>e.event==="complete");
  const abandons  = events.filter(e=>e.event==="abandon");
  const times   = completes.map(e=>e.time_secs).filter(Boolean);
  const compRate = starts.length ? Math.round(completes.length/starts.length*100) : 0;

  const byDay = {};
  events.forEach(e=>{
    const d = e.puzzle_date || e.created_at?.slice(0,10) || "?";
    if (!byDay[d]) byDay[d]={date:d,starts:0,completions:0,abandons:0,times:[]};
    if (e.event==="start")    byDay[d].starts++;
    if (e.event==="complete") { byDay[d].completions++; if(e.time_secs) byDay[d].times.push(e.time_secs); }
    if (e.event==="abandon")  byDay[d].abandons++;
  });
  const days = Object.values(byDay).sort((a,b)=>b.date.localeCompare(a.date));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}}>
      <div style={{background:"var(--color-background-primary)",borderRadius:"18px 18px 0 0",padding:"20px 16px 36px",width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <h3 style={{margin:0,fontSize:17,color:"var(--color-text-primary)"}}>📊 Admin Dashboard</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--color-text-secondary)"}}>✕</button>
        </div>
        <div style={{fontSize:11,color:ANALYTICS_ON?"#2ECC71":"#E67E22",marginBottom:14,display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:ANALYTICS_ON?"#2ECC71":"#E67E22",display:"inline-block"}}/>
          {ANALYTICS_ON?"Live data from Supabase — all players, all devices":"Local preview only — add Supabase keys to see global data"}
        </div>
        {loading && <p style={{textAlign:"center",color:"var(--color-text-secondary)"}}>Loading…</p>}
        {!loading && <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[["🎮","Total Starts",starts.length],["✅","Completions",completes.length],
              ["📉","Abandoned",abandons.length],["📈","Completion %",compRate+"%"],
              ["⏱","Best Time",times.length?fmt(Math.min(...times)):"—"],
              ["⏱","Avg Time",times.length?fmt(mean(times)):"—"]
            ].map(([ic,l,v])=>(
              <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"11px 10px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:2}}>{ic}</div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".05em"}}>{l}</div>
                <div style={{fontSize:18,fontWeight:700,color:"var(--color-text-primary)"}}>{v}</div>
              </div>
            ))}
          </div>
          <p style={{fontSize:10,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Day by day</p>
          {days.length===0
            ? <p style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center",padding:"20px 0"}}>No data yet!</p>
            : days.map(d=>(
              <div key={d.date} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 12px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{d.date}</span>
                  <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{d.completions}/{d.starts} done</span>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {d.times.length ? <>
                    <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>⏱ Best {fmt(Math.min(...d.times))}</span>
                    <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Avg {fmt(mean(d.times))}</span>
                  </> : null}
                  {d.abandons ? <span style={{fontSize:11,color:"#E67E22"}}>↩ {d.abandons} quit</span> : null}
                </div>
              </div>
            ))}
        </>}
        <button onClick={onClose} style={{width:"100%",marginTop:12,padding:12,borderRadius:10,border:"none",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:14,cursor:"pointer"}}>Close</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const now  = new Date();
  const dStr = now.toISOString().slice(0,10);

  const [puzzle,setPuzzle]               = useState(null);
  const [screen,setScreen]               = useState("landing");
  const [selected,setSelected]           = useState([]);
  const [solved,setSolved]               = useState([]);
  const [lives,setLives]                 = useState(4);   // hearts — shared pool for mistakes AND hints
  const [hintsUsed,setHintsUsed]         = useState(0);
  const [revealedHints,setRevealedHints] = useState([]);
  const [shaking,setShaking]             = useState(false);
  const [showConfetti,setShowConfetti]   = useState(false);
  const [done,setDone]                   = useState(false);
  const [wrongMsg,setWrongMsg]           = useState("");
  const [showAdmin,setShowAdmin]         = useState(false);
  const [logoTaps,setLogoTaps]           = useState(0);
  const [copied,setCopied]               = useState(false);
  const [liveStats,setLiveStats]         = useState(null);
  const [result,setResult]               = useState(null);
  const startLives = 4;

  // Load today's puzzle from Supabase, fallback to hardcoded
  useEffect(()=>{
    async function load() {
      if (ANALYTICS_ON) {
        const rows = await dbGet("puzzles", {date:dStr});
        if (rows && rows.length > 0) {
          setPuzzle(preparePuzzle(rows[0], now));
          return;
        }
      }
      setPuzzle(getFallback(now));
    }
    load();
  },[]);

  function save(event, extra) {
    if (!ANALYTICS_ON || !puzzle) return;
    dbPost("events", Object.assign({ puzzle_date:dStr, event }, extra||{}));
  }

  useEffect(()=>{ if(screen==="game") save("start"); },[screen]);
  useEffect(()=>{
    function onUnload() { if(screen==="game"&&!done) save("abandon"); }
    window.addEventListener("beforeunload",onUnload);
    return()=>window.removeEventListener("beforeunload",onUnload);
  },[screen,done]);

  function useHint() {
    if (!puzzle) return;
    if (lives <= 1) { setWrongMsg("Not enough hearts for a hint!"); setTimeout(()=>setWrongMsg(""),1500); return; }
    const unsolved = puzzle.groups.map((_,i)=>i).filter(i=>!solved.includes(i)&&!revealedHints.includes(i));
    if (!unsolved.length) return;
    setRevealedHints(prev=>[...prev,unsolved[0]]);
    setHintsUsed(h=>h+1);
    setLives(l=>l-1);
  }

  function toggleCard(idx) {
    if (!puzzle||done||solved.includes(puzzle.cards[idx].groupIdx)) return;
    setSelected(prev=>prev.includes(idx)?prev.filter(i=>i!==idx):prev.length>=4?prev:[...prev,idx]);
  }

  function submit() {
    if (!puzzle||selected.length!==4) return;
    const gis = selected.map(i=>puzzle.cards[i].groupIdx);
    if (gis.every(g=>g===gis[0])) {
      const newSolved=[...solved,gis[0]];
      setSolved(newSolved);
      setSelected([]);
      if (newSolved.length===4) {
        setTimeout(()=>{
          const mistakes = startLives - lives;
          const r = { solved:4, mistakes, hintsUsed };
          setResult(r);
          save("complete",{groups_found:4,mistakes,hints_used:hintsUsed});
          setDone(true); setShowConfetti(true);
          setTimeout(()=>setShowConfetti(false),4500);
          // fetch real stats after 2s
          if (ANALYTICS_ON) setTimeout(()=>fetchLiveStats(r),2000);
        },400);
      }
    } else {
      const counts={};
      gis.forEach(g=>{counts[g]=(counts[g]||0)+1;});
      const nl=lives-1;
      setLives(nl);
      setShaking(true);
      setWrongMsg(Math.max(...Object.values(counts))===3?"So close — one card doesn't belong 🤔":"Not quite — try again!");
      setTimeout(()=>{setShaking(false);setSelected([]);setWrongMsg("");},900);
      if (nl<=0) {
        setTimeout(()=>{
          const mistakes=startLives;
          const r={solved:solved.length,mistakes,hintsUsed};
          setResult(r);
          save("complete",{groups_found:solved.length,mistakes,hints_used:hintsUsed});
          setDone(true);
          if (ANALYTICS_ON) setTimeout(()=>fetchLiveStats(r),2000);
        },500);
      }
    }
  }

  async function fetchLiveStats(r) {
    const rows = await dbGet("events",{puzzle_date:dStr});
    if (!Array.isArray(rows)) return;
    const completes = rows.filter(e=>e.event==="complete");
    const times = completes.map(e=>e.time_secs).filter(Boolean);
    const hints = completes.map(e=>e.hints_used||0);
    const mistakes = completes.map(e=>e.mistakes||0);
    setLiveStats({
      total: rows.filter(e=>e.event==="start").length,
      completions: completes.length,
      avgTime: mean(times),
      avgHints: mean(hints),
      avgMistakes: mean(mistakes),
    });
  }

  function handleLogoTap() { const n=logoTaps+1; setLogoTaps(n); if(n>=5){setShowAdmin(true);setLogoTaps(0);} }

  const won = solved.length===4;
  const shareText = puzzle
    ? `🔷 Lattice · ${now.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}\n${"🟩".repeat(solved.length)}${"⬜".repeat(4-solved.length)}\n❤️ ${lives}/${startLives} hearts left  💡 ${hintsUsed} hints\n\nPlay free → lattice-science.vercel.app`
    : "";

  function handleShare() {
    if(navigator.share) navigator.share({text:shareText}).catch(()=>{});
    else navigator.clipboard&&navigator.clipboard.writeText(shareText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }

  const vw = typeof window!=="undefined"?window.innerWidth:400;
  const cellH = Math.max(52,Math.min(66,Math.floor((Math.min(vw-28,490)-18)/4*0.82)));
  const hintsLeft = puzzle ? puzzle.groups.filter((_,i)=>!solved.includes(i)&&!revealedHints.includes(i)).length : 0;
  const mistakes  = startLives - lives - hintsUsed;

  if (!puzzle) return (
    <div style={{fontFamily:"system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--color-text-secondary)"}}>
      Loading today's puzzle…
    </div>
  );

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (screen==="landing") return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:490,margin:"0 auto",padding:"0 14px 48px",minHeight:"100vh"}}>
      {showAdmin&&<AdminView onClose={()=>setShowAdmin(false)}/>}
      <div style={{textAlign:"center",padding:"38px 0 20px"}}>
        <div style={{fontSize:52,marginBottom:8,cursor:"pointer",WebkitTapHighlightColor:"transparent"}} onClick={handleLogoTap}>🔷</div>
        <h1 style={{fontSize:32,fontWeight:700,margin:"0 0 4px",color:"var(--color-text-primary)",letterSpacing:-1}}>Lattice</h1>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 2px"}}>Daily connections puzzle</p>
        <p style={{fontSize:12,color:"var(--color-text-secondary)",opacity:.5,margin:0}}>{dateFmt(now)}</p>
      </div>

      <div style={{border:"2px solid #3498DB33",borderRadius:16,padding:"20px",marginBottom:18,background:"var(--color-background-primary)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#3498DB,#9B59B6,#2ECC71,#E67E22)"}}/>
        <div style={{textAlign:"center",padding:"8px 0 16px"}}>
          <div style={{fontSize:36,marginBottom:8}}>🔷</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:4}}>Today's puzzle is ready</div>
          <div style={{fontSize:14,color:"var(--color-text-secondary)",fontStyle:"italic",lineHeight:1.6}}>{puzzle.clue}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:16}}>
          {["🔵","🟢","🟠","🟣"].map((dot,i)=>(
            <div key={i} style={{background:"var(--color-background-secondary)",borderRadius:8,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              {dot}
            </div>
          ))}
        </div>
        <button onClick={()=>setScreen("game")} style={{width:"100%",padding:14,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3498DB,#9B59B6)",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>
          Play Today's Puzzle →
        </button>
      </div>

      <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:"14px 16px"}}>
        <p style={{fontSize:10,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".07em",margin:"0 0 10px"}}>How to play</p>
        {[
          ["👀","16 words appear on the grid — all face up"],
          ["🧠","Find 4 groups of 4 that share a hidden connection"],
          ["👆","Tap 4 words you think go together, then press Submit"],
          ["✅","Correct? The group is revealed and removed!"],
          ["❤️","You have 4 hearts — lose one for each wrong guess"],
          ["💡","Tap Hint to reveal a group label — uses one heart"],
        ].map(([ic,txt])=>(
          <div key={txt} style={{display:"flex",gap:10,marginBottom:7,alignItems:"flex-start"}}>
            <span style={{fontSize:15,flexShrink:0,lineHeight:1.5}}>{ic}</span>
            <span style={{fontSize:13,color:"var(--color-text-primary)",lineHeight:1.5}}>{txt}</span>
          </div>
        ))}
      </div>
      <p style={{textAlign:"center",fontSize:10,color:"var(--color-text-secondary)",opacity:.3,marginTop:12}}>Tap 🔷 five times for admin</p>
    </div>
  );

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:490,margin:"0 auto",padding:"20px 14px 44px"}}>
      {showConfetti&&<Confetti/>}
      {showAdmin&&<AdminView onClose={()=>setShowAdmin(false)}/>}
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:52,marginBottom:8}}>{won?"🏆":"🔬"}</div>
        <h2 style={{fontSize:24,fontWeight:700,margin:"0 0 4px",color:"var(--color-text-primary)"}}>{won?"Brilliant!":"Good effort!"}</h2>
        <p style={{fontSize:14,color:"var(--color-text-secondary)",margin:0}}>{won?"All 4 connections found!":`You found ${solved.length} of 4 groups`}</p>
      </div>

      {/* your stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        {[["✅","Groups",solved.length+"/4"],["❤️","Hearts left",lives],["💡","Hints",hintsUsed]].map(([ic,l,v])=>(
          <div key={l} style={{background:"var(--color-background-secondary)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:3}}>{ic}</div>
            <div style={{fontSize:10,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>{l}</div>
            <div style={{fontSize:20,fontWeight:700,color:"var(--color-text-primary)"}}>{v}</div>
          </div>
        ))}
      </div>

      {/* global comparison */}
      {liveStats ? (
        <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
          <p style={{fontSize:10,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 10px"}}>Today's players</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["👥","Players",liveStats.total],["⏱","Avg hints",liveStats.avgHints],["❌","Avg mistakes",liveStats.avgMistakes]].map(([ic,l,v])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:16}}>{ic}</div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{l}</div>
                <div style={{fontSize:16,fontWeight:700,color:"var(--color-text-primary)"}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : ANALYTICS_ON ? (
        <div style={{textAlign:"center",fontSize:12,color:"var(--color-text-secondary)",marginBottom:12,opacity:.7}}>Fetching today's player stats…</div>
      ) : null}

      {/* rating */}
      <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:"11px 14px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>Rating</div>
        <div style={{fontSize:20}}>
          {won&&lives===4&&hintsUsed===0?"⭐⭐⭐ Perfect!":won&&hintsUsed===0?"⭐⭐ Great!":won?"⭐ Completed":"Keep exploring!"}
        </div>
      </div>

      {/* all groups */}
      <p style={{fontSize:10,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".06em",margin:"0 0 8px"}}>Today's connections</p>
      {puzzle.groups.map((g,i)=>(
        <div key={i} style={{borderRadius:10,padding:"10px 14px",marginBottom:6,
          background:solved.includes(i)?g.color:g.color+"22",
          border:`1.5px solid ${g.color}`,
          display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{g.emoji}</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:solved.includes(i)?"#fff":g.color}}>{g.label}{solved.includes(i)?" ✓":""}</div>
            <div style={{fontSize:11,color:solved.includes(i)?"rgba(255,255,255,.85)":g.color,lineHeight:1.4}}>{g.items.join(" · ")}</div>
          </div>
        </div>
      ))}

      <div style={{background:"var(--color-background-secondary)",borderRadius:12,padding:"12px",margin:"14px 0"}}>
        <p style={{fontSize:10,fontWeight:600,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".07em",margin:"0 0 7px"}}>Share your result</p>
        <pre style={{fontSize:12,color:"var(--color-text-primary)",whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit",lineHeight:1.7}}>{shareText}</pre>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        <button onClick={handleShare} style={{padding:13,borderRadius:10,border:"none",background:"#3498DB",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer"}}>{copied?"✅ Copied!":"📤 Share Result"}</button>
        <button onClick={()=>setScreen("landing")} style={{padding:11,borderRadius:10,border:"none",background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",fontSize:13,cursor:"pointer"}}>🏠 Home</button>
      </div>
    </div>
  );

  // ── GAME ───────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:520,margin:"0 auto",padding:"12px 14px 32px"}}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
      {showAdmin&&<AdminView onClose={()=>setShowAdmin(false)}/>}

      {/* top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>{save("abandon");setScreen("landing");}} style={{width:36,height:36,borderRadius:"50%",border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>🏠</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--color-text-primary)"}}>🔷 Lattice</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",fontStyle:"italic",maxWidth:220,lineHeight:1.3}}>{puzzle.clue}</div>
        </div>
        {/* unified hearts — shared pool for mistakes and hints */}
        <div style={{display:"flex",gap:2,minWidth:56,justifyContent:"flex-end"}}>
          {Array.from({length:startLives},(_,i)=>(
            <span key={i} style={{fontSize:18}}>{i<lives?"❤️":"🖤"}</span>
          ))}
        </div>
      </div>

      {/* revealed hints */}
      {revealedHints.filter(hi=>!solved.includes(hi)).map(hi=>{
        const g=puzzle.groups[hi];
        return (
          <div key={hi} style={{display:"flex",alignItems:"center",gap:8,background:g.color+"18",border:`1.5px solid ${g.color}55`,borderRadius:8,padding:"7px 10px",marginBottom:5}}>
            <span style={{fontSize:14}}>💡</span>
            <span style={{fontSize:12,fontWeight:600,color:g.color}}>Hint: {g.label}</span>
            <span style={{marginLeft:"auto",fontSize:14}}>{g.emoji}</span>
          </div>
        );
      })}

      {/* solved banners */}
      {solved.map(gi=>{
        const g=puzzle.groups[gi];
        return (
          <div key={gi} style={{borderRadius:9,padding:"8px 12px",marginBottom:5,background:g.color,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>{g.emoji}</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{g.label}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.8)",lineHeight:1.4}}>{g.items.join(" · ")}</div>
            </div>
          </div>
        );
      })}

      {/* grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8,animation:shaking?"shake .5s ease":"none"}}>
        {puzzle.cards.map((c,i)=>{
          if (solved.includes(c.groupIdx)) return null;
          const sel=selected.includes(i);
          return (
            <div key={i} onClick={()=>toggleCard(i)} style={{
              height:cellH,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",
              padding:"5px 4px",textAlign:"center",cursor:"pointer",userSelect:"none",
              fontSize:fsize(c.item.length),fontWeight:500,lineHeight:1.25,boxSizing:"border-box",
              border:sel?`2.5px solid ${SEL}`:"1.5px solid var(--color-border-tertiary)",
              background:sel?SEL+"20":"var(--color-background-secondary)",
              color:sel?SEL:"var(--color-text-primary)",
              transform:sel?"scale(1.05)":"scale(1)",
              transition:"all .12s",
              boxShadow:sel?`0 3px 10px ${SEL}44`:"none",
            }}>
              {c.item}
            </div>
          );
        })}
        {Array.from({length:solved.length*4}).map((_,i)=>(
          <div key={"e"+i} style={{height:cellH}}/>
        ))}
      </div>

      {/* status */}
      <div style={{minHeight:22,marginBottom:8,textAlign:"center"}}>
        {wrongMsg
          ? <span style={{fontSize:13,color:"#E67E22",fontWeight:500}}>{wrongMsg}</span>
          : <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>
              {selected.length===0?"Tap words to select":selected.length<4?`${4-selected.length} more to select`:"Ready — submit when sure!"}
              {" · "}{solved.length}/4 found
            </span>}
      </div>

      {/* action row */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <button onClick={()=>setSelected([])} style={{flex:1,padding:11,borderRadius:10,border:"1.5px solid var(--color-border-tertiary)",background:"transparent",color:"var(--color-text-secondary)",fontSize:14,cursor:"pointer"}}>Clear</button>
        <button onClick={submit} disabled={selected.length!==4} style={{
          flex:2,padding:11,borderRadius:10,border:"none",fontSize:15,fontWeight:600,
          cursor:selected.length===4?"pointer":"default",transition:"all .15s",
          background:selected.length===4?"linear-gradient(135deg,#3498DB,#9B59B6)":"var(--color-background-secondary)",
          color:selected.length===4?"#fff":"var(--color-text-secondary)",
        }}>
          {selected.length===4?"Submit →":"Select 4 words"}
        </button>
      </div>

      {/* hint button */}
      <button onClick={useHint} disabled={hintsLeft===0||lives<=1} style={{
        width:"100%",padding:10,borderRadius:10,
        border:`1.5px solid ${hintsLeft>0&&lives>1?"#E67E22":"var(--color-border-tertiary)"}`,
        background:"transparent",
        color:hintsLeft>0&&lives>1?"#E67E22":"var(--color-text-secondary)",
        fontSize:13,cursor:hintsLeft>0&&lives>1?"pointer":"default",
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
      }}>
        💡 {hintsLeft>0&&lives>1?`Reveal a group label (costs ❤️ · ${hintsLeft} hints left)`:hintsLeft===0?"No more hints":"Not enough hearts"}
      </button>
    </div>
  );
}
