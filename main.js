(() => {
  'use strict';

  // =========================================================
  // Audio (soft WebAudio)
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
    function isEnabled(){ return enabled; }
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

    return { setEnabled, isEnabled, unlock, play };
  })();

  // =========================================================
  // Utilities / DOM
  // =========================================================
  const $ = (id) => document.getElementById(id);
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const opp = (c)=> c==='r'?'b':'r';

  const STORAGE_KEY = 'xiangqi_dark_rework_v3';

  const MODE = { PVC:'pvcpu', PVP:'pvp' };
  const BOARD = { BIG:'big', DARK:'dark' };
  const COLOR = { R:'r', B:'b' };

  const CPU_LEVELS = {
    normal: { name:'一般', noise: 40, p6: 1/6 },
    medium: { name:'稍強', noise: 18, p6: 0.22 },
    strong: { name:'強勁', noise: 8,  p6: 0.28 },
    ultra:  { name:'超強', noise: 0,  p6: 0.34 },
  };

  // Big board glyphs
  const GLYPH = {
    r: { K:'帥', A:'仕', B:'相', N:'馬', R:'車', C:'炮', P:'兵' },
    b: { K:'將', A:'士', B:'象', N:'馬', R:'車', C:'炮', P:'卒' },
  };

  // =========================================================
  // Taiwan Dark Chess rules (as implemented)
  // =========================================================
  // Based on zh.wikipedia.org/zh-tw/暗棋 "台灣暗棋" section:
  // - Board: 4x8, 32 pieces, all face-down random on squares.
  // - Each turn choose ONE action:
  //   1) Flip one face-down piece.
  //   2) Move ONE of your face-up pieces to adjacent orthogonal empty square OR capture.
  // - Color assignment: first player’s first flip decides that player’s color.
  // - Move: one step orthogonally (炮也可走一步到空格).
  // - Capture rank rules:
  //   * 將/帥: can capture any EXCEPT 兵/卒
  //   * 士/仕: can capture any EXCEPT 將/帥
  //   * 象/相: can capture any EXCEPT 士/仕、將/帥
  //   * 車: can capture any EXCEPT 象/相、士/仕、將/帥
  //   * 馬: can capture 兵/卒、砲/炮
  //   * 兵/卒: can capture 將/帥 (special) AND is lowest; cannot capture 砲/炮
  //   * 砲/炮: cannot capture adjacent; can "翻山" jump exactly ONE piece as screen
  //            and capture an enemy face-up piece at the first piece beyond the screen.
  // - Win: capture all opponent pieces (16).
  // - Draw: simplified 50 plies without flip/capture (implemented).
  //
  // NOTE: We enforce "cannot capture face-down pieces"; must flip them first.

  const DARK = {
    rows: 4,
    cols: 8,
    types: ['K','A','B','R','N','C','P'],
    counts: { K:1, A:2, B:2, R:2, N:2, C:2, P:5 }, // per color
  };

  // =========================================================
  // App elements
  // =========================================================
  const menuScreen = $('menuScreen');
  const gameScreen = $('gameScreen');

  const cpuPanel = $('cpuPanel');
  const manualFirstRow = $('manualFirstRow');

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

  const inSound = $('inSound');
  const inMoveHints = $('inMoveHints');
  const inDangerHints = $('inDangerHints');
  const optSound = $('optSound');

  // Modal
  const modalOverlay = $('modalOverlay');
  const modalTitle = $('modalTitle');
  const modalBody = $('modalBody');
  const modalActions = $('modalActions');

  // =========================================================
  // Game State
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

      // dark chess color assignment:
      // before assignment: playerColor = null
      // once assigned: {p1:'r'|'b', p2:'r'|'b'} where p1=first mover side, p2=other
      this.darkSide = { p1: null, p2: null }; // which color each side controls
      this.darkCaptured = { r:0, b:0 };
      this.noProgressPlies = 0;

      this.players = { r:'human', b:'cpu' };
      this.cpuLevel = 'normal';

      this.settings = {
        soundOn: true,
        moveHints: true,
        dangerHints: false,
      };

      this.selected = null;
      this.legalMoves = [];
      this.dangerSquares = new Set();

      this.checkWindow = null; // big board only
      this.lastCheckState = { r:false, b:false };

      this.history = [];
      this.idCounter = 1;
      this.gameOver = false;

      this.undoStack = []; // snapshot stack

      // animation / lock
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
      // Deep copy minimal state needed to restore
      const snap = {
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
        checkWindow: this.checkWindow ? {...this.checkWindow} : null,
        lastCheckState: {...this.lastCheckState},
        history: [...this.history],
        idCounter: this.idCounter,
        gameOver: this.gameOver,
        lastCpuFrom: this.lastCpuFrom ? {...this.lastCpuFrom} : null,
        lastCpuTo: this.lastCpuTo ? {...this.lastCpuTo} : null,
      };
      return snap;
    }

    restore(snap){
      this.config = snap.config;
      this.boardMode = snap.boardMode;
      this.mode = snap.mode;
      this.rows = snap.rows;
      this.cols = snap.cols;
      this.board = snap.board.map(row => row.map(p => p ? ({...p}) : null));
      this.turn = snap.turn;
      this.players = {...snap.players};
      this.cpuLevel = snap.cpuLevel;
      this.settings = {...snap.settings};
      this.selected = snap.selected ? {...snap.selected} : null;
      this.legalMoves = snap.legalMoves.map(m=>({...m}));
      this.darkSide = {...snap.darkSide};
      this.darkCaptured = {...snap.darkCaptured};
      this.noProgressPlies = snap.noProgressPlies;
      this.checkWindow = snap.checkWindow ? {...snap.checkWindow} : null;
      this.lastCheckState = {...snap.lastCheckState};
      this.history = [...snap.history];
      this.idCounter = snap.idCounter;
      this.gameOver = snap.gameOver;
      this.lastCpuFrom = snap.lastCpuFrom ? {...snap.lastCpuFrom} : null;
      this.lastCpuTo = snap.lastCpuTo ? {...snap.lastCpuTo} : null;

      this.dangerSquares = new Set();
      this.locked = false;
    }

    saveUndoPoint(){
      this.undoStack.push(this.snapshot());
      if(this.undoStack.length > 200) this.undoStack.shift();
    }

    canUndo(){
      return this.undoStack.length > 0 && !this.locked;
    }

    undo(){
      if(!this.canUndo()) return false;

      // PvC: default undo back to player's turn (2 plies)
      const isPVC = this.mode === MODE.PVC;
      if(!isPVC){
        const s = this.undoStack.pop();
        if(!s) return false;
        this.restore(s);
        return true;
      }

      // pop at least 1, and keep popping until it's human's turn again OR stack empty
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
      };
      AudioManager.setEnabled(this.settings.soundOn);

      // players mapping: for big board fixed colors, for dark chess colors are assigned by first flip
      if(cfg.mode === MODE.PVC){
        this.players = { r:'human', b:'cpu' };
      }else{
        this.players = { r:'human', b:'human' };
      }

      this.turn = cfg.startTurn || 'r';
      this.selected = null;
      this.legalMoves = [];
      this.dangerSquares = new Set();

      this.history = [];
      this.idCounter = 1;
      this.gameOver = false;
      this.undoStack = [];
      this.noProgressPlies = 0;

      this.lastCpuFrom = null;
      this.lastCpuTo = null;

      if(this.boardMode === BOARD.BIG){
        const {board, rows, cols} = createBigBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
        this.checkWindow = null;
        this.lastCheckState = { r:false, b:false };
        this.pushHistory(`新局（大盤）開始，先手：${this.turn==='r'?'紅':'黑'}`);
      }else{
        const {board, rows, cols} = createDarkBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
        this.darkSide = { p1:null, p2:null };
        this.darkCaptured = { r:0, b:0 };
        this.checkWindow = null;
        this.lastCheckState = { r:false, b:false };
        this.pushHistory(`新局（台灣暗棋 4×8）開始，先手行動方：${this.turn==='r'?'紅/玩家1':'黑/玩家2'}`);
      }

      // save initial undo point (so undo can revert first move too)
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
      for(const [t, cnt] of Object.entries(DARK.counts)){
        for(let i=0;i<cnt;i++){
          bag.push(mkPiece(game, t, color, false)); // all face-down
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
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  // =========================================================
  // BIG board rules (kept minimal from previous: legal moves + check-window win)
  // =========================================================
  const DIRS4 = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

  function inside(r,c,rows,cols){ return r>=0 && r<rows && c>=0 && c<cols; }

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
          if(b[legR][legC]) continue;
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
        const pos={r,c};
        const pseudo = pseudoMovesBig({...game, board, rows, cols}, pos, p);
        // For cannon attack squares, pseudoMovesBig includes moves and capture squares; good enough as danger indicator
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
  // DARK chess rules: legal moves
  // =========================================================
  function darkPlayerColorForTurn(game){
    // In dark chess, "turn" is still 'r'/'b' seat, but seat color might control piece color determined by first flip.
    // p1 = seat 'r', p2 = seat 'b'
    const seat = game.turn === 'r' ? 'p1' : 'p2';
    return game.darkSide[seat]; // null before first assignment
  }

  function darkSeatForColor(game, pieceColor){
    if(game.darkSide.p1 === pieceColor) return 'r';
    if(game.darkSide.p2 === pieceColor) return 'b';
    return null;
  }

  function canCaptureTaiwan(attackerType, targetType){
    // Taiwan dark chess exceptions
    if(attackerType === 'C'){
      // cannon capture handled separately (jump)
      return false;
    }
    if(attackerType === 'K'){
      return targetType !== 'P';
    }
    if(attackerType === 'A'){
      return targetType !== 'K';
    }
    if(attackerType === 'B'){
      return (targetType !== 'A' && targetType !== 'K');
    }
    if(attackerType === 'R'){
      return (targetType !== 'B' && targetType !== 'A' && targetType !== 'K');
    }
    if(attackerType === 'N'){
      return (targetType === 'P' || targetType === 'C');
    }
    if(attackerType === 'P'){
      // pawn can capture king, but cannot capture cannon (wiki says pawn cannot eat cannon)
      return (targetType === 'K');
    }
    return false;
  }

  function darkLegalMovesForPiece(game, from){
    const rows=game.rows, cols=game.cols;
    const p=game.board[from.r][from.c];
    if(!p || !p.revealed) return [];
    const myColor = darkPlayerColorForTurn(game);
    if(!myColor) return []; // not assigned yet -> cannot move, must flip
    if(p.color !== myColor) return [];

    const moves = [];
    const addMove=(r,c,kind)=>{ moves.push({r,c, kind}); }; // kind: 'move'|'cap'|'capCannon'

    if(p.type === 'C'){
      // Move 1 step to empty
      for(const d of DIRS4){
        const r=from.r+d.dr, c=from.c+d.dc;
        if(!inside(r,c,rows,cols)) continue;
        if(!game.board[r][c]) addMove(r,c,'move');
      }
      // Capture by jumping exactly 1 piece (any piece as screen), target must be revealed enemy
      for(const d of DIRS4){
        let r=from.r+d.dr, c=from.c+d.dc;
        // find screen (first piece)
        let screenFound=false;
        while(inside(r,c,rows,cols)){
          if(game.board[r][c]){
            screenFound=true;
            r+=d.dr; c+=d.dc;
            break;
          }
          r+=d.dr; c+=d.dc;
        }
        if(!screenFound) continue;
        // next piece after screen is the only capturable (first piece encountered)
        while(inside(r,c,rows,cols)){
          const t=game.board[r][c];
          if(t){
            if(t.revealed && t.color !== myColor){
              addMove(r,c,'capCannon');
            }
            break;
          }
          r+=d.dr; c+=d.dc;
        }
      }
      return moves;
    }

    // Others: move/cap 1 step orth
    for(const d of DIRS4){
      const r=from.r+d.dr, c=from.c+d.dc;
      if(!inside(r,c,rows,cols)) continue;
      const t=game.board[r][c];
      if(!t){
        addMove(r,c,'move');
      }else{
        // cannot capture face-down
        if(!t.revealed) continue;
        if(t.color === myColor) continue;
        if(canCaptureTaiwan(p.type, t.type)){
          addMove(r,c,'cap');
        }
      }
    }
    return moves;
  }

  function darkAllLegalActions(game){
    // action can be flip (any face-down) OR move/cap with own revealed pieces after color assigned
    const actions = [];
    const rows=game.rows, cols=game.cols;

    // flips always allowed
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const p=game.board[r][c];
        if(p && !p.revealed){
          actions.push({type:'flip', at:{r,c}});
        }
      }
    }

    const myColor = darkPlayerColorForTurn(game);
    if(!myColor){
      return actions; // before color assignment only flipping is legal
    }

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const p=game.board[r][c];
        if(!p || !p.revealed) continue;
        if(p.color !== myColor) continue;
        const from={r,c};
        const ms = darkLegalMovesForPiece(game, from);
        for(const m of ms){
          actions.push({type:'move', from, to:{r:m.r,c:m.c}, kind:m.kind});
        }
      }
    }
    return actions;
  }

  // =========================================================
  // Rendering
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
    const modeText = game.mode === MODE.PVP ? '雙人模式' : `玩家 vs CPU（${CPU_LEVELS[game.cpuLevel]?.name || game.cpuLevel}）`;
    const boardText = game.boardMode === BOARD.BIG ? '大盤 9×10' : '台灣暗棋 4×8（32 子）';
    const turnSeat = game.turn === 'r' ? '先手/玩家1' : '後手/玩家2';

    if(game.boardMode === BOARD.DARK){
      const p1 = game.darkSide.p1 ? (game.darkSide.p1==='r'?'紅':'黑') : '未定';
      const p2 = game.darkSide.p2 ? (game.darkSide.p2==='r'?'紅':'黑') : '未定';
      const myColor = darkPlayerColorForTurn(game);
      const colorText = myColor ? (myColor==='r'?'紅':'黑') : '（請翻棋決定顏色）';
      statusLine.textContent =
        `${boardText}｜${modeText}｜輪到：${turnSeat} ${colorText}｜玩家1=${p1} 玩家2=${p2}｜吃子：紅${game.darkCaptured.r}/16 黑${game.darkCaptured.b}/16`;
      btnCheckWin.classList.add('hidden');
      btnCheckWin.classList.remove('flash');
    } else {
      const turnText = game.turn==='r'?'紅方':'黑方';
      statusLine.textContent = `${boardText}｜${modeText}｜輪到：${turnText}`;
      // check button visibility handled in renderBoard for simplicity
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

    // big board center band
    if(game.boardMode === BOARD.BIG){
      const band = document.createElement('div');
      band.className='centerBand';
      band.innerHTML = `<div class="bandSplit"></div><div class="bandText">楚河漢界</div>`;
      boardEl.appendChild(band);
    } else {
      const band = document.createElement('div');
      band.className='darkBand';
      band.innerHTML = `<div class="darkTitle">台灣暗棋</div>`;
      boardEl.appendChild(band);
    }

    // recompute danger squares (simple: mark opponent capture squares)
    game.dangerSquares = new Set();
    if(game.settings.dangerHints){
      if(game.boardMode === BOARD.BIG){
        const enemy = opp(game.turn);
        const atk = attackedSquaresBig(game, game.board, enemy);
        atk.forEach(k=>game.dangerSquares.add(k));
      }else{
        // dark: show enemy potential capture destinations (only if colors assigned)
        const myColor = darkPlayerColorForTurn(game);
        if(myColor){
          const enemyColor = opp(myColor);
          // pretend it's enemy's turn on their seat
          const enemySeat = darkSeatForColor(game, enemyColor);
          if(enemySeat){
            const tempTurn = game.turn;
            game.turn = enemySeat;
            const acts = darkAllLegalActions(game).filter(a=>a.type==='move' && (a.kind==='cap' || a.kind==='capCannon'));
            for(const a of acts) game.dangerSquares.add(cellKey(a.to.r,a.to.c));
            game.turn = tempTurn;
          }
        }
      }
    }

    // check window big
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

        // corner ornaments (light)
        if(((r+c)%5)===0) cell.classList.add('cornerMark');

        // selection & hints
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

        // CPU last move highlight
        if(game.lastCpuFrom && game.lastCpuFrom.r===r && game.lastCpuFrom.c===c){
          cell.classList.add('cpuFrom');
        }
        if(game.lastCpuTo && game.lastCpuTo.r===r && game.lastCpuTo.c===c){
          cell.classList.add('cpuTo');
        }

        // piece
        const p = game.board[r][c];
        if(p){
          if(game.boardMode === BOARD.DARK){
            // flip card style
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
      el.textContent = '卍';
      return el;
    }
    const cls = p.color==='r'?'red':'black';
    el.className = `piece ${cls}`;
    el.textContent = GLYPH[p.color][p.type];
    return el;
  }

  // =========================================================
  // Interaction + animation lock
  // =========================================================
  function posFromCell(el){
    return { r: parseInt(el.dataset.r,10), c: parseInt(el.dataset.c,10) };
  }

  async function onCellClick(e){
    if(game.gameOver) return;
    if(game.locked) return;
    if(game.players[game.turn] !== 'human') return;

    const cell = e.currentTarget;
    const pos = posFromCell(cell);

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

    // cancel / reselect
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

    // move attempt
    const ok = game.legalMoves.some(m=>m.r===pos.r && m.c===pos.c);
    if(!ok){
      AudioManager.play('error');
      setSub('不合法的目的地。');
      return;
    }

    // undo point
    game.saveUndoPoint();

    const from = game.selected;
    const mover = game.board[from.r][from.c];
    const target = game.board[pos.r][pos.c];

    game.board[pos.r][pos.c] = mover;
    game.board[from.r][from.c] = null;
    game.selected=null; game.legalMoves=[];

    AudioManager.play(target ? 'capture':'move');
    game.pushHistory(`${game.turn==='r'?'紅':'黑'}：${GLYPH[mover.color][mover.type]} (${from.r+1},${from.c+1})→(${pos.r+1},${pos.c+1})${target?` 吃 ${GLYPH[target.color][target.type]}`:''}`);

    // win by check-button rule (same as older)
    game.turn = opp(game.turn);

    // check window
    const defender = game.turn;
    const attacker = opp(defender);
    if(inCheckBig(game, game.board, defender)){
      game.checkWindow = { attacker, defender };
      if(!game.lastCheckState[defender]){
        AudioManager.play('check');
      }
      game.lastCheckState[defender] = true;
      setSub(`⚠️ ${attacker==='r'?'紅':'黑'}方將軍！可按「將軍！」立即獲勝。`);
      if(game.players[attacker]==='cpu'){
        // auto claim
        renderAll();
        setTimeout(()=>{
          if(game.checkWindow && inCheckBig(game, game.board, defender)){
            endGame(attacker, '（CPU 自動按下「將軍！」）');
          }
        }, 600);
      }
    }else{
      game.checkWindow = null;
      game.lastCheckState[defender] = false;
      setSub('');
    }

    renderAll();
    maybeCpuAct();
  }

  async function handleDarkClick(pos){
    const p = game.board[pos.r][pos.c];

    // In dark chess, selecting a face-down piece triggers "flip" action (if not currently selecting a move).
    // If a piece is selected (revealed + belongs to player), clicking a destination attempts move/capture.

    // If selected exists, attempt move
    if(game.selected){
      const ok = game.legalMoves.some(m=>m.r===pos.r && m.c===pos.c);
      if(!ok){
        // allow reselect another own piece
        if(p && p.revealed){
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
        setSub('不合法的目的地。');
        return;
      }

      // execute move/capture with animation
      const from = game.selected;
      await darkDoMove(from, pos);
      return;
    }

    // no selection
    if(!p){
      AudioManager.play('error');
      return;
    }

    // If face-down: flip action
    if(!p.revealed){
      await darkDoFlip(pos);
      return;
    }

    // revealed: can select only if it belongs to current player's color
    const myColor = darkPlayerColorForTurn(game);
    if(!myColor){
      // before assignment, cannot move any revealed; must flip
      AudioManager.play('error');
      setSub('尚未決定顏色：請翻一顆蓋牌。');
      return;
    }
    if(p.color !== myColor){
      AudioManager.play('error');
      setSub('只能操作自己顏色的棋。');
      return;
    }

    game.selected = pos;
    game.legalMoves = darkLegalMovesForPiece(game, pos);
    AudioManager.play('select');
    renderAll();
  }

  // =========================================================
  // DARK actions (flip / move) with undo + CPU animation
  // =========================================================
  async function darkDoFlip(at, isCpu=false){
    if(game.gameOver) return;
    const p = game.board[at.r][at.c];
    if(!p || p.revealed) return;

    // save undo
    game.saveUndoPoint();

    // lock during animation
    game.locked = true;
    renderAll();

    // CPU highlight
    if(isCpu){
      await cpuPreHighlight(at);
    }

    // reveal
    p.revealed = true;

    // assign colors if first flip not yet assigned
    if(!game.darkSide.p1 && !game.darkSide.p2){
      // first flipper seat becomes color of flipped piece
      const seat = game.turn==='r' ? 'p1' : 'p2';
      const other = seat==='p1' ? 'p2':'p1';
      game.darkSide[seat] = p.color;
      game.darkSide[other] = opp(p.color);
      game.pushHistory(`翻棋決定顏色：${seat==='p1'?'玩家1':'玩家2'} 操作 ${p.color==='r'?'紅':'黑'}。`);
    }

    game.noProgressPlies = 0; // flip counts as progress

    // flip animation: toggle class by rerender with flipped state
    AudioManager.play('capture');
    await animateFlip(at);

    game.pushHistory(`${game.turn==='r'?'玩家1':'玩家2'} 翻開：${GLYPH[p.color][p.type]} @(${at.r+1},${at.c+1})`);

    // end of action: switch turn
    game.turn = opp(game.turn);

    // clear selection
    game.selected=null; game.legalMoves=[];
    game.lastCpuFrom = null;
    game.lastCpuTo = at;

    // unlock and render
    game.locked = false;
    renderAll();

    // win check (if someone has no pieces? not possible on flip)
    checkDarkEndOrDraw();

    // cpu if needed
    await maybeCpuAct();
  }

  async function darkDoMove(from, to, isCpu=false){
    if(game.gameOver) return;

    const mover = game.board[from.r][from.c];
    const target = game.board[to.r][to.c];

    // save undo
    game.saveUndoPoint();

    // lock
    game.locked = true;
    renderAll();

    if(isCpu){
      await cpuPreHighlight(from);
    }

    // Determine if capture
    const isCapture = !!target;

    // Capture restrictions: target must be revealed enemy (already ensured by legal move gen)
    // Apply visual move animation first
    await animatePieceTravel(from, to);

    // if capture: fade target then remove
    if(isCapture){
      await animateCaptureFade(to);
      // count captured by color
      game.darkCaptured[target.color] += 1;
    }

    // apply board
    game.board[to.r][to.c] = mover;
    game.board[from.r][from.c] = null;

    // clear selection
    game.selected=null; game.legalMoves=[];

    // progress rule
    if(isCapture){
      game.noProgressPlies = 0;
      AudioManager.play('capture');
    }else{
      game.noProgressPlies += 1;
      AudioManager.play('move');
    }

    game.pushHistory(`${game.turn==='r'?'玩家1':'玩家2'}：${GLYPH[mover.color][mover.type]} (${from.r+1},${from.c+1})→(${to.r+1},${to.c+1})${isCapture?` 吃 ${GLYPH[target.color][target.type]}`:''}`);

    // cpu move highlight squares for 1s
    game.lastCpuFrom = isCpu ? from : null;
    game.lastCpuTo = isCpu ? to : null;

    // switch turn
    game.turn = opp(game.turn);

    // unlock
    game.locked = false;
    renderAll();

    // highlight squares 1s
    if(isCpu){
      await highlightCpuSquares(from, to);
    }

    checkDarkEndOrDraw();
    await maybeCpuAct();
  }

  function checkDarkEndOrDraw(){
    if(game.boardMode !== BOARD.DARK) return;

    // win: captured all opponent pieces
    if(game.darkCaptured.r >= 16){
      endGame('b', '（暗棋：黑方吃完紅方 16 子）');
      return;
    }
    if(game.darkCaptured.b >= 16){
      endGame('r', '（暗棋：紅方吃完黑方 16 子）');
      return;
    }

    // draw: 50 plies without flip or capture (simplified)
    if(game.noProgressPlies >= 50){
      endDraw('（50 步無翻子或吃子）');
    }
  }

  // =========================================================
  // CPU logic (both modes)
  // =========================================================
  async function maybeCpuAct(){
    if(game.gameOver) return;
    if(game.locked) return;
    if(game.players[game.turn] !== 'cpu') return;

    // small delay for clarity
    await sleep(260);

    if(game.boardMode === BOARD.BIG){
      await cpuActBig();
      return;
    }
    await cpuActDark();
  }

  async function cpuActBig(){
    // extremely simple CPU: random legal move, prefer capture
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
      endGame(opp(game.turn), '（無合法步）');
      return;
    }
    all.sort((a,b)=> (b.cap?1:0)-(a.cap?1:0) + (Math.random()-0.5)*0.1 );
    const choice = all[0];

    // animate CPU move
    game.saveUndoPoint();
    game.locked=true;
    renderAll();

    await cpuPreHighlight(choice.from);
    await animatePieceTravel(choice.from, choice.to);
    if(choice.cap) await animateCaptureFade(choice.to);

    const mover=game.board[choice.from.r][choice.from.c];
    const target=game.board[choice.to.r][choice.to.c];
    game.board[choice.to.r][choice.to.c]=mover;
    game.board[choice.from.r][choice.from.c]=null;

    AudioManager.play(choice.cap?'capture':'move');
    game.pushHistory(`CPU：${GLYPH[mover.color][mover.type]} (${choice.from.r+1},${choice.from.c+1})→(${choice.to.r+1},${choice.to.c+1})${choice.cap?` 吃 ${GLYPH[target.color][target.type]}`:''}`);

    game.turn = opp(game.turn);
    game.locked=false;
    game.lastCpuFrom = choice.from;
    game.lastCpuTo = choice.to;
    renderAll();
    await highlightCpuSquares(choice.from, choice.to);

    // check window logic
    const defender = game.turn;
    const attacker = opp(defender);
    if(inCheckBig(game, game.board, defender)){
      game.checkWindow = { attacker, defender };
      AudioManager.play('check');
      setSub(`⚠️ ${attacker==='r'?'紅':'黑'}方將軍！CPU 將自動按「將軍！」獲勝。`);
      renderAll();
      setTimeout(()=>{
        if(game.checkWindow && inCheckBig(game, game.board, defender)){
          endGame(attacker, '（CPU 自動按下「將軍！」）');
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
      // no legal actions -> lose (rare)
      endGame(opp(game.turn), '（暗棋：無可行動）');
      return;
    }

    // Heuristic:
    // - prefer capture (especially capturing higher-value)
    // - else prefer flipping (early / if no assigned / low mobility)
    // - else random move
    const myColor = darkPlayerColorForTurn(game);

    let best = null;
    let bestScore = -Infinity;

    for(const a of actions){
      let s = 0;
      if(a.type === 'flip'){
        // before assignment flipping is mandatory
        s += (!myColor ? 1000 : 40);
        s += Math.random() * 10;
      } else {
        const mover = game.board[a.from.r][a.from.c];
        const target = game.board[a.to.r][a.to.c];
        if(target){
          s += 300;
          s += pieceValue(target.type);
          // slight bonus for cannon capture
          if(a.kind==='capCannon') s += 40;
        } else {
          s += 30;
        }
        s += (Math.random()*2-1) * (lvl.noise||0);
      }
      if(s > bestScore){
        bestScore = s;
        best = a;
      }
    }

    if(best.type === 'flip'){
      await darkDoFlip(best.at, true);
      return;
    }
    await darkDoMove(best.from, best.to, true);
  }

  function pieceValue(t){
    // rough value for AI preference
    switch(t){
      case 'K': return 120;
      case 'A': return 80;
      case 'B': return 70;
      case 'R': return 60;
      case 'N': return 45;
      case 'C': return 55;
      case 'P': return 25;
      default: return 0;
    }
  }

  // =========================================================
  // CPU animation helpers
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

  async function highlightCpuSquares(from,to){
    // keep highlight for 1s using existing classes set in state; just wait
    await sleep(1000);
    // keep in state until next CPU move; no need to clear
  }

  async function animateFlip(at){
    // render already updated revealed=true, so we can just wait for CSS transition to play
    renderAll();
    await sleep(460);
  }

  async function animateCaptureFade(at){
    const cell = getCellEl(at);
    if(!cell) return;
    const piece = cell.querySelector('.piece, .flipWrap');
    if(!piece) return;
    // fade the front face if dark
    let targetEl = piece;
    const frontPiece = cell.querySelector('.flipInner.flipped .front .piece');
    if(frontPiece) targetEl = frontPiece;
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

    // clone visual
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

    // animate
    clone.animate(
      [{ transform:`translate(0px,0px)` }, { transform:`translate(${dx}px,${dy}px)` }],
      { duration: 260, easing:'cubic-bezier(.2,.8,.2,1)' }
    );

    await sleep(270);
    clone.remove();
  }

  // =========================================================
  // Dice (for first mover seat, not color in dark chess)
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
      <div>規則：紅方與黑方各擲一次，點數大者先手；同點重擲。</div>
      <div class="small" style="margin-top:6px;">${cfg.mode===MODE.PVC ? '（CPU 等級越高更容易骰到 6）' : ''}</div>
      <div class="diceBox">
        <div class="diceRow"><div class="diceLabel">紅方</div><div id="dvR" class="diceValue red">–</div></div>
        <div class="diceRow"><div class="diceLabel">黑方</div><div id="dvB" class="diceValue black">–</div></div>
      </div>
      <div id="diceInfo" style="margin-top:10px;font-weight:800;">準備開始…</div>
    `;
    openModal({ title:'擲骰決定先手', bodyNode: body, actions:[{text:'取消', onClick:()=>{cleanup(); closeModal();}}] });

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
      info.textContent = `現在輪到 ${seat==='r'?'紅方':'黑方'} 停骰`;
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
        info.textContent = `同點（${rVal}）！重擲…`;
        reset();
        setTimeout(()=>startRolling('r'), 500);
        return;
      }
      const startTurn = rVal>bVal ? 'r':'b';
      info.textContent = `結果：紅 ${rVal} vs 黑 ${bVal} → ${startTurn==='r'?'紅方':'黑方'} 先手`;
      setTimeout(()=>{ closeModal(); onDone(startTurn); }, 650);
    }
    function cleanup(){ clearInterval(interval); interval=null; }

    reset();
    startRolling('r');
  }

  // =========================================================
  // Modal helpers
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
  // End game / draw
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

  // =========================================================
  // Escape
  // =========================================================
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
    const save = game.snapshot();
    // also persist undoStack length-limited snapshots? keep simple: store only current state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:3, savedAt:Date.now(), state: save }));
  }
  function clearSave(){ localStorage.removeItem(STORAGE_KEY); }
  function tryLoadSave(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    try{
      const o = JSON.parse(raw);
      if(!o || o.version !== 3) return null;
      return o;
    }catch(_e){ return null; }
  }

  // =========================================================
  // Menu wiring
  // =========================================================
  function updateMenuVisibility(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked').value;
    cpuPanel.classList.toggle('hidden', mode !== MODE.PVC);
    manualFirstRow.classList.toggle('hidden', firstMethod !== 'manual');
  }

  function getMenuConfig(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardMode = document.querySelector('input[name="boardMode"]:checked').value;
    const cpuLevel = $('cpuLevel').value;
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked').value;
    const manualFirst = document.querySelector('input[name="manualFirst"]:checked').value;

    return {
      mode,
      boardMode,
      cpuLevel,
      firstMethod,
      manualFirst,
      moveHints: $('optMoveHints').checked,
      dangerHints: $('optDangerHints').checked,
      soundOn: $('optSound').checked,
      startTurn: manualFirst
    };
  }

  function startNewGameFromMenu(){
    const cfg0 = getMenuConfig();
    const cfg = {
      mode: cfg0.mode,
      boardMode: cfg0.boardMode,
      cpuLevel: cfg0.cpuLevel,
      moveHints: cfg0.moveHints,
      dangerHints: cfg0.dangerHints,
      soundOn: cfg0.soundOn,
      startTurn: cfg0.startTurn,
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
  // Buttons / toggles
  // =========================================================
  function wireUI(){
    document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change', updateMenuVisibility));
    document.querySelectorAll('input[name="firstMethod"]').forEach(el=>el.addEventListener('change', updateMenuVisibility));

    $('btnStart').addEventListener('click', startNewGameFromMenu);
    $('btnClearSave').addEventListener('click', ()=>{
      clearSave();
      openModal({ title:'已清除存檔', bodyHTML:'<div>已清除本機 localStorage 存檔。</div>', actions:[{text:'OK', primary:true, onClick:closeModal}]});
    });

    btnRestart.addEventListener('click', ()=>restartSameConfig());
    btnToMenu.addEventListener('click', ()=>{ autoSave(); toMenu(true); });

    btnUndo.addEventListener('click', ()=>{
      if(!game.canUndo()) return;
      const ok = game.undo();
      if(ok){
        AudioManager.play('select');
        setSub('已悔棋。');
        renderAll();
        maybeCpuAct();
      }
    });

    btnCheckWin.addEventListener('click', ()=>{
      if(game.boardMode !== BOARD.BIG) return;
      if(!game.checkWindow) return;
      const attacker = game.checkWindow.attacker;
      const defender = game.checkWindow.defender;
      if(inCheckBig(game, game.board, defender)){
        AudioManager.play('win');
        endGame(attacker, '（手動按下「將軍！」）');
      }else{
        AudioManager.play('error');
        setSub('將軍機會已失效（對手已解除將軍）。');
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

    optSound?.addEventListener('change', ()=>{
      AudioManager.setEnabled(optSound.checked);
      if(optSound.checked) AudioManager.play('select');
    });

    // autoplay unlock
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
  // Resume prompt
  // =========================================================
  function maybePromptResume(){
    const saved = tryLoadSave();
    if(!saved) return;

    openModal({
      title:'是否從上次進度開始？',
      bodyHTML: `
        <div style="margin-bottom:10px;">
          偵測到本機存檔。你可以選擇從上次進度繼續，或開新局。<br/>
          <b>已保存進度，關掉網頁進度消失一概不負責</b>
        </div>
        <div class="small">存檔時間：${new Date(saved.savedAt||Date.now()).toLocaleString()}</div>
      `,
      actions:[
        {text:'從上次進度開始', primary:true, onClick:()=>{
          closeModal();
          game = new Game();
          game.restore(saved.state);
          AudioManager.setEnabled(game.settings.soundOn);
          showScreen('game');
          setSub('已載入上次進度。');
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
