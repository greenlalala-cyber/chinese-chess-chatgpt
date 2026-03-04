/* Xiangqi (Chinese Chess) - Offline HTML/CSS/JS
   - Audio system: WebAudio (softer, natural-ish) with autoplay unlock and overlap-safe playback.
   - If you want to use local audio files instead, see AudioManager.playSample() comments.
*/

(() => {
  'use strict';

  // -----------------------------
  // Audio Manager (更悅耳自然：WebAudio 合成)
  // -----------------------------
  const AudioManager = (() => {
    let enabled = true;
    let unlocked = false;
    let ctx = null;
    let master = null;

    // throttle for spammy sounds (dice tick)
    const lastAt = new Map();

    function ensureContext(){
      if(ctx) return true;
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.65; // overall volume (soft)
        master.connect(ctx.destination);
        return true;
      }catch(_e){
        return false;
      }
    }

    function setEnabled(on){ enabled = !!on; }
    function isEnabled(){ return enabled; }

    // Must be called from a user gesture
    async function unlock(){
      if(unlocked) return;
      if(!ensureContext()) return;
      try{
        if(ctx.state === 'suspended'){
          await ctx.resume();
        }
        unlocked = true;
      }catch(_e){
        // swallow
      }
    }

    function now(){ return ctx ? ctx.currentTime : 0; }

    // Utility: envelope gain
    function env(g, t0, a, d, s=0){
      // attack a, decay d to sustain s (here often 0)
      g.gain.cancelScheduledValues(t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(1.0, t0 + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), t0 + a + d);
    }

    // Utility: create noise buffer
    function makeNoiseBuffer(duration=0.08){
      const sr = ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * duration));
      const buffer = ctx.createBuffer(1, len, sr);
      const data = buffer.getChannelData(0);
      for(let i=0;i<len;i++){
        // softer noise
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }
      return buffer;
    }

    // Gentle "click" with sine + tiny noise
    function sfxSelect(){
      const t0 = now();
      const g = ctx.createGain();
      g.gain.value = 0.0;

      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, t0);
      o.frequency.exponentialRampToValueAtTime(880, t0 + 0.04);

      const ng = ctx.createGain();
      ng.gain.value = 0.07;
      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(0.03);
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'highpass';
      nFilter.frequency.value = 1200;

      env(g, t0, 0.005, 0.08, 0.0001);

      o.connect(g);
      n.connect(nFilter);
      nFilter.connect(ng);
      ng.connect(g);

      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.10);
      n.start(t0);
      n.stop(t0 + 0.04);
    }

    // Soft wooden knock: low noise + short sine body
    function sfxMove(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      // Body
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t0);
      o.frequency.exponentialRampToValueAtTime(120, t0 + 0.06);

      const og = ctx.createGain();
      og.gain.value = 0.18;
      o.connect(og);

      // Knock noise (lowpassed)
      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(0.06);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const ng = ctx.createGain();
      ng.gain.value = 0.12;

      n.connect(lp);
      lp.connect(ng);

      // Envelope
      env(out, t0, 0.003, 0.14, 0.0001);

      og.connect(out);
      ng.connect(out);
      out.connect(master);

      o.start(t0);
      o.stop(t0 + 0.16);
      n.start(t0);
      n.stop(t0 + 0.08);
    }

    // Capture / flip: slightly sharper but still pleasant (short sweep + filtered noise)
    function sfxCapture(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t0);
      o.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);

      const og = ctx.createGain();
      og.gain.value = 0.16;

      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(0.09);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200;
      bp.Q.value = 0.8;

      const ng = ctx.createGain();
      ng.gain.value = 0.10;

      env(out, t0, 0.004, 0.20, 0.0001);

      o.connect(og);
      n.connect(bp);
      bp.connect(ng);

      og.connect(out);
      ng.connect(out);
      out.connect(master);

      o.start(t0);
      o.stop(t0 + 0.22);
      n.start(t0);
      n.stop(t0 + 0.10);
    }

    // Error: soft low "bup" (no harsh beep)
    function sfxError(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(190, t0);
      o.frequency.exponentialRampToValueAtTime(110, t0 + 0.10);

      const og = ctx.createGain();
      og.gain.value = 0.20;

      env(out, t0, 0.005, 0.25, 0.0001);

      o.connect(og);
      og.connect(out);
      out.connect(master);

      o.start(t0);
      o.stop(t0 + 0.28);
    }

    // Check warning: two gentle tones (not shrill), short pattern
    function sfxCheck(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      env(out, t0, 0.006, 0.55, 0.0001);
      out.connect(master);

      const playTone = (freq, start, dur) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, start);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g);
        g.connect(out);
        o.start(start);
        o.stop(start + dur + 0.01);
      };

      playTone(523.25, t0 + 0.00, 0.18); // C5
      playTone(659.25, t0 + 0.22, 0.20); // E5
    }

    // Win: small major arpeggio, soft
    function sfxWin(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;
      env(out, t0, 0.01, 0.80, 0.0001);
      out.connect(master);

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((f, i) => {
        const start = t0 + i * 0.10;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, start);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

        // soften high freq
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;

        o.connect(lp);
        lp.connect(g);
        g.connect(out);

        o.start(start);
        o.stop(start + 0.25);
      });
    }

    // Dice tick: very soft "rattle" (highpassed noise), throttled
    function sfxDiceTick(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(0.04);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;

      const ng = ctx.createGain();
      ng.gain.value = 0.06;

      env(out, t0, 0.002, 0.06, 0.0001);

      n.connect(hp);
      hp.connect(ng);
      ng.connect(out);
      out.connect(master);

      n.start(t0);
      n.stop(t0 + 0.05);
    }

    // Dice stop: a soft chime
    function sfxDiceStop(){
      const t0 = now();
      const out = ctx.createGain();
      out.gain.value = 0.0;

      env(out, t0, 0.005, 0.35, 0.0001);
      out.connect(master);

      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(784, t0); // G5
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, t0);
      g1.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o1.connect(g1);
      g1.connect(out);
      o1.start(t0);
      o1.stop(t0 + 0.28);

      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(587.33, t0 + 0.02); // D5
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t0 + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
      o2.connect(g2);
      g2.connect(out);
      o2.start(t0 + 0.02);
      o2.stop(t0 + 0.33);
    }

    // OPTIONAL: If you later want real audio files, you can implement a sampler here
    // and replace play() to load ./sounds/*.mp3
    // function playSample(url) { /* load + decodeAudioData + play buffer */ }

    function play(name){
      if(!enabled) return;
      if(!unlocked) return;
      if(!ensureContext()) return;

      // throttle (dice tick)
      if(name === 'diceTick'){
        const nowMs = performance.now();
        const last = lastAt.get(name) ?? -Infinity;
        if(nowMs - last < 70) return;
        lastAt.set(name, nowMs);
      }

      try{
        // Keep context alive
        if(ctx.state === 'suspended'){
          ctx.resume().catch(()=>{});
        }

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
      }catch(_e){
        // no console noise
      }
    }

    return { setEnabled, isEnabled, unlock, play };
  })();

  // -----------------------------
  // Constants & Utilities
  // -----------------------------
  const STORAGE_KEY = 'xiangqi_save_v2_audio_soft';

  const COLOR = { RED: 'r', BLACK: 'b' };
  const MODE = { PVC: 'pvcpu', PVP: 'pvp' };
  const BOARD_MODE = { BIG: 'big', SMALL: 'small' };

  const CPU_LEVELS = {
    normal: { name: '一般', depthBig: 1, depthSmall: 1, noise: 50, topK: 6, p6: 1/6 },
    medium: { name: '稍強', depthBig: 2, depthSmall: 2, noise: 25, topK: 8, p6: 0.22 },
    strong: { name: '強勁', depthBig: 3, depthSmall: 2, noise: 12, topK: 10, p6: 0.28 },
    ultra: { name: '超強', depthBig: 4, depthSmall: 3, noise: 0, topK: 14, p6: 0.34 },
  };

  const GLYPH = {
    r: { K:'帥', A:'仕', B:'相', N:'馬', R:'車', C:'炮', P:'兵' },
    b: { K:'將', A:'士', B:'象', N:'馬', R:'車', C:'炮', P:'卒' },
  };

  const SIZE_RANK = { P:1, A:2, B:3, C:4, N:5, R:6, K:7 };
  const PIECE_VALUE = { P:100, A:250, B:260, N:320, C:360, R:520, K:20000 };

  const DIRS4 = [
    {dr:-1, dc:0},{dr:1, dc:0},{dr:0, dc:-1},{dr:0, dc:1}
  ];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const opp = (c) => c === COLOR.RED ? COLOR.BLACK : COLOR.RED;
  const inside = (r,c,rows,cols) => r>=0 && r<rows && c>=0 && c<cols;

  function deepCloneBoard(board){
    return board.map(row => row.map(cell => cell ? ({...cell}) : null));
  }
  function samePos(a,b){ return a && b && a.r===b.r && a.c===b.c; }

  // -----------------------------
  // UI Elements
  // -----------------------------
  const $ = (id) => document.getElementById(id);

  const menuScreen = $('menuScreen');
  const gameScreen = $('gameScreen');

  const cpuPanel = $('cpuPanel');
  const smallRulesPanel = $('smallRulesPanel');
  const manualFirstRow = $('manualFirstRow');

  const btnStart = $('btnStart');
  const btnClearSave = $('btnClearSave');

  const boardEl = $('board');
  const historyEl = $('history');

  const statusLine = $('statusLine');
  const subStatusLine = $('subStatusLine');

  const btnRestart = $('btnRestart');
  const btnToMenu = $('btnToMenu');
  const btnCheckWin = $('btnCheckWin');

  const inSound = $('inSound');
  const inMoveHints = $('inMoveHints');
  const inDangerHints = $('inDangerHints');
  const inDarkCapture = $('inDarkCapture');
  const inChainCapture = $('inChainCapture');

  const optSound = $('optSound');

  const modalOverlay = $('modalOverlay');
  const modalTitle = $('modalTitle');
  const modalBody = $('modalBody');
  const modalActions = $('modalActions');

  // -----------------------------
  // Game State
  // -----------------------------
  class Game {
    constructor(){
      this.resetRuntimeOnly();
      this.config = null;
      this.board = null;
      this.rows = 0;
      this.cols = 0;
      this.turn = COLOR.RED;
      this.players = { r:'human', b:'human' };
      this.cpuLevel = 'normal';

      this.settings = {
        soundOn: true,
        darkCapture: true,
        chainCapture: true,
        moveHints: true,
        dangerHints: false,
      };

      this.inChain = false;
      this.chainPieceId = null;

      this.checkWindow = null;
      this.moveCount = 0;

      this.gameOver = false;
      this.winner = null;
      this.endReason = '';

      this.history = [];
      this.idCounter = 1;

      // Avoid check sound spam
      this.lastCheckState = { r:false, b:false };
    }

    resetRuntimeOnly(){
      this.selected = null;
      this.legalMoves = [];
      this.dangerSquares = new Set();
    }

    nextId(){ return this.idCounter++; }

    initNew(config){
      this.resetRuntimeOnly();
      this.config = config;
      this.cpuLevel = config.cpuLevel || 'normal';

      this.settings = {
        soundOn: config.soundOn ?? true,
        darkCapture: !!config.darkCapture,
        chainCapture: !!config.chainCapture,
        moveHints: !!config.moveHints,
        dangerHints: !!config.dangerHints,
      };
      AudioManager.setEnabled(this.settings.soundOn);

      this.players = (config.mode === MODE.PVC) ? { r:'human', b:'cpu' } : { r:'human', b:'human' };

      if(config.boardMode === BOARD_MODE.BIG){
        const {board, rows, cols} = createBigBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
      }else{
        const {board, rows, cols} = createSmallBoard(this);
        this.board = board; this.rows = rows; this.cols = cols;
      }

      this.turn = config.startTurn || COLOR.RED;
      this.inChain = false;
      this.chainPieceId = null;

      this.checkWindow = null;
      this.moveCount = 0;

      this.gameOver = false;
      this.winner = null;
      this.endReason = '';
      this.history = [];
      this.lastCheckState = { r:false, b:false };

      this.pushHistory(`新局開始：${config.boardMode==='big'?'大盤':'小盤'}，${config.mode==='pvp'?'雙人':'玩家vsCPU'}，先手：${this.turn==='r'?'紅':'黑'}`);
    }

    toSave(){
      return {
        version: 2,
        savedAt: Date.now(),
        config: this.config,
        cpuLevel: this.cpuLevel,
        players: this.players,
        settings: this.settings,
        rows: this.rows,
        cols: this.cols,
        turn: this.turn,
        inChain: this.inChain,
        chainPieceId: this.chainPieceId,
        checkWindow: this.checkWindow,
        moveCount: this.moveCount,
        gameOver: this.gameOver,
        winner: this.winner,
        endReason: this.endReason,
        history: this.history,
        idCounter: this.idCounter,
        board: this.board,
        lastCheckState: this.lastCheckState,
      };
    }

    loadSave(save){
      this.resetRuntimeOnly();
      this.config = save.config;
      this.cpuLevel = save.cpuLevel || 'normal';
      this.players = save.players || {r:'human', b:'human'};
      this.settings = save.settings || this.settings;
      AudioManager.setEnabled(this.settings.soundOn ?? true);

      this.rows = save.rows; this.cols = save.cols;
      this.turn = save.turn;
      this.inChain = !!save.inChain;
      this.chainPieceId = save.chainPieceId;
      this.checkWindow = save.checkWindow;
      this.moveCount = save.moveCount || 0;
      this.gameOver = !!save.gameOver;
      this.winner = save.winner;
      this.endReason = save.endReason || '';
      this.history = save.history || [];
      this.idCounter = save.idCounter || 1;
      this.board = save.board;
      this.lastCheckState = save.lastCheckState || { r:false, b:false };
    }

    pushHistory(line){
      this.history.push(line);
      if(this.history.length > 300) this.history.shift();
    }

    getLegalMovesForPiece(pos){
      const piece = this.board[pos.r][pos.c];
      if(!piece) return [];
      if(piece.color !== this.turn) return [];

      if(this.inChain && piece.id !== this.chainPieceId) return [];

      const pseudo = getPseudoMoves(this, pos, piece);
      const legal = [];
      for(const m of pseudo){
        const sim = simulateMove(this, pos, m);
        if(!sim) continue;
        const b2 = sim.board;
        if(isInCheck(this, b2, this.turn)) continue;
        if(areKingsFacing(this, b2)) continue;
        legal.push(m);
      }
      return legal;
    }

    recomputeDangerSquares(){
      this.dangerSquares = new Set();
      if(!this.settings.dangerHints) return;
      const enemy = opp(this.turn);
      const attacked = getAttackedSquares(this, this.board, enemy);
      for(const key of attacked) this.dangerSquares.add(key);
    }

    tryMove(from, to){
      if(this.gameOver) return;

      const piece = this.board[from.r][from.c];
      if(!piece) return;

      const legal = this.getLegalMovesForPiece(from);
      const isLegal = legal.some(m => m.r===to.r && m.c===to.c);
      if(!isLegal){
        AudioManager.play('error');
        setSubStatus('不合法的走法。');
        return;
      }

      const moverColor = this.turn;

      // Defender is about to move -> previous check window invalid
      if(this.config.boardMode === BOARD_MODE.BIG && this.checkWindow && this.checkWindow.defender === moverColor){
        this.checkWindow = null;
      }

      const result = applyMoveReal(this, from, to);
      if(result.sound) AudioManager.play(result.sound);

      this.moveCount += 1;
      this.resetRuntimeOnly();

      if(result.message) this.pushHistory(result.message);

      if(result.gameOver){
        this.endGame(result.winner, result.reason, {playWin: true});
        return;
      }

      // Big: after move, check detection and warning
      if(this.config.boardMode === BOARD_MODE.BIG){
        const defender = this.turn;
        const attacker = opp(defender);

        const inCheckNow = isInCheck(this, this.board, defender);
        if(inCheckNow){
          this.checkWindow = { attacker, defender, expiresOnMove: this.moveCount + 1 };
          setSubStatus(`⚠️ ${attacker==='r'?'紅':'黑'}方將軍！可按「將軍！」立即獲勝（若略過，對手解除後就無效）。`);

          if(!this.lastCheckState[defender]){
            AudioManager.play('check');
          }
          this.lastCheckState[defender] = true;

          // CPU auto-claim
          if(this.players[attacker] === 'cpu'){
            renderAll();
            window.setTimeout(() => {
              if(this.checkWindow && this.checkWindow.attacker === attacker && isInCheck(this, this.board, defender)){
                this.endGame(attacker, '（CPU 自動按下「將軍！」）', {playWin: true});
              }
            }, 600);
          }
        }else{
          this.checkWindow = null;
          this.lastCheckState[defender] = false;
          setSubStatus('');
        }

        // Defender turn in check
        const selfInCheck = isInCheck(this, this.board, this.turn);
        if(selfInCheck){
          if(!this.lastCheckState[this.turn]){
            AudioManager.play('check');
          }
          this.lastCheckState[this.turn] = true;
          setSubStatus(`⚠️ ${this.turn==='r'?'紅':'黑'}方被將軍，必須應對。`);
        }else{
          this.lastCheckState[this.turn] = false;
        }
      }

      if(this.config.boardMode === BOARD_MODE.SMALL){
        setSubStatus(this.inChain ? '連吃中：必須走到空格才能停止並換手。' : '');
      }

      renderAll();
      maybeCpuAct();
    }

    endGame(winnerColor, reason, {playWin=false} = {}){
      this.gameOver = true;
      this.winner = winnerColor;
      this.endReason = reason || '';
      this.checkWindow = null;
      this.inChain = false;
      this.chainPieceId = null;
      this.resetRuntimeOnly();

      const winnerText = winnerColor === 'r' ? '紅方' : '黑方';
      this.pushHistory(`🏁 結束：${winnerText}獲勝 ${this.endReason || ''}`);

      if(playWin) AudioManager.play('win');

      renderAll();
      openModal({
        title: '遊戲結束',
        bodyHTML: `<div style="font-size:16px;"><b>${winnerText}獲勝</b> ${escapeHTML(this.endReason||'')}</div>`,
        actions: [
          { text: '重新開始', primary: true, onClick: () => { closeModal(); restartSameConfig(); } },
          { text: '回主選單', onClick: () => { closeModal(); toMenu(true); } },
        ]
      });
    }
  }

  let game = new Game();

  // -----------------------------
  // Board Creation
  // -----------------------------
  function piece(game, type, color, revealed=true){
    return { id: game.nextId(), type, color, revealed };
  }

  function createBigBoard(game){
    const rows = 10, cols = 9;
    const board = Array.from({length: rows}, () => Array(cols).fill(null));

    // Black
    board[0][0] = piece(game,'R','b',true);
    board[0][1] = piece(game,'N','b',true);
    board[0][2] = piece(game,'B','b',true);
    board[0][3] = piece(game,'A','b',true);
    board[0][4] = piece(game,'K','b',true);
    board[0][5] = piece(game,'A','b',true);
    board[0][6] = piece(game,'B','b',true);
    board[0][7] = piece(game,'N','b',true);
    board[0][8] = piece(game,'R','b',true);

    board[2][1] = piece(game,'C','b',true);
    board[2][7] = piece(game,'C','b',true);
    for(const c of [0,2,4,6,8]) board[3][c] = piece(game,'P','b',true);

    // Red
    board[9][0] = piece(game,'R','r',true);
    board[9][1] = piece(game,'N','r',true);
    board[9][2] = piece(game,'B','r',true);
    board[9][3] = piece(game,'A','r',true);
    board[9][4] = piece(game,'K','r',true);
    board[9][5] = piece(game,'A','r',true);
    board[9][6] = piece(game,'B','r',true);
    board[9][7] = piece(game,'N','r',true);
    board[9][8] = piece(game,'R','r',true);

    board[7][1] = piece(game,'C','r',true);
    board[7][7] = piece(game,'C','r',true);
    for(const c of [0,2,4,6,8]) board[6][c] = piece(game,'P','r',true);

    return {board, rows, cols};
  }

  function createSmallBoard(game){
    const rows = 5, cols = 9;
    const board = Array.from({length: rows}, () => Array(cols).fill(null));

    // Black (all face-down)
    board[0][0] = piece(game,'R','b',false);
    board[0][1] = piece(game,'N','b',false);
    board[0][2] = piece(game,'B','b',false);
    board[0][3] = piece(game,'A','b',false);
    board[0][4] = piece(game,'K','b',false);
    board[0][5] = piece(game,'C','b',false);
    board[1][2] = piece(game,'P','b',false);
    board[1][6] = piece(game,'P','b',false);

    // Red (all face-down)
    board[4][0] = piece(game,'R','r',false);
    board[4][1] = piece(game,'N','r',false);
    board[4][2] = piece(game,'B','r',false);
    board[4][3] = piece(game,'A','r',false);
    board[4][4] = piece(game,'K','r',false);
    board[4][5] = piece(game,'C','r',false);
    board[3][2] = piece(game,'P','r',false);
    board[3][6] = piece(game,'P','r',false);

    return {board, rows, cols};
  }

  // -----------------------------
  // Movement Rules
  // -----------------------------
  function palaceContains(game, color, r, c){
    if(game.config.boardMode === BOARD_MODE.BIG){
      if(c < 3 || c > 5) return false;
      return (color === 'b') ? (r>=0 && r<=2) : (r>=7 && r<=9);
    }else{
      if(c < 3 || c > 5) return false;
      return (color === 'b') ? (r>=0 && r<=1) : (r>=3 && r<=4);
    }
  }

  function riverCrossed(game, color, r){
    if(game.config.boardMode === BOARD_MODE.BIG){
      return (color === 'r') ? (r<=4) : (r>=5);
    }else{
      return (color === 'r') ? (r<=2) : (r>=2);
    }
  }

  function elephantAllowed(game, color, r){
    if(game.config.boardMode === BOARD_MODE.BIG){
      return (color === 'r') ? (r>=5) : (r<=4);
    }else{
      return (color === 'r') ? (r>=2) : (r<=2);
    }
  }

  function getPseudoMoves(game, pos, piece){
    const rows = game.rows, cols = game.cols;
    const b = game.board;
    const moves = [];
    const add = (r,c) => { if(inside(r,c,rows,cols)) moves.push({r,c}); };
    const type = piece.type;

    if(type === 'K'){
      for(const d of DIRS4){
        const r = pos.r + d.dr, c = pos.c + d.dc;
        if(!inside(r,c,rows,cols)) continue;
        if(!palaceContains(game, piece.color, r, c)) continue;
        add(r,c);
      }
    }else if(type === 'A'){
      const diags = [{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}];
      for(const d of diags){
        const r = pos.r + d.dr, c = pos.c + d.dc;
        if(!inside(r,c,rows,cols)) continue;
        if(!palaceContains(game, piece.color, r, c)) continue;
        add(r,c);
      }
    }else if(type === 'B'){
      const diags2 = [{dr:-2,dc:-2},{dr:-2,dc:2},{dr:2,dc:-2},{dr:2,dc:2}];
      for(const d of diags2){
        const r = pos.r + d.dr, c = pos.c + d.dc;
        const eyeR = pos.r + d.dr/2, eyeC = pos.c + d.dc/2;
        if(!inside(r,c,rows,cols)) continue;
        if(!inside(eyeR,eyeC,rows,cols)) continue;
        if(b[eyeR][eyeC]) continue;
        if(!elephantAllowed(game, piece.color, r)) continue;
        add(r,c);
      }
    }else if(type === 'N'){
      const candidates = [
        {dr:-2,dc:-1, lr:-1,lc:0},{dr:-2,dc:1, lr:-1,lc:0},
        {dr:2,dc:-1, lr:1,lc:0},{dr:2,dc:1, lr:1,lc:0},
        {dr:-1,dc:-2, lr:0,lc:-1},{dr:1,dc:-2, lr:0,lc:-1},
        {dr:-1,dc:2, lr:0,lc:1},{dr:1,dc:2, lr:0,lc:1},
      ];
      for(const d of candidates){
        const legR = pos.r + d.lr, legC = pos.c + d.lc;
        const r = pos.r + d.dr, c = pos.c + d.dc;
        if(!inside(r,c,rows,cols)) continue;
        if(b[legR][legC]) continue;
        add(r,c);
      }
    }else if(type === 'R'){
      for(const d of DIRS4){
        let r = pos.r + d.dr, c = pos.c + d.dc;
        while(inside(r,c,rows,cols)){
          add(r,c);
          if(b[r][c]) break;
          r += d.dr; c += d.dc;
        }
      }
    }else if(type === 'C'){
      for(const d of DIRS4){
        let r = pos.r + d.dr, c = pos.c + d.dc;
        while(inside(r,c,rows,cols) && !b[r][c]){
          add(r,c);
          r += d.dr; c += d.dc;
        }
        if(!inside(r,c,rows,cols)) continue;
        r += d.dr; c += d.dc;
        while(inside(r,c,rows,cols)){
          if(b[r][c]){
            add(r,c);
            break;
          }
          r += d.dr; c += d.dc;
        }
      }
    }else if(type === 'P'){
      const forward = piece.color === 'r' ? -1 : 1;
      add(pos.r + forward, pos.c);
      if(riverCrossed(game, piece.color, pos.r)){
        add(pos.r, pos.c - 1);
        add(pos.r, pos.c + 1);
      }
    }

    return moves.filter(m => inside(m.r,m.c,rows,cols));
  }

  function findKing(board, color){
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        const p = board[r][c];
        if(p && p.color===color && p.type==='K') return {r,c};
      }
    }
    return null;
  }

  function areKingsFacing(game, board){
    const kr = findKing(board,'r');
    const kb = findKing(board,'b');
    if(!kr || !kb) return false;
    if(kr.c !== kb.c) return false;
    const col = kr.c;
    const r1 = Math.min(kr.r, kb.r)+1;
    const r2 = Math.max(kr.r, kb.r)-1;
    for(let r=r1; r<=r2; r++){
      if(board[r][col]) return false;
    }
    return true;
  }

  function isInCheck(game, board, color){
    const kingPos = findKing(board, color);
    if(!kingPos) return false;
    const enemy = opp(color);
    const attacked = getAttackedSquares(game, board, enemy);
    return attacked.has(`${kingPos.r},${kingPos.c}`);
  }

  function getAttackedSquares(game, board, attackerColor){
    const rows = board.length, cols = board[0].length;
    const attacked = new Set();
    const addKey = (r,c) => { if(inside(r,c,rows,cols)) attacked.add(`${r},${c}`); };

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const p = board[r][c];
        if(!p || p.color !== attackerColor) continue;

        const type = p.type;

        if(type==='R'){
          for(const d of DIRS4){
            let rr=r+d.dr, cc=c+d.dc;
            while(inside(rr,cc,rows,cols)){
              addKey(rr,cc);
              if(board[rr][cc]) break;
              rr+=d.dr; cc+=d.dc;
            }
          }
        }else if(type==='C'){
          for(const d of DIRS4){
            let rr=r+d.dr, cc=c+d.dc;
            while(inside(rr,cc,rows,cols) && !board[rr][cc]){
              rr+=d.dr; cc+=d.dc;
            }
            if(!inside(rr,cc,rows,cols)) continue;
            rr+=d.dr; cc+=d.dc;
            while(inside(rr,cc,rows,cols)){
              addKey(rr,cc);
              if(board[rr][cc]) break;
              rr+=d.dr; cc+=d.dc;
            }
          }
        }else if(type==='N'){
          const candidates = [
            {dr:-2,dc:-1, lr:-1,lc:0},{dr:-2,dc:1, lr:-1,lc:0},
            {dr:2,dc:-1, lr:1,lc:0},{dr:2,dc:1, lr:1,lc:0},
            {dr:-1,dc:-2, lr:0,lc:-1},{dr:1,dc:-2, lr:0,lc:-1},
            {dr:-1,dc:2, lr:0,lc:1},{dr:1,dc:2, lr:0,lc:1},
          ];
          for(const d of candidates){
            const legR = r + d.lr, legC = c + d.lc;
            const rr = r + d.dr, cc = c + d.dc;
            if(!inside(rr,cc,rows,cols)) continue;
            if(board[legR][legC]) continue;
            addKey(rr,cc);
          }
        }else if(type==='B'){
          const diags2 = [{dr:-2,dc:-2},{dr:-2,dc:2},{dr:2,dc:-2},{dr:2,dc:2}];
          for(const d of diags2){
            const rr = r + d.dr, cc = c + d.dc;
            const eyeR = r + d.dr/2, eyeC = c + d.dc/2;
            if(!inside(rr,cc,rows,cols)) continue;
            if(board[eyeR][eyeC]) continue;
            if(!elephantAllowed(game, attackerColor, rr)) continue;
            addKey(rr,cc);
          }
        }else if(type==='A'){
          const diags = [{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}];
          for(const d of diags){
            const rr=r+d.dr, cc=c+d.dc;
            if(!inside(rr,cc,rows,cols)) continue;
            if(!palaceContains(game, attackerColor, rr, cc)) continue;
            addKey(rr,cc);
          }
        }else if(type==='K'){
          for(const d of DIRS4){
            const rr=r+d.dr, cc=c+d.dc;
            if(!inside(rr,cc,rows,cols)) continue;
            if(!palaceContains(game, attackerColor, rr, cc)) continue;
            addKey(rr,cc);
          }
        }else if(type==='P'){
          const forward = attackerColor === 'r' ? -1 : 1;
          addKey(r+forward, c);
          if(riverCrossed(game, attackerColor, r)){
            addKey(r, c-1);
            addKey(r, c+1);
          }
        }
      }
    }
    return attacked;
  }

  function darkCompare(game, attackerPiece, targetPiece){
    // Special: small board pawn can capture king
    if(game.config.boardMode === BOARD_MODE.SMALL && attackerPiece.type==='P' && targetPiece.type==='K'){
      return 'win';
    }
    const a = SIZE_RANK[attackerPiece.type] || 0;
    const t = SIZE_RANK[targetPiece.type] || 0;
    return (a >= t) ? 'win' : 'lose';
  }

  // -----------------------------
  // Simulate for legality / AI
  // -----------------------------
  function simulateMove(game, from, to){
    const board = deepCloneBoard(game.board);
    const rows = game.rows, cols = game.cols;
    if(!inside(from.r,from.c,rows,cols) || !inside(to.r,to.c,rows,cols)) return null;

    const mover = board[from.r][from.c];
    if(!mover) return null;

    const target = board[to.r][to.c];

    if(game.config.boardMode === BOARD_MODE.BIG){
      if(target && target.color === mover.color) return null;
      board[to.r][to.c] = mover;
      board[from.r][from.c] = null;
      return {board};
    }

    const darkOn = !!game.settings.darkCapture;

    if(!target){
      board[to.r][to.c] = mover;
      board[from.r][from.c] = null;
      return {board};
    }

    if(target.revealed && target.color === mover.color) return null;

    if(darkOn && !target.revealed){
      target.revealed = true;

      if(target.color === mover.color){
        return {board};
      }

      const cmp = darkCompare(game, mover, target);
      if(cmp === 'lose'){
        board[from.r][from.c] = null;
        return {board};
      }else{
        board[to.r][to.c] = mover;
        board[from.r][from.c] = null;
        return {board};
      }
    }

    if(target.color === mover.color) return null;
    target.revealed = true;
    board[to.r][to.c] = mover;
    board[from.r][from.c] = null;
    return {board};
  }

  // -----------------------------
  // Apply move to real board (分類音效)
  // -----------------------------
  function applyMoveReal(game, from, to){
    const b = game.board;
    const mover = b[from.r][from.c];
    const target = b[to.r][to.c];
    const moverColor = game.turn;

    let message = '';
    let gameOver = false;
    let winner = null;
    let reason = '';
    let sound = null;

    const coord = (p) => `(${p.r+1},${p.c+1})`;
    const moverName = (p) => (p.revealed ? GLYPH[p.color][p.type] : '蓋子');

    if(game.config.boardMode === BOARD_MODE.BIG){
      if(target && target.color === mover.color){
        return {message:'非法：不能吃自己的棋', sound:'error'};
      }
      b[to.r][to.c] = mover;
      b[from.r][from.c] = null;

      sound = target ? 'capture' : 'move';
      message = `${moverColor==='r'?'紅':'黑'}：${GLYPH[moverColor][mover.type]} ${coord(from)}→${coord(to)}${target?` 吃 ${GLYPH[target.color][target.type]}`:''}`;
      game.turn = opp(moverColor);
      game.inChain = false;
      game.chainPieceId = null;

      if(target && target.type === 'K'){
        gameOver = true;
        winner = moverColor;
        reason = '（吃掉對方將/帥）';
      }
      return {message, gameOver, winner, reason, sound};
    }

    // Small
    const darkOn = !!game.settings.darkCapture;
    const chainOn = !!game.settings.chainCapture;

    if(!target){
      b[to.r][to.c] = mover;
      b[from.r][from.c] = null;
      sound = 'move';
      message = `${moverColor==='r'?'紅':'黑'}：${moverName(mover)} ${coord(from)}→${coord(to)}（空）`;
      game.inChain = false;
      game.chainPieceId = null;
      game.turn = opp(moverColor);
      return {message, gameOver, winner, reason, sound};
    }

    if(target.revealed && target.color === mover.color){
      return {message:'非法：不能吃自己的棋（已翻開）', sound:'error'};
    }

    if(darkOn && !target.revealed){
      target.revealed = true;

      if(target.color === mover.color){
        sound = 'error';
        message = `${moverColor==='r'?'紅':'黑'}：暗吃 ${coord(from)}→${coord(to)}，翻到自己的棋（${GLYPH[target.color][target.type]}）→ 退回，換對手`;
        game.inChain = false;
        game.chainPieceId = null;
        game.turn = opp(moverColor);
        return {message, gameOver, winner, reason, sound};
      }

      const cmp = darkCompare(game, mover, target);
      if(cmp === 'lose'){
        b[from.r][from.c] = null;
        sound = 'error';
        message = `${moverColor==='r'?'紅':'黑'}：暗吃 ${coord(from)}→${coord(to)}，翻到較大棋（${GLYPH[target.color][target.type]}）→ 自己死亡，換對手`;
        game.inChain = false;
        game.chainPieceId = null;
        game.turn = opp(moverColor);
        return {message, gameOver, winner, reason, sound};
      }else{
        b[to.r][to.c] = mover;
        b[from.r][from.c] = null;
        sound = 'capture';
        message = `${moverColor==='r'?'紅':'黑'}：暗吃 ${coord(from)}→${coord(to)}，翻到較小棋（${GLYPH[target.color][target.type]}）→ 吃到`;

        if(target.type === 'K'){
          gameOver = true;
          winner = moverColor;
          reason = '（小盤：吃掉對方將/帥）';
          return {message, gameOver, winner, reason, sound};
        }

        if(chainOn){
          game.inChain = true;
          game.chainPieceId = mover.id;
        }else{
          game.inChain = false;
          game.chainPieceId = null;
          game.turn = opp(moverColor);
        }
        return {message, gameOver, winner, reason, sound};
      }
    }

    // Normal capture
    if(target.color === mover.color){
      return {message:'非法：不能吃自己的棋', sound:'error'};
    }
    if(!target.revealed) target.revealed = true;

    b[to.r][to.c] = mover;
    b[from.r][from.c] = null;
    sound = 'capture';
    message = `${moverColor==='r'?'紅':'黑'}：${moverName(mover)} ${coord(from)}→${coord(to)} 吃 ${GLYPH[target.color][target.type]}`;

    if(target.type === 'K'){
      gameOver = true;
      winner = moverColor;
      reason = '（小盤：吃掉對方將/帥）';
      return {message, gameOver, winner, reason, sound};
    }

    if(chainOn){
      game.inChain = true;
      game.chainPieceId = mover.id;
    }else{
      game.inChain = false;
      game.chainPieceId = null;
      game.turn = opp(moverColor);
    }
    return {message, gameOver, winner, reason, sound};
  }

  // -----------------------------
  // AI (沿用原本簡化版)
  // -----------------------------
  function evaluateBoard(board, perspectiveColor){
    let score = 0;
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        const p = board[r][c];
        if(!p) continue;
        const v = PIECE_VALUE[p.type] || 0;
        score += (p.color === perspectiveColor ? v : -v);
        if(p.type==='P'){
          if(p.color==='r') score += (perspectiveColor==='r' ? (4-r)*3 : -(4-r)*3);
          if(p.color==='b') score += (perspectiveColor==='b' ? r*3 : -r*3);
        }
      }
    }
    return score;
  }

  function listAllLegalMoves(game, board, color, chainPieceId=null){
    const temp = { ...game, board, turn: color, inChain: !!chainPieceId, chainPieceId };
    const moves = [];
    for(let r=0;r<temp.rows;r++){
      for(let c=0;c<temp.cols;c++){
        const p = board[r][c];
        if(!p || p.color !== color) continue;
        if(chainPieceId && p.id !== chainPieceId) continue;

        const pos = {r,c};
        const pseudo = getPseudoMoves(temp, pos, p);
        for(const m of pseudo){
          const sim = simulateMove(temp, pos, m);
          if(!sim) continue;
          if(isInCheck(temp, sim.board, color)) continue;
          if(areKingsFacing(temp, sim.board)) continue;
          moves.push({ from: pos, to: {r:m.r,c:m.c} });
        }
      }
    }
    return moves;
  }

  function chooseMoveAI(game){
    const cpuColor = COLOR.BLACK;
    if(game.turn !== cpuColor) return null;
    const level = CPU_LEVELS[game.cpuLevel] || CPU_LEVELS.normal;

    const moves = listAllLegalMoves(game, game.board, cpuColor, game.inChain ? game.chainPieceId : null);
    if(!moves.length) return null;

    // Super simple: pick best capture otherwise random among top
    const scored = moves.map(mv => {
      const target = game.board[mv.to.r][mv.to.c];
      let s = 0;
      if(target){
        if(target.type==='K') s += 999999;
        else s += PIECE_VALUE[target.type] || 0;
      }else{
        s += 2;
      }
      s += (Math.random()*2-1) * (level.noise||0);
      return {mv, s};
    });
    scored.sort((a,b)=>b.s-a.s);
    return scored[0].mv;
  }

  async function maybeCpuAct(){
    if(game.gameOver) return;
    if(game.players[game.turn] !== 'cpu') return;

    await sleep(180);

    let safety = 0;
    while(!game.gameOver && game.players[game.turn] === 'cpu' && safety < 30){
      safety += 1;
      const mv = chooseMoveAI(game);
      if(!mv){
        game.endGame(opp(game.turn), '（無合法步）', {playWin:false});
        break;
      }
      game.tryMove(mv.from, mv.to);
      renderAll();
      await sleep(220);
    }
  }

  function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

  // -----------------------------
  // Dice (sounds)
  // -----------------------------
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

  function openDiceModal(firstMethod, config, onDone){
    let phase = 'r';
    let rVal = null;
    let bVal = null;
    let interval = null;

    const isCpu = (color) => config.mode===MODE.PVC && color===COLOR.BLACK;

    const title = '擲骰決定先手';
    const body = document.createElement('div');

    const desc = document.createElement('div');
    desc.innerHTML = `
      <div>規則：紅方與黑方各擲一次，點數大者先手；同點重擲直到分出勝負。</div>
      <div class="small" style="margin-top:6px;">${config.mode===MODE.PVC ? '（CPU 等級越高，黑方更容易骰到 6）' : ''}</div>
    `;

    const box = document.createElement('div');
    box.className = 'diceBox';

    const rowR = makeDiceRow('紅方', 'red');
    const rowB = makeDiceRow('黑方', 'black');
    box.appendChild(rowR.row);
    box.appendChild(rowB.row);

    const info = document.createElement('div');
    info.style.marginTop = '10px';
    info.style.fontWeight = '700';
    info.textContent = '準備開始…';

    body.appendChild(desc);
    body.appendChild(box);
    body.appendChild(info);

    const btnStop = document.createElement('button');
    btnStop.textContent = '停';
    btnStop.className = 'primary';
    btnStop.onclick = () => stopNow();

    const btnCancel = document.createElement('button');
    btnCancel.textContent = '取消';
    btnCancel.className = 'ghost';
    btnCancel.onclick = () => { cleanup(); closeModal(); };

    openModal({
      title,
      bodyNode: body,
      actions: [
        { text: '取消', onClick: () => { cleanup(); closeModal(); } },
      ],
    });

    modalActions.innerHTML = '';
    modalActions.appendChild(btnCancel);
    if(firstMethod === 'diceStop'){
      modalActions.appendChild(btnStop);
    }

    function setVal(color, val){
      if(color==='r'){
        rVal = val;
        rowR.valueEl.textContent = String(val);
      }else{
        bVal = val;
        rowB.valueEl.textContent = String(val);
      }
    }

    function resetForReroll(){
      rVal = null; bVal = null;
      rowR.valueEl.textContent = '–';
      rowB.valueEl.textContent = '–';
      phase = 'r';
    }

    function rollTick(){
      const val = isCpu(phase) ? weightedDiceForCpu(config.cpuLevel) : uniformDice();
      if(phase==='r') rowR.valueEl.textContent = String(val);
      else rowB.valueEl.textContent = String(val);

      AudioManager.play('diceTick');
    }

    function startRollingFor(color){
      phase = color;
      info.textContent = `現在輪到 ${color==='r'?'紅方':'黑方'} 停骰`;
      clearInterval(interval);
      interval = setInterval(rollTick, 80);

      if(firstMethod === 'diceAuto'){
        const delay = isCpu(color) ? 380 : 520;
        window.setTimeout(() => stopNow(), delay + Math.floor(Math.random()*240));
      }else{
        if(isCpu(color)){
          window.setTimeout(() => stopNow(), 520 + Math.floor(Math.random()*320));
        }
      }
    }

    function stopNow(){
      const shown = phase==='r' ? rowR.valueEl.textContent : rowB.valueEl.textContent;
      const val = parseInt(shown, 10);
      if(Number.isNaN(val)) return;

      AudioManager.play('diceStop');
      setVal(phase, val);

      if(phase === 'r'){
        startRollingFor('b');
        return;
      }

      cleanup();
      if(rVal === bVal){
        info.textContent = `同點（${rVal}）！重擲…`;
        resetForReroll();
        window.setTimeout(() => startRollingFor('r'), 500);
        return;
      }

      const startTurn = rVal > bVal ? 'r' : 'b';
      info.textContent = `結果：紅方 ${rVal} vs 黑方 ${bVal} → ${startTurn==='r'?'紅方':'黑方'} 先手`;
      window.setTimeout(() => {
        closeModal();
        onDone(startTurn);
      }, 650);
    }

    function cleanup(){
      clearInterval(interval);
      interval = null;
    }

    rowR.valueEl.textContent = '–';
    rowB.valueEl.textContent = '–';
    startRollingFor('r');
  }

  function makeDiceRow(label, cssColor){
    const row = document.createElement('div');
    row.className = 'diceRow';

    const left = document.createElement('div');
    left.className = 'diceLabel';
    left.textContent = label;

    const value = document.createElement('div');
    value.className = `diceValue ${cssColor}`;
    value.textContent = '–';

    row.appendChild(left);
    row.appendChild(value);

    return {row, valueEl: value};
  }

  // -----------------------------
  // Rendering & Interaction
  // -----------------------------
  function showScreen(which){
    if(which === 'menu'){
      menuScreen.classList.remove('hidden');
      gameScreen.classList.add('hidden');
    }else{
      menuScreen.classList.add('hidden');
      gameScreen.classList.remove('hidden');
    }
  }

  function escapeHTML(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#39;");
  }

  function renderBoard(){
    boardEl.style.setProperty('--cols', String(game.cols));
    boardEl.style.setProperty('--rows', String(game.rows));
    boardEl.innerHTML = '';

    game.recomputeDangerSquares();

    const kingInCheckPos = (game.config.boardMode===BOARD_MODE.BIG && isInCheck(game, game.board, game.turn))
      ? findKing(game.board, game.turn) : null;

    for(let r=0; r<game.rows; r++){
      for(let c=0; c<game.cols; c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);

        if((c+1) % game.cols === 0) cell.style.borderRight = 'none';
        if(r === game.rows-1) cell.style.borderBottom = 'none';

        const p = game.board[r][c];
        if(p){
          const el = document.createElement('div');
          const colorClass = p.color === 'r' ? 'red' : 'black';
          el.className = `piece ${colorClass}`;

          if(game.config.boardMode === BOARD_MODE.SMALL && !p.revealed){
            el.classList.add('hiddenPiece');
            el.textContent = '■';
          }else{
            el.textContent = GLYPH[p.color][p.type];
          }
          cell.appendChild(el);
        }

        if(game.selected && game.selected.r===r && game.selected.c===c){
          cell.classList.add('selected');
        }

        if(game.settings.moveHints && game.selected){
          const hit = game.legalMoves.find(m => m.r===r && m.c===c);
          if(hit){
            const target = game.board[r][c];
            cell.classList.add(target ? 'hintCapture' : 'hintMove');
          }
        }

        if(game.settings.dangerHints && game.dangerSquares.has(`${r},${c}`)){
          cell.classList.add('danger');
        }

        if(kingInCheckPos && kingInCheckPos.r===r && kingInCheckPos.c===c){
          cell.classList.add('kingInCheck');
        }

        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function renderStatus(){
    const turnText = game.turn === 'r' ? '紅方' : '黑方';
    const modeText = game.config.mode === 'pvp' ? '雙人模式' : `玩家 vs CPU（${CPU_LEVELS[game.cpuLevel]?.name || game.cpuLevel}）`;
    const boardText = game.config.boardMode === 'big' ? '大盤 9×10' : '小盤 9×5（全蓋）';

    const extra = (game.config.boardMode === BOARD_MODE.SMALL && game.inChain)
      ? '｜連吃中（必須走到空格才能停）' : '';

    statusLine.textContent = `${boardText}｜${modeText}｜輪到：${turnText}${extra}`;

    if(game.config.boardMode === BOARD_MODE.BIG && game.checkWindow && !game.gameOver){
      const stillInCheck = isInCheck(game, game.board, game.checkWindow.defender);
      const show = stillInCheck && game.players[game.checkWindow.attacker] === 'human';
      btnCheckWin.classList.toggle('hidden', !show);
      btnCheckWin.classList.toggle('flash', show);
      if(show) setSubStatus('⚠️ 對手被將軍！按「將軍！」立即獲勝。');
    }else{
      btnCheckWin.classList.add('hidden');
      btnCheckWin.classList.remove('flash');
    }

    inSound.checked = !!game.settings.soundOn;
    inMoveHints.checked = !!game.settings.moveHints;
    inDangerHints.checked = !!game.settings.dangerHints;
    inDarkCapture.checked = !!game.settings.darkCapture;
    inChainCapture.checked = !!game.settings.chainCapture;

    const isSmall = game.config.boardMode === BOARD_MODE.SMALL;
    inDarkCapture.disabled = !isSmall;
    inChainCapture.disabled = !isSmall;
  }

  function renderHistory(){
    historyEl.textContent = game.history.slice(-80).join('\n');
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function renderAll(){
    renderBoard();
    renderStatus();
    renderHistory();
    autoSaveIfPlaying();
  }

  function setSubStatus(text){
    subStatusLine.textContent = text || '';
  }

  function onCellClick(e){
    if(game.gameOver) return;
    if(game.players[game.turn] !== 'human') return;

    const cell = e.currentTarget;
    const r = parseInt(cell.dataset.r, 10);
    const c = parseInt(cell.dataset.c, 10);
    const pos = {r,c};
    const p = game.board[r][c];

    // Chain: only chain piece can move
    if(game.inChain){
      const chainPos = findPieceById(game.board, game.chainPieceId);
      if(chainPos){
        if(chainPos.r===r && chainPos.c===c){
          selectPiece(pos);
          return;
        }
        if(game.selected && samePos(game.selected, chainPos)){
          attemptMove(pos);
        }else{
          selectPiece(chainPos);
          attemptMove(pos);
        }
        return;
      }else{
        game.inChain = false;
        game.chainPieceId = null;
      }
    }

    if(!game.selected){
      if(p && p.color === game.turn){
        selectPiece(pos);
      }else{
        AudioManager.play('error');
      }
      return;
    }

    if(p && p.color === game.turn){
      if(game.selected.r===r && game.selected.c===c){
        // cancel
        game.selected = null;
        game.legalMoves = [];
        AudioManager.play('select');
        renderAll();
        return;
      }
      selectPiece(pos);
      return;
    }

    attemptMove(pos);
  }

  function selectPiece(pos){
    const p = game.board[pos.r][pos.c];
    if(!p) return;
    if(p.color !== game.turn) return;
    if(game.inChain && p.id !== game.chainPieceId) return;

    game.selected = pos;
    game.legalMoves = game.getLegalMovesForPiece(pos);
    AudioManager.play('select');
    renderAll();
  }

  function attemptMove(toPos){
    if(!game.selected) return;
    const ok = game.legalMoves.some(m => m.r===toPos.r && m.c===toPos.c);
    if(!ok){
      AudioManager.play('error');
      setSubStatus('不合法的目的地。');
      return;
    }
    game.tryMove(game.selected, toPos);
  }

  function findPieceById(board, id){
    for(let r=0;r<board.length;r++){
      for(let c=0;c<board[0].length;c++){
        const p = board[r][c];
        if(p && p.id===id) return {r,c};
      }
    }
    return null;
  }

  // -----------------------------
  // Save / Load
  // -----------------------------
  function autoSaveIfPlaying(){
    if(!game.config) return;
    const save = game.toSave();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }
  function clearSave(){ localStorage.removeItem(STORAGE_KEY); }
  function tryLoadSave(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    try{
      const save = JSON.parse(raw);
      if(!save || save.version !== 2) return null;
      return save;
    }catch(_e){ return null; }
  }

  // -----------------------------
  // Modal helpers
  // -----------------------------
  function openModal({title, bodyHTML, bodyNode, actions}){
    modalTitle.textContent = title || '提示';
    modalBody.innerHTML = '';
    if(bodyNode) modalBody.appendChild(bodyNode);
    else modalBody.innerHTML = bodyHTML || '';

    modalActions.innerHTML = '';
    (actions || []).forEach(a => {
      const b = document.createElement('button');
      b.textContent = a.text || 'OK';
      b.className = a.primary ? 'primary' : 'ghost';
      b.onclick = () => { if(a.onClick) a.onClick(); };
      modalActions.appendChild(b);
    });

    modalOverlay.classList.remove('hidden');
    modalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal(){
    modalOverlay.classList.add('hidden');
    modalOverlay.setAttribute('aria-hidden', 'true');
    modalBody.innerHTML = '';
    modalActions.innerHTML = '';
  }

  // -----------------------------
  // Menu Logic
  // -----------------------------
  function getMenuConfig(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardMode = document.querySelector('input[name="boardMode"]:checked').value;
    const cpuLevel = $('cpuLevel').value;
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked').value;
    const manualFirst = document.querySelector('input[name="manualFirst"]:checked').value;

    const dark = $('optDark')?.checked ?? true;
    const chain = $('optChain')?.checked ?? true;

    const moveHints = $('optMoveHints').checked;
    const dangerHints = $('optDangerHints').checked;
    const soundOn = $('optSound').checked;

    return { mode, boardMode, cpuLevel, firstMethod, manualFirst, darkCapture: dark, chainCapture: chain, moveHints, dangerHints, soundOn };
  }

  function updateMenuVisibility(){
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardMode = document.querySelector('input[name="boardMode"]:checked').value;
    const firstMethod = document.querySelector('input[name="firstMethod"]:checked').value;

    cpuPanel.classList.toggle('hidden', mode !== MODE.PVC);
    smallRulesPanel.classList.toggle('hidden', boardMode !== BOARD_MODE.SMALL);
    manualFirstRow.classList.toggle('hidden', firstMethod !== 'manual');
  }

  // -----------------------------
  // Start / Restart / Menu
  // -----------------------------
  function startNewGameFromMenu(){
    const cfg0 = getMenuConfig();
    const cfg = {
      mode: cfg0.mode,
      boardMode: cfg0.boardMode,
      cpuLevel: cfg0.cpuLevel,
      darkCapture: cfg0.boardMode===BOARD_MODE.SMALL ? cfg0.darkCapture : false,
      chainCapture: cfg0.boardMode===BOARD_MODE.SMALL ? cfg0.chainCapture : false,
      moveHints: cfg0.moveHints,
      dangerHints: cfg0.dangerHints,
      soundOn: cfg0.soundOn,
      startTurn: cfg0.manualFirst,
    };

    const startGameWithTurn = (startTurn) => {
      cfg.startTurn = startTurn;
      game = new Game();
      game.initNew(cfg);
      showScreen('game');
      setSubStatus('');
      renderAll();
      maybeCpuAct();
    };

    if(cfg0.firstMethod === 'manual'){
      startGameWithTurn(cfg0.manualFirst);
      return;
    }

    openDiceModal(cfg0.firstMethod, cfg, (startTurn) => startGameWithTurn(startTurn));
  }

  function restartSameConfig(){
    if(!game.config) return;
    const cfg = {...game.config};
    cfg.darkCapture = game.settings.darkCapture;
    cfg.chainCapture = game.settings.chainCapture;
    cfg.moveHints = game.settings.moveHints;
    cfg.dangerHints = game.settings.dangerHints;
    cfg.soundOn = game.settings.soundOn;

    game = new Game();
    game.initNew(cfg);
    setSubStatus('');
    renderAll();
    maybeCpuAct();
  }

  function toMenu(save=true){
    if(save && game.config) autoSaveIfPlaying();
    showScreen('menu');
    updateMenuVisibility();
  }

  // -----------------------------
  // Big board "將軍！" button
  // -----------------------------
  function onCheckWinClick(){
    if(game.gameOver) return;
    if(game.config.boardMode !== BOARD_MODE.BIG) return;
    if(!game.checkWindow) return;

    const attacker = game.checkWindow.attacker;
    const defender = game.checkWindow.defender;

    if(isInCheck(game, game.board, defender)){
      AudioManager.play('win');
      game.endGame(attacker, '（手動按下「將軍！」）', {playWin:false});
    }else{
      AudioManager.play('error');
      setSubStatus('將軍機會已失效（對手已解除將軍）。');
      game.checkWindow = null;
      renderAll();
    }
  }

  // -----------------------------
  // In-game toggles
  // -----------------------------
  function wireInGameToggles(){
    inSound.addEventListener('change', () => {
      game.settings.soundOn = inSound.checked;
      AudioManager.setEnabled(game.settings.soundOn);
      if(game.settings.soundOn) AudioManager.play('select');
      renderAll();
    });

    inMoveHints.addEventListener('change', () => { game.settings.moveHints = inMoveHints.checked; renderAll(); });
    inDangerHints.addEventListener('change', () => { game.settings.dangerHints = inDangerHints.checked; renderAll(); });

    inDarkCapture.addEventListener('change', () => {
      if(game.config.boardMode !== BOARD_MODE.SMALL) return;
      game.settings.darkCapture = inDarkCapture.checked;
      renderAll();
    });

    inChainCapture.addEventListener('change', () => {
      if(game.config.boardMode !== BOARD_MODE.SMALL) return;
      const wasOn = game.settings.chainCapture;
      const nowOn = inChainCapture.checked;
      game.settings.chainCapture = nowOn;

      if(wasOn && !nowOn && game.inChain){
        game.inChain = false;
        game.chainPieceId = null;
        game.turn = opp(game.turn);
        game.selected = null;
        game.legalMoves = [];
      }
      renderAll();
      maybeCpuAct();
    });
  }

  // -----------------------------
  // Resume prompt on load
  // -----------------------------
  function maybePromptResume(){
    const save = tryLoadSave();
    if(!save) return;

    openModal({
      title: '是否從上次進度開始？',
      bodyHTML: `
        <div style="margin-bottom:10px;">
          偵測到本機存檔。你可以選擇從上次進度繼續，或開新局。<br/>
          <b>已保存進度，關掉網頁進度消失一概不負責</b>
        </div>
        <div class="small">存檔時間：${new Date(save.savedAt||Date.now()).toLocaleString()}</div>
      `,
      actions: [
        { text: '從上次進度開始', primary: true, onClick: () => {
          closeModal();
          game = new Game();
          game.loadSave(save);
          showScreen('game');
          updateMenuVisibility();
          setSubStatus('已載入上次進度。');
          renderAll();
          maybeCpuAct();
        }},
        { text: '開新局', onClick: () => { closeModal(); clearSave(); toMenu(false); } },
      ]
    });
  }

  // -----------------------------
  // Wire up Menu & Buttons
  // -----------------------------
  function wireMenu(){
    document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener('change', updateMenuVisibility));
    document.querySelectorAll('input[name="boardMode"]').forEach(el => el.addEventListener('change', updateMenuVisibility));
    document.querySelectorAll('input[name="firstMethod"]').forEach(el => el.addEventListener('change', updateMenuVisibility));

    btnStart.addEventListener('click', startNewGameFromMenu);

    btnClearSave.addEventListener('click', () => {
      clearSave();
      openModal({
        title: '已清除存檔',
        bodyHTML: '<div>已清除本機 localStorage 存檔。</div>',
        actions: [{text:'OK', primary:true, onClick: closeModal}]
      });
    });

    optSound?.addEventListener('change', () => {
      AudioManager.setEnabled(optSound.checked);
      if(optSound.checked) AudioManager.play('select');
    });
  }

  function wireGameButtons(){
    btnRestart.addEventListener('click', () => restartSameConfig());
    btnToMenu.addEventListener('click', () => { autoSaveIfPlaying(); toMenu(true); });
    btnCheckWin.addEventListener('click', onCheckWinClick);
  }

  // Autoplay unlock (first user gesture)
  function wireAutoplayUnlock(){
    const unlockOnce = async () => {
      await AudioManager.unlock();
      if(optSound && optSound.checked) AudioManager.play('select');
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      window.removeEventListener('touchstart', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, {passive:true});
    window.addEventListener('touchstart', unlockOnce, {passive:true});
    window.addEventListener('keydown', unlockOnce);
  }

  window.addEventListener('beforeunload', () => {
    try{ autoSaveIfPlaying(); }catch(_e){}
  });

  // -----------------------------
  // Boot
  // -----------------------------
  function boot(){
    wireMenu();
    wireGameButtons();
    wireInGameToggles();
    wireAutoplayUnlock();

    updateMenuVisibility();

    // Defaults
    inSound.checked = true;
    inMoveHints.checked = true;
    inDangerHints.checked = false;
    inDarkCapture.checked = true;
    inChainCapture.checked = true;
    if(optSound) optSound.checked = true;

    AudioManager.setEnabled(true);

    showScreen('menu');
    maybePromptResume();
  }

  boot();

})();
