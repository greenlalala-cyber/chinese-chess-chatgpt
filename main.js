(() => {
  'use strict';

  // =========================================================
  // Audio Manager
  // =========================================================
  const AudioManager = (() => {
    let enabled = true;
    let unlocked = false;
    let ctx = null;
    let master = null;
    const lastAt = new Map();

    function ensureContext(){
      if(ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.62;
      master.connect(ctx.destination);
      return true;
    }
    function setEnabled(on){ enabled = !!on; }
    async function unlock(){
      if(unlocked) return;
      if(!ensureContext()) return;
      try{
        if(ctx.state === 'suspended') await ctx.resume();
        unlocked = true;
      }catch(_e){}
    }
    function now(){ return ctx ? ctx.currentTime : 0; }
    function env(g, t0, a, d, s=0){
      g.gain.cancelScheduledValues(t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(1.0, t0 + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), t0 + a + d);
    }
    function noiseBuf(duration=0.06){
      const sr = ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr*duration));
      const b = ctx.createBuffer(1, len, sr);
      const d = b.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*0.6;
      return b;
    }
    function sfxSelect(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.005, 0.08, 0.0001);
      out.connect(master);

      const o = ctx.createOscillator();
      o.type='sine';
      o.frequency.setValueAtTime(660, t0);
      o.frequency.exponentialRampToValueAtTime(880, t0+0.04);

      const og = ctx.createGain(); og.gain.value=0.22;
      o.connect(og); og.connect(out);
      o.start(t0); o.stop(t0+0.10);
    }
    function sfxMove(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.003, 0.14, 0.0001);
      out.connect(master);

      const o = ctx.createOscillator();
      o.type='sine';
      o.frequency.setValueAtTime(180, t0);
      o.frequency.exponentialRampToValueAtTime(120, t0+0.06);
      const og = ctx.createGain(); og.gain.value=0.18;
      o.connect(og); og.connect(out);

      const n = ctx.createBufferSource();
      n.buffer = noiseBuf(0.06);
      const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
      const ng = ctx.createGain(); ng.gain.value=0.10;
      n.connect(lp); lp.connect(ng); ng.connect(out);

      o.start(t0); o.stop(t0+0.16);
      n.start(t0); n.stop(t0+0.08);
    }
    function sfxCapture(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.004, 0.20, 0.0001);
      out.connect(master);

      const o = ctx.createOscillator();
      o.type='triangle';
      o.frequency.setValueAtTime(420, t0);
      o.frequency.exponentialRampToValueAtTime(220, t0+0.08);
      const og = ctx.createGain(); og.gain.value=0.16;
      o.connect(og); og.connect(out);

      const n = ctx.createBufferSource();
      n.buffer = noiseBuf(0.09);
      const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1200; bp.Q.value=0.8;
      const ng = ctx.createGain(); ng.gain.value=0.08;
      n.connect(bp); bp.connect(ng); ng.connect(out);

      o.start(t0); o.stop(t0+0.22);
      n.start(t0); n.stop(t0+0.10);
    }
    function sfxError(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.005, 0.25, 0.0001);
      out.connect(master);

      const o = ctx.createOscillator();
      o.type='sine';
      o.frequency.setValueAtTime(190, t0);
      o.frequency.exponentialRampToValueAtTime(110, t0+0.10);
      const og = ctx.createGain(); og.gain.value=0.20;
      o.connect(og); og.connect(out);
      o.start(t0); o.stop(t0+0.28);
    }
    function sfxCheck(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.006, 0.55, 0.0001);
      out.connect(master);
      const tone = (f, s, dur) => {
        const o = ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f, s);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.22, s+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, s+dur);
        o.connect(g); g.connect(out);
        o.start(s); o.stop(s+dur+0.01);
      };
      tone(523.25, t0+0.00, 0.18);
      tone(659.25, t0+0.22, 0.20);
    }
    function sfxWin(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.01, 0.80, 0.0001);
      out.connect(master);
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f,i)=>{
        const s = t0 + i*0.10;
        const o = ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(f, s);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.18, s+0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, s+0.22);
        const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400;
        o.connect(lp); lp.connect(g); g.connect(out);
        o.start(s); o.stop(s+0.25);
      });
    }
    function sfxDiceTick(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.002, 0.06, 0.0001);
      out.connect(master);
      const n = ctx.createBufferSource(); n.buffer = noiseBuf(0.04);
      const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900;
      const ng = ctx.createGain(); ng.gain.value=0.06;
      n.connect(hp); hp.connect(ng); ng.connect(out);
      n.start(t0); n.stop(t0+0.05);
    }
    function sfxDiceStop(){
      const t0 = now();
      const out = ctx.createGain(); out.gain.value=0;
      env(out, t0, 0.005, 0.35, 0.0001);
      out.connect(master);
      const o1 = ctx.createOscillator(); o1.type='sine'; o1.frequency.setValueAtTime(784, t0);
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, t0);
      g1.gain.exponentialRampToValueAtTime(0.18, t0+0.02);
      g1.gain.exponentialRampToValueAtTime(0.0001, t0+0.25);
      o1.connect(g1); g1.connect(out); o1.start(t0); o1.stop(t0+0.28);

      const o2 = ctx.createOscillator(); o2.type='sine'; o2.frequency.setValueAtTime(587.33, t0+0.02);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t0+0.02);
      g2.gain.exponentialRampToValueAtTime(0.12, t0+0.04);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0+0.30);
      o2.connect(g2); g2.connect(out); o2.start(t0+0.02); o2.stop(t0+0.33);
    }

    function play(name){
      if(!enabled || !unlocked) return;
      if(!ensureContext()) return;
      if(name === 'diceTick'){
        const ms = performance.now();
        const last = lastAt.get(name) ?? -Infinity;
        if(ms-last < 70) return;
        lastAt.set(name, ms);
      }
      try{
        if(ctx.state === 'suspended'){ ctx.resume().catch(()=>{}); }
        switch(name){
          case 'select': return sfxSelect();
          case 'move': return sfxMove();
          case 'capture': return sfxCapture();
          case 'error': return sfxError();
          case 'check': return sfxCheck();
          case 'win': return sfxWin();
          case 'diceTick': return sfxDiceTick();
          case 'diceStop': return sfxDiceStop();
          default: return;
        }
      }catch(_e){}
    }
    return { setEnabled, unlock, play };
  })();

  // =========================================================
  // Utilities / DOM
  // =========================================================
  const $ = (id) => document.getElementById(id);
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const opp = (c)=> c==='r'?'b':'r';
  const inside = (r,c,rows,cols)=> r>=0 && r<rows && c>=0 && c<cols;

  const STORAGE_KEY = 'xiangqi_dark_big_fixed_v1';

  const MODE = { PVC:'pvcpu', PVP:'pvp' };
  const BOARD = { BIG:'big', DARK:'dark' };

  const CPU_LEVELS = {
    normal: { name:'一般', noise: 40, p6: 1/6 },
    medium: { name:'稍強', noise: 18, p6: 0.22 },
    strong: { name:'強勁', noise: 8,  p6: 0.28 },
    ultra:  { name:'超強', noise: 0,  p6: 0.34 },
  };

  const GLYPH = {
    r: { K:'帥', A:'仕', B:'相', N:'馬', R:'車', C:'炮', P:'兵' },
    b: { K:'將', A:'士', B:'象', N:'馬', R:'車', C:'炮', P:'卒' },
  };

  // =========================================================
  // Dark chess config
  // =========================================================
  const DARK = { rows: 4, cols: 8 };
  const DARK_COUNTS = { K:1, A:2, B:2, R:2, N:2, C:2, P:5 };

  // capture table aligned with funtown version used previously
  const CAPTURE_MAP = {
    K: new Set(['K','A','B','R','N','C']),
    A: new Set(['A','B','R','N','C','P']),
    B: new Set(['B','R','N','C','P']),
    R: new Set(['R','N','C','P']),
    N: new Set(['N','C','P']),
    C: new Set(['K','A','B','R','N','C','P']),
  };

  function pawnCanCapture(attacker, target){
    if(attacker.color==='r'){
      return (target.type==='P' && target.color==='b') || (target.type==='K' && target.color==='b');
    }
    return (target.type==='P' && target.color==='r') || (target.type==='K' && target.color==='r');
  }
  function canCaptureFuntown(attacker, target){
    if(attacker.type==='P') return pawnCanCapture(attacker, target);
    if(attacker.type==='C') return true;
    const set = CAPTURE_MAP[attacker.type];
    return !!set && set.has(target.type);
  }

  // =========================================================
  // UI elements
  // =========================================================
  const menuScreen = $('menuScreen');
  const gameScreen = $('gameScreen');

  const cpuPanel = $('cpuPanel');
  const dicePanel = $('dicePanel');
  const manualFirstRow = $('manualFirstRow');
  const darkOptionsPanel = $('darkOptionsPanel');
  const bigColorPanel = $('bigColorPanel');

  const btnStart = $('btnStart');
  const btnClearSave = $('btnClearSave');

  const boardEl = $('board');
  const historyEl = $('history');
  const statusLine = $('statusLine');
  const subStatusLine = $('subStatusLine');

  const btnRestart = $('btnRestart');
  const btnToMenu = $('btnToMenu');
  const btnUndo = $('btnUndo');
  const btnCheckWin = $('btnCheckWin');
  const btnStopChain = $('btnStopChain');

  const optFogCapture = $('optFogCapture');
  const optChainCapture = $('optChainCapture');

  const inSound = $('inSound');
  const inMoveHints = $('inMoveHints');
  const inDangerHints = $('inDangerHints');
  const inFogCapture = $('inFogCapture');
  const inChainCapture = $('inChainCapture');
  const darkToggles = $('darkToggles');

  const optSound = $('optSound');

  const modalOverlay = $('modalOverlay');
  const modalTitle = $('modalTitle');
  const modalBody = $('modalBody');
  const modalActions = $('modalActions');

  // =========================================================
  // Game
  // =========================================================
  class Game {
    constructor(){
      this.config = null;
      this.boardMode = BOARD.BIG;
      this.mode = MODE.PVC;

      this.rows = 10;
      this.cols = 9;
      this.board = [];
      this.turn = 'r';

      this.players = { r:'human', b:'cpu' };
      this.cpuLevel = 'normal';

      this.settings = {
        soundOn: true,
        moveHints: true,
        dangerHints: false,
        fogCapture: true,
        chainCapture: true,
      };

      // dark state
      this.darkSide = { p1:null, p2:null };
      this.darkCaptured = { r:0, b:0 };
      this.noProgressPlies = 0;

      // chain
      this.chainActive = false;
      this.chainPieceId = null;

      this.selected = null;
      this.legalMoves = [];
      this.dangerSquares = new Set();

      // big check window
      this.checkWindow = null;

      this.history = [];
      this.idCounter = 1;
      this.gameOver = false;

      this.undoStack = [];
      this.locked = false;

      this.lastCpuFrom = null;
      this.lastCpuTo = null;
    }

    nextId(){ return this.idCounter++; }

    pushHistory(line){
      this.history.push(line);
      if(this.history.length > 300) this.history.shift();
    }

    snapshot(){
      return {
        config: this.config,
        boardMode: this.boardMode,
        mode: this.mode,
        rows: this.rows,
        cols: this.cols,
        board: this.board.map(row => row.map(p => p ? ({...p}) : null)),
        turn: this.turn,
        players: {...this.players},
        cpuLevel: this.cpuLevel,
        settings: {...this.settings},
        selected: this.selected ? {...this.selected} : null,
        legalMoves: this.legalMoves.map(m=>({...m})),
        darkSide: {...this.darkSide},
        darkCaptured: {...this.darkCaptured},
        noProgressPlies: this.noProgressPlies,
        history: [...this.history],
        idCounter: this.idCounter,
        gameOver: this.gameOver,
        chainActive: this.chainActive,
        chainPieceId: this.chainPieceId,
        lastCpuFrom: this.lastCpuFrom ? {...this.lastCpuFrom} : null,
        lastCpuTo: this.lastCpuTo ? {...this.lastCpuTo} : null,
        checkWindow: this.checkWindow ? {...this.checkWindow} : null,
      };
    }

    restore(s){
      Object.assign(this, {
        config: s.config,
        boardMode: s.boardMode,
        mode: s.mode,
        rows: s.rows,
        cols: s.cols,
        board: s.board.map(row => row.map(p => p ? ({...p}) : null)),
        turn: s.turn,
        players: {...s.players},
        cpuLevel: s.cpuLevel,
        settings: {...s.settings},
        selected: s.selected ? {...s.selected} : null,
        legalMoves: s.legalMoves.map(m=>({...m})),
        darkSide: {...s.darkSide},
        darkCaptured: {...s.darkCaptured},
        noProgressPlies: s.noProgressPlies,
        history: [...s.history],
        idCounter: s.idCounter,
        gameOver: s.gameOver,
        chainActive: s.chainActive,
        chainPieceId: s.chainPieceId,
        lastCpuFrom: s.lastCpuFrom ? {...s.lastCpuFrom} : null,
        lastCpuTo: s.lastCpuTo ? {...s.lastCpuTo} : null,
        checkWindow: s.checkWindow ? {...s.checkWindow} : null,
      });
      this.locked = false;
      this.dangerSquares = new Set();
    }

    saveUndoPoint(){
      this.undoStack.push(this.snapshot());
      if(this.undoStack.length > 200) this.undoStack.shift();
    }

    canUndo(){ return this.undoStack.length > 0 && !this.locked; }

    undo(){
      if(!this.canUndo()) return false;
      const isPVC = this.mode === MODE.PVC;
      if(!isPVC){
        const s = this.undoStack.pop();
        if(!s) return false;
        this.restore(s);
        return true;
      }
      while(this.undoStack.length){
        const s = this.undoStack.pop();
        this.restore(s);
        if(this.players[this.turn] === 'human') break;
      }
      return true;
    }

    initNew(cfg){
      this.config = cfg;
      this.boardMode = cfg.boardMode;
      this.mode = cfg.mode;
      this.cpuLevel = cfg.cpuLevel || 'normal';

      this.settings = {
        soundOn: cfg.soundOn ?? true,
        moveHints: cfg.moveHints ?? true,
        dangerHints: cfg.dangerHints ?? false,
        fogCapture: cfg.fogCapture ?? true,
        chainCapture: cfg.chainCapture ?? true,
      };
      AudioManager.setEnabled(this.settings.soundOn);

      // Players assignment:
      // - Big: PvC choose player's color; red always starts
      // - Big: PvP no choice; red always starts
      // - Dark: keep as seats; color decided by first flip
      if(this.boardMode === BOARD.BIG){
        this.turn = 'r'; // big always red first
        if(cfg.mode === MODE.PVC){
          const pc = cfg.bigPlayerColor || 'r';
          this.players = pc==='r' ? {r:'human', b:'cpu'} : {r:'cpu', b:'human'};
        }else{
          this.players = {r:'human', b:'human'};
        }
      }else{
        // Dark: start turn determined by dice/manual
        this.turn = cfg.startTurn || 'r';
        this.players = (cfg.mode === MODE.PVC) ? {r:'human', b:'cpu'} : {r:'human', b:'human'};
      }

      this.selected = null;
      this.legalMoves = [];
      this.chainActive = false;
      this.chainPieceId = null;

      this.history = [];
      this.idCounter = 1;
      this.gameOver = false;
      this.undoStack = [];
      this.noProgressPlies = 0;

      this.lastCpuFrom = null;
      this.lastCpuTo = null;

      this.checkWindow = null;

      if(this.boardMode === BOARD.BIG){
        const {board, rows, cols} = createBigBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
        this.pushHistory('新局 大盤 紅方先手');
      }else{
        const {board, rows, cols} = createDarkBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
        this.darkSide = {p1:null, p2:null};
        this.darkCaptured = {r:0, b:0};
        this.pushHistory(this.turn==='r' ? '新局 暗棋 玩家1先行動' : '新局 暗棋 玩家2先行動');
      }

      this.saveUndoPoint();
    }
  }

  let game = new Game();

  // =========================================================
  // Board creation
  // =========================================================
  function mkPiece(game, type, color, revealed=true){
    return { id: game.nextId(), type, color, revealed };
  }

  function createBigBoard(game){
    const rows=10, cols=9;
    const b = Array.from({length:rows}, ()=>Array(cols).fill(null));

    // Black
    b[0][0]=mkPiece(game,'R','b',true); b[0][1]=mkPiece(game,'N','b',true);
    b[0][2]=mkPiece(game,'B','b',true); b[0][3]=mkPiece(game,'A','b',true);
    b[0][4]=mkPiece(game,'K','b',true); b[0][5]=mkPiece(game,'A','b',true);
    b[0][6]=mkPiece(game,'B','b',true); b[0][7]=mkPiece(game,'N','b',true);
    b[0][8]=mkPiece(game,'R','b',true);
    b[2][1]=mkPiece(game,'C','b',true); b[2][7]=mkPiece(game,'C','b',true);
    [0,2,4,6,8].forEach(c=>b[3][c]=mkPiece(game,'P','b',true));

    // Red
    b[9][0]=mkPiece(game,'R','r',true); b[9][1]=mkPiece(game,'N','r',true);
    b[9][2]=mkPiece(game,'B','r',true); b[9][3]=mkPiece(game,'A','r',true);
    b[9][4]=mkPiece(game,'K','r',true); b[9][5]=mkPiece(game,'A','r',true);
    b[9][6]=mkPiece(game,'B','r',true); b[9][7]=mkPiece(game,'N','r',true);
    b[9][8]=mkPiece(game,'R','r',true);
    b[7][1]=mkPiece(game,'C','r',true); b[7][7]=mkPiece(game,'C','r',true);
    [0,2,4,6,8].forEach(c=>b[6][c]=mkPiece(game,'P','r',true));

    return {board:b, rows, cols};
  }

  function createDarkBoard(game){
    const rows = DARK.rows, cols = DARK.cols;
    const b = Array.from({length:rows}, ()=>Array(cols).fill(null));
    const bag = [];
    for(const color of ['r','b']){
      for(const [t,cnt] of Object.entries(DARK_COUNTS)){
        for(let i=0;i<cnt;i++){
          bag.push(mkPiece(game, t, color, false));
        }
      }
    }
    shuffle(bag);
    let k=0;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        b[r][c] = bag[k++];
      }
    }
    return {board:b, rows, cols};
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  // =========================================================
  // Big rules
  // =========================================================
  const DIRS4 = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

  function palaceContainsBig(color,r,c){
    if(c<3||c>5) return false;
    if(color==='b') return r>=0&&r<=2;
    return r>=7&&r<=9;
  }
  function riverCrossedBig(color,r){
    if(color==='r') return r<=4;
    return r>=5;
  }
  function elephantAllowedBig(color,r){
    if(color==='r') return r>=5;
    return r<=4;
  }

  function pseudoMovesBig(game, pos, p){
    const rows=game.rows, cols=game.cols, b=game.board;
    const out=[];
    const add=(r,c)=>{ if(inside(r,c,rows,cols)) out.push({r,c}); };

    switch(p.type){
      case 'K':
        for(const d of DIRS4){
          const r=pos.r+d.dr,c=pos.c+d.dc;
          if(!inside(r,c,rows,cols)) continue;
          if(!palaceContainsBig(p.color,r,c)) continue;
          add(r,c);
        } break;

      case 'A':{
        const ds=[{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}];
        for(const d of ds){
          const r=pos.r+d.dr,c=pos.c+d.dc;
          if(!inside(r,c,rows,cols)) continue;
          if(!palaceContainsBig(p.color,r,c)) continue;
          add(r,c);
        } break;
      }

      case 'B':{
        const ds=[{dr:-2,dc:-2},{dr:-2,dc:2},{dr:2,dc:-2},{dr:2,dc:2}];
        for(const d of ds){
          const r=pos.r+d.dr,c=pos.c+d.dc;
          const er=pos.r+d.dr/2, ec=pos.c+d.dc/2;
          if(!inside(r,c,rows,cols)) continue;
          if(b[er][ec]) continue;
          if(!elephantAllowedBig(p.color,r)) continue;
          add(r,c);
        } break;
      }

      case 'N':{
        const cand=[
          {dr:-2,dc:-1, lr:-1,lc:0},{dr:-2,dc:1, lr:-1,lc:0},
          {dr:2,dc:-1, lr:1,lc:0},{dr:2,dc:1, lr:1,lc:0},
          {dr:-1,dc:-2, lr:0,lc:-1},{dr:1,dc:-2, lr:0,lc:-1},
          {dr:-1,dc:2, lr:0,lc:1},{dr:1,dc:2, lr:0,lc:1},
        ];
        for(const d of cand){
          const legR=pos.r+d.lr, legC=pos.c+d.lc;
          const r=pos.r+d.dr, c=pos.c+d.dc;
          if(!inside(r,c,rows,cols)) continue;
          if(b[legR][legC]) continue; // 拐馬腳
          add(r,c);
        } break;
      }

      case 'R':
        for(const d of DIRS4){
          let r=pos.r+d.dr, c=pos.c+d.dc;
          while(inside(r,c,rows,cols)){
            add(r,c);
            if(b[r][c]) break;
            r+=d.dr; c+=d.dc;
          }
        } break;

      case 'C':
        for(const d of DIRS4){
          let r=pos.r+d.dr, c=pos.c+d.dc;
          while(inside(r,c,rows,cols) && !b[r][c]){
            add(r,c);
            r+=d.dr; c+=d.dc;
          }
          if(!inside(r,c,rows,cols)) continue;
          r+=d.dr; c+=d.dc;
          while(inside(r,c,rows,cols)){
            if(b[r][c]){ add(r,c); break; }
            r+=d.dr; c+=d.dc;
          }
        } break;

      case 'P':{
        const f = p.color==='r' ? -1 : 1;
        add(pos.r+f,pos.c);
        if(riverCrossedBig(p.color,pos.r)){
          add(pos.r,pos.c-1);
          add(pos.r,pos.c+1);
        }
      } break;
    }
    return out;
  }

  function findKing(board, color){
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        const p=board[r][c];
        if(p&&p.color===color&&p.type==='K') return {r,c};
      }
    }
    return null;
  }

  function areKingsFacingBig(board){
    const kr=findKing(board,'r');
    const kb=findKing(board,'b');
    if(!kr||!kb) return false;
    if(kr.c!==kb.c) return false;
    const col=kr.c;
    for(let r=Math.min(kr.r,kb.r)+1; r<=Math.max(kr.r,kb.r)-1; r++){
      if(board[r][col]) return false;
    }
    return true;
  }

  function attackedSquaresBig(game, board, attacker){
    const rows=board.length, cols=board[0].length;
    const set=new Set();
    const add=(r,c)=>{ if(inside(r,c,rows,cols)) set.add(`${r},${c}`); };
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const p=board[r][c];
        if(!p||p.color!==attacker) continue;
        const pseudo = pseudoMovesBig({...game, board, rows, cols}, {r,c}, p);
        for(const m of pseudo) add(m.r,m.c);
      }
    }
    return set;
  }

  function inCheckBig(game, board, color){
    const k=findKing(board,color);
    if(!k) return false;
    const enemy=opp(color);
    const atk=attackedSquaresBig(game, board, enemy);
    return atk.has(`${k.r},${k.c}`);
  }

  function simulateBigMove(game, from, to){
    const b = game.board.map(row=>row.map(p=>p?({...p}):null));
    const mover=b[from.r][from.c];
    const tgt=b[to.r][to.c];
    if(!mover) return null;
    if(tgt && tgt.color===mover.color) return null;
    b[to.r][to.c]=mover;
    b[from.r][from.c]=null;
    if(areKingsFacingBig(b)) return null;
    if(inCheckBig(game, b, mover.color)) return null;
    return b;
  }

  function legalMovesBig(game, from){
    const p=game.board[from.r][from.c];
    if(!p || p.color!==game.turn) return [];
    const pseudo = pseudoMovesBig(game, from, p);
    const out=[];
    for(const m of pseudo){
      const b2 = simulateBigMove(game, from, m);
      if(!b2) continue;
      out.push({...m});
    }
    return out;
  }

  // =========================================================
  // Dark control
  // =========================================================
  function darkPlayerColorForTurn(game){
    const seat = game.turn === 'r' ? 'p1' : 'p2';
    return game.darkSide[seat];
  }
  function darkSeatForColor(game, pieceColor){
    if(game.darkSide.p1 === pieceColor) return 'r';
    if(game.darkSide.p2 === pieceColor) return 'b';
    return null;
  }

  function darkLegalMovesForPiece(game, from){
    const rows=game.rows, cols=game.cols;
    const p=game.board[from.r][from.c];
    if(!p || !p.revealed) return [];
    const myColor = darkPlayerColorForTurn(game);
    if(!myColor) return [];
    if(p.color !== myColor) return [];
    if(game.chainActive && game.chainPieceId !== p.id) return [];

    const moves = [];
    const add = (r,c,kind)=>moves.push({r,c,kind});
    const fogOn = !!game.settings.fogCapture;

    if(p.type === 'C'){
      for(const d of DIRS4){
        const r=from.r+d.dr, c=from.c+d.dc;
        if(!inside(r,c,rows,cols)) continue;
        if(!game.board[r][c]) add(r,c,'move');
      }
      for(const d of DIRS4){
        let r=from.r+d.dr, c=from.c+d.dc;
        let screen=false;
        while(inside(r,c,rows,cols)){
          if(game.board[r][c]){
            screen=true;
            r+=d.dr; c+=d.dc;
            break;
          }
          r+=d.dr; c+=d.dc;
        }
        if(!screen) continue;
        while(inside(r,c,rows,cols)){
          const t=game.board[r][c];
          if(t){
            if(t.color !== myColor){
              if(t.revealed) add(r,c,'capCannon');
              else if(fogOn) add(r,c,'capCannonFog');
            }
            break;
          }
          r+=d.dr; c+=d.dc;
        }
      }
      return moves;
    }

    for(const d of DIRS4){
      const r=from.r+d.dr, c=from.c+d.dc;
      if(!inside(r,c,rows,cols)) continue;
      const t=game.board[r][c];
      if(!t){
        if(game.chainActive) continue;
        add(r,c,'move');
      }else{
        if(t.color === myColor) continue;
        if(t.revealed){
          if(canCaptureFuntown(p, t)) add(r,c,'cap');
        }else if(fogOn){
          add(r,c,'capFog');
        }
      }
    }
    return moves;
  }

  function darkHasAnyCaptureFrom(game, from){
    const ms = darkLegalMovesForPiece(game, from);
    return ms.some(m => m.kind.startsWith('cap'));
  }

  function darkAllLegalActions(game){
    const actions = [];
    for(let r=0;r<game.rows;r++){
      for(let c=0;c<game.cols;c++){
        const p=game.board[r][c];
        if(p && !p.revealed) actions.push({type:'flip', at:{r,c}});
      }
    }
    const myColor = darkPlayerColorForTurn(game);
    if(!myColor) return actions;

    for(let r=0;r<game.rows;r++){
      for(let c=0;c<game.cols;c++){
        const p=game.board[r][c];
        if(!p || !p.revealed) continue;
        if(p.color !== myColor) continue;
        if(game.chainActive && game.chainPieceId !== p.id) continue;
        const from={r,c};
        for(const m of darkLegalMovesForPiece(game, from)){
          actions.push({type:'move', from, to:{r:m.r,c:m.c}, kind:m.kind});
        }
      }
    }
    return actions;
  }

  // =========================================================
  // Render
  // =========================================================
  function showScreen(which){
    if(which==='menu'){
      menuScreen.classList.remove('hidden');
      gameScreen.classList.add('hidden');
    }else{
      menuScreen.classList.add('hidden');
      gameScreen.classList.remove('hidden');
    }
  }

  function setSub(text){ subStatusLine.textContent = text || ''; }

  function renderAll(){
    renderBoard();
    renderStatus();
    renderHistory();
    autoSave();
  }

  function renderStatus(){
    const modeText = game.mode === MODE.PVP ? '雙人' : `玩家對電腦 ${CPU_LEVELS[game.cpuLevel]?.name || game.cpuLevel}`;

    if(game.boardMode === BOARD.DARK){
      const seatText = game.turn==='r'?'玩家1':'玩家2';
      const p1 = game.darkSide.p1 ? (game.darkSide.p1==='r'?'紅':'黑') : '未定';
      const p2 = game.darkSide.p2 ? (game.darkSide.p2==='r'?'紅':'黑') : '未定';
      const myColor = darkPlayerColorForTurn(game);
      const colorText = myColor ? (myColor==='r'?'操紅':'操黑') : '請翻棋決定顏色';

      statusLine.textContent =
        `暗棋 4×8 ${modeText} 輪到 ${seatText} ${colorText} 玩家1 ${p1} 玩家2 ${p2} 吃子 紅 ${game.darkCaptured.r} 黑 ${game.darkCaptured.b}`;

      darkToggles.classList.remove('hidden');
      inFogCapture.checked = !!game.settings.fogCapture;
      inChainCapture.checked = !!game.settings.chainCapture;

      btnStopChain.classList.toggle('hidden', !(game.chainActive && game.players[game.turn]==='human' && game.settings.chainCapture));
    }else{
      const turnText = game.turn==='r'?'紅方':'黑方';
      statusLine.textContent = `大盤 9×10 ${modeText} 輪到 ${turnText} 紅方先手固定`;

      darkToggles.classList.add('hidden');
      btnStopChain.classList.add('hidden');
    }

    inSound.checked = !!game.settings.soundOn;
    inMoveHints.checked = !!game.settings.moveHints;
    inDangerHints.checked = !!game.settings.dangerHints;

    btnUndo.disabled = !game.canUndo();
  }

  function renderHistory(){
    historyEl.textContent = game.history.slice(-90).join('\n');
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function cellKey(r,c){ return `${r},${c}`; }

  function renderBoard(){
    boardEl.style.setProperty('--cols', String(game.cols));
    boardEl.style.setProperty('--rows', String(game.rows));
    boardEl.innerHTML = '';

    if(game.boardMode === BOARD.BIG){
      const band = document.createElement('div');
      band.className='riverBand';
      band.innerHTML = `<div class="bandSplit"></div><div class="riverText"><span>楚河</span><span>漢界</span></div>`;
      boardEl.appendChild(band);
    }else{
      const band = document.createElement('div');
      band.className='darkBand';
      band.innerHTML = `<div class="darkTitle">暗棋</div>`;
      boardEl.appendChild(band);
    }

    // danger squares simplified
    game.dangerSquares = new Set();
    if(game.settings.dangerHints){
      if(game.boardMode === BOARD.BIG){
        const enemy = opp(game.turn);
        const atk = attackedSquaresBig(game, game.board, enemy);
        atk.forEach(k=>game.dangerSquares.add(k));
      }else{
        const myColor = darkPlayerColorForTurn(game);
        if(myColor){
          const enemyColor = opp(myColor);
          const enemySeat = darkSeatForColor(game, enemyColor);
          if(enemySeat){
            const tempTurn = game.turn;
            game.turn = enemySeat;
            const acts = darkAllLegalActions(game).filter(a=>a.type==='move' && a.kind.startsWith('cap'));
            for(const a of acts) game.dangerSquares.add(cellKey(a.to.r,a.to.c));
            game.turn = tempTurn;
          }
        }
      }
    }

    // check button only big
    if(game.boardMode === BOARD.BIG && game.checkWindow && !game.gameOver){
      const still = inCheckBig(game, game.board, game.checkWindow.defender);
      const show = still && game.players[game.checkWindow.attacker]==='human';
      btnCheckWin.classList.toggle('hidden', !show);
      btnCheckWin.classList.toggle('flash', show);
    }else{
      btnCheckWin.classList.add('hidden');
      btnCheckWin.classList.remove('flash');
    }

    for(let r=0;r<game.rows;r++){
      for(let c=0;c<game.cols;c++){
        const cell = document.createElement('div');
        cell.className='cell';
        cell.dataset.r=String(r);
        cell.dataset.c=String(c);

        if(c===game.cols-1) cell.classList.add('edgeR');
        if(r===game.rows-1) cell.classList.add('edgeB');
        if(((r+c)%5)===0) cell.classList.add('cornerMark');

        if(game.selected && game.selected.r===r && game.selected.c===c){
          cell.classList.add('selected');
        }

        if(game.settings.moveHints && game.selected){
          const hit = game.legalMoves.find(m=>m.r===r && m.c===c);
          if(hit){
            const t = game.board[r][c];
            cell.classList.add(t ? 'hintCapture':'hintMove');
          }
        }

        if(game.settings.dangerHints && game.dangerSquares.has(cellKey(r,c))){
          cell.classList.add('danger');
        }

        if(game.lastCpuFrom && game.lastCpuFrom.r===r && game.lastCpuFrom.c===c){
          cell.classList.add('cpuFrom');
        }
        if(game.lastCpuTo && game.lastCpuTo.r===r && game.lastCpuTo.c===c){
          cell.classList.add('cpuTo');
        }

        const p = game.board[r][c];
        if(p){
          if(game.boardMode === BOARD.DARK){
            const wrap = document.createElement('div');
            wrap.className='flipWrap';

            const inner = document.createElement('div');
            inner.className='flipInner' + (p.revealed ? ' flipped':'');
            inner.dataset.pid = String(p.id);

            const back = document.createElement('div');
            back.className='flipFace back';
            back.appendChild(makePieceEl(p, true));

            const front = document.createElement('div');
            front.className='flipFace front';
            front.appendChild(makePieceEl(p, false));

            inner.appendChild(back);
            inner.appendChild(front);
            wrap.appendChild(inner);
            cell.appendChild(wrap);
          }else{
            cell.appendChild(makePieceEl(p, false));
          }
        }

        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function makePieceEl(p, forceBack){
    const el = document.createElement('div');
    if(forceBack || (game.boardMode===BOARD.DARK && !p.revealed)){
      el.className = 'piece back';
      el.textContent = '';
      return el;
    }
    const cls = p.color==='r'?'red':'black';
    el.className = `piece ${cls}`;
    el.textContent = GLYPH[p.color][p.type];
    return el;
  }

  // =========================================================
  // Interaction
  // =========================================================
  function posFromCell(el){
    return { r: parseInt(el.dataset.r,10), c: parseInt(el.dataset.c,10) };
  }

  async function onCellClick(e){
    if(game.gameOver) return;
    if(game.locked) return;
    if(game.players[game.turn] !== 'human') return;

    const pos = posFromCell(e.currentTarget);
    if(game.boardMode === BOARD.BIG){
      handleBigClick(pos);
      return;
    }
    await handleDarkClick(pos);
  }

  function handleBigClick(pos){
    const p = game.board[pos.r][pos.c];

    if(!game.selected){
      if(p && p.color===game.turn){
        game.selected = pos;
        game.legalMoves = legalMovesBig(game, pos);
        AudioManager.play('select');
        renderAll();
      } else {
        AudioManager.play('error');
      }
      return;
    }

    if(p && p.color===game.turn){
      if(game.selected.r===pos.r && game.selected.c===pos.c){
        game.selected=null; game.legalMoves=[];
        AudioManager.play('select');
        renderAll();
        return;
      }
      game.selected=pos;
      game.legalMoves=legalMovesBig(game,pos);
      AudioManager.play('select');
      renderAll();
      return;
    }

    const ok = game.legalMoves.some(m=>m.r===pos.r && m.c===pos.c);
    if(!ok){
      AudioManager.play('error');
      setSub('不合法目的地');
      return;
    }

    game.saveUndoPoint();

    const from = game.selected;
    const mover = game.board[from.r][from.c];
    const target = game.board[pos.r][pos.c];

    game.board[pos.r][pos.c] = mover;
    game.board[from.r][from.c] = null;
    game.selected=null; game.legalMoves=[];

    AudioManager.play(target ? 'capture':'move');
    game.pushHistory(`${game.turn==='r'?'紅':'黑'} ${GLYPH[mover.color][mover.type]} ${from.r+1},${from.c+1} 到 ${pos.r+1},${pos.c+1}${target?` 吃 ${GLYPH[target.color][target.type]}`:''}`);

    game.turn = opp(game.turn);

    const defender = game.turn;
    const attacker = opp(defender);
    if(inCheckBig(game, game.board, defender)){
      game.checkWindow = { attacker, defender };
      AudioManager.play('check');
      setSub('將軍 可按將軍立即獲勝');
      if(game.players[attacker]==='cpu'){
        renderAll();
        setTimeout(()=>{
          if(game.checkWindow && inCheckBig(game, game.board, defender)){
            endGame(attacker, '電腦按下將軍');
          }
        }, 600);
      }
    }else{
      game.checkWindow = null;
      setSub('');
    }

    renderAll();
    maybeCpuAct();
  }

  async function handleDarkClick(pos){
    const p = game.board[pos.r][pos.c];

    if(game.chainActive){
      const chainPos = findPieceById(game.board, game.chainPieceId);
      if(chainPos && (chainPos.r!==pos.r || chainPos.c!==pos.c)){
        if(game.selected && game.selected.r===chainPos.r && game.selected.c===chainPos.c){
          const ok = game.legalMoves.some(m=>m.r===pos.r && m.c===pos.c);
          if(ok){ await darkDoMove(chainPos, pos, false); return; }
        }
        game.selected = chainPos;
        game.legalMoves = darkLegalMovesForPiece(game, chainPos);
      }
    }

    if(game.selected){
      const ok = game.legalMoves.some(m=>m.r===pos.r && m.c===pos.c);
      if(!ok){
        if(!game.chainActive && p && p.revealed){
          const myColor = darkPlayerColorForTurn(game);
          if(myColor && p.color===myColor){
            game.selected = pos;
            game.legalMoves = darkLegalMovesForPiece(game, pos);
            AudioManager.play('select');
            renderAll();
            return;
          }
        }
        AudioManager.play('error');
        setSub('不合法目的地');
        return;
      }
      await darkDoMove(game.selected, pos, false);
      return;
    }

    if(!p){ AudioManager.play('error'); return; }

    if(!p.revealed){
      await darkDoFlip(pos, false);
      return;
    }

    const myColor = darkPlayerColorForTurn(game);
    if(!myColor){
      AudioManager.play('error');
      setSub('請先翻棋決定顏色');
      return;
    }
    if(p.color !== myColor){
      AudioManager.play('error');
      setSub('只能操作自己顏色');
      return;
    }

    game.selected = pos;
    game.legalMoves = darkLegalMovesForPiece(game, pos);
    AudioManager.play('select');
    renderAll();
  }

  // =========================================================
  // Dark actions
  // =========================================================
  async function darkDoFlip(at, isCpu=false){
    const p = game.board[at.r][at.c];
    if(!p || p.revealed) return;

    game.saveUndoPoint();
    game.locked = true;
    renderAll();

    if(isCpu) await cpuPreHighlight(at);

    p.revealed = true;
    await animateFlip(at);

    if(!game.darkSide.p1 && !game.darkSide.p2){
      const seat = game.turn==='r' ? 'p1' : 'p2';
      const other = seat==='p1' ? 'p2' : 'p1';
      game.darkSide[seat] = p.color;
      game.darkSide[other] = opp(p.color);
      game.pushHistory(`${game.turn==='r'?'玩家1':'玩家2'} 翻到 ${p.color==='r'?'紅':'黑'}`);
    }else{
      game.pushHistory(`${game.turn==='r'?'玩家1':'玩家2'} 翻開 ${GLYPH[p.color][p.type]}`);
    }

    game.noProgressPlies = 0;
    game.chainActive = false;
    game.chainPieceId = null;

    AudioManager.play('capture');

    game.turn = opp(game.turn);
    game.selected=null; game.legalMoves=[];
    game.lastCpuFrom = null;
    game.lastCpuTo = at;

    game.locked = false;
    renderAll();
    checkDarkEndOrDraw();
    await maybeCpuAct();
  }

  function getMoveKind(to){
    const m = game.legalMoves.find(x=>x.r===to.r && x.c===to.c);
    return m ? m.kind : null;
  }

  async function darkDoMove(from, to, isCpu=false){
    const mover = game.board[from.r][from.c];
    if(!mover) return;

    const kind = getMoveKind(to);
    if(!kind){ AudioManager.play('error'); return; }

    const target = game.board[to.r][to.c];
    const myColor = darkPlayerColorForTurn(game);

    game.saveUndoPoint();
    game.locked = true;
    renderAll();

    if(isCpu) await cpuPreHighlight(from);

    if(kind === 'capFog' || kind === 'capCannonFog'){
      if(target && !target.revealed){
        target.revealed = true;
        await animateFlip(to);
      }
      if(!target || target.color === myColor){
        AudioManager.play('error');
        game.locked = false;
        renderAll();
        return;
      }
      if(mover.type !== 'C' && !canCaptureFuntown(mover, target)){
        AudioManager.play('error');
        game.pushHistory('暗吃失敗 目標翻開');
        game.chainActive = false;
        game.chainPieceId = null;
        game.selected=null; game.legalMoves=[];
        game.turn = opp(game.turn);
        game.noProgressPlies += 1;
        game.locked = false;
        renderAll();
        await maybeCpuAct();
        return;
      }
    }

    await animatePieceTravel(from, to);

    const isCapture = kind.startsWith('cap');
    if(isCapture){
      await animateCaptureFade(to);
      if(target) game.darkCaptured[target.color] += 1;
    }

    game.board[to.r][to.c] = mover;
    game.board[from.r][from.c] = null;

    AudioManager.play(isCapture ? 'capture' : 'move');

    if(isCapture) game.noProgressPlies = 0;
    else game.noProgressPlies += 1;

    game.pushHistory(`${game.turn==='r'?'玩家1':'玩家2'} ${GLYPH[mover.color][mover.type]} 移動`);

    game.selected=null; game.legalMoves=[];
    game.lastCpuFrom = isCpu ? from : null;
    game.lastCpuTo = isCpu ? to : null;

    if(isCapture && game.settings.chainCapture){
      const newPos = {r:to.r, c:to.c};
      game.chainActive = darkHasAnyCaptureFrom(game, newPos);
      game.chainPieceId = game.chainActive ? mover.id : null;

      if(game.chainActive){
        setSub('連吃中 可繼續吃或按結束連吃');
        game.selected = newPos;
        game.legalMoves = darkLegalMovesForPiece(game, newPos);
      }else{
        setSub('');
        game.turn = opp(game.turn);
      }
    }else{
      game.chainActive = false;
      game.chainPieceId = null;
      setSub('');
      game.turn = opp(game.turn);
    }

    game.locked = false;
    renderAll();

    if(isCpu) await highlightCpuSquares(from,to);

    checkDarkEndOrDraw();
    await maybeCpuAct();
  }

  function stopChainIfAny(){
    if(game.boardMode !== BOARD.DARK) return;
    if(!game.chainActive) return;
    game.chainActive = false;
    game.chainPieceId = null;
    game.selected=null; game.legalMoves=[];
    setSub('已結束連吃 換對手');
    game.turn = opp(game.turn);
    renderAll();
    maybeCpuAct();
  }

  function checkDarkEndOrDraw(){
    if(game.boardMode !== BOARD.DARK) return;
    if(game.darkCaptured.r >= 16){ endGame('b', '黑方吃完紅方'); return; }
    if(game.darkCaptured.b >= 16){ endGame('r', '紅方吃完黑方'); return; }
    if(game.noProgressPlies >= 50){ endDraw('空步判和'); }
  }

  function findPieceById(board, id){
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        const p=board[r][c];
        if(p && p.id===id) return {r,c};
      }
    }
    return null;
  }

  // =========================================================
  // CPU
  // =========================================================
  async function maybeCpuAct(){
    if(game.gameOver) return;
    if(game.locked) return;
    if(game.players[game.turn] !== 'cpu') return;

    await sleep(260);

    if(game.boardMode === BOARD.BIG){
      await cpuActBig();
      return;
    }
    await cpuActDark();
  }

  async function cpuActBig(){
    const all=[];
    for(let r=0;r<game.rows;r++){
      for(let c=0;c<game.cols;c++){
        const p=game.board[r][c];
        if(!p || p.color!==game.turn) continue;
        const from={r,c};
        const ms=legalMovesBig(game, from);
        for(const m of ms){
          const t=game.board[m.r][m.c];
          all.push({from, to:{r:m.r,c:m.c}, cap:!!t});
        }
      }
    }
    if(!all.length){
      endGame(opp(game.turn), '無合法步');
      return;
    }
    all.sort((a,b)=> (b.cap?1:0)-(a.cap?1:0) + (Math.random()-0.5)*0.1 );
    const choice = all[0];

    game.saveUndoPoint();
    game.locked=true;
    renderAll();

    await cpuPreHighlight(choice.from);
    await animatePieceTravel(choice.from, choice.to);
    if(choice.cap) await animateCaptureFade(choice.to);

    const mover=game.board[choice.from.r][choice.from.c];
    game.board[choice.to.r][choice.to.c]=mover;
    game.board[choice.from.r][choice.from.c]=null;

    AudioManager.play(choice.cap?'capture':'move');
    game.pushHistory('電腦走子');

    game.turn = opp(game.turn);
    game.locked=false;
    game.lastCpuFrom = choice.from;
    game.lastCpuTo = choice.to;
    renderAll();
    await highlightCpuSquares(choice.from, choice.to);

    const defender = game.turn;
    const attacker = opp(defender);
    if(inCheckBig(game, game.board, defender)){
      game.checkWindow = { attacker, defender };
      AudioManager.play('check');
      setSub('將軍');
      renderAll();
      setTimeout(()=>{
        if(game.checkWindow && inCheckBig(game, game.board, defender)){
          endGame(attacker, '電腦按下將軍');
        }
      }, 600);
    }else{
      game.checkWindow=null;
      setSub('');
    }
  }

  async function cpuActDark(){
    const lvl = CPU_LEVELS[game.cpuLevel] || CPU_LEVELS.normal;
    const actions = darkAllLegalActions(game);
    if(!actions.length){
      endGame(opp(game.turn), '無可行動');
      return;
    }

    let best=null;
    let bestScore=-Infinity;

    for(const a of actions){
      let s=0;
      if(a.type==='flip'){
        const myColor = darkPlayerColorForTurn(game);
        s += (!myColor ? 900 : 20);
        s += Math.random()*8;
      }else{
        if(a.kind.startsWith('cap')) s += 200;
        else s += 10;
        s += (Math.random()*2-1) * (lvl.noise||0);
      }
      if(s>bestScore){ bestScore=s; best=a; }
    }

    if(best.type==='flip'){ await darkDoFlip(best.at, true); return; }
    await darkDoMove(best.from, best.to, true);

    if(game.chainActive && game.players[game.turn]==='cpu'){
      const stopProb = (lvl.noise>0) ? 0.25 : 0.12;
      if(Math.random() < stopProb) stopChainIfAny();
    }
  }

  // =========================================================
  // Animations
  // =========================================================
  function getCellEl(pos){
    return boardEl.querySelector(`.cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
  }

  async function cpuPreHighlight(pos){
    const cell = getCellEl(pos);
    if(!cell) return;
    cell.classList.add('cpuFlash');
    await sleep(260);
    cell.classList.remove('cpuFlash');
  }

  async function highlightCpuSquares(){ await sleep(1000); }

  async function animateFlip(){ renderAll(); await sleep(460); }

  async function animateCaptureFade(at){
    const cell = getCellEl(at);
    if(!cell) return;
    const frontPiece = cell.querySelector('.flipInner.flipped .front .piece');
    const targetEl = frontPiece || cell.querySelector('.piece') || cell.querySelector('.flipWrap');
    if(!targetEl) return;
    targetEl.classList.add('fadeOut');
    await sleep(280);
  }

  async function animatePieceTravel(from,to){
    const fromCell = getCellEl(from);
    const toCell = getCellEl(to);
    if(!fromCell || !toCell) return;

    const fromPiece = fromCell.querySelector('.piece, .flipWrap');
    if(!fromPiece) return;

    const rectFrom = fromPiece.getBoundingClientRect();
    const rectTo = toCell.getBoundingClientRect();

    const clone = fromPiece.cloneNode(true);
    clone.classList.add('flying');
    document.body.appendChild(clone);

    clone.style.left = `${rectFrom.left}px`;
    clone.style.top = `${rectFrom.top}px`;
    clone.style.width = `${rectFrom.width}px`;
    clone.style.height = `${rectFrom.height}px`;
    clone.style.transform = `translate(0px,0px)`;

    const dx = rectTo.left + rectTo.width/2 - (rectFrom.left + rectFrom.width/2);
    const dy = rectTo.top + rectTo.height/2 - (rectFrom.top + rectFrom.height/2);

    clone.animate(
      [{ transform:`translate(0px,0px)` }, { transform:`translate(${dx}px,${dy}px)` }],
      { duration: 260, easing:'cubic-bezier(.2,.8,.2,1)' }
    );

    await sleep(270);
    clone.remove();
  }

  // =========================================================
  // Modal
  // =========================================================
  function openModal({title, bodyHTML, bodyNode, actions}){
    modalTitle.textContent = title || '提示';
    modalBody.innerHTML='';
    if(bodyNode) modalBody.appendChild(bodyNode);
    else modalBody.innerHTML = bodyHTML || '';
    modalActions.innerHTML='';
    (actions||[]).forEach(a=>{
      const b=document.createElement('button');
      b.textContent=a.text||'OK';
      b.className=a.primary?'primary':'ghost';
      b.onclick=()=>a.onClick && a.onClick();
      modalActions.appendChild(b);
    });
    modalOverlay.classList.remove('hidden');
    modalOverlay.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    modalOverlay.classList.add('hidden');
    modalOverlay.setAttribute('aria-hidden','true');
    modalBody.innerHTML='';
    modalActions.innerHTML='';
  }

  // =========================================================
  // End game
  // =========================================================
  function endGame(winnerColor, reason){
    if(game.gameOver) return;
    game.gameOver = true;
    AudioManager.play('win');
    renderAll();
    openModal({
      title:'遊戲結束',
      bodyHTML:`<div style="font-size:16px;"><b>${winnerColor==='r'?'紅方':'黑方'}獲勝</b> ${escapeHTML(reason||'')}</div>`,
      actions:[
        {text:'重新開始', primary:true, onClick:()=>{ closeModal(); restartSameConfig(); }},
        {text:'回主選單', onClick:()=>{ closeModal(); toMenu(true); }},
      ]
    });
  }
  function endDraw(reason){
    if(game.gameOver) return;
    game.gameOver = true;
    renderAll();
    openModal({
      title:'和局',
      bodyHTML:`<div style="font-size:16px;"><b>和局</b> ${escapeHTML(reason||'')}</div>`,
      actions:[
        {text:'重新開始', primary:true, onClick:()=>{ closeModal(); restartSameConfig(); }},
        {text:'回主選單', onClick:()=>{ closeModal(); toMenu(true); }},
      ]
    });
  }
  function escapeHTML(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#39;");
  }

  // =========================================================
  // Save / Load
  // =========================================================
  function autoSave(){
    if(!game.config) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:1, savedAt:Date.now(), state: game.snapshot() }));
  }
  function clearSave(){ localStorage.removeItem(STORAGE_KEY); }
  function tryLoadSave(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    try{
      const o = JSON.parse(raw);
      if(!o || o.version !== 1) return null;
      return o;
    }catch(_e){ return null; }
  }

  // =========================================================
  // Menu logic
  // =========================================================
  function updateMenuVisibility(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardMode = document.querySelector('input[name="boardMode"]:checked').value;
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked')?.value || 'manual';

    cpuPanel.classList.toggle('hidden', mode !== MODE.PVC);

    // Big rules:
    // - no dice panel
    // - PvC show big color picker
    // - PvP hide big color picker
    if(boardMode === BOARD.BIG){
      dicePanel.classList.add('hidden');
      darkOptionsPanel.classList.add('hidden');
      bigColorPanel.classList.toggle('hidden', mode !== MODE.PVC);
      manualFirstRow.classList.add('hidden');
      return;
    }

    // Dark rules:
    // - show dice
    // - show dark options
    dicePanel.classList.remove('hidden');
    darkOptionsPanel.classList.remove('hidden');
    bigColorPanel.classList.add('hidden');

    manualFirstRow.classList.toggle('hidden', firstMethod !== 'manual');
  }

  function getMenuConfig(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardMode = document.querySelector('input[name="boardMode"]:checked').value;
    const cpuLevel = $('cpuLevel').value;

    const moveHints = $('optMoveHints').checked;
    const dangerHints = $('optDangerHints').checked;
    const soundOn = $('optSound').checked;

    // big player color only relevant for big + pvc
    const bigPlayerColor = document.querySelector('input[name="bigPlayerColor"]:checked')?.value || 'r';

    // dark dice only relevant for dark
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked')?.value || 'manual';
    const manualFirst = document.querySelector('input[name="manualFirst"]:checked')?.value || 'r';

    return {
      mode, boardMode, cpuLevel,
      moveHints, dangerHints, soundOn,
      bigPlayerColor,
      firstMethod, manualFirst,
      fogCapture: optFogCapture?.checked ?? true,
      chainCapture: optChainCapture?.checked ?? true,
    };
  }

  function startNewGameFromMenu(){
    const cfg0 = getMenuConfig();

    // Big: fixed red first, no dice
    if(cfg0.boardMode === BOARD.BIG){
      const cfg = {
        mode: cfg0.mode,
        boardMode: cfg0.boardMode,
        cpuLevel: cfg0.cpuLevel,
        moveHints: cfg0.moveHints,
        dangerHints: cfg0.dangerHints,
        soundOn: cfg0.soundOn,
        bigPlayerColor: (cfg0.mode === MODE.PVC) ? cfg0.bigPlayerColor : 'r',
        startTurn: 'r',
      };
      game = new Game();
      game.initNew(cfg);
      showScreen('game');
      setSub('');
      renderAll();
      maybeCpuAct();
      return;
    }

    // Dark: can use dice/manual
    const cfg = {
      mode: cfg0.mode,
      boardMode: cfg0.boardMode,
      cpuLevel: cfg0.cpuLevel,
      moveHints: cfg0.moveHints,
      dangerHints: cfg0.dangerHints,
      soundOn: cfg0.soundOn,
      fogCapture: cfg0.fogCapture,
      chainCapture: cfg0.chainCapture,
      startTurn: cfg0.manualFirst,
    };

    const startWith = (startTurn)=>{
      cfg.startTurn = startTurn;
      game = new Game();
      game.initNew(cfg);
      showScreen('game');
      setSub('');
      renderAll();
      maybeCpuAct();
    };

    if(cfg0.firstMethod === 'manual'){
      startWith(cfg0.manualFirst);
      return;
    }
    openDiceModal(cfg0.firstMethod, cfg, (startTurn)=>startWith(startTurn));
  }

  function restartSameConfig(){
    if(!game.config) return;
    const cfg = {...game.config};
    cfg.moveHints = game.settings.moveHints;
    cfg.dangerHints = game.settings.dangerHints;
    cfg.soundOn = game.settings.soundOn;
    cfg.fogCapture = game.settings.fogCapture;
    cfg.chainCapture = game.settings.chainCapture;
    cfg.bigPlayerColor = cfg.bigPlayerColor || 'r';
    game = new Game();
    game.initNew(cfg);
    setSub('');
    renderAll();
    maybeCpuAct();
  }

  function toMenu(save=true){
    if(save) autoSave();
    showScreen('menu');
    updateMenuVisibility();
  }

  // =========================================================
  // Dice modal for dark only
  // =========================================================
  function weightedDiceForCpu(levelKey){
    const lvl = CPU_LEVELS[levelKey] || CPU_LEVELS.normal;
    const p6 = clamp(lvl.p6 ?? (1/6), 1/6, 0.5);
    const rest = (1 - p6) / 5;
    const probs = [rest,rest,rest,rest,rest,p6];
    const x = Math.random();
    let acc = 0;
    for(let i=0;i<6;i++){
      acc += probs[i];
      if(x <= acc) return i+1;
    }
    return 6;
  }
  function uniformDice(){ return 1 + Math.floor(Math.random()*6); }

  function openDiceModal(firstMethod, cfg, onDone){
    let phase = 'r';
    let rVal=null, bVal=null;
    let interval=null;

    const isCpu = (seat) => cfg.mode===MODE.PVC && seat==='b';

    const body = document.createElement('div');
    body.innerHTML = `
      <div>紅方與黑方各擲一次 點數大者先行動 同點重擲</div>
      <div class="diceBox">
        <div class="diceRow"><div class="diceLabel">玩家1</div><div id="dvR" class="diceValue red">–</div></div>
        <div class="diceRow"><div class="diceLabel">玩家2</div><div id="dvB" class="diceValue black">–</div></div>
      </div>
      <div id="diceInfo" style="margin-top:10px;font-weight:900;">準備開始</div>
    `;
    openModal({ title:'擲骰決定先行動方', bodyNode: body, actions:[{text:'取消', onClick:()=>{cleanup(); closeModal();}}] });

    const dvR = body.querySelector('#dvR');
    const dvB = body.querySelector('#dvB');
    const info = body.querySelector('#diceInfo');

    modalActions.innerHTML='';
    const btnCancel = document.createElement('button');
    btnCancel.textContent='取消';
    btnCancel.className='ghost';
    btnCancel.onclick=()=>{cleanup(); closeModal();};
    modalActions.appendChild(btnCancel);

    if(firstMethod==='diceStop'){
      const btnStop = document.createElement('button');
      btnStop.textContent='停';
      btnStop.className='primary';
      btnStop.onclick=()=>stopNow();
      modalActions.appendChild(btnStop);
    }

    function setVal(seat,val){
      if(seat==='r'){ rVal=val; dvR.textContent=String(val); }
      else { bVal=val; dvB.textContent=String(val); }
    }
    function reset(){
      rVal=null; bVal=null; dvR.textContent='–'; dvB.textContent='–'; phase='r';
    }
    function tick(){
      const val = isCpu(phase) ? weightedDiceForCpu(cfg.cpuLevel) : uniformDice();
      if(phase==='r') dvR.textContent=String(val); else dvB.textContent=String(val);
      AudioManager.play('diceTick');
    }
    function startRolling(seat){
      phase=seat;
      info.textContent = seat==='r' ? '輪到玩家1停骰' : '輪到玩家2停骰';
      clearInterval(interval);
      interval = setInterval(tick, 80);

      if(firstMethod==='diceAuto'){
        const delay = isCpu(seat)? 380 : 520;
        setTimeout(()=>stopNow(), delay + Math.floor(Math.random()*240));
      }else{
        if(isCpu(seat)){
          setTimeout(()=>stopNow(), 520 + Math.floor(Math.random()*320));
        }
      }
    }
    function stopNow(){
      const shown = phase==='r' ? dvR.textContent : dvB.textContent;
      const val = parseInt(shown,10);
      if(Number.isNaN(val)) return;
      AudioManager.play('diceStop');
      setVal(phase,val);

      if(phase==='r'){
        startRolling('b');
        return;
      }

      cleanup();
      if(rVal===bVal){
        info.textContent = `同點 ${rVal} 重擲`;
        reset();
        setTimeout(()=>startRolling('r'), 500);
        return;
      }
      const startTurn = rVal>bVal ? 'r':'b';
      info.textContent = startTurn==='r' ? '玩家1先行動' : '玩家2先行動';
      setTimeout(()=>{ closeModal(); onDone(startTurn); }, 650);
    }
    function cleanup(){ clearInterval(interval); interval=null; }

    reset();
    startRolling('r');
  }

  // =========================================================
  // Settings wiring
  // =========================================================
  function wireUI(){
    document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change', updateMenuVisibility));
    document.querySelectorAll('input[name="boardMode"]').forEach(el=>el.addEventListener('change', updateMenuVisibility));
    document.querySelectorAll('input[name="firstMethod"]').forEach(el=>el.addEventListener('change', updateMenuVisibility));

    btnStart.addEventListener('click', startNewGameFromMenu);

    btnClearSave.addEventListener('click', ()=>{
      clearSave();
      openModal({ title:'已清除存檔', bodyHTML:'<div>已清除本機存檔</div>', actions:[{text:'OK', primary:true, onClick:closeModal}]});
    });

    btnRestart.addEventListener('click', ()=>restartSameConfig());
    btnToMenu.addEventListener('click', ()=>{ autoSave(); toMenu(true); });

    btnUndo.addEventListener('click', ()=>{
      if(!game.canUndo()) return;
      const ok = game.undo();
      if(ok){
        AudioManager.play('select');
        setSub('已悔棋');
        renderAll();
        maybeCpuAct();
      }
    });

    btnStopChain.addEventListener('click', ()=>{
      AudioManager.play('select');
      stopChainIfAny();
    });

    btnCheckWin.addEventListener('click', ()=>{
      if(game.boardMode !== BOARD.BIG) return;
      if(!game.checkWindow) return;
      const attacker = game.checkWindow.attacker;
      const defender = game.checkWindow.defender;
      if(inCheckBig(game, game.board, defender)){
        AudioManager.play('win');
        endGame(attacker, '手動將軍獲勝');
      }else{
        AudioManager.play('error');
        setSub('將軍已失效');
        game.checkWindow = null;
        renderAll();
      }
    });

    inSound.addEventListener('change', ()=>{
      game.settings.soundOn = inSound.checked;
      AudioManager.setEnabled(game.settings.soundOn);
      if(game.settings.soundOn) AudioManager.play('select');
      renderAll();
    });
    inMoveHints.addEventListener('change', ()=>{ game.settings.moveHints = inMoveHints.checked; renderAll(); });
    inDangerHints.addEventListener('change', ()=>{ game.settings.dangerHints = inDangerHints.checked; renderAll(); });

    inFogCapture.addEventListener('change', ()=>{
      if(game.boardMode !== BOARD.DARK) return;
      game.settings.fogCapture = inFogCapture.checked;
      renderAll();
    });
    inChainCapture.addEventListener('change', ()=>{
      if(game.boardMode !== BOARD.DARK) return;
      const was = game.settings.chainCapture;
      game.settings.chainCapture = inChainCapture.checked;
      if(was && !game.settings.chainCapture && game.chainActive){
        setSub('已關閉連吃 本回合立即結束換對手');
        game.chainActive=false;
        game.chainPieceId=null;
        game.selected=null;
        game.legalMoves=[];
        game.turn = opp(game.turn);
        renderAll();
        maybeCpuAct();
        return;
      }
      renderAll();
    });

    optSound?.addEventListener('change', ()=>{
      AudioManager.setEnabled(optSound.checked);
      if(optSound.checked) AudioManager.play('select');
    });

    const unlockOnce = async ()=>{
      await AudioManager.unlock();
      if(optSound && optSound.checked) AudioManager.play('select');
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('touchstart', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, {passive:true});
    window.addEventListener('touchstart', unlockOnce, {passive:true});
    window.addEventListener('keydown', unlockOnce);

    window.addEventListener('beforeunload', ()=>{ try{autoSave();}catch(_e){} });
  }

  // =========================================================
  // Menu resume
  // =========================================================
  function maybePromptResume(){
    const saved = tryLoadSave();
    if(!saved) return;

    openModal({
      title:'是否從上次進度開始',
      bodyHTML: `
        <div style="margin-bottom:10px;">
          偵測到本機存檔 可選擇續玩或開新局<br/>
          <b>已保存進度，關掉網頁進度消失一概不負責</b>
        </div>
        <div class="small">存檔時間 ${new Date(saved.savedAt||Date.now()).toLocaleString()}</div>
      `,
      actions:[
        {text:'從上次進度開始', primary:true, onClick:()=>{
          closeModal();
          game = new Game();
          game.restore(saved.state);
          AudioManager.setEnabled(game.settings.soundOn);
          showScreen('game');
          setSub('已載入進度');
          renderAll();
          maybeCpuAct();
        }},
        {text:'開新局', onClick:()=>{ closeModal(); clearSave(); toMenu(false); }},
      ]
    });
  }

  // =========================================================
  // Boot
  // =========================================================
  function boot(){
    wireUI();
    updateMenuVisibility();
    showScreen('menu');
    maybePromptResume();
  }
  boot();

})();
