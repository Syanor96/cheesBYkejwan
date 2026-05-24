// ═══════════════════════════════════════════════════════
//  CHESS — ENGINE + BOT AI + SOUND + MENU
// ═══════════════════════════════════════════════════════

// ── Piece tables ─────────────────────────────────────
const WHITE_PIECES=['♙','♖','♘','♗','♕','♔'];
const PIECE_VAL={'♙':100,'♖':500,'♘':320,'♗':330,'♕':900,'♔':20000,
                 '♟':100,'♜':500,'♞':320,'♝':330,'♛':900,'♚':20000};
const PIECE_DISPLAY_VAL={'♙':1,'♖':5,'♘':3,'♗':3,'♕':9,'♔':0,
                         '♟':1,'♜':5,'♞':3,'♝':3,'♛':9,'♚':0};
const PIECE_ORDER={'♙':1,'♟':1,'♘':2,'♞':2,'♗':3,'♝':3,'♖':4,'♜':4,'♕':5,'♛':5,'♔':6,'♚':6};

// Piece-square tables (white pov, row0=rank8)
const PST={
'♙':[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
'♘':[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
'♗':[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
'♖':[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
'♕':[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
'♔':[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};
for(const[wp,bp]of[['♙','♟'],['♘','♞'],['♗','♝'],['♖','♜'],['♕','♛'],['♔','♚']]){
    PST[bp]=[...PST[wp]].reverse();
}

// ── Game state ────────────────────────────────────────
const INIT=[
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],['','','','','','','',''],
    ['','','','','','','',''],['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖']
];

let board,turn,sel,history;
let epTarget=null, cr={wK:1,wQ:1,bK:1,bQ:1}, over=false;
let capW=[],capB=[];
let lastFrom=null,lastTo=null;
let undoStack=[];

// Bot
let mode='human', botCol='black', botLvl=2, playerSide='black';
let botBusy=false;

// ── Timer ─────────────────────────────────────────────
let timerEnabled=false, timerMins=3;
let timeW=0, timeB=0, timerInterval=null;

function formatTime(s){
    const m=Math.floor(s/60),sec=s%60;
    return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function updateTimerDisplay(){
    $('time-white').textContent=formatTime(timeW);
    $('time-black').textContent=formatTime(timeB);
    $('timer-white').classList.toggle('low',timeW<=30&&timeW>0);
    $('timer-black').classList.toggle('low',timeB<=30&&timeB>0);
}
function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
function startTimer(){
    stopTimer();
    if(!timerEnabled||over)return;
    timerInterval=setInterval(()=>{
        if(over){stopTimer();return;}
        if(turn==='white'){
            timeW--;
            if(timeW<=0){timeW=0;updateTimerDisplay();stopTimer();over=true;
                SFX.checkmate();
                setTimeout(()=>toast2('⏱ وقت سفید تموم شد! سیاه برنده شد 🏆',7000),100);return;}
        } else {
            timeB--;
            if(timeB<=0){timeB=0;updateTimerDisplay();stopTimer();over=true;
                SFX.checkmate();
                setTimeout(()=>toast2('⏱ وقت سیاه تموم شد! سفید برنده شد 🏆',7000),100);return;}
        }
        updateTimerDisplay();
    },1000);
}

// ── Sound engine (Web Audio — no files needed) ────────
let actx=null, sfxOn=true;
function ac(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();return actx;}

function tone(f,type,dur,vol=0.15){
    if(!sfxOn)return;
    try{
        const ctx=ac(),o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type=type;o.frequency.setValueAtTime(f,ctx.currentTime);
        g.gain.setValueAtTime(vol,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
        o.start();o.stop(ctx.currentTime+dur);
    }catch(e){}
}
function noise(dur,vol=0.07){
    if(!sfxOn)return;
    try{
        const ctx=ac(),buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate);
        const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
        const s=ctx.createBufferSource(),g=ctx.createGain();
        s.buffer=buf;s.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(vol,ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
        s.start();
    }catch(e){}
}

const SFX={
    select(){ tone(660,'sine',0.06,0.07); },
    move(){
        // wooden thud: noise burst + soft tone
        noise(0.05,0.09);
        setTimeout(()=>tone(280,'triangle',0.1,0.1),20);
    },
    capture(){
        noise(0.1,0.15);
        tone(180,'sawtooth',0.18,0.13);
    },
    castle(){
        tone(330,'triangle',0.09,0.12);
        setTimeout(()=>tone(440,'triangle',0.09,0.12),90);
        setTimeout(()=>tone(550,'triangle',0.14,0.12),180);
    },
    check(){
        tone(880,'square',0.07,0.11);
        setTimeout(()=>tone(660,'square',0.1,0.09),80);
        setTimeout(()=>tone(440,'square',0.16,0.07),180);
    },
    checkmate(){
        [220,196,174,164].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',0.38,0.16),i*200));
    },
    stalemate(){
        tone(300,'triangle',0.28,0.1);
        setTimeout(()=>tone(280,'triangle',0.28,0.09),320);
    },
    promote(){
        [440,550,660,880].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',0.15,0.12),i*80));
    }
};

// ── DOM ───────────────────────────────────────────────
const $=id=>document.getElementById(id);
const $board=$('chessboard'), $turn=$('turn-indicator'), $reset=$('reset-btn');
const $wInd=$('white-indicator'), $bInd=$('black-indicator');
const $wBar=document.querySelector('.player-white'), $bBar=document.querySelector('.player-black');
const $log=$('move-log'), $toast=$('toast');
const $wCap=$('white-captured'), $bCap=$('black-captured');
const $wScore=$('white-score'), $bScore=$('black-score');
const $wName=$('white-name'), $bName=$('black-name');
const $botThink=$('bot-thinking');
const $pause=$('pause-overlay');

// ── Helpers ───────────────────────────────────────────
const pc=p=>!p?null:WHITE_PIECES.includes(p)?'white':'black';
const opp=c=>c==='white'?'black':'white';
const clone=b=>b.map(r=>[...r]);
const sq2n=(r,c)=>'abcdefgh'[7-c]+(8-r);

// ── Raw moves (no check filter) ───────────────────────
function rawMoves(b,fr,fc,ep,cst,col){
    const piece=b[fr][fc];
    if(!piece||pc(piece)!==col)return[];
    const mv=[],op=opp(col);
    function add(r,c){
        if(r<0||r>7||c<0||c>7)return;
        const t=b[r][c];if(t&&pc(t)===col)return;
        mv.push({row:r,col:c});
    }
    function slide(dr,dc){
        let r=fr+dr,c=fc+dc;
        while(r>=0&&r<8&&c>=0&&c<8){
            const t=b[r][c];
            if(t){if(pc(t)===op)mv.push({row:r,col:c});break;}
            mv.push({row:r,col:c});r+=dr;c+=dc;
        }
    }
    switch(piece){
    case'♙':
        if(fr>0&&!b[fr-1][fc])add(fr-1,fc);
        if(fr===6&&!b[5][fc]&&!b[4][fc])add(4,fc);
        for(const dc of[-1,1]){
            const tc=fc+dc;if(tc<0||tc>7||fr<1)continue;
            const t=b[fr-1][tc];
            if(t&&pc(t)==='black')mv.push({row:fr-1,col:tc});
            if(ep&&ep.row===fr-1&&ep.col===tc)mv.push({row:fr-1,col:tc,ep:1});
        }
        break;
    case'♟':
        if(fr<7&&!b[fr+1][fc])add(fr+1,fc);
        if(fr===1&&!b[2][fc]&&!b[3][fc])add(3,fc);
        for(const dc of[-1,1]){
            const tc=fc+dc;if(tc<0||tc>7||fr>6)continue;
            const t=b[fr+1][tc];
            if(t&&pc(t)==='white')mv.push({row:fr+1,col:tc});
            if(ep&&ep.row===fr+1&&ep.col===tc)mv.push({row:fr+1,col:tc,ep:1});
        }
        break;
    case'♖':case'♜':
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♗':case'♝':
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♕':case'♛':
        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♘':case'♞':
        [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(fr+dr,fc+dc));break;
    case'♔':
        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(fr+dr,fc+dc));
        if(col==='white'&&fr===7&&fc===4){
            if(cst.wK&&!b[7][5]&&!b[7][6]&&b[7][7]==='♖')mv.push({row:7,col:6,castle:'wK'});
            if(cst.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&b[7][0]==='♖')mv.push({row:7,col:2,castle:'wQ'});
        }
        break;
    case'♚':
        [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(fr+dr,fc+dc));
        if(col==='black'&&fr===0&&fc===4){
            if(cst.bK&&!b[0][5]&&!b[0][6]&&b[0][7]==='♜')mv.push({row:0,col:6,castle:'bK'});
            if(cst.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&b[0][0]==='♜')mv.push({row:0,col:2,castle:'bQ'});
        }
        break;
    }
    return mv;
}

function applyMove(b,fr,fc,m,promoPiece){
    const nb=clone(b),piece=nb[fr][fc];
    nb[m.row][m.col]=piece;nb[fr][fc]='';
    if(m.ep){pc(piece)==='white'?nb[m.row+1][m.col]='':nb[m.row-1][m.col]='';}
    if(m.castle==='wK'){nb[7][5]='♖';nb[7][7]='';}
    if(m.castle==='wQ'){nb[7][3]='♖';nb[7][0]='';}
    if(m.castle==='bK'){nb[0][5]='♜';nb[0][7]='';}
    if(m.castle==='bQ'){nb[0][3]='♜';nb[0][0]='';}
    // promotion: use chosen piece if provided, else default to queen (for AI/undo)
    if(piece==='♙'&&m.row===0)nb[m.row][m.col]=promoPiece||'♕';
    if(piece==='♟'&&m.row===7)nb[m.row][m.col]=promoPiece||'♛';
    return nb;
}

function findKing(b,col){
    const k=col==='white'?'♔':'♚';
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return{row:r,col:c};
    return null;
}

// Fast attacked() — checks outward from target square, no full board scan
function attacked(b,row,col,byCol){
    const rookP=byCol==='white'?['♖','♕']:['♜','♛'];
    const bishP=byCol==='white'?['♗','♕']:['♝','♛'];
    // Rook/Queen lines
    for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){
        let r=row+dr,c=col+dc;
        while(r>=0&&r<8&&c>=0&&c<8){
            const p=b[r][c];
            if(p){if(pc(p)===byCol&&rookP.includes(p))return true;break;}
            r+=dr;c+=dc;
        }
    }
    // Bishop/Queen diagonals
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
        let r=row+dr,c=col+dc;
        while(r>=0&&r<8&&c>=0&&c<8){
            const p=b[r][c];
            if(p){if(pc(p)===byCol&&bishP.includes(p))return true;break;}
            r+=dr;c+=dc;
        }
    }
    // Knight
    const kn=byCol==='white'?'♘':'♞';
    for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]){
        const r=row+dr,c=col+dc;
        if(r>=0&&r<8&&c>=0&&c<8&&b[r][c]===kn)return true;
    }
    // Pawn
    if(byCol==='white'){
        if(row+1<8){
            if(col>0&&b[row+1][col-1]==='♙')return true;
            if(col<7&&b[row+1][col+1]==='♙')return true;
        }
    } else {
        if(row>0){
            if(col>0&&b[row-1][col-1]==='♟')return true;
            if(col<7&&b[row-1][col+1]==='♟')return true;
        }
    }
    // King
    const kg=byCol==='white'?'♔':'♚';
    for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const r=row+dr,c=col+dc;
        if(r>=0&&r<8&&c>=0&&c<8&&b[r][c]===kg)return true;
    }
    return false;
}

function legalMoves(b,fr,fc,col,ep,cst){
    const piece=b[fr][fc];
    if(!piece||pc(piece)!==col)return[];
    return rawMoves(b,fr,fc,ep,cst,col).filter(m=>{
        if(m.castle){
            const pass=m.castle.endsWith('K')?[5,6]:[2,3];
            const row=m.castle.startsWith('w')?7:0;
            if(attacked(b,row,4,opp(col)))return false;
            for(const pc2 of pass)if(attacked(b,row,pc2,opp(col)))return false;
        }
        const nb=applyMove(b,fr,fc,m);
        const k=findKing(nb,col);
        return k&&!attacked(nb,k.row,k.col,opp(col));
    });
}

function inCheck(b,col){
    const k=findKing(b,col);
    return k&&attacked(b,k.row,k.col,opp(col));
}

function hasLegal(b,col,ep,cst){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
        if(pc(b[r][c])===col&&legalMoves(b,r,c,col,ep,cst).length)return true;
    return false;
}

// ── Board rendering ───────────────────────────────────
// prevBoard mirrors what is currently painted on the DOM
let prevBoard=null;
let prevCheckSq=null; // {row,col} of last in-check king square

function sqEl(r,c){return $board.children[r*8+c];}

function setSqContent(sq,r,c,p,isCheck){
    const cl=sq.classList;
    if(p){
        let span=sq.querySelector('.piece');
        if(!span){span=document.createElement('span');sq.appendChild(span);}
        const want='piece '+(pc(p)==='white'?'piece-white':'piece-black');
        if(span.className!==want)span.className=want;
        if(span.textContent!==p)span.textContent=p;
        cl.add('has-piece');
    } else {
        const span=sq.querySelector('.piece');
        if(span)span.remove();
        cl.remove('has-piece');
    }
    if(isCheck)cl.add('in-check'); else cl.remove('in-check');
    if(!isCheck)cl.remove('checkmate-king');
}

// Build the 64 squares once; afterwards only patch
function buildBoard(){
    $board.innerHTML='';
    prevBoard=Array.from({length:8},()=>Array(8).fill(''));
    prevCheckSq=null;
    for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
            const sq=document.createElement('div');
            sq.className='square '+((r+c)%2===0?'white-square':'black-square');
            sq.addEventListener('click',()=>clickSq(r,c));
            $board.appendChild(sq);
        }
    }
}

