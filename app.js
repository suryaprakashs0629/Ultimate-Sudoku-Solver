// ─── GRID CONFIGS ────────────────────────────────────────────
const CONFIGS = {
  4:  {size:4,  bR:2, bC:2, syms:'1234'.split('')},
  6:  {size:6,  bR:2, bC:3, syms:'123456'.split('')},
  8:  {size:8,  bR:2, bC:4, syms:'12345678'.split('')},
  9:  {size:9,  bR:3, bC:3, syms:'123456789'.split('')},
  12: {size:12, bR:3, bC:4, syms:[...'123456789ABC']},
  16: {size:16, bR:4, bC:4, syms:[...'123456789ABCDEFG']},
  25: {size:25, bR:5, bC:5, syms:[...'123456789ABCDEFGHIJKLMNOP']},
};

// ─── STATE ──────────────────────────────────────────────────
let S = {
  cfg: CONFIGS[9],
  board: [],      // 0 = empty, string = filled
  given: [],      // boolean matrix
  original: [],   // for reset
  selected: null, // [r,c]
  history: [],    // undo stack [{r,c,old}]
  status: 'idle',
  timerID: null,
  startMs: null,
  solving: false,
  vizID: null,
};

// ─── INIT ────────────────────────────────────────────────────
function initBoard(size) {
  S.cfg = CONFIGS[size];
  const n = size;
  S.board   = Array.from({length:n}, ()=>Array(n).fill(0));
  S.given   = Array.from({length:n}, ()=>Array(n).fill(false));
  S.original= Array.from({length:n}, ()=>Array(n).fill(0));
  S.selected= null;
  S.history = [];
  S.status  = 'idle';
  stopTimer();
}

// ─── VALIDITY ────────────────────────────────────────────────
function isValid(board, r, c, val, cfg) {
  const n=cfg.size, bR=cfg.bR, bC=cfg.bC;
  for(let i=0;i<n;i++){
    if(i!==c && board[r][i]===val) return false;
    if(i!==r && board[i][c]===val) return false;
  }
  const sr=Math.floor(r/bR)*bR, sc=Math.floor(c/bC)*bC;
  for(let i=sr;i<sr+bR;i++)
    for(let j=sc;j<sc+bC;j++)
      if((i!==r||j!==c) && board[i][j]===val) return false;
  return true;
}

// ─── FIND BEST EMPTY (MRV) ───────────────────────────────────
function findBestEmpty(board, cfg) {
  let best=null, min=cfg.size+1;
  for(let r=0;r<cfg.size;r++)
    for(let c=0;c<cfg.size;c++)
      if(board[r][c]===0) {
        let cnt=0;
        for(const s of cfg.syms) if(isValid(board,r,c,s,cfg)) cnt++;
        if(cnt<min){min=cnt;best=[r,c];}
        if(cnt===0) return best;
      }
  return best;
}

// ─── SOLVER (backtracking + MRV) ─────────────────────────────
function solve(board, cfg, steps, limit) {
  const cell = findBestEmpty(board, cfg);
  if(!cell) return true;
  const [r,c] = cell;
  const syms = [...cfg.syms].sort(()=>Math.random()-.5);
  for(const s of syms) {
    if(isValid(board,r,c,s,cfg)) {
      board[r][c]=s;
      if(steps) steps.push({r,c,val:s,bt:false});
      if(limit && steps && steps.length>limit){board[r][c]=0;return false;}
      if(solve(board,cfg,steps,limit)) return true;
      board[r][c]=0;
      if(steps) steps.push({r,c,val:0,bt:true});
    }
  }
  return false;
}

// Deterministic solve (for the actual solve action)
function solveDet(board, cfg) {
  const cell = findBestEmpty(board, cfg);
  if(!cell) return true;
  const [r,c] = cell;
  for(const s of cfg.syms) {
    if(isValid(board,r,c,s,cfg)) {
      board[r][c]=s;
      if(solveDet(board,cfg)) return true;
      board[r][c]=0;
    }
  }
  return false;
}

