// chess-worker.js — Bot AI off main thread

const WHITE_PIECES=['♙','♖','♘','♗','♕','♔'];
const PIECE_VAL={'♙':100,'♖':500,'♘':320,'♗':330,'♕':900,'♔':20000,'♟':100,'♜':500,'♞':320,'♝':330,'♛':900,'♚':20000};
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

const pc=p=>!p?null:WHITE_PIECES.includes(p)?'white':'black';
const opp=c=>c==='white'?'black':'white';
const clone=b=>b.map(r=>[...r]);

// Fast attacked() — reverse lookup from target square
function attacked(b,row,col,byCol){
    const rookP=byCol==='white'?['♖','♕']:['♜','♛'];
    const bishP=byCol==='white'?['♗','♕']:['♝','♛'];
    for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){
        let r=row+dr,c=col+dc;
        while(r>=0&&r<8&&c>=0&&c<8){
            const p=b[r][c];
            if(p){if(pc(p)===byCol&&rookP.includes(p))return true;break;}
            r+=dr;c+=dc;
        }
    }
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
        let r=row+dr,c=col+dc;
        while(r>=0&&r<8&&c>=0&&c<8){
            const p=b[r][c];
            if(p){if(pc(p)===byCol&&bishP.includes(p))return true;break;}
            r+=dr;c+=dc;
        }
    }
    const kn=byCol==='white'?'♘':'♞';
    for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]){
        const r=row+dr,c=col+dc;
        if(r>=0&&r<8&&c>=0&&c<8&&b[r][c]===kn)return true;
    }
    if(byCol==='white'){
        if(row+1<8){if(col>0&&b[row+1][col-1]==='♙')return true;if(col<7&&b[row+1][col+1]==='♙')return true;}
    } else {
        if(row>0){if(col>0&&b[row-1][col-1]==='♟')return true;if(col<7&&b[row-1][col+1]==='♟')return true;}
    }
    const kg=byCol==='white'?'♔':'♚';
    for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const r=row+dr,c=col+dc;
        if(r>=0&&r<8&&c>=0&&c<8&&b[r][c]===kg)return true;
    }
    return false;
}

function rawMoves(b,fr,fc,ep,cst,col){
    const piece=b[fr][fc];
    if(!piece||pc(piece)!==col)return[];
    const mv=[],op=opp(col);
    function add(r,c){if(r<0||r>7||c<0||c>7)return;const t=b[r][c];if(t&&pc(t)===col)return;mv.push({row:r,col:c});}
    function slide(dr,dc){let r=fr+dr,c=fc+dc;while(r>=0&&r<8&&c>=0&&c<8){const t=b[r][c];if(t){if(pc(t)===op)mv.push({row:r,col:c});break;}mv.push({row:r,col:c});r+=dr;c+=dc;}}
    switch(piece){
    case'♙':if(fr>0&&!b[fr-1][fc])add(fr-1,fc);if(fr===6&&!b[5][fc]&&!b[4][fc])add(4,fc);for(const dc of[-1,1]){const tc=fc+dc;if(tc<0||tc>7||fr<1)continue;const t=b[fr-1][tc];if(t&&pc(t)==='black')mv.push({row:fr-1,col:tc});if(ep&&ep.row===fr-1&&ep.col===tc)mv.push({row:fr-1,col:tc,ep:1});}break;
    case'♟':if(fr<7&&!b[fr+1][fc])add(fr+1,fc);if(fr===1&&!b[2][fc]&&!b[3][fc])add(3,fc);for(const dc of[-1,1]){const tc=fc+dc;if(tc<0||tc>7||fr>6)continue;const t=b[fr+1][tc];if(t&&pc(t)==='white')mv.push({row:fr+1,col:tc});if(ep&&ep.row===fr+1&&ep.col===tc)mv.push({row:fr+1,col:tc,ep:1});}break;
    case'♖':case'♜':[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♗':case'♝':[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♕':case'♛':[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));break;
    case'♘':case'♞':[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(fr+dr,fc+dc));break;
    case'♔':[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(fr+dr,fc+dc));if(col==='white'&&fr===7&&fc===4){if(cst.wK&&!b[7][5]&&!b[7][6]&&b[7][7]==='♖')mv.push({row:7,col:6,castle:'wK'});if(cst.wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&b[7][0]==='♖')mv.push({row:7,col:2,castle:'wQ'});}break;
    case'♚':[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(fr+dr,fc+dc));if(col==='black'&&fr===0&&fc===4){if(cst.bK&&!b[0][5]&&!b[0][6]&&b[0][7]==='♜')mv.push({row:0,col:6,castle:'bK'});if(cst.bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&b[0][0]==='♜')mv.push({row:0,col:2,castle:'bQ'});}break;
    }
    return mv;
}