// Full sync after undo / initGame
function render(){
    if($board.children.length!==64)buildBoard();
    const chk=inCheck(board,turn);
    const king=chk?findKing(board,turn):null;
    for(let r=0;r<8;r++){
        for(let c=0;c<8;c++){
            const sq=sqEl(r,c);
            const p=board[r][c];
            const isCheck=!!(chk&&king&&r===king.row&&c===king.col);
            sq.classList.toggle('last-from',!!(lastFrom&&lastFrom.row===r&&lastFrom.col===c));
            sq.classList.toggle('last-to',!!(lastTo&&lastTo.row===r&&lastTo.col===c));
            setSqContent(sq,r,c,p,isCheck);
            prevBoard[r][c]=p;
        }
    }
    prevCheckSq=king?{row:king.row,col:king.col}:null;
}

// Incremental update — only touch squares that changed
function patchBoard(changedSquares,prevLF,prevLT){
    if(prevLF)sqEl(prevLF.row,prevLF.col).classList.remove('last-from');
    if(prevLT)sqEl(prevLT.row,prevLT.col).classList.remove('last-to');
    if(prevCheckSq)sqEl(prevCheckSq.row,prevCheckSq.col).classList.remove('in-check');
    for(const{r,c} of changedSquares){
        setSqContent(sqEl(r,c),r,c,board[r][c],false);
        prevBoard[r][c]=board[r][c];
    }
    if(lastFrom)sqEl(lastFrom.row,lastFrom.col).classList.add('last-from');
    if(lastTo)sqEl(lastTo.row,lastTo.col).classList.add('last-to');
    const chk=inCheck(board,turn);
    const king=chk?findKing(board,turn):null;
    if(king){sqEl(king.row,king.col).classList.add('in-check');prevCheckSq={row:king.row,col:king.col};}
    else prevCheckSq=null;
}