// ─── PUZZLE GENERATOR ────────────────────────────────────────
function generatePuzzle(cfg, difficulty) {
  // Start with solved board
  const board = Array.from({length:cfg.size},()=>Array(cfg.size).fill(0));
  // Fill diagonal boxes first (they don't share rows/cols)
  for(let b=0;b<cfg.size;b+=Math.max(cfg.bR,cfg.bC)) {
    const sr=Math.floor(b/cfg.bC)*cfg.bR;
    const sc=Math.floor(b/cfg.bR)*cfg.bC;
    if(sr<cfg.size && sc<cfg.size) fillBox(board,cfg,sr,sc);
  }
  solve(board,cfg,null,null);

  // Remove cells based on difficulty
  const removed = {easy:0.4, medium:0.55, hard:0.68}[difficulty]||0.55;
  const cells = [];
  for(let r=0;r<cfg.size;r++)
    for(let c=0;c<cfg.size;c++) cells.push([r,c]);
  shuffle(cells);
  const toRemove = Math.floor(cfg.size*cfg.size*removed);
  for(let i=0;i<toRemove&&i<cells.length;i++) {
    const [r,c]=cells[i];
    board[r][c]=0;
  }
  return board;
}

function fillBox(board,cfg,sr,sc) {
  const syms=[...cfg.syms]; shuffle(syms);
  let k=0;
  for(let r=sr;r<sr+cfg.bR&&r<cfg.size;r++)
    for(let c=sc;c<sc+cfg.bC&&c<cfg.size;c++)
      board[r][c]=syms[k++]||0;
}

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}

// ─── TIMER ───────────────────────────────────────────────────
function startTimer(){
  stopTimer();
  S.startMs=Date.now();
  S.timerID=setInterval(()=>{
    const e=Math.floor((Date.now()-S.startMs)/1000);
    const m=String(Math.floor(e/60)).padStart(2,'0');
    const s=String(e%60).padStart(2,'0');
    document.getElementById('timer').textContent=`${m}:${s}`;
  },1000);
}
function stopTimer(){
  if(S.timerID){clearInterval(S.timerID);S.timerID=null;}
}
function elapsedMs(){return S.startMs?Date.now()-S.startMs:0;}

// ─── DOM — BUILD GRID ────────────────────────────────────────
function cellSize(n){
  if(n<=4) return 58;
  if(n<=6) return 52;
  if(n<=8) return 46;
  if(n<=9) return 44;
  if(n<=12)return 36;
  if(n<=16)return 30;
  return 22;
}
function fontSize(n){
  if(n<=4) return '1.3rem';
  if(n<=9) return '.95rem';
  if(n<=12)return '.8rem';
  if(n<=16)return '.7rem';
  return '.58rem';
}

function buildGrid() {
  const cfg=S.cfg, n=cfg.size;
  const g=document.getElementById('sudoku-grid');
  g.innerHTML='';
  g.style.gridTemplateColumns=`repeat(${n},1fr)`;
  const cs=cellSize(n), fs=fontSize(n);
  g.style.width=`${n*cs}px`;

  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++) {
      const cell=document.createElement('div');
      cell.classList.add('cell');
      cell.style.width=cell.style.height=cs+'px';
      cell.style.fontSize=fs;
      cell.dataset.r=r; cell.dataset.c=c;
      cell.tabIndex=0;

      // subgrid borders
      if((c+1)%cfg.bC===0 && c<n-1) cell.classList.add('br');
      if((r+1)%cfg.bR===0 && r<n-1) cell.classList.add('bb');

      cell.addEventListener('click',()=>selectCell(r,c));
      cell.addEventListener('keydown',e=>onKey(e,r,c));
      g.appendChild(cell);
    }
  buildNumpad();
}

function getCell(r,c){
  return document.querySelector(`#sudoku-grid .cell[data-r="${r}"][data-c="${c}"]`);
}

function renderBoard(){
  const cfg=S.cfg, n=cfg.size;
  let empty=0, filled=0;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++) {
      const el=getCell(r,c);
      if(!el) continue;
      const val=S.board[r][c];
      el.textContent=val||'';
      el.className='cell';
      if((c+1)%cfg.bC===0&&c<n-1) el.classList.add('br');
      if((r+1)%cfg.bR===0&&r<n-1) el.classList.add('bb');
      if(S.given[r][c]) el.classList.add('cell-given');
      else if(val) el.classList.add('cell-solved');
      if(val) filled++; else empty++;
    }
  document.getElementById('info-empty').textContent=empty;
  document.getElementById('info-filled').textContent=filled;
  if(S.selected){
    const [sr,sc]=S.selected;
    highlightRelated(sr,sc);
  }
}