function applyMove(b,fr,fc,m){
    const nb=clone(b),piece=nb[fr][fc];
    nb[m.row][m.col]=piece;nb[fr][fc]='';
    if(m.ep){pc(piece)==='white'?nb[m.row+1][m.col]='':nb[m.row-1][m.col]='';}
    if(m.castle==='wK'){nb[7][5]='♖';nb[7][7]='';}if(m.castle==='wQ'){nb[7][3]='♖';nb[7][0]='';}
    if(m.castle==='bK'){nb[0][5]='♜';nb[0][7]='';}if(m.castle==='bQ'){nb[0][3]='♜';nb[0][0]='';}
    if(piece==='♙'&&m.row===0)nb[m.row][m.col]='♕';if(piece==='♟'&&m.row===7)nb[m.row][m.col]='♛';
    return nb;
}

function findKing(b,col){const k=col==='white'?'♔':'♚';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return{row:r,col:c};return null;}

function legalMoves(b,fr,fc,col,ep,cst){
    const piece=b[fr][fc];if(!piece||pc(piece)!==col)return[];
    return rawMoves(b,fr,fc,ep,cst,col).filter(m=>{
        if(m.castle){const pass=m.castle.endsWith('K')?[5,6]:[2,3];const row=m.castle.startsWith('w')?7:0;if(attacked(b,row,4,opp(col)))return false;for(const p of pass)if(attacked(b,row,p,opp(col)))return false;}
        const nb=applyMove(b,fr,fc,m);const k=findKing(nb,col);
        return k&&!attacked(nb,k.row,k.col,opp(col));
    });
}

function inCheck(b,col){const k=findKing(b,col);return k&&attacked(b,k.row,k.col,opp(col));}

function evalBoard(b){
    let score=0;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;const pst=PST[p]?PST[p][r*8+c]:0;score+=(pc(p)==='white'?1:-1)*(PIECE_VAL[p]+pst);}
    return score;
}

function allLegal(b,col,ep,cst){
    const mvs=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(pc(b[r][c])===col)for(const m of legalMoves(b,r,c,col,ep,cst))mvs.push({fr:r,fc:c,m});
    return mvs;
}

function sortMoves(b,mvs){
    return mvs.sort((a,x)=>{const cA=b[a.m.row][a.m.col]?PIECE_VAL[b[a.m.row][a.m.col]]:0;const cB=b[x.m.row][x.m.col]?PIECE_VAL[b[x.m.row][x.m.col]]:0;return cB-cA;});
}

function minimax(b,depth,alpha,beta,col,ep,cst){
    if(depth===0)return evalBoard(b);
    const mvs=sortMoves(b,allLegal(b,col,ep,cst));
    if(!mvs.length)return inCheck(b,col)?(col==='white'?-99999:99999):0;
    let best=col==='white'?-Infinity:Infinity;
    for(const{fr,fc,m} of mvs){
        let nep=null;const np=b[fr][fc];
        if(np==='♙'&&fr-m.row===2)nep={row:fr-1,col:fc};
        else if(np==='♟'&&m.row-fr===2)nep={row:fr+1,col:fc};
        const ncr={...cst};if(np==='♔'){ncr.wK=0;ncr.wQ=0;}if(np==='♚'){ncr.bK=0;ncr.bQ=0;}
        const val=minimax(applyMove(b,fr,fc,m),depth-1,alpha,beta,opp(col),nep,ncr);
        if(col==='white'){best=Math.max(best,val);alpha=Math.max(alpha,val);}
        else{best=Math.min(best,val);beta=Math.min(beta,val);}
        if(beta<=alpha)break;
    }
    return best;
}

self.onmessage=function(e){
    const{board,botCol,botLvl,epTarget,cr}=e.data;
    const depth=[0,1,2,3][Math.min(botLvl,3)];
    const mvs=sortMoves(board,allLegal(board,botCol,epTarget,cr));
    if(!mvs.length){self.postMessage(null);return;}
    let best=botCol==='white'?-Infinity:Infinity;
    let bestMove=null;
    const noise=botLvl===1?50:botLvl===2?15:0;
    for(const{fr,fc,m} of mvs){
        let nep=null;const np=board[fr][fc];
        if(np==='♙'&&fr-m.row===2)nep={row:fr-1,col:fc};
        else if(np==='♟'&&m.row-fr===2)nep={row:fr+1,col:fc};
        const ncr={...cr};if(np==='♔'){ncr.wK=0;ncr.wQ=0;}if(np==='♚'){ncr.bK=0;ncr.bQ=0;}
        const val=minimax(applyMove(board,fr,fc,m),depth,-Infinity,Infinity,opp(botCol),nep,ncr)+(Math.random()-.5)*noise;
        if(botCol==='white'?val>best:val<best){best=val;bestMove={fr,fc,move:m};}
    }
    self.postMessage(bestMove);
};