// ── Piece animation ───────────────────────────────────
const ANIM_MS=160; // move duration
const $fly=document.getElementById('fly-piece');

function sqCenter(r,c){
    const sq=sqEl(r,c);
    const rect=sq.getBoundingClientRect();
    return{x:rect.left+rect.width/2, y:rect.top+rect.height/2};
}

// Animate piece from (fr,fc) to (tr,tc), then call done()
// capturedPos: {r,c} of piece to fade out before arrival (optional)
function animatePiece(piece,fr,fc,tr,tc,capturedSq,done){
    const isWhite=pc(piece)==='white';
    const from=sqCenter(fr,fc);
    const to=sqCenter(tr,tc);
    const sqSize=sqEl(0,0).getBoundingClientRect().width;

    // Hide the real piece on source square during flight
    const srcSpan=sqEl(fr,fc).querySelector('.piece');
    if(srcSpan)srcSpan.style.opacity='0';

    // Fade out captured piece immediately
    if(capturedSq){
        const capSpan=sqEl(capturedSq.r,capturedSq.c).querySelector('.piece');
        if(capSpan){
            capSpan.style.transition='transform .12s ease-in, opacity .12s ease-in';
            capSpan.style.transform='scale(1.3)';
            capSpan.style.opacity='0';
        }
    }

    // Set up fly element
    $fly.textContent=piece;
    $fly.className='fly-piece '+(isWhite?'piece-white':'piece-black');
    $fly.style.cssText=`
        display:block;
        font-size:calc(var(--sq) * .82);
        width:${sqSize}px;height:${sqSize}px;
        line-height:${sqSize}px;
        text-align:center;
        left:${from.x - sqSize/2}px;
        top:${from.y - sqSize/2}px;
        transform:scale(1.18) translateZ(0);
        filter:drop-shadow(0 6px 14px rgba(0,0,0,.55));
        will-change:transform,left,top;
        transition:none;
        z-index:999;
    `;

    // Arc via Web Animations API — lift piece slightly on the way
    const dx=to.x-from.x, dy=to.y-from.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const arc=Math.min(dist*0.18, sqSize*0.9); // arc height proportional to distance
    const easing='cubic-bezier(.25,.1,.3,1)';

    $fly.animate([
        {left:`${from.x-sqSize/2}px`, top:`${from.y-sqSize/2}px`, transform:'scale(1.18) translateZ(0)', offset:0},
        {left:`${(from.x+to.x)/2-sqSize/2}px`, top:`${(from.y+to.y)/2-sqSize/2-arc}px`, transform:'scale(1.22) translateZ(0)', offset:0.45},
        {left:`${to.x-sqSize/2}px`, top:`${to.y-sqSize/2}px`, transform:'scale(1) translateZ(0)', offset:1},
    ],{duration:ANIM_MS, easing, fill:'forwards'})
    .finished.then(()=>{
        $fly.style.display='none';
        if(srcSpan)srcSpan.style.opacity='';
        done();
    });
}