// Highlight same row, col, and subgrid
function highlightRelated(r,c){
  const cfg=S.cfg, n=cfg.size;
  const bR=cfg.bR, bC=cfg.bC;
  const sr2=Math.floor(r/bR)*bR, sc2=Math.floor(c/bC)*bC;
  for(let i=0;i<n;i++)
    for(let j=0;j<n;j++) {
      const el=getCell(i,j);
      if(!el) continue;
      if(i===r&&j===c){el.classList.add('selected');continue;}
      if(i===r||j===c) el.classList.add('row-col-hl');
      else if(i>=sr2&&i<sr2+bR&&j>=sc2&&j<sc2+bC) el.classList.add('box-hl');
    }
}

// ─── CELL SELECTION & INPUT ──────────────────────────────────
function selectCell(r,c){
  S.selected=[r,c];
  renderBoard();
  getCell(r,c)?.focus();
}

function inputVal(val){
  if(!S.selected||S.solving) return;
  const [r,c]=S.selected;
  if(S.given[r][c]) return;
  const old=S.board[r][c];
  S.history.push({r,c,old});
  S.board[r][c]=val;
  if(!S.startMs&&val) startTimer();
  renderBoard();
  checkConflicts();
  updateInfoStatus('Editing');
}

function onKey(e,r,c){
  const n=S.cfg.size;
  const dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(dirs[e.key]){
    e.preventDefault();
    const [dr,dc]=dirs[e.key];
    const nr=Math.max(0,Math.min(n-1,r+dr));
    const nc=Math.max(0,Math.min(n-1,c+dc));
    selectCell(nr,nc);
    return;
  }
  if(e.key==='Escape'){S.selected=null;renderBoard();return;}
  if(e.key==='Delete'||e.key==='Backspace'){inputVal(0);return;}

  const k=e.key.toUpperCase();
  if(S.cfg.syms.includes(k)){
    e.preventDefault();
    inputVal(k);
  }
}

// ─── CONFLICT CHECK ──────────────────────────────────────────
function checkConflicts(){
  const cfg=S.cfg, n=cfg.size;
  let hasConflict=false;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++) {
      const el=getCell(r,c);
      if(!el) continue;
      const val=S.board[r][c];
      if(val && !isValid(S.board,r,c,val,cfg)){
        el.classList.add('conflict');
        hasConflict=true;
      }
    }
  return hasConflict;
}

// ─── HANDLE BUTTONS ──────────────────────────────────────────
function handleSolve(){
  if(S.solving) return;
  stopViz();
  const copy=S.board.map(r=>[...r]);
  const t0=performance.now();
  const ok=solveDet(copy,S.cfg);
  const dt=((performance.now()-t0)/1000).toFixed(3);
  if(!ok){setStatus('error','No solution found for this puzzle');updateInfoStatus('No solution');return;}
  const cfg=S.cfg, n=cfg.size;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++)
      if(!S.given[r][c]) S.board[r][c]=copy[r][c];
  stopTimer();
  renderBoard();
  setStatus('solved',`Solved in ${dt}s using backtracking + MRV`);
  updateInfoStatus('Solved ✓');
  document.getElementById('info-time').textContent=dt+'s';
  document.getElementById('info-time').className='ir-val ok';
  showSuccess(dt);
}