// Castle: animate king first, then rook simultaneously
function animateCastle(piece,fr,fc,tr,tc,rookFr,rookFc,rookTr,rookTc,done){
    const isWhite=pc(piece)==='white';
    const rookPiece=isWhite?'♖':'♜';

    // Second fly element for rook (we reuse $fly for king, create temp for rook)
    const $fly2=document.createElement('div');
    $fly2.className='fly-piece '+(isWhite?'piece-white':'piece-black');
    document.body.appendChild($fly2);

    const sqSize=sqEl(0,0).getBoundingClientRect().width;
    const kFrom=sqCenter(fr,fc), kTo=sqCenter(tr,tc);
    const rFrom=sqCenter(rookFr,rookFc), rTo=sqCenter(rookTr,rookTc);

    const hideKing=sqEl(fr,fc).querySelector('.piece');
    const hideRook=sqEl(rookFr,rookFc).querySelector('.piece');
    if(hideKing)hideKing.style.opacity='0';
    if(hideRook)hideRook.style.opacity='0';

    function setupFly(el,p,isW){
        el.textContent=p;
        el.className='fly-piece '+(isW?'piece-white':'piece-black');
        el.style.cssText=`display:block;font-size:calc(var(--sq)*.82);width:${sqSize}px;height:${sqSize}px;line-height:${sqSize}px;text-align:center;z-index:999;will-change:transform,left,top;`;
    }
    setupFly($fly,piece,isWhite);
    setupFly($fly2,rookPiece,isWhite);

    const easing='cubic-bezier(.25,.1,.3,1)';
    const kAnim=$fly.animate([
        {left:`${kFrom.x-sqSize/2}px`,top:`${kFrom.y-sqSize/2}px`,transform:'scale(1.18)'},
        {left:`${(kFrom.x+kTo.x)/2-sqSize/2}px`,top:`${(kFrom.y+kTo.y)/2-sqSize/2-sqSize*.3}px`,transform:'scale(1.22)'},
        {left:`${kTo.x-sqSize/2}px`,top:`${kTo.y-sqSize/2}px`,transform:'scale(1)'},
    ],{duration:ANIM_MS*1.2,easing,fill:'forwards'});

    $fly2.animate([
        {left:`${rFrom.x-sqSize/2}px`,top:`${rFrom.y-sqSize/2}px`,transform:'scale(1.1)'},
        {left:`${rTo.x-sqSize/2}px`,top:`${rTo.y-sqSize/2}px`,transform:'scale(1)'},
    ],{duration:ANIM_MS*1.1,easing,fill:'forwards'});

    kAnim.finished.then(()=>{
        $fly.style.display='none';
        $fly2.remove();
        if(hideKing)hideKing.style.opacity='';
        if(hideRook)hideRook.style.opacity='';
        done();
    });
}

function clearHL(){for(const s of $board.children)s.classList.remove('selected','highlight','capture-highlight');}

function showMoves(fr,fc){
    legalMoves(board,fr,fc,turn,epTarget,cr).forEach(m=>{
        const sq=sqEl(m.row,m.col);
        sq.classList.add(board[m.row][m.col]||m.ep?'capture-highlight':'highlight');
    });
}

// ── Click handler ─────────────────────────────────────
function clickSq(r,c){
    if(over)return;
    if(mode==='bot'&&turn===botCol)return;
    if(botBusy)return;
    SFX.select();

    const p=board[r][c],col=pc(p);
    if(!sel){
        if(p&&col===turn){sel={row:r,col:c};clearHL();sqEl(r,c).classList.add('selected');showMoves(r,c);}
        return;
    }
    if(sel.row===r&&sel.col===c){clearHL();sel=null;return;}
    if(p&&col===turn){sel={row:r,col:c};clearHL();sqEl(r,c).classList.add('selected');showMoves(r,c);return;}

    const mv=legalMoves(board,sel.row,sel.col,turn,epTarget,cr).find(m=>m.row===r&&m.col===c);
    if(mv)doMove(sel.row,sel.col,mv);
    else{clearHL();sel=null;}
}