function handleVisualize(){
  if(S.solving){stopViz();return;}
  if(S.cfg.size>12){alert('Visualization is available for grids up to 12×12.');return;}

  // ── Step 1: reset all non-given cells to 0 so we start fresh ──
  const n=S.cfg.size;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++)
      if(!S.given[r][c]) S.board[r][c]=0;
  renderBoard();

  // ── Step 2: collect every forward + backtrack step (no limit) ──
  const copy=S.board.map(row=>[...row]);
  const steps=[];

  function solveViz(board){
    const cell=findBestEmpty(board,S.cfg);
    if(!cell) return true;
    const[r,c]=cell;
    for(const s of S.cfg.syms){
      if(isValid(board,r,c,s,S.cfg)){
        board[r][c]=s;
        steps.push({r,c,val:s,bt:false});
        if(solveViz(board)) return true;
        board[r][c]=0;
        steps.push({r,c,val:0,bt:true});  // backtrack step — cell erased
      }
    }
    return false;
  }

  const ok=solveViz(copy);
  if(!ok){setStatus('error','No solution found for this puzzle');updateInfoStatus('No solution');return;}
  if(steps.length===0){setStatus('error','Board is already fully solved — press Reset first');return;}

  // ── Step 3: animate ──
  const total=steps.length;
  setStatus('solving',`Visualizing ${total.toLocaleString()} steps… (🟢 place  🔴 backtrack)`);
  S.solving=true;
  document.getElementById('btn-viz').textContent='⏹ Stop';

  const vizStart=performance.now();
  let i=0;

  // Adaptive batch: 4×4 one step at a time, 9×9 a few per tick, 12×12 more
  const batchSize = n<=4?1 : n<=6?2 : n<=9?4 : 10;
  const delay     = n<=4?80: n<=6?40: n<=9?10: 18;

  function applyCell(r,c,val,bt){
    S.board[r][c]=val;
    const el=getCell(r,c);
    if(!el) return;
    el.textContent=val||'';
    // rebuild class list cleanly
    const classes=['cell'];
    if((c+1)%S.cfg.bC===0&&c<n-1) classes.push('br');
    if((r+1)%S.cfg.bR===0&&r<n-1) classes.push('bb');
    if(S.given[r][c])       classes.push('cell-given');
    else if(val && !bt)     classes.push('cell-solved');   // green — placed
    else if(val && bt)      classes.push('cell-solved');
    else                    classes.push('cell-bt');       // red — backtracked/erased
    el.className=classes.join(' ');
  }

  function tick(){
    if(!S.solving) return;
    if(i>=steps.length){
      // Done — render final clean board
      S.solving=false;
      document.getElementById('btn-viz').textContent='🎬 Visualize';
      // Apply all remaining cells cleanly
      for(let r=0;r<n;r++)
        for(let c=0;c<n;c++)
          if(!S.given[r][c]) {
            const el=getCell(r,c);
            if(!el) continue;
            el.textContent=copy[r][c]||'';
            const cls=['cell'];
            if((c+1)%S.cfg.bC===0&&c<n-1) cls.push('br');
            if((r+1)%S.cfg.bR===0&&r<n-1) cls.push('bb');
            if(copy[r][c]) cls.push('cell-solved');
            el.className=cls.join(' ');
            S.board[r][c]=copy[r][c];
          }
      stopTimer();
      const dt=((performance.now()-vizStart)/1000).toFixed(2);
      setStatus('solved',`Solved! ${total.toLocaleString()} steps in ${dt}s`);
      updateInfoStatus('Solved ✓');
      document.getElementById('info-time').textContent=dt+'s';
      document.getElementById('info-time').className='ir-val ok';
      showSuccess(dt);
      return;
    }
    for(let b=0;b<batchSize&&i<steps.length;b++){
      const{r,c,val,bt}=steps[i++];
      if(!S.given[r][c]) applyCell(r,c,val,bt);
    }
    S.vizID=setTimeout(tick,delay);
  }
  tick();
}

function stopViz(){
  if(S.vizID){clearTimeout(S.vizID);S.vizID=null;}
  S.solving=false;
  document.getElementById('btn-viz').textContent='🎬 Visualize';
}

function handleGenerate(){
  stopViz();
  const diff=document.getElementById('difficulty').value;
  const cfg=S.cfg;
  setStatus('solving','Generating puzzle…');
  setTimeout(()=>{
    initBoard(cfg.size);
    const puzz=generatePuzzle(cfg,diff);
    S.board=puzz.map(r=>[...r]);
    S.given=puzz.map(r=>r.map(v=>v!==0));
    S.original=puzz.map(r=>[...r]);
    buildGrid(); renderBoard(); checkConflicts();
    setStatus('ready',`${cfg.size}×${cfg.size} ${diff} puzzle ready — fill the empty cells!`);
    updateInfoStatus('Ready');
    startTimer();
  },50);
}

// Deterministic check for conflicts
function handleValidate(){
  const hasC=checkConflicts();
  if(hasC){setStatus('error','Conflicts found — red cells have duplicates!');updateInfoStatus('Conflicts');}
  else{setStatus('ready','No conflicts found — board is valid so far!');updateInfoStatus('Valid ✓');}
}

function handleClear(){
  stopViz();
  const n=S.cfg.size;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++) {S.board[r][c]=0;S.given[r][c]=false;}
  S.history=[];
  stopTimer();
  document.getElementById('timer').textContent='00:00';
  renderBoard();
  setStatus('ready','Board cleared');
  updateInfoStatus('Idle');
  document.getElementById('info-time').textContent='—';
  document.getElementById('info-time').className='ir-val acc';
}