// ── Execute move ──────────────────────────────────────
function doMove(fr,fc,m){
    const piece=board[fr][fc];
    const captured=board[m.row][m.col];
    const isPromotion=(piece==='♙'&&m.row===0)||(piece==='♟'&&m.row===7);

    // Save state for undo
    undoStack.push({
        board:clone(board),turn,epTarget,
        cr:{...cr},capW:[...capW],capB:[...capB],
        lastFrom:lastFrom?{...lastFrom}:null,
        lastTo:lastTo?{...lastTo}:null,
        histLen:history.length
    });

    // Track captures
    if(captured){pc(piece)==='white'?capW.push(captured):capB.push(captured);}
    if(m.ep){pc(piece)==='white'?capW.push('♟'):capB.push('♙');}

    // Compute changed squares BEFORE applying move
    const prevLF=lastFrom?{...lastFrom}:null;
    const prevLT=lastTo?{...lastTo}:null;
    const changed=[];
    function markChanged(r,c){changed.push({r,c});}
    markChanged(fr,fc);
    markChanged(m.row,m.col);
    if(m.castle==='wK'){markChanged(7,5);markChanged(7,7);}
    if(m.castle==='wQ'){markChanged(7,3);markChanged(7,0);}
    if(m.castle==='bK'){markChanged(0,5);markChanged(0,7);}
    if(m.castle==='bQ'){markChanged(0,3);markChanged(0,0);}
    if(m.ep){pc(piece)==='white'?markChanged(m.row+1,m.col):markChanged(m.row-1,m.col);}

    // Captured square for animation (en passant differs from destination)
    const capSq=m.ep
        ?(pc(piece)==='white'?{r:m.row+1,c:m.col}:{r:m.row-1,c:m.col})
        :(captured?{r:m.row,c:m.col}:null);

    sel=null;clearHL();

    // ── CASTLE ──────────────────────────────────────────
    if(m.castle){
        const isWK=m.castle==='wK',isWQ=m.castle==='wQ',isBK=m.castle==='bK';
        const rookFr=m.castle.startsWith('w')?7:0;
        const rookFc=(isWK||isBK)?7:0;
        const rookTc=(isWK||isBK)?5:3;
        SFX.castle();
        // Apply board state immediately (DOM update happens after anim)
        board=applyMove(board,fr,fc,m);
        updateCastlingEp(piece,fr,fc,m);
        lastFrom={row:fr,col:fc};lastTo={row:m.row,col:m.col};
        animateCastle(piece,fr,fc,m.row,m.col,rookFr,rookFc,rookFr,rookTc,()=>{
            patchBoard(changed,prevLF,prevLT);
            finishMove(piece,fr,fc,m,captured,null,null,null,false);
        });
        return;
    }

    // ── PROMOTION (human) ────────────────────────────────
    if(isPromotion&&(mode==='human'||(mode==='bot'&&turn!==botCol))){
        board=applyMove(board,fr,fc,m,'__pending__');
        board[m.row][m.col]=piece;
        updateCastlingEp(piece,fr,fc,m);
        lastFrom={row:fr,col:fc};lastTo={row:m.row,col:m.col};
        if(captured||m.ep)SFX.capture(); else SFX.move();
        animatePiece(piece,fr,fc,m.row,m.col,capSq,()=>{
            patchBoard(changed,prevLF,prevLT);
            showPromoModal(piece,m.row,m.col,fr,fc,m,captured);
        });
        return;
    }

    // ── NORMAL MOVE ──────────────────────────────────────
    // NOTE: apply board state AFTER animation so captured piece is still visible during flight
    updateCastlingEp(piece,fr,fc,m);
    lastFrom={row:fr,col:fc};lastTo={row:m.row,col:m.col};

    if(captured||m.ep)SFX.capture(); else SFX.move();

    animatePiece(piece,fr,fc,m.row,m.col,capSq,()=>{
        board=applyMove(board,fr,fc,m);
        patchBoard(changed,prevLF,prevLT);
        finishMove(piece,fr,fc,m,captured,null,null,null,false);
    });
}

// Shared: update castling rights + en-passant after a move
function updateCastlingEp(piece,fr,fc,m){
    if(piece==='♔'){cr.wK=0;cr.wQ=0;}
    if(piece==='♚'){cr.bK=0;cr.bQ=0;}
    if(piece==='♖'&&fc===7&&fr===7)cr.wK=0;
    if(piece==='♖'&&fc===0&&fr===7)cr.wQ=0;
    if(piece==='♜'&&fc===7&&fr===0)cr.bK=0;
    if(piece==='♜'&&fc===0&&fr===0)cr.bQ=0;
    if(piece==='♙'&&fr-m.row===2)epTarget={row:fr-1,col:fc};
    else if(piece==='♟'&&m.row-fr===2)epTarget={row:fr+1,col:fc};
    else epTarget=null;
}

// ── Promotion modal ───────────────────────────────────
function showPromoModal(pawn,pr,pc2,fr,fc,m,captured){
    const isWhite=pawn==='♙';
    const opts=isWhite
        ?[{p:'♕',n:'وزیر'},{p:'♖',n:'رخ'},{p:'♗',n:'فیل'},{p:'♘',n:'اسب'}]
        :[ {p:'♛',n:'وزیر'},{p:'♜',n:'رخ'},{p:'♝',n:'فیل'},{p:'♞',n:'اسب'}];
    const $pp=$('promo-pieces');
    $pp.innerHTML='';
    opts.forEach(({p,n})=>{
        const btn=document.createElement('button');
        btn.className='promo-btn '+(isWhite?'piece-white-btn':'piece-black-btn');
        btn.innerHTML=`<span class="promo-piece-icon">${p}</span><span class="promo-name">${n}</span>`;
        btn.addEventListener('click',()=>{
            $('promo-overlay').classList.add('hidden');
            // Place chosen piece
            board[pr][pc2]=p;
            setSqContent(sqEl(pr,pc2),pr,pc2,p,false);
            SFX.promote();
            promotionBurst(pr,pc2);
            finishMove(pawn,fr,fc,m,captured,[],null,null,true,p);
        },{once:true});
        $pp.appendChild(btn);
    });
    $('promo-overlay').classList.remove('hidden');
}

function finishMove(piece,fr,fc,m,captured,_c,_pf,_pt,wasPromo,promoPiece){
    addLog(piece,fr,fc,m,captured||m.ep);
    updateCap();

    const promotedTo=wasPromo?promoPiece:board[m.row][m.col];
    turn=opp(turn);
    updateTurn();
    if(timerEnabled)startTimer();

    if(wasPromo)toast2((pc(piece)==='white'?'سفید':'سیاه')+' ترفیع گرفت! '+promotedTo,2500);

    // Post-move check/mate/stalemate
    const oppCheck=inCheck(board,turn);
    const oppHas=hasLegal(board,turn,epTarget,cr);

    if(!oppHas){
        over=true;
        stopTimer();
        if(oppCheck){
            SFX.checkmate();
            const winner=turn==='white'?'سیاه':'سفید';
            setTimeout(()=>toast2('♟ کیش و مات! بازیکن '+winner+' برنده شد 🏆',7000),200);
            const k=findKing(board,turn);
            if(k)$board.children[k.row*8+k.col].classList.add('checkmate-king');
            setTimeout(checkmateWave,600);
        } else {
            SFX.stalemate();
            setTimeout(()=>toast2('پات! بازی مساوی شد 🤝',5000),200);
        }
    } else if(oppCheck){
        SFX.check();
        toast2('کیش! ♚',2000);
    }

    if(!over&&mode==='bot'&&turn===botCol)scheduleBotMove();
}

// ── Checkmate wave animation ──────────────────────────
function checkmateWave(){
    // All opponent pieces fly off with staggered delay
    const loser=turn; // turn is already switched to loser in finishMove
    const pieces=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
        if(board[r][c]&&pc(board[r][c])===loser)pieces.push({r,c});
    pieces.forEach(({r,c},i)=>{
        const sq=sqEl(r,c);
        const span=sq.querySelector('.piece');
        if(!span)return;
        setTimeout(()=>{
            span.style.transition=`transform .5s cubic-bezier(.4,0,.6,1) ${i*18}ms, opacity .5s ease ${i*18}ms`;
            const angle=(Math.random()*260+50)*(Math.PI/180);
            const dist=60+Math.random()*50;
            span.style.transform=`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${(Math.random()-.5)*720}deg) scale(.3)`;
            span.style.opacity='0';
        },300+i*18);
    });
}

// ── Promotion burst ───────────────────────────────────
function promotionBurst(r,c){
    const sq=sqEl(r,c);
    const rect=sq.getBoundingClientRect();
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
    const stars='★✦✧◆◇●';
    for(let i=0;i<12;i++){
        const p=document.createElement('span');
        p.textContent=stars[i%stars.length];
        const angle=(i/12)*Math.PI*2;
        const dist=35+Math.random()*30;
        const col=['#d4a017','#f6e27a','#fff','#ffcc44'][i%4];
        p.style.cssText=`position:fixed;left:${cx}px;top:${cy}px;font-size:${10+Math.random()*8}px;color:${col};pointer-events:none;z-index:1000;transform:translate(-50%,-50%);transition:none;`;
        document.body.appendChild(p);
        requestAnimationFrame(()=>{
            p.style.transition=`transform .55s cubic-bezier(.2,0,.8,1), opacity .55s ease .1s`;
            p.style.transform=`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`;
            p.style.opacity='0';
        });
        setTimeout(()=>p.remove(),700);
    }
}

// ── Bot AI (minimax + alpha-beta) ─────────────────────
function evalBoard(b){
    let score=0;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=b[r][c];if(!p)continue;
        const idx=r*8+c;
        const pst=PST[p]?PST[p][idx]:0;
        score+=(pc(p)==='white'?1:-1)*(PIECE_VAL[p]+pst);
    }
    return score;
}

function allLegal(b,col,ep,cst){
    const mvs=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)
        if(pc(b[r][c])===col)
            for(const m of legalMoves(b,r,c,col,ep,cst))mvs.push({fr:r,fc:c,m});
    return mvs;
}

// Sort moves: captures first (MVV-LVA), then by PST gain
function sortMoves(b,mvs){
    return mvs.sort((a,b2)=>{
        const capA=b[a.m.row][a.m.col]?PIECE_VAL[b[a.m.row][a.m.col]]:0;
        const capB2=b[b2.m.row][b2.m.col]?PIECE_VAL[b[b2.m.row][b2.m.col]]:0;
        return capB2-capA;
    });
}

function minimax(b,depth,alpha,beta,maxCol,ep,cst){
    if(depth===0)return evalBoard(b);
    const mvs=sortMoves(b,allLegal(b,maxCol,ep,cst));
    if(!mvs.length){
        if(inCheck(b,maxCol))return maxCol==='white'?-99999:99999;
        return 0;
    }
    let best=maxCol==='white'?-Infinity:Infinity;
    for(const{fr,fc,m} of mvs){
        // update ep/cr for child
        let nep=null;
        const npiece=b[fr][fc];
        if(npiece==='♙'&&fr-m.row===2)nep={row:fr-1,col:fc};
        else if(npiece==='♟'&&m.row-fr===2)nep={row:fr+1,col:fc};
        const ncr={...cst};
        if(npiece==='♔'){ncr.wK=0;ncr.wQ=0;}
        if(npiece==='♚'){ncr.bK=0;ncr.bQ=0;}
        const nb=applyMove(b,fr,fc,m);
        const val=minimax(nb,depth-1,alpha,beta,opp(maxCol),nep,ncr);
        if(maxCol==='white'){best=Math.max(best,val);alpha=Math.max(alpha,val);}
        else{best=Math.min(best,val);beta=Math.min(beta,val);}
        if(beta<=alpha)break;
    }
    return best;
}