function handleReset(){
  stopViz();
  const n=S.cfg.size;
  for(let r=0;r<n;r++)
    for(let c=0;c<n;c++)
      if(!S.given[r][c]) S.board[r][c]=0;
  S.history=[];
  stopTimer();
  document.getElementById('timer').textContent='00:00';
  renderBoard();
  setStatus('ready','Board reset to original puzzle');
  updateInfoStatus('Reset');
  startTimer();
}

function handleUndo(){
  if(!S.history.length) return;
  const {r,c,old}=S.history.pop();
  S.board[r][c]=old;
  renderBoard(); checkConflicts();
}

// ─── NUMPAD ──────────────────────────────────────────────────
function buildNumpad(){
  const g=document.getElementById('numpad-grid');
  g.innerHTML='';
  const syms=S.cfg.syms;
  const cols=syms.length<=9?3:syms.length<=12?4:syms.length<=16?4:5;
  g.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  syms.forEach(s=>{
    const b=document.createElement('button');
    b.className='np-btn'; b.textContent=s;
    b.onclick=()=>inputVal(s);
    g.appendChild(b);
  });
  const er=document.createElement('button');
  er.className='np-btn erase'; er.textContent='⌫';
  er.style.gridColumn=`1/-1`;
  er.onclick=()=>inputVal(0);
  g.appendChild(er);
}

// ─── INFO PANEL ──────────────────────────────────────────────
function updateInfoPanel(){
  const cfg=S.cfg;
  document.getElementById('info-grid').textContent=`${cfg.size}×${cfg.size}`;
  document.getElementById('info-sub').textContent=`${cfg.bR}×${cfg.bC}`;
  const first=cfg.syms[0], last=cfg.syms[cfg.syms.length-1];
  document.getElementById('info-syms').textContent=`${first}–${last}`;
}

function setStatus(type, msg){
  const dot=document.getElementById('sdot');
  dot.className='sdot '+type;
  document.getElementById('status-msg').textContent=msg;
}

function updateInfoStatus(s){
  const el=document.getElementById('info-status');
  el.textContent=s;
  el.className='ir-val '+(s.includes('✓')?'ok':s==='Conflicts'?'err':s==='No solution'?'err':'acc');
}

// ─── GRID TYPE CHANGE ────────────────────────────────────────
function changeGridType(size){
  stopViz();
  initBoard(size);
  buildGrid(); renderBoard();
  updateInfoPanel();
  setStatus('ready',`${size}×${size} grid ready — generate a puzzle or enter values`);
  updateInfoStatus('Idle');
  document.getElementById('timer').textContent='00:00';
  document.getElementById('info-time').textContent='—';
  document.getElementById('info-time').className='ir-val acc';
  if(size>=16) alert(`${size}×${size} Sudoku loaded. Solving large grids may take a few seconds. Visualization is disabled for grids >12×12.`);
}

// ─── SUCCESS OVERLAY ─────────────────────────────────────────
function showSuccess(t){
  document.getElementById('solve-time-badge').textContent=t+'s';
  document.getElementById('success-overlay').classList.add('show');
  launchConfetti();
}
function closeSuccess(){
  document.getElementById('success-overlay').classList.remove('show');
}

// ─── CONFETTI ────────────────────────────────────────────────
function launchConfetti(){
  const canvas=document.getElementById('confetti-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const pieces=Array.from({length:120},()=>({
    x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,
    w:6+Math.random()*6,h:10+Math.random()*6,
    color:['#7c3aed','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'][Math.floor(Math.random()*6)],
    rot:Math.random()*360,drot:(Math.random()-.5)*8,
    vy:3+Math.random()*5,vx:(Math.random()-.5)*2
  }));
  let frame;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    pieces.forEach(p=>{
      p.y+=p.vy;p.x+=p.vx;p.rot+=p.drot;
      if(p.y<canvas.height+20){alive=true;}
      ctx.save();
      ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;ctx.globalAlpha=.85;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if(alive) frame=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  if(frame) cancelAnimationFrame(frame);
  draw();
  setTimeout(()=>{cancelAnimationFrame(frame);ctx.clearRect(0,0,canvas.width,canvas.height);},4000);
}

// ─── THEME ───────────────────────────────────────────────────
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme');
  const nt=t==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',nt);
  document.getElementById('theme-icon').textContent=nt==='dark'?'🌙':'☀️';
}

// ─── BOOTSTRAP ───────────────────────────────────────────────
(function init(){
  initBoard(9);
  buildGrid();
  renderBoard();
  updateInfoPanel();
  setStatus('ready','Welcome! Generate a puzzle or enter values manually.');
  updateInfoStatus('Idle');
})();