function getBotMove(){
    const depth=[0,1,2,3][Math.min(botLvl,3)];
    const mvs=sortMoves(board,allLegal(board,botCol,epTarget,cr));
    if(!mvs.length)return null;
    let best=botCol==='white'?-Infinity:Infinity;
    let bestMove=mvs[0];
    // Add tiny randomness at low levels
    const noise=botLvl===1?50:botLvl===2?15:0;
    for(const{fr,fc,m} of mvs){
        let nep=null;
        const npiece=board[fr][fc];
        if(npiece==='♙'&&fr-m.row===2)nep={row:fr-1,col:fc};
        else if(npiece==='♟'&&m.row-fr===2)nep={row:fr+1,col:fc};
        const ncr={...cr};
        if(npiece==='♔'){ncr.wK=0;ncr.wQ=0;}
        if(npiece==='♚'){ncr.bK=0;ncr.bQ=0;}
        const nb=applyMove(board,fr,fc,m);
        const val=minimax(nb,depth,botCol==='white'?-Infinity:Infinity,botCol==='white'?Infinity:-Infinity,opp(botCol),nep,ncr)+(Math.random()-0.5)*noise;
        if(botCol==='white'?val>best:val<best){best=val;bestMove={fr,fc,move:m};}
    }
    return bestMove;
}

// ── Web Worker for bot AI ─────────────────────────────
let _botWorker=null;
function ensureWorker(){
    if(!_botWorker){
        try{ _botWorker=new Worker('./chess-worker.js'); }catch(e){ _botWorker=null; }
    }
    return _botWorker;
}

function scheduleBotMove(){
    botBusy=true;
    $botThink.classList.remove('hidden');
    const w=ensureWorker();
    if(w){
        w.onmessage=e=>{
            $botThink.classList.add('hidden');
            botBusy=false;
            const bm=e.data;
            if(bm&&!over)doMove(bm.fr,bm.fc,bm.move||bm.m);
        };
        w.onerror=()=>{
            _botWorker=null;
            fallbackBotMove();
        };
        // Small delay so UI can paint "thinking..." before heavy work
        setTimeout(()=>{
            w.postMessage({board:board.map(r=>[...r]),botCol,botLvl,epTarget,cr:{...cr}});
        },50);
    } else {
        fallbackBotMove();
    }
}

function fallbackBotMove(){
    setTimeout(()=>{
        const bm=getBotMove();
        $botThink.classList.add('hidden');
        botBusy=false;
        if(bm&&!over)doMove(bm.fr,bm.fc,bm.move);
    },50);
}

// ── Move log ─────────────────────────────────────────
function addLog(piece,fr,fc,m,cap){
    const e=$log.querySelector('.move-log-empty');if(e)e.remove();
    history.push({piece,fr,fc,m,cap});
    const div=document.createElement('div');div.className='move-entry';
    const num=document.createElement('span');num.className='move-number';num.textContent=history.length+'.';
    const pc2=document.createElement('span');pc2.className='move-piece';pc2.textContent=piece;
    const note=document.createElement('span');note.className='move-notation';
    let str=sq2n(fr,fc)+(cap?'×':'→')+sq2n(m.row,m.col);
    if(m.castle)str+=' ♜';if(m.ep)str+=' (آنپاسان)';
    note.textContent=str;
    div.append(num,pc2,note);$log.appendChild(div);$log.scrollTop=$log.scrollHeight;
}

// ── Turn indicator ────────────────────────────────────
function updateTurn(){
    if(turn==='white'){
        $turn.className='turn-display turn-white';
        $turn.innerHTML='<span class="turn-piece">♔</span><span class="turn-text">سفید</span>';
        $wInd.classList.add('active');$bInd.classList.remove('active');
        $wBar.classList.add('active');$bBar.classList.remove('active');
    } else {
        $turn.className='turn-display turn-black';
        $turn.innerHTML='<span class="turn-piece">♚</span><span class="turn-text">سیاه</span>';
        $bInd.classList.add('active');$wInd.classList.remove('active');
        $bBar.classList.add('active');$wBar.classList.remove('active');
    }
}

// ── Captured pieces ───────────────────────────────────
function renderCap(el,pieces){
    const s=[...pieces].sort((a,b2)=>PIECE_ORDER[a]-PIECE_ORDER[b2]);
    el.innerHTML='';
    if(!s.length){el.innerHTML='<span class="cap-empty">—</span>';return;}
    const g={};for(const p of s)g[p]=(g[p]||0)+1;
    for(const[p,n] of Object.entries(g)){
        const w=document.createElement('span');w.className='cap-group';
        const sp=document.createElement('span');
        sp.className='cap-piece '+(pc(p)==='white'?'cap-white':'cap-black');
        sp.textContent=p;w.appendChild(sp);
        if(n>1){const cnt=document.createElement('span');cnt.className='cap-count';cnt.textContent='×'+n;w.appendChild(cnt);}
        el.appendChild(w);
    }
}
function updateCap(){
    renderCap($wCap,capW);renderCap($bCap,capB);
    const wv=capW.reduce((s,p)=>s+PIECE_DISPLAY_VAL[p],0);
    const bv=capB.reduce((s,p)=>s+PIECE_DISPLAY_VAL[p],0);
    const diff=wv-bv;
    $wScore.textContent=diff>0?'+'+diff:'';$bScore.textContent=diff<0?'+'+(-diff):'';
    $wScore.className='score-badge'+(diff>0?' score-lead':'');
    $bScore.className='score-badge'+(diff<0?' score-lead':'');
}

// ── Toast ─────────────────────────────────────────────
let tT;
function toast2(msg,dur=2500){
    clearTimeout(tT);$toast.textContent=msg;$toast.classList.add('show');
    tT=setTimeout(()=>$toast.classList.remove('show'),dur);
}

// ── Init game ─────────────────────────────────────────
function initGame(){
    board=clone(INIT);turn='white';sel=null;history=[];
    capW=[];capB=[];epTarget=null;cr={wK:1,wQ:1,bK:1,bQ:1};
    over=false;botBusy=false;lastFrom=null;lastTo=null;undoStack=[];
    stopTimer();
    if(timerEnabled){
        timeW=timerMins*60;timeB=timerMins*60;
        $('timer-white').classList.remove('hidden');
        $('timer-black').classList.remove('hidden');
        updateTimerDisplay();
    } else {
        $('timer-white').classList.add('hidden');
        $('timer-black').classList.add('hidden');
    }
    $log.innerHTML='<div class="move-log-empty">هنوز حرکتی انجام نشده</div>';
    updateCap();updateTurn();$botThink.classList.add('hidden');
    $wBar.classList.add('active');$bBar.classList.remove('active');
    render();
    if(timerEnabled)startTimer();
    if(mode==='bot'&&botCol==='white')scheduleBotMove();
}

// ═══════════════════════════════════════════════════════
//  SCREEN / MENU LOGIC
// ═══════════════════════════════════════════════════════
function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    $(id).classList.add('active');
}

// Menu card selection
$('btn-vs-human').addEventListener('click',()=>{
    $('difficulty-panel').classList.add('hidden');
    $('btn-start-human').classList.remove('hidden');
    document.querySelectorAll('.menu-card').forEach(c=>c.classList.remove('selected-card'));
    $('btn-vs-human').classList.add('selected-card');
    mode='human';
});
$('btn-vs-bot').addEventListener('click',()=>{
    $('difficulty-panel').classList.remove('hidden');
    $('btn-start-human').classList.add('hidden');
    document.querySelectorAll('.menu-card').forEach(c=>c.classList.remove('selected-card'));
    $('btn-vs-bot').classList.add('selected-card');
    mode='bot';
});

// Difficulty & side buttons
document.querySelectorAll('.diff-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');botLvl=parseInt(btn.dataset.level);
}));
document.querySelectorAll('.side-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.side-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');playerSide=btn.dataset.side;
}));

// Start human
$('btn-start-human').addEventListener('click',()=>{
    mode='human';
    $wName.textContent='بازیکن سفید';$bName.textContent='بازیکن سیاه';
    showScreen('screen-game');initGame();
});

// Start bot
$('btn-start-bot').addEventListener('click',()=>{
    mode='bot';
    let side=playerSide==='random'?(Math.random()<.5?'white':'black'):playerSide;
    botCol=opp(side);
    const lvl=['','مبتدی','متوسط','حرفه‌ای'][botLvl];
    $wName.textContent=side==='white'?'شما':'ربات ('+lvl+')';
    $bName.textContent=side==='black'?'شما':'ربات ('+lvl+')';
    showScreen('screen-game');initGame();
});

// Header buttons
$('btn-menu').addEventListener('click',()=>$pause.classList.remove('hidden'));
$reset.addEventListener('click',()=>{initGame();toast2('بازی جدید شروع شد ♟');});

// Undo
$('btn-undo').addEventListener('click',()=>{
    if(over||botBusy)return;
    // In bot mode: undo 2 moves (player + bot), in human mode: undo 1
    const steps=mode==='bot'?2:1;
    let popped=0;
    for(let i=0;i<steps;i++){
        if(!undoStack.length)break;
        const s=undoStack.pop();
        board=s.board;turn=s.turn;epTarget=s.epTarget;
        cr=s.cr;capW=s.capW;capB=s.capB;
        lastFrom=s.lastFrom;lastTo=s.lastTo;
        history.splice(s.histLen);
        popped++;
    }
    if(!popped){toast2('حرکتی برای بازگشت وجود ندارد');return;}
    over=false;sel=null;
    // Rebuild move log
    $log.innerHTML='';
    if(!history.length){$log.innerHTML='<div class="move-log-empty">هنوز حرکتی انجام نشده</div>';}
    else{history.forEach(h=>{
        const div=document.createElement('div');div.className='move-entry';
        const num=document.createElement('span');num.className='move-number';num.textContent=history.indexOf(h)+1+'.';
        const pc2=document.createElement('span');pc2.className='move-piece';pc2.textContent=h.piece;
        const note=document.createElement('span');note.className='move-notation';
        let str=sq2n(h.fr,h.fc)+(h.cap?'×':'→')+sq2n(h.m.row,h.m.col);
        if(h.m.castle)str+=' ♜';if(h.m.ep)str+=' (آنپاسان)';
        note.textContent=str;div.append(num,pc2,note);$log.appendChild(div);
    });}
    updateCap();updateTurn();
    if(timerEnabled)startTimer();
    render();
    toast2('حرکت بازگشت داده شد ↩');
});

// Pause overlay
$('pause-resume').addEventListener('click',()=>$pause.classList.add('hidden'));
$('pause-new').addEventListener('click',()=>{$pause.classList.add('hidden');initGame();toast2('بازی جدید شروع شد ♟');});
$('pause-main').addEventListener('click',()=>{$pause.classList.add('hidden');showScreen('screen-menu');});

// Sound toggle
const $btnSound=$('btn-sound'),$iOn=$('icon-sound-on'),$iOff=$('icon-sound-off');
$btnSound.addEventListener('click',()=>{
    sfxOn=!sfxOn;
    $iOn.style.display=sfxOn?'':'none';$iOff.style.display=sfxOn?'none':'';
    $btnSound.classList.toggle('sound-off',!sfxOn);
    if(sfxOn){try{ac();}catch(e){}}
});

// Default selections
document.querySelector('.diff-btn[data-level="2"]').classList.add('active');
document.querySelector('.side-btn[data-side="black"]').classList.add('active');

// Timer toggle & time selection
$('timer-toggle').addEventListener('change',function(){
    timerEnabled=this.checked;
    $('timer-config').classList.toggle('hidden',!timerEnabled);
});
document.querySelectorAll('.time-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    timerMins=parseInt(btn.dataset.mins);
}));

// ── Theme buttons ─────────────────────────────────────
function applyTheme(theme){
    document.documentElement.setAttribute('data-theme',theme);
    document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));
    try{localStorage.setItem('chess-theme',theme);}catch(e){}
}
document.querySelectorAll('.theme-btn').forEach(btn=>btn.addEventListener('click',()=>applyTheme(btn.dataset.theme)));
// Load saved theme
try{const saved=localStorage.getItem('chess-theme');if(saved)applyTheme(saved);}catch(e){}
