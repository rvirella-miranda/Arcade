// Answer Arcade game engines. Each game: {reset, startLife, update(dt,input), draw(ctx), hint}
// api passed to each game: {add(points), lose()}
export const W=640,H=480;
export const rand=(a,b)=>a+Math.random()*(b-a), randi=(a,b)=>Math.floor(rand(a,b+1));
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

// ---------- MAZE MUNCHER ----------
function MazeGame(api){
  const MAP=[
    "#####################",
    "#o........#........o#",
    "#.##.####.#.####.##.#",
    "#...................#",
    "#.##.#.#######.#.##.#",
    "#....#....#....#....#",
    "####.####.#.####.####",
    "####.#    G    #.####",
    "####.#.#######.#.####",
    "#.........#.........#",
    "#.##.####.#.####.##.#",
    "#o.#......P......#.o#",
    "##.#.#.#######.#.#.##",
    "#....#....#....#....#",
    "#####################"];
  const T=30, OX=5, OY=15, R=MAP.length, C=MAP[0].length;
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  let grid, dots, level=1, pl, bugs, startP, startG, chain=1, t=0, banner=0;
  const open=(x,y)=>y>=0&&y<R&&x>=0&&x<C&&grid[y][x]!=="#";
  function build(){
    grid=MAP.map(r=>r.split("")); dots=0;
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){const c=grid[y][x];
      if(c==="."||c==="o")dots++; if(c==="P"){startP={x,y};grid[y][x]=" ";} if(c==="G"){startG={x,y};grid[y][x]=" ";}}
  }
  function startLife(){
    pl={x:startP.x,y:startP.y,dx:0,dy:0,p:0,want:[-1,0],face:[-1,0]};
    const cols=["#ff5a6e","#56d6ff","#ffa24a","#c88bff"];
    const n=Math.min(4,2+level);
    bugs=[];
    for(let i=0;i<n;i++) bugs.push({x:startG.x+(i%2?1:-1)*(i>1?2:0),y:startG.y,dx:0,dy:0,p:0,color:cols[i],chase:[.8,.55,.35,.65][i],wait:i*1.6,scared:0});
    chain=1;
  }
  function reset(){ level=1; build(); startLife(); }
  function eat(){
    const c=grid[pl.y][pl.x];
    if(c==="."){grid[pl.y][pl.x]=" ";dots--;api.add(10);}
    else if(c==="o"){grid[pl.y][pl.x]=" ";dots--;api.add(50);chain=1;
      bugs.forEach(b=>{if(b.wait<=0){b.scared=7;if(b.dx||b.dy){b.x+=b.dx;b.y+=b.dy;b.p=1-b.p;b.dx=-b.dx;b.dy=-b.dy;}}});}
    if(dots<=0){level++;api.add(500);build();startLife();banner=2;}
  }
  function choosePlayer(){
    const [wx,wy]=pl.want;
    if(open(pl.x+wx,pl.y+wy)){pl.dx=wx;pl.dy=wy;pl.face=[wx,wy];}
    else if(!open(pl.x+pl.dx,pl.y+pl.dy)){pl.dx=0;pl.dy=0;}
  }
  function chooseBug(b){
    let opts=DIRS.filter(([dx,dy])=>open(b.x+dx,b.y+dy)&&!(dx===-b.dx&&dy===-b.dy&&(b.dx||b.dy)));
    if(!opts.length) opts=DIRS.filter(([dx,dy])=>open(b.x+dx,b.y+dy));
    let pick;
    if(Math.random()<b.chase){
      const sc=([dx,dy])=>{const d=Math.hypot(b.x+dx-pl.x,b.y+dy-pl.y);return b.scared>0?-d:d;};
      pick=opts.reduce((a,o)=>sc(o)<sc(a)?o:a,opts[0]);
    } else pick=opts[Math.floor(Math.random()*opts.length)];
    b.dx=pick[0];b.dy=pick[1];
  }
  function move(e,speed,dt,choose,arrive){
    if(!e.dx&&!e.dy){choose(e);if(!e.dx&&!e.dy)return;}
    e.p+=speed*dt;
    while(e.p>=1){e.x+=e.dx;e.y+=e.dy;e.p-=1;if(arrive)arrive();choose(e);if(!e.dx&&!e.dy){e.p=0;break;}}
  }
  function update(dt,inp){
    t+=dt; if(banner>0)banner-=dt;
    for(const k of ["left","right","up","down"]) if(inp.pressed.has(k)||inp.held[k]) pl.want={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[k];
    // instant reverse
    if((pl.dx||pl.dy)&&pl.want[0]===-pl.dx&&pl.want[1]===-pl.dy){pl.x+=pl.dx;pl.y+=pl.dy;pl.p=1-pl.p;pl.dx=-pl.dx;pl.dy=-pl.dy;pl.face=[pl.dx,pl.dy];}
    move(pl,6.6,dt,choosePlayer,eat);
    if(!pl.dx&&!pl.dy)choosePlayer();
    const bs=Math.min(6.4,4.6+0.35*(level-1));
    for(const b of bugs){
      if(b.wait>0){b.wait-=dt;continue;}
      if(b.scared>0)b.scared-=dt;
      move(b,b.scared>0?3.4:bs,dt,chooseBug);
      const px=pl.x+pl.dx*pl.p,py=pl.y+pl.dy*pl.p,bx=b.x+b.dx*b.p,by=b.y+b.dy*b.p;
      if(Math.hypot(px-bx,py-by)<0.7){
        if(b.scared>0){api.add(200*chain);chain*=2;b.x=startG.x;b.y=startG.y;b.dx=b.dy=0;b.p=0;b.scared=0;b.wait=2.5;}
        else {api.lose();return;}
      }
    }
  }
  function draw(g){
    g.fillStyle="#07061a";g.fillRect(0,0,W,H);
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){
      const X=OX+x*T,Y=OY+y*T,c=grid[y][x];
      if(c==="#"){
        g.fillStyle="#17195c";g.fillRect(X,Y,T,T);
        g.strokeStyle="#6a74ff";g.lineWidth=2;g.beginPath();
        if(!(y>0&&grid[y-1][x]==="#")){g.moveTo(X,Y+1);g.lineTo(X+T,Y+1);}
        if(!(y<R-1&&grid[y+1][x]==="#")){g.moveTo(X,Y+T-1);g.lineTo(X+T,Y+T-1);}
        if(!(x>0&&grid[y][x-1]==="#")){g.moveTo(X+1,Y);g.lineTo(X+1,Y+T);}
        if(!(x<C-1&&grid[y][x+1]==="#")){g.moveTo(X+T-1,Y);g.lineTo(X+T-1,Y+T);}
        g.stroke();
      } else if(c==="."){g.fillStyle="#ffe7b8";g.fillRect(X+T/2-2.5,Y+T/2-2.5,5,5);}
      else if(c==="o"){const r=6+Math.sin(t*6)*2;g.fillStyle="#ffd23f";g.beginPath();g.arc(X+T/2,Y+T/2,r,0,7);g.fill();}
    }
    // player
    const px=OX+(pl.x+pl.dx*pl.p)*T+T/2, py=OY+(pl.y+pl.dy*pl.p)*T+T/2;
    const ang=Math.atan2(pl.face[1],pl.face[0]), m=(pl.dx||pl.dy)?Math.abs(Math.sin(t*14))*0.7:0.25;
    g.save();g.translate(px,py);g.rotate(ang);
    g.fillStyle="#3fe0ff";g.beginPath();g.moveTo(0,0);g.arc(0,0,12,m,Math.PI*2-m);g.closePath();g.fill();
    g.fillStyle="#07061a";g.beginPath();g.arc(1,-6,2.4,0,7);g.fill();
    g.restore();
    // bugs
    for(const b of bugs){
      const bx=OX+(b.x+b.dx*b.p)*T+T/2, by=OY+(b.y+b.dy*b.p)*T+T/2;
      const flash=b.scared>0&&b.scared<2&&Math.floor(t*8)%2;
      const col=b.scared>0?(flash?"#ffffff":"#5a4dff"):b.color;
      g.globalAlpha=b.wait>0?0.55:1;
      g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.moveTo(bx-5,by-9);g.lineTo(bx-8,by-15);g.moveTo(bx+5,by-9);g.lineTo(bx+8,by-15);g.stroke();
      g.fillStyle=col;roundRect(g,bx-12,by-10,24,21,8);g.fill();
      g.fillStyle="#07061a";for(let i=-1;i<=1;i++)g.fillRect(bx+i*7-1.5,by+8,3,4+Math.sin(t*20+i)*1.5);
      g.fillStyle="#fff";g.beginPath();g.arc(bx-5,by-2,4,0,7);g.arc(bx+5,by-2,4,0,7);g.fill();
      g.fillStyle="#111";g.beginPath();g.arc(bx-5+b.dx*2,by-2+b.dy*2,2,0,7);g.arc(bx+5+b.dx*2,by-2+b.dy*2,2,0,7);g.fill();
      g.globalAlpha=1;
    }
    g.fillStyle="#a69fcf";g.font="12px Silkscreen, monospace";g.textAlign="left";g.fillText("LEVEL "+level,8,12);
    if(banner>0)bigText(g,"LEVEL "+level+"!","#ffd23f");
  }
  return {reset,startLife,update,draw,hint:"Arrow keys or WASD to steer. Eat every dot. Big dots let you chase the bugs."};
}

// ---------- RING RUSH ----------
function RunnerGame(api){
  const GY=400; let cam,speed,segs,things,parts,pl,rings,inv,acc,genX,t=0,lastHaz;
  function startLife(){
    cam=0;speed=320;segs=[{x0:-300,x1:1100}];things=[];parts=[];genX=1100;acc=0;rings=0;inv=0;lastHaz=0;
    pl={x:150,y:GY,vy:0,ground:true,roll:false,spin:0};
    gen();
  }
  function reset(){startLife();}
  function ringRow(x,y,n){for(let i=0;i<n;i++)things.push({k:"ring",x:x+i*34,y});}
  function gen(){
    while(genX<cam+W+400){
      const gap=Math.random()<0.45?rand(80,Math.min(170,80+speed*0.15)):0;
      if(gap){ringArc(genX+gap/2-50,GY-90);genX+=gap;}
      const len=rand(420,900), x0=genX, x1=genX+len;
      segs.push({x0,x1});
      let x=x0+120;
      while(x<x1-140){
        const r=Math.random();
        if(r<0.3) {ringRow(x,GY-30-(Math.random()<.4?70:0),randi(3,6));x+=220;}
        else if(r<0.55){const w=randi(1,3)*20;things.push({k:"spike",x,w});x+=w+rand(200,320);}
        else if(r<0.75){things.push({k:"crawl",x,y:GY,dir:-1,alive:true});x+=rand(220,320);}
        else if(r<0.88&&speed>380){things.push({k:"drone",x,y:GY-58,alive:true,ph:Math.random()*6});x+=rand(260,340);}
        else x+=rand(120,200);
      }
      genX=x1;
    }
    segs=segs.filter(s=>s.x1>cam-200); things=things.filter(o=>o.x>cam-200&&o.k!=="gone");
  }
  function ringArc(cx,cy){for(let i=0;i<5;i++){const a=Math.PI*(i/4);things.push({k:"ring",x:cx+i*25,y:cy+Math.sin(a)*-30+30});}}
  function onGround(wx){return segs.some(s=>wx+12>=s.x0&&wx-12<=s.x1);}
  function hit(){
    if(inv>0)return;
    if(rings>0){
      for(let i=0;i<Math.min(rings,12);i++)parts.push({x:pl.x,y:pl.y-20,vx:rand(-260,260),vy:rand(-500,-200),life:1.2});
      rings=0;inv=1.6;pl.vy=-420;pl.ground=false;
    } else api.lose();
  }
  function update(dt,inp){
    t+=dt; speed=Math.min(720,speed+9*dt); cam+=speed*dt; if(inv>0)inv-=dt;
    acc+=speed*dt; while(acc>=40){acc-=40;api.add(1);}
    const wx=cam+pl.x;
    if((inp.pressed.has("up")||inp.pressed.has("action"))&&pl.ground){pl.vy=-840;pl.ground=false;}
    if(!pl.ground&&pl.vy<-320&&!(inp.held.up||inp.held.action))pl.vy=-320;
    pl.roll=pl.ground&&inp.held.down;
    const prevY=pl.y;
    pl.vy+=2400*dt; pl.y+=pl.vy*dt;
    if(pl.vy>=0&&prevY<=GY+4&&pl.y>=GY&&onGround(wx)){pl.y=GY;pl.vy=0;pl.ground=true;}
    else if(pl.ground&&!onGround(wx)){pl.ground=false;}
    if(pl.y>H+60){api.lose();return;}
    pl.spin+=dt*speed/18;
    const top=pl.y-(pl.roll?20:34), L=wx-13, Rr=wx+13;
    for(const o of things){
      if(o.k==="ring"){ if(Math.hypot(o.x-wx,o.y-(pl.y-17))<24){o.k="gone";rings++;api.add(10);} }
      else if(o.k==="spike"){ if(Rr>o.x+3&&L<o.x+o.w-3&&pl.y>GY-16){hit();} }
      else if(o.k==="crawl"&&o.alive){
        o.x-=50*dt;
        if(Rr>o.x-14&&L<o.x+14&&pl.y>GY-24&&top<GY){
          if(pl.vy>0&&prevY<GY-14){o.alive=false;o.k="gone";api.add(50);pl.vy=-520;parts.push({x:pl.x,y:GY-12,vx:0,vy:-100,life:.5,pop:1});}
          else hit();
        }
      }
      else if(o.k==="drone"&&o.alive){
        const dy=o.y+Math.sin(t*4+o.ph)*5;
        if(Rr>o.x-16&&L<o.x+16&&top<dy+10&&pl.y>dy-10){
          if(!pl.ground&&pl.vy>0&&prevY<dy-6){o.alive=false;o.k="gone";api.add(80);pl.vy=-520;}
          else hit();
        }
      }
    }
    for(const p of parts){p.vy+=1200*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
    parts=parts.filter(p=>p.life>0);
    gen();
  }
  function draw(g){
    const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#2a1660");sky.addColorStop(.6,"#c2408a");sky.addColorStop(1,"#ff9a5c");
    g.fillStyle=sky;g.fillRect(0,0,W,H);
    g.fillStyle="rgba(255,240,200,.85)";g.beginPath();g.arc(500,130,46,0,7);g.fill();
    hills(g,cam*0.15,300,60,"#5b2a8a",0.006);hills(g,cam*0.35,345,40,"#3c1d6e",0.011);
    for(const s of segs){
      const x0=s.x0-cam,x1=s.x1-cam; if(x1<-20||x0>W+20)continue;
      g.fillStyle="#7a4320";g.fillRect(x0,GY,x1-x0,H-GY);
      for(let cx=Math.floor(s.x0/32)*32;cx<s.x1;cx+=32){for(let cy=0;cy<3;cy++){if(((cx/32)+cy)%2===0){g.fillStyle="#5e3218";g.fillRect(Math.max(x0,cx-cam),GY+14+cy*24,Math.min(32,x1-(cx-cam)),24);}}}
      g.fillStyle="#3fd46a";g.fillRect(x0,GY,x1-x0,12);g.fillStyle="#2aa24f";g.fillRect(x0,GY+10,x1-x0,4);
    }
    for(const o of things){
      const x=o.x-cam; if(x<-40||x>W+40)continue;
      if(o.k==="ring"){const w=Math.abs(Math.cos(t*4+o.x*0.01))*9+2;g.strokeStyle="#ffd23f";g.lineWidth=3.5;g.beginPath();g.ellipse(x,o.y,w,10,0,0,7);g.stroke();}
      else if(o.k==="spike"){g.fillStyle="#d9dcf0";for(let i=0;i<o.w;i+=20){g.beginPath();g.moveTo(x+i,GY);g.lineTo(x+i+10,GY-18);g.lineTo(x+i+20,GY);g.fill();}}
      else if(o.k==="crawl"){g.fillStyle="#ff4f6e";roundRect(g,x-15,GY-22,30,20,8);g.fill();g.fillStyle="#fff";g.fillRect(x-9,GY-17,6,6);g.fillStyle="#222";g.fillRect(x-9,GY-15,3,3);
        g.fillStyle="#333";for(let i=-1;i<=1;i++){g.beginPath();g.arc(x+i*9,GY-2,3.5,0,7);g.fill();}}
      else if(o.k==="drone"){const y=o.y+Math.sin(t*4+o.ph)*5;g.fillStyle="#56d6ff";g.beginPath();g.ellipse(x,y,16,9,0,0,7);g.fill();
        g.strokeStyle="#cfefff";g.lineWidth=2;g.beginPath();g.moveTo(x-18,y-12);g.lineTo(x+18,y-12);g.stroke();g.fillStyle="#07061a";g.fillRect(x-8,y-2,16,4);}
    }
    for(const p of parts){if(p.pop){g.fillStyle="rgba(255,255,255,"+p.life*2+")";g.beginPath();g.arc(p.x,p.y,16*(1-p.life),0,7);g.fill();}
      else{g.strokeStyle="rgba(255,210,63,"+Math.min(1,p.life)+")";g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y,6,8,0,0,7);g.stroke();}}
    // player
    if(!(inv>0&&Math.floor(t*14)%2)){
      const x=pl.x,y=pl.y;
      if(!pl.ground||pl.roll){
        const r=pl.roll?12:16, cy=y-r-2;
        g.fillStyle="rgba(255,79,163,.25)";for(let i=1;i<4;i++){g.beginPath();g.arc(x-i*10,cy,r-i*2,0,7);g.fill();}
        g.save();g.translate(x,cy);g.rotate(pl.spin);g.fillStyle="#ff4fa3";g.beginPath();g.arc(0,0,r,0,7);g.fill();
        g.strokeStyle="#ffd1ea";g.lineWidth=3;g.beginPath();g.arc(0,0,r-5,0,2);g.stroke();g.restore();
      } else {
        const step=Math.sin(t*speed/16);
        g.fillStyle="#2b2b55";g.fillRect(x-9+step*6,y-8,10,8);g.fillRect(x-1-step*6,y-8,10,8);
        g.fillStyle="#ff4fa3";g.beginPath();g.arc(x,y-22,15,0,7);g.fill();
        g.beginPath();g.moveTo(x-12,y-30);g.lineTo(x-28,y-36);g.lineTo(x-12,y-22);g.fill();
        g.fillStyle="#fff";g.beginPath();g.ellipse(x+6,y-26,6,7,0,0,7);g.fill();g.fillStyle="#111";g.beginPath();g.arc(x+8,y-26,2.6,0,7);g.fill();
        g.fillStyle="#ffd1ea";g.beginPath();g.ellipse(x+5,y-14,7,4,0,0,7);g.fill();
      }
    }
    g.fillStyle="#ffd23f";g.font="16px Silkscreen, monospace";g.textAlign="left";g.fillText("RINGS "+rings,12,24);
    g.fillStyle="rgba(255,255,255,.7)";g.font="11px Silkscreen, monospace";g.fillText(rings?"Rings protect you from one hit":"No rings: next hit ends the round",12,42);
  }
  function hills(g,off,base,amp,col,f){g.fillStyle=col;g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=8){g.lineTo(x,base-Math.abs(Math.sin((x+off)*f))*amp-Math.sin((x+off)*f*2.3)*amp*.3);}g.lineTo(W,H);g.fill();}
  return {reset,startLife,update,draw,hint:"Up, W, or Space to jump (hold for higher). Down to roll. Stomp enemies; rings protect you from one hit."};
}

// ---------- BLOCK STACK ----------
function StackGame(api){
  const COLS=10,ROWS=20,CS=22,BX=209,BY=20;
  const SH={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
  const COL={I:"#3fe0ff",O:"#ffd23f",T:"#a77bff",S:"#86f56a",Z:"#ff5a6e",J:"#4f7bff",L:"#ff9a3c"};
  let board,cur,next,bag=[],lines=0,level=1,fall=0,lock=0,das={left:0,right:0},soft=0,flash=[],ft=0;
  const rot=m=>m[0].map((_,i)=>m.map(r=>r[i]).reverse());
  function draw7(){if(!bag.length)bag=shuffle(Object.keys(SH));return bag.pop();}
  function fits(m,x,y){for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++)if(m[r][c]){const X=x+c,Y=y+r;if(X<0||X>=COLS||Y>=ROWS)return false;if(Y>=0&&board[Y][X])return false;}return true;}
  function spawn(){const k=next||draw7();next=draw7();const m=SH[k];cur={k,m,x:Math.floor((COLS-m[0].length)/2),y:k==="I"?-1:0};lock=0;
    if(!fits(cur.m,cur.x,cur.y)){api.lose();return false;}return true;}
  function startLife(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));next=null;bag=[];spawn();fall=0;}
  function reset(){lines=0;level=1;startLife();}
  function place(){
    for(let r=0;r<cur.m.length;r++)for(let c=0;c<cur.m[r].length;c++)if(cur.m[r][c]){const Y=cur.y+r;if(Y<0){api.lose();return;}board[Y][cur.x+c]=COL[cur.k];}
    const full=[];for(let y=0;y<ROWS;y++)if(board[y].every(Boolean))full.push(y);
    if(full.length){flash=full.slice();ft=0.12;for(const y of full){board.splice(y,1);board.unshift(Array(COLS).fill(null));}
      api.add([0,100,300,500,800][full.length]*level);lines+=full.length;level=1+Math.floor(lines/8);}
    spawn();
  }
  function tryMove(dx){if(fits(cur.m,cur.x+dx,cur.y)){cur.x+=dx;lock=0;}}
  function tryRot(){const m=rot(cur.m);for(const k of [0,-1,1,-2,2]){if(fits(m,cur.x+k,cur.y)){cur.m=m;cur.x+=k;lock=0;return;}}}
  function update(dt,inp){
    if(ft>0)ft-=dt;
    for(const k of ["left","right"]){const d=k==="left"?-1:1;
      if(inp.pressed.has(k)){tryMove(d);das[k]=-0.16;}
      else if(inp.held[k]){das[k]+=dt;while(das[k]>0.045){das[k]-=0.045;tryMove(d);}}
    }
    if(inp.pressed.has("up"))tryRot();
    if(inp.pressed.has("action")){let n=0;while(fits(cur.m,cur.x,cur.y+1)){cur.y++;n++;}api.add(n*2);place();return;}
    const g=Math.max(0.07,0.75-(level-1)*0.07);
    fall+=inp.held.down?dt*g/0.035:dt;
    while(fall>=g){fall-=g;
      if(fits(cur.m,cur.x,cur.y+1)){cur.y++;if(inp.held.down)api.add(1);}
      else break;
    }
    if(!fits(cur.m,cur.x,cur.y+1)){lock+=dt;if(lock>0.45){place();}}
  }
  function cell(g,x,y,c,a){g.globalAlpha=a??1;g.fillStyle=c;g.fillRect(x+1,y+1,CS-2,CS-2);g.fillStyle="rgba(255,255,255,.35)";g.fillRect(x+1,y+1,CS-2,4);g.fillStyle="rgba(0,0,0,.25)";g.fillRect(x+1,y+CS-5,CS-2,4);g.globalAlpha=1;}
  function draw(g){
    g.fillStyle="#0b0920";g.fillRect(0,0,W,H);
    for(let i=0;i<40;i++){g.fillStyle="rgba(167,123,255,.07)";g.fillRect((i*97)%W,(i*53)%H,2,2);}
    g.fillStyle="#140f33";g.fillRect(BX-4,BY-4,COLS*CS+8,ROWS*CS+8);
    g.strokeStyle="#a77bff";g.lineWidth=2;g.strokeRect(BX-4,BY-4,COLS*CS+8,ROWS*CS+8);
    g.strokeStyle="rgba(255,255,255,.04)";g.lineWidth=1;
    for(let x=1;x<COLS;x++){g.beginPath();g.moveTo(BX+x*CS,BY);g.lineTo(BX+x*CS,BY+ROWS*CS);g.stroke();}
    for(let y=1;y<ROWS;y++){g.beginPath();g.moveTo(BX,BY+y*CS);g.lineTo(BX+COLS*CS,BY+y*CS);g.stroke();}
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(board[y][x])cell(g,BX+x*CS,BY+y*CS,board[y][x]);
    if(cur){
      let gy=cur.y;while(fits(cur.m,cur.x,gy+1))gy++;
      for(let r=0;r<cur.m.length;r++)for(let c=0;c<cur.m[r].length;c++)if(cur.m[r][c]){
        if(gy+r>=0){g.strokeStyle=COL[cur.k];g.globalAlpha=.4;g.lineWidth=2;g.strokeRect(BX+(cur.x+c)*CS+2,BY+(gy+r)*CS+2,CS-4,CS-4);g.globalAlpha=1;}
        if(cur.y+r>=0)cell(g,BX+(cur.x+c)*CS,BY+(cur.y+r)*CS,COL[cur.k]);}
    }
    if(ft>0){g.fillStyle="rgba(255,255,255,.5)";g.fillRect(BX,BY,COLS*CS,ROWS*CS);}
    g.textAlign="left";g.fillStyle="#a69fcf";g.font="13px Silkscreen, monospace";
    g.fillText("LINES",60,80);g.fillText("LEVEL",60,160);g.fillText("NEXT",470,80);
    g.fillStyle="#f4f0ff";g.font="28px Silkscreen, monospace";g.fillText(String(lines),60,112);g.fillText(String(level),60,192);
    if(next){const m=SH[next];for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++)if(m[r][c])cell(g,470+c*CS,100+r*CS,COL[next]);}
  }
  return {reset,startLife,update,draw,hint:"Left/Right to move, Up to rotate, Down to drop faster, Space to slam it down."};
}

// ---------- SNAKE ----------
function SnakeGame(api){
  const CS=20,GC=32,GR=24;
  let sn,dir,q,stepT,food,gold,grow,t=0;
  function freeCell(){for(let i=0;i<500;i++){const x=randi(0,GC-1),y=randi(0,GR-1);if(!sn.some(s=>s.x===x&&s.y===y)&&!(food&&food.x===x&&food.y===y))return{x,y};}return{x:0,y:0};}
  function startLife(){sn=[{x:8,y:12},{x:7,y:12},{x:6,y:12},{x:5,y:12}];dir=[1,0];q=[];stepT=0;grow=0;gold=null;if(!food||sn.some(s=>s.x===food.x&&s.y===food.y))food=freeCell();}
  function reset(){food=null;startLife();}
  function update(dt,inp){
    t+=dt;
    const map={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
    for(const k of ["left","right","up","down"])if(inp.pressed.has(k)){const d=map[k],last=q.length?q[q.length-1]:dir;
      if(!(d[0]===-last[0]&&d[1]===-last[1])&&!(d[0]===last[0]&&d[1]===last[1])&&q.length<3)q.push(d);}
    if(gold){gold.life-=dt;if(gold.life<=0)gold=null;}
    stepT+=dt;const iv=Math.max(0.06,0.13-sn.length*0.0013);
    while(stepT>=iv){stepT-=iv;
      if(q.length)dir=q.shift();
      const h={x:sn[0].x+dir[0],y:sn[0].y+dir[1]};
      if(h.x<0||h.y<0||h.x>=GC||h.y>=GR){api.lose();return;}
      const body=grow>0?sn:sn.slice(0,-1);
      if(body.some(s=>s.x===h.x&&s.y===h.y)){api.lose();return;}
      sn.unshift(h);
      if(grow>0)grow--;else sn.pop();
      if(h.x===food.x&&h.y===food.y){api.add(10);grow+=1;food=freeCell();if(!gold&&Math.random()<0.18){const c=freeCell();gold={...c,life:6};}}
      if(gold&&h.x===gold.x&&h.y===gold.y){api.add(50);grow+=3;gold=null;}
    }
  }
  function draw(g){
    for(let y=0;y<GR;y++)for(let x=0;x<GC;x++){g.fillStyle=(x+y)%2?"#0d1f14":"#10261a";g.fillRect(x*CS,y*CS,CS,CS);}
    g.fillStyle="#ff5a6e";g.beginPath();g.arc(food.x*CS+10,food.y*CS+11,7,0,7);g.fill();g.fillStyle="#86f56a";g.fillRect(food.x*CS+10,food.y*CS+1,3,5);
    if(gold&&!(gold.life<2&&Math.floor(t*8)%2)){star(g,gold.x*CS+10,gold.y*CS+10,9,4,"#ffd23f");}
    for(let i=sn.length-1;i>=0;i--){const s=sn[i],k=1-i/Math.max(12,sn.length)*0.5;
      g.fillStyle=i===0?"#c4ff9e":`rgba(134,245,106,${k})`;roundRect(g,s.x*CS+1,s.y*CS+1,CS-2,CS-2,6);g.fill();}
    const h=sn[0];g.fillStyle="#07061a";
    const ex=dir[1]!==0?[5,13]:[10,10], ey=dir[0]!==0?[5,13]:[10,10];
    const ox=h.x*CS+dir[0]*3,oy=h.y*CS+dir[1]*3;
    g.beginPath();g.arc(ox+ex[0],oy+ey[0],2.4,0,7);g.arc(ox+ex[1],oy+ey[1],2.4,0,7);g.fill();
    g.fillStyle="rgba(255,255,255,.6)";g.font="12px Silkscreen, monospace";g.textAlign="left";g.fillText("LENGTH "+sn.length,8,14);
  }
  return {reset,startLife,update,draw,hint:"Arrow keys or WASD to turn. Eat apples to grow. Gold stars are worth 50."};
}

// ---------- BRICK BREAKER ----------
function BrickGame(api){
  let pd,ball,bricks,level=1,t=0,auto=0,banner=0;
  const ROWC=["#ff5a6e","#ff9a3c","#ffd23f","#86f56a","#3fe0ff","#a77bff"];
  function build(){bricks=[];const cols=10,bw=58,bh=20,gap=4,ox=(W-(cols*(bw+gap)-gap))/2;
    for(let r=0;r<6;r++)for(let c=0;c<cols;c++)bricks.push({x:ox+c*(bw+gap),y:50+r*(bh+gap),w:bw,h:bh,hp:(level>=2&&r===0)||(level>=4&&r===1)?2:1,col:ROWC[r],pts:(6-r)*10});}
  function startLife(){pd={x:W/2,w:Math.max(70,100-(level-1)*6)};ball={x:W/2,y:440,vx:0,vy:0,r:7,stuck:true,s:0};auto=2.5;}
  function reset(){level=1;build();startLife();}
  function launch(){const s=Math.min(640,360+(level-1)*35);const a=rand(-0.5,0.5);ball.vx=Math.sin(a)*s;ball.vy=-Math.cos(a)*s;ball.s=s;ball.stuck=false;}
  function update(dt,inp){
    t+=dt;if(banner>0)banner-=dt;
    if(inp.held.left)pd.x-=560*dt; if(inp.held.right)pd.x+=560*dt;
    if(inp.px!=null)pd.x+= (inp.px-pd.x)*Math.min(1,dt*18);
    pd.x=clamp(pd.x,pd.w/2,W-pd.w/2);
    if(ball.stuck){ball.x=pd.x;ball.y=452-ball.r;auto-=dt;if(inp.pressed.has("action")||inp.pressed.has("up")||auto<=0)launch();return;}
    const n=Math.ceil(ball.s*dt/4);
    for(let i=0;i<n;i++){
      const st=dt/n;ball.x+=ball.vx*st;ball.y+=ball.vy*st;
      if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);}
      if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);}
      if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy);}
      if(ball.vy>0&&ball.y+ball.r>=452&&ball.y-ball.r<=466&&ball.x>pd.x-pd.w/2-ball.r&&ball.x<pd.x+pd.w/2+ball.r){
        const off=clamp((ball.x-pd.x)/(pd.w/2),-1,1)*1.05;ball.vx=Math.sin(off)*ball.s;ball.vy=-Math.cos(off)*ball.s;ball.y=452-ball.r;}
      for(const b of bricks){if(b.hp<=0)continue;
        const cx=clamp(ball.x,b.x,b.x+b.w),cy=clamp(ball.y,b.y,b.y+b.h);
        if((ball.x-cx)**2+(ball.y-cy)**2<ball.r*ball.r){
          const ox=Math.min(ball.x+ball.r-b.x,b.x+b.w-(ball.x-ball.r)),oy=Math.min(ball.y+ball.r-b.y,b.y+b.h-(ball.y-ball.r));
          if(ox<oy)ball.vx=ball.x<b.x+b.w/2?-Math.abs(ball.vx):Math.abs(ball.vx);else ball.vy=ball.y<b.y+b.h/2?-Math.abs(ball.vy):Math.abs(ball.vy);
          b.hp--;if(b.hp<=0){api.add(b.pts);ball.s=Math.min(760,ball.s+3);const m=ball.s/Math.hypot(ball.vx,ball.vy);ball.vx*=m;ball.vy*=m;}
          break;
        }
      }
      if(ball.y>H+20){api.lose();return;}
    }
    if(bricks.every(b=>b.hp<=0)){level++;api.add(300);build();startLife();banner=2;}
  }
  function draw(g){
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#140c2e");bg.addColorStop(1,"#07061a");g.fillStyle=bg;g.fillRect(0,0,W,H);
    for(const b of bricks){if(b.hp<=0)continue;g.fillStyle=b.col;roundRect(g,b.x,b.y,b.w,b.h,4);g.fill();
      g.fillStyle="rgba(255,255,255,.35)";g.fillRect(b.x+3,b.y+2,b.w-6,4);
      if(b.hp>1){g.strokeStyle="#fff";g.lineWidth=2;roundRect(g,b.x+2,b.y+2,b.w-4,b.h-4,3);g.stroke();}}
    g.fillStyle="#f4f0ff";roundRect(g,pd.x-pd.w/2,452,pd.w,12,6);g.fill();g.fillStyle="#ff9a3c";g.fillRect(pd.x-pd.w/2+6,456,pd.w-12,4);
    g.shadowColor="#3fe0ff";g.shadowBlur=14;g.fillStyle="#ffffff";g.beginPath();g.arc(ball.x,ball.y,ball.r,0,7);g.fill();g.shadowBlur=0;
    g.fillStyle="#a69fcf";g.font="12px Silkscreen, monospace";g.textAlign="left";g.fillText("LEVEL "+level,8,16);
    if(ball.stuck){g.textAlign="center";g.fillStyle="#f4f0ff";g.font="14px Silkscreen, monospace";g.fillText("SPACE OR TAP TO LAUNCH",W/2,400);}
    if(banner>0)bigText(g,"LEVEL "+level+"!","#ffd23f");
  }
  return {reset,startLife,update,draw,hint:"Left/Right or move your mouse/finger to slide the paddle. Space or tap to launch."};
}

// ---------- PENCIL HOP (one-screen platformer) ----------
// Legend: # block, - one-way ruler, ^ tacks, S spring, * star, E lost eraser (goal), P start, b ink blot
function HopGame(api, theme){
  const T=32, C=20, R=15;
  const LEVELS=[
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..........*.......#",
     "#.........###......#",
     "#......*...........#",
     "#.....###..........#",
     "#P..........^^....E#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..............*...#",
     "#...............E..#",
     "#.............####.#",
     "#.........*........#",
     "#........---.......#",
     "#.....*............#",
     "#....---...........#",
     "#P.........b.......#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.....*...*...*....#",
     "#..................#",
     "#....--..--..--....#",
     "#P..^^^^^^^^^^^^..E#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..........*..*....#",
     "#..............E...#",
     "#.........######...#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#....*.............#",
     "#..................#",
     "#P....S.......b..^^#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#...............E..#",
     "#.............----.#",
     "#.........*........#",
     "#........----......#",
     "#....*.............#",
     "#...----...........#",
     "#.........b........#",
     "#........----......#",
     "#.....*............#",
     "#...----...........#",
     "#P.......b.........#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#....*......*......#",
     "#...--.....---.....#",
     "#P.......^......b.E#",
     "####...######...####"],
    ["####################",
     "#..................#",
     "#.................E#",
     "#................--#",
     "#..................#",
     "#..............--..#",
     "#......*.....*.....#",
     "#.....###...###....#",
     "#..................#",
     "#..................#",
     "#..*...............#",
     "#..................#",
     "#..................#",
     "#P.S..^^^^^^^^^^^^^#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#...*.....*....*...#",
     "#..................#",
     "#P...............E.#",
     "###...###..###..####"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.........**.......#",
     "#.........##.......#",
     "#..................#",
     "#......##....##....#",
     "#..................#",
     "#...##..........##.#",
     "#P....^^^^^^^^^^..E#",
     "####################"],
    ["####################",
     "#................E.#",
     "#.............----.#",
     "#............*.....#",
     "#...........---....#",
     "#.......*..........#",
     "#.....#####........#",
     "#..................#",
     "#..................#",
     "#..*...............#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#P.S..^^^^^^^^^^^^^#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#........*.........#",
     "#.........b....E...#",
     "#.....----------...#",
     "#.*................#",
     "#----..............#",
     "#.......b..........#",
     "#..----------......#",
     "#..............*...#",
     "#.............----.#",
     "#P......b..........#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.....*....*.......#",
     "#..................#",
     "#..--...--...--....#",
     "#P^^^^^^^^^^^^^^^.E#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.........*......E.#",
     "#.....--.--...######",
     "#...*..............#",
     "#..--..............#",
     "#......*...........#",
     "#.....--...........#",
     "#..................#",
     "#..--..............#",
     "#P...^^^^^^^^^^^^^^#",
     "####################"],
    ["####################",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.....*.......*....#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#.........S........#",
     "#.........##.......#",
     "#P.S^^^^^^^^^^^^^.E#",
     "####################"],
    ["####################",
     "#..E...............#",
     "#..-----...........#",
     "#.........*........#",
     "#......---.........#",
     "#...........*......#",
     "#..........####....#",
     "#..................#",
     "#..................#",
     "#..................#",
     "#..............*...#",
     "#..................#",
     "#..................#",
     "#P....b....^^^..S..#",
     "####################"]
  ];
  let lvl=0, loop=0, grid, pl, foes, stars, t=0, banner=0, startX, startY;
  const at=(cx,cy)=>(cy<0||cx<0||cx>=C)?"#":(cy>=R?".":grid[cy][cx]);
  const solid=(cx,cy)=>at(cx,cy)==="#";
  function load(){
    const L=LEVELS[lvl%LEVELS.length];
    grid=L.map(r=>r.split("")); foes=[]; stars=0;
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){const c=grid[y][x];
      if(c==="P"){startX=x*T+T/2;startY=(y+1)*T;grid[y][x]=".";}
      else if(c==="b"){foes.push({x:x*T+T/2,y:(y+1)*T,dir:Math.random()<.5?-1:1,alive:true});grid[y][x]=".";}
      else if(c==="*")stars++;}
    banner=1.6;
  }
  function spawn(){pl={x:startX,y:startY,vx:0,vy:0,ground:true,face:1,coyote:0,buffer:0,squash:0};}
  function startLife(){lvl=0;loop=0;load();spawn();}   // a lost life goes back to level 1
  function reset(){startLife();}
  const PW=18, PH=30;
  function hitsSolid(x,y){ // feet at y, centered x
    const l=Math.floor((x-PW/2)/T), r=Math.floor((x+PW/2-1)/T), top=Math.floor((y-PH)/T), bot=Math.floor((y-1)/T);
    for(let cy=top;cy<=bot;cy++)for(let cx=l;cx<=r;cx++)if(solid(cx,cy))return true;
    return false;
  }
  function update(dt,inp){
    t+=dt; if(banner>0)banner-=dt;
    const spd=210, acc=pl.ground?2200:1500;
    let want=(inp.held.right?1:0)-(inp.held.left?1:0);
    if(want){pl.vx+=want*acc*dt;pl.face=want;} else {const f=(pl.ground?1800:600)*dt; pl.vx=Math.abs(pl.vx)<=f?0:pl.vx-Math.sign(pl.vx)*f;}
    pl.vx=clamp(pl.vx,-spd,spd);
    if(inp.pressed.has("up")||inp.pressed.has("action"))pl.buffer=0.13; else pl.buffer-=dt;
    pl.coyote=pl.ground?0.1:pl.coyote-dt;
    if(pl.buffer>0&&pl.coyote>0){pl.vy=-650;pl.ground=false;pl.coyote=0;pl.buffer=0;pl.squash=-0.25;}
    if(pl.vy>=0)pl.boost=false;
    if(!pl.ground&&!pl.boost&&pl.vy<-250&&!(inp.held.up||inp.held.action))pl.vy=-250;
    pl.vy=Math.min(900,pl.vy+1900*dt);
    // horizontal
    let nx=pl.x+pl.vx*dt;
    if(hitsSolid(nx,pl.y)){ // slide to wall
      const step=Math.sign(pl.vx); while(!hitsSolid(pl.x+step,pl.y)&&Math.abs(nx-pl.x)>=1)pl.x+=step; pl.vx=0;
    } else pl.x=nx;
    // vertical
    const prevY=pl.y; let ny=pl.y+pl.vy*dt; pl.ground=false;
    if(pl.vy>0){
      const l=Math.floor((pl.x-PW/2)/T), r=Math.floor((pl.x+PW/2-1)/T);
      const r0=Math.floor((prevY-1)/T)+1, r1=Math.floor(ny/T);
      for(let cy=r0;cy<=r1;cy++){let land=false;
        for(let cx=l;cx<=r;cx++){const c=at(cx,cy); if(c==="#"||(c==="-"&&prevY<=cy*T+1))land=true;}
        if(land){ny=cy*T;pl.vy=0;pl.ground=true;if(prevY<ny-6)pl.squash=0.25;break;}}
    } else if(pl.vy<0){
      if(hitsSolid(pl.x,ny)){ny=(Math.floor((ny-PH)/T)+1)*T+PH;pl.vy=0;}
    }
    pl.y=ny; if(pl.squash)pl.squash*=Math.pow(0.0005,dt);
    if(pl.y>H+60){api.lose();return;}
    // tiles touched
    const l=Math.floor((pl.x-PW/2+3)/T), r=Math.floor((pl.x+PW/2-4)/T), top=Math.floor((pl.y-PH+4)/T), bot=Math.floor((pl.y-2)/T);
    for(let cy=top;cy<=bot;cy++)for(let cx=l;cx<=r;cx++){const c=at(cx,cy);
      if(c==="*"){grid[cy][cx]=".";api.add(25);}
      else if(c==="^"&&pl.y>cy*T+14){api.lose();return;}
      else if(c==="E"){api.add(200+50*loop);lvl++;if(lvl%LEVELS.length===0)loop++;load();spawn();return;}}
    // spring under feet
    if(pl.ground){const fx=Math.floor(pl.x/T),fy=Math.floor((pl.y-2)/T); if(at(fx,fy)==="S"){pl.vy=-1060;pl.ground=false;pl.boost=true;pl.squash=-0.35;}}
    // ink blots
    const fs=55+loop*25+lvl%LEVELS.length*4;
    for(const f of foes){ if(!f.alive)continue;
      const nx2=f.x+f.dir*fs*dt, ahead=Math.floor((nx2+f.dir*11)/T), row=Math.floor((f.y-4)/T), below=at(ahead,row+1);
      if(solid(ahead,row)||!(below==="#"||below==="-"))f.dir*=-1; else f.x=nx2;
      if(Math.abs(f.x-pl.x)<20&&pl.y>f.y-22&&pl.y-PH<f.y){
        if(pl.vy>0&&prevY<=f.y-12){f.alive=false;api.add(50);pl.vy=-430;pl.boost=true;}
        else {api.lose();return;}
      }
    }
  }
  function book(g,x,y,i){const cols=["#c0564a","#4f7bbf","#6b9a3c","#d49a2a"];g.fillStyle=cols[i%4];g.fillRect(x,y,T,T);
    g.fillStyle="rgba(255,255,255,.28)";g.fillRect(x,y,T,4);g.fillStyle="rgba(0,0,0,.25)";g.fillRect(x,y+T-3,T,3);
    g.fillStyle="rgba(255,255,255,.55)";g.fillRect(x+6,y+12,T-12,3);g.strokeStyle="#2a1c13";g.lineWidth=2;g.strokeRect(x+1,y+1,T-2,T-2);}
  function draw(g){
    g.fillStyle="#fbf3dc";g.fillRect(0,0,W,H);
    g.strokeStyle="#bcd3ea";g.lineWidth=1;for(let y=T;y<H;y+=T/2){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke();}
    g.strokeStyle="#e6a3a3";g.lineWidth=2;g.beginPath();g.moveTo(52,0);g.lineTo(52,H);g.stroke();
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){const c=grid[y][x],X=x*T,Y=y*T;
      if(c==="#")book(g,X,Y,x*7+y*3);
      else if(c==="-"){g.fillStyle="#e8c96a";g.fillRect(X,Y,T,10);g.strokeStyle="#7a5a1c";g.lineWidth=2;g.strokeRect(X+1,Y+1,T-2,8);
        g.fillStyle="#7a5a1c";for(let k=4;k<T;k+=6)g.fillRect(X+k,Y+2,1.5,k%12===4?5:3);}
      else if(c==="^"){for(let k=0;k<2;k++){const cx=X+8+k*16;g.fillStyle="#9aa3ad";g.beginPath();g.moveTo(cx-7,Y+T);g.lineTo(cx,Y+T-16);g.lineTo(cx+7,Y+T);g.fill();
        g.fillStyle="#d84a4a";g.beginPath();g.arc(cx,Y+T-17,4,0,7);g.fill();}}
      else if(c==="S"){g.strokeStyle="#5d6670";g.lineWidth=3;g.beginPath();for(let k=0;k<5;k++){g.lineTo(X+6+(k%2)*20,Y+T-2-k*4);}g.stroke();
        g.fillStyle="#d84a4a";g.fillRect(X+3,Y+T-24,T-6,6);}
      else if(c==="*")star(g,X+T/2,Y+T/2+Math.sin(t*4+x)*2,10,4.5,"#f2b81d");
      else if(c==="E"){const bob=Math.sin(t*3)*2;g.fillStyle="#f28fae";roundRect(g,X+4,Y+10+bob,24,18,5);g.fill();g.fillStyle="#d86a8d";g.fillRect(X+4,Y+22+bob,24,6);
        g.fillStyle="#3b2a20";g.fillRect(X+11,Y+15+bob,3,3);g.fillRect(X+19,Y+15+bob,3,3);
        g.fillStyle="#fff";roundRect(g,X+12,Y-12+bob,30,16,6);g.fill();g.fillStyle="#3b2a20";g.font="10px Silkscreen, monospace";g.textAlign="center";g.fillText("HELP",X+27,Y-1+bob);}
    }
    for(const f of foes){if(!f.alive)continue;const wob=Math.sin(t*10+f.x)*2;
      g.fillStyle="#1f2a6b";g.beginPath();g.ellipse(f.x,f.y-10,13+wob*.5,10-wob*.3,0,0,7);g.fill();
      g.beginPath();g.arc(f.x-9,f.y-2,3,0,7);g.arc(f.x+9,f.y-2,3,0,7);g.arc(f.x,f.y-1,3,0,7);g.fill();
      g.fillStyle="#fff";g.beginPath();g.arc(f.x-4+f.dir*2,f.y-12,3.2,0,7);g.arc(f.x+4+f.dir*2,f.y-12,3.2,0,7);g.fill();
      g.fillStyle="#000";g.beginPath();g.arc(f.x-4+f.dir*3,f.y-12,1.5,0,7);g.arc(f.x+4+f.dir*3,f.y-12,1.5,0,7);g.fill();}
    // pencil hero
    const s=pl.squash||0, w=16*(1+s), h=PH*(1-s), x=pl.x, y=pl.y;
    g.save();g.translate(x,y);
    g.fillStyle="#3b2a20";const step=pl.ground&&Math.abs(pl.vx)>20?Math.sin(t*18)*3:0;g.fillRect(-7+step,-4,6,4);g.fillRect(1-step,-4,6,4);
    g.fillStyle="#f4c430";g.fillRect(-w/2,-h+10,w,h-18);
    g.fillStyle="#e0a91a";g.fillRect(-w/2,-h+10,w*0.3,h-18);
    g.fillStyle="#f1d3a5";g.beginPath();g.moveTo(-w/2,-8);g.lineTo(w/2,-8);g.lineTo(0,-1);g.fill();
    g.fillStyle="#3b2a20";g.beginPath();g.moveTo(-3,-4);g.lineTo(3,-4);g.lineTo(0,-1);g.fill();
    g.fillStyle="#aab2bb";g.fillRect(-w/2,-h+6,w,5);g.fillStyle="#f28fae";roundRect(g,-w/2,-h-2,w,9,3);g.fill();
    g.fillStyle="#fff";g.beginPath();g.arc(-3+pl.face*2,-h+17,3,0,7);g.arc(4+pl.face*2,-h+17,3,0,7);g.fill();
    g.fillStyle="#111";g.beginPath();g.arc(-3+pl.face*3,-h+17,1.5,0,7);g.arc(4+pl.face*3,-h+17,1.5,0,7);g.fill();
    g.restore();
    g.fillStyle="#3b2a20";g.font="12px Silkscreen, monospace";g.textAlign="left";g.fillText("LEVEL "+(lvl+1),62,52);
    g.textAlign="right";g.fillText("FIND THE LOST ERASER",W-42,52);
    if(banner>0){g.textAlign="center";g.font="40px Silkscreen, monospace";g.lineWidth=6;g.strokeStyle="#fbf3dc";g.strokeText("LEVEL "+(lvl+1),W/2,H/2-40);g.fillStyle="#2e7d86";g.fillText("LEVEL "+(lvl+1),W/2,H/2-40);}
  }
  function drawSprout(g){
    const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#9fd8f0");sky.addColorStop(1,"#e9f6d6");g.fillStyle=sky;g.fillRect(0,0,W,H);
    g.fillStyle="rgba(255,240,170,.9)";g.beginPath();g.arc(520,96,30,0,7);g.fill();
    g.fillStyle="rgba(255,255,255,.85)";for(const [cx,cy] of [[150,90],[360,70]]){g.beginPath();g.arc(cx,cy,16,0,7);g.arc(cx+18,cy-8,20,0,7);g.arc(cx+40,cy,16,0,7);g.fill();}
    g.fillStyle="#b6dd9a";g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=10)g.lineTo(x,330-Math.sin(x*0.012)*30-Math.sin(x*0.031)*12);g.lineTo(W,H);g.fill();
    for(let y=0;y<R;y++)for(let x=0;x<C;x++){const c=grid[y][x],X=x*T,Y=y*T;
      if(c==="#"){g.fillStyle="#8a5a34";g.fillRect(X,Y,T,T);g.fillStyle="#734826";
        for(let k=0;k<4;k++){const sx=(x*37+y*11+k*13)%26+3,sy=(x*17+y*29+k*7)%24+5;g.fillRect(X+sx,Y+sy,3,2);}
        if(!(y>0&&grid[y-1][x]==="#")){g.fillStyle="#5fb53a";g.fillRect(X,Y,T,8);g.fillStyle="#4a9a2c";g.fillRect(X,Y+7,T,2);
          g.fillStyle="#6fcf45";for(let k=2;k<T;k+=6){g.beginPath();g.moveTo(X+k,Y+1);g.lineTo(X+k+2,Y-5);g.lineTo(X+k+4,Y+1);g.fill();}}}
      else if(c==="-"){g.fillStyle="#c58d50";g.fillRect(X,Y,T,10);g.fillStyle="#9c6a35";g.fillRect(X,Y+8,T,2);g.fillStyle="#6b4520";g.fillRect(X+4,Y+4,2,2);g.fillRect(X+T-6,Y+4,2,2);}
      else if(c==="^"){g.fillStyle="#2f6b2a";for(let k=0;k<3;k++){const cx=X+5+k*11;g.beginPath();g.moveTo(cx-5,Y+T);g.lineTo(cx,Y+T-17);g.lineTo(cx+5,Y+T);g.fill();}
        g.fillStyle="#3d8a35";g.fillRect(X,Y+T-5,T,5);g.fillStyle="#c9334a";g.beginPath();g.arc(X+11,Y+T-8,2.5,0,7);g.arc(X+22,Y+T-10,2.5,0,7);g.fill();}
      else if(c==="S"){g.fillStyle="#f3ead6";g.fillRect(X+11,Y+T-12,10,12);g.fillStyle="#d9423a";g.beginPath();g.ellipse(X+T/2,Y+T-12,15,10,0,Math.PI,0);g.fill();
        g.fillStyle="#fff";g.beginPath();g.arc(X+10,Y+T-17,2.5,0,7);g.arc(X+20,Y+T-19,3,0,7);g.arc(X+25,Y+T-14,2,0,7);g.fill();}
      else if(c==="*"){const bob=Math.sin(t*4+x)*2,cx=X+T/2,cy=Y+T/2+bob;g.fillStyle="#3aa0e6";g.beginPath();g.moveTo(cx,cy-11);g.quadraticCurveTo(cx+9,cy,cx,cy+8);g.quadraticCurveTo(cx-9,cy,cx,cy-11);g.fill();
        g.fillStyle="rgba(255,255,255,.7)";g.beginPath();g.arc(cx-2.5,cy+1,2,0,7);g.fill();}
      else if(c==="E"){const bob=Math.sin(t*3)*1.5;g.fillStyle="#6f9fc7";roundRect(g,X+5,Y+12+bob,20,18,4);g.fill();g.fillStyle="#5a86ab";g.fillRect(X+5,Y+24+bob,20,6);
        g.strokeStyle="#6f9fc7";g.lineWidth=4;g.beginPath();g.moveTo(X+24,Y+18+bob);g.lineTo(X+33,Y+8+bob);g.stroke();g.fillStyle="#6f9fc7";g.fillRect(X+30,Y+5+bob,6,4);
        g.strokeStyle="#5a86ab";g.lineWidth=3;g.beginPath();g.arc(X+15,Y+12+bob,7,Math.PI,0);g.stroke();
        g.fillStyle="#fff";g.globalAlpha=.6+.4*Math.sin(t*5);star(g,X+4,Y+6,5,2,"#fff");g.globalAlpha=1;}
    }
    for(const f of foes){if(!f.alive)continue;const sx=f.x,sy=f.y;
      g.fillStyle="#a7a39a";roundRect(g,sx-14,sy-7,28,7,3);g.fill();g.fillRect(sx+f.dir*9-2,sy-14,4,8);
      g.fillStyle="#222";g.beginPath();g.arc(sx+f.dir*10,sy-15,2,0,7);g.fill();
      g.fillStyle="#e3953a";g.beginPath();g.arc(sx-f.dir*2,sy-12,9,0,7);g.fill();g.strokeStyle="#8a4f17";g.lineWidth=2;g.beginPath();
      for(let a=0;a<9;a+=0.3){const r=a*0.9;g.lineTo(sx-f.dir*2+Math.cos(a)*r,sy-12+Math.sin(a)*r);}g.stroke();}
    // sprout hero
    const s=pl.squash||0, w=18*(1+s), h=PH*(1-s), x=pl.x, y=pl.y;
    g.save();g.translate(x,y);
    g.fillStyle="#5a3a22";const step=pl.ground&&Math.abs(pl.vx)>20?Math.sin(t*18)*3:0;g.fillRect(-7+step,-4,6,4);g.fillRect(1-step,-4,6,4);
    g.fillStyle="#e8c79a";g.beginPath();g.ellipse(0,-h*0.36,w/2,h*0.36,0,0,7);g.fill();
    g.fillStyle="#d4ad7a";g.beginPath();g.ellipse(-w*0.18,-h*0.32,w*0.18,h*0.26,0,0,7);g.fill();
    g.strokeStyle="#4a9a2c";g.lineWidth=3;g.beginPath();g.moveTo(0,-h*0.7);g.quadraticCurveTo(-pl.face*2,-h*0.9,0,-h-2);g.stroke();
    const sway=Math.sin(t*6)*0.15;
    g.fillStyle="#6fcf45";g.save();g.translate(0,-h-1);g.rotate(-0.5+sway);g.beginPath();g.ellipse(-8,0,9,5,0,0,7);g.fill();g.restore();
    g.save();g.translate(0,-h-1);g.rotate(0.5+sway);g.beginPath();g.ellipse(8,0,9,5,0,0,7);g.fill();g.restore();
    g.fillStyle="#fff";g.beginPath();g.arc(-3+pl.face*2,-h*0.42,3,0,7);g.arc(4+pl.face*2,-h*0.42,3,0,7);g.fill();
    g.fillStyle="#111";g.beginPath();g.arc(-3+pl.face*3,-h*0.42,1.5,0,7);g.arc(4+pl.face*3,-h*0.42,1.5,0,7);g.fill();
    g.fillStyle="#e88a8a";g.beginPath();g.arc(-6+pl.face*2,-h*0.3,2,0,7);g.arc(7+pl.face*2,-h*0.3,2,0,7);g.fill();
    g.restore();
    g.fillStyle="#2f4a1f";g.font="12px Silkscreen, monospace";g.textAlign="left";g.fillText("LEVEL "+(lvl+1),44,52);
    g.textAlign="right";g.fillText("FIND THE WATERING CAN",W-44,52);
    if(banner>0){g.textAlign="center";g.font="40px Silkscreen, monospace";g.lineWidth=6;g.strokeStyle="#e9f6d6";g.strokeText("LEVEL "+(lvl+1),W/2,H/2-40);g.fillStyle="#3d7a37";g.fillText("LEVEL "+(lvl+1),W/2,H/2-40);}
  }
  if(theme==="sprout") return {reset,startLife,update,draw:drawSprout,hint:"Left/Right to move, Up or Space to jump (hold for higher). Collect water drops, stomp snails, reach the watering can. Losing a life sends you back to level 1."};
  return {reset,startLife,update,draw,hint:"Left/Right to move, Up or Space to jump (hold for higher). Grab stars, stomp ink blots, reach the eraser. Losing a life sends you back to level 1."};
}

// ---------- shared on-screen keyboard (for the typing games) ----------
const KB_ROWS=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
function kbLayout(y0,withSpace){
  const keys=[], kw=46, kh=40, gap=6;
  KB_ROWS.forEach((row,r)=>{
    const extra=r===2?2:0, n=row.length+extra, wide=r===2?70:kw;
    let total=row.length*(kw+gap)-gap+(r===2?2*(wide+gap):0);
    let x=(W-total)/2, y=y0+r*(kh+gap);
    if(r===2){keys.push({k:"Enter",label:"ENTER",x,y,w:wide,h:kh});x+=wide+gap;}
    for(const ch of row){keys.push({k:ch,label:ch,x,y,w:kw,h:kh});x+=kw+gap;}
    if(r===2){keys.push({k:"Backspace",label:"⌫",x,y,w:wide,h:kh});}
  });
  if(withSpace){const y=y0+3*(kh+gap);keys.push({k:" ",label:"SPACE",x:W/2-130,y,w:260,h:34});}
  return keys;
}
function drawKeyboard(g,keys,colorOf){
  g.textAlign="center";g.textBaseline="middle";
  for(const k of keys){
    const c=colorOf?colorOf(k.k):null;
    g.fillStyle=c||"#3a3256";roundRect(g,k.x,k.y,k.w,k.h,7);g.fill();
    g.fillStyle="#fff";g.font=(k.label.length>1?"bold 13px":"bold 18px")+" Atkinson Hyperlegible, system-ui, sans-serif";g.fillText(k.label,k.x+k.w/2,k.y+k.h/2+1);
  }
  g.textBaseline="alphabetic";
}
function keyAt(keys,x,y){return keys.find(k=>x>=k.x&&x<=k.x+k.w&&y>=k.y&&y<=k.y+k.h);}
// typed characters from the physical keyboard and taps on the on-screen one
function readTyping(inp,keys){
  const out=[...(inp.text||[])];
  for(const t of (inp.taps||[])){const k=keyAt(keys,t.x,t.y);if(k)out.push(k.k);}
  return out;
}
function wrapText(g,text,x,y,maxW,lh){
  const words=String(text).split(/\s+/);let line="",yy=y;
  for(const w of words){const test=line?line+" "+w:w;if(g.measureText(test).width>maxW&&line){g.fillText(line,x,yy);line=w;yy+=lh;}else line=test;}
  if(line)g.fillText(line,x,yy);return yy;
}

// ---------- RARE FIND (rare-answer trivia) ----------
function RareGame(api){
  const T=(c,u,r)=>({c:c.split(","),u:u.split(","),r:r.split(",")});
  const PROMPTS=[
    {p:"Name a prime number less than 100.",t:T("2,3,5,7,11,13","17,19,23,29,31,37,41,43,47","53,59,61,67,71,73,79,83,89,97")},
    {p:"Name a multiple of 7 between 1 and 100.",t:T("7,14,21,28,35,49,70","42,56,63,77","84,91,98")},
    {p:"Name a perfect square less than 200.",t:T("1,4,9,16,25,36,49,64,81,100","121,144","169,196")},
    {p:"Name a two-digit number divisible by both 3 and 4.",t:T("12,24,36,48","60,72","84,96")},
    {p:"Name a two-digit number whose digits add up to 10.",t:T("19,55,91","28,82,37,73","46,64")},
    {p:"Name a fraction equal to 1/2 (like 3/6).",frac:true},
    {p:"Name a polygon (a flat shape with straight sides).",t:T("triangle,square,rectangle,pentagon,hexagon,octagon","heptagon,nonagon,decagon,rhombus,trapezoid,parallelogram,quadrilateral","dodecagon,hendecagon,undecagon,kite,trapezium,icosagon,rhomboid,septagon")},
    {p:"Name a 3D shape.",t:T("cube,sphere,cylinder,cone,pyramid,prism","rectangular prism,triangular prism,cuboid,hemisphere,square pyramid","tetrahedron,octahedron,dodecahedron,icosahedron,torus,frustum,ellipsoid,pentagonal prism,hexagonal prism,triangular pyramid,polyhedron")},
    {p:"Name a unit for measuring length or distance.",t:T("inch,foot,feet,yard,mile,meter,centimeter,millimeter,kilometer","decimeter,nanometer,micrometer,light year,nautical mile","furlong,league,fathom,cubit,parsec,angstrom,hand,rod,chain,astronomical unit,micron")},
    {p:"Name a math word that starts with P.",t:T("plus,pi,percent,perimeter,prime,product","parallel,perpendicular,polygon,proportion,pyramid,parabola,place value,point,power,probability,pentagon,protractor,prism","parallelogram,polynomial,permutation,parameter,pythagorean theorem,pattern,positive,plane,polyhedron,period,proof,profit")},
    {p:"Name a fruit.",t:T("apple,banana,orange,grape,strawberry,watermelon,pineapple,mango,peach,pear,cherry,lemon,blueberry","kiwi,plum,lime,raspberry,blackberry,coconut,papaya,cantaloupe,pomegranate,apricot,grapefruit,nectarine,cranberry,honeydew,tangerine,fig,avocado,tomato","dragonfruit,dragon fruit,lychee,guava,persimmon,kumquat,starfruit,jackfruit,durian,passion fruit,passionfruit,quince,gooseberry,elderberry,mulberry,rambutan,plantain,date,clementine,boysenberry,huckleberry")},
    {p:"Name a vegetable.",t:T("carrot,broccoli,potato,corn,lettuce,peas,green beans,onion,celery,cucumber,spinach","cauliflower,cabbage,pepper,zucchini,asparagus,kale,mushroom,beet,radish,squash,sweet potato,eggplant,garlic","artichoke,kohlrabi,rutabaga,parsnip,turnip,leek,okra,bok choy,jicama,fennel,chard,brussels sprouts,arugula,endive,watercress,yam,shallot,daikon")},
    {p:"Name a U.S. state.",t:T("california,texas,florida,new york,illinois,hawaii,alaska,washington,georgia,ohio,michigan","indiana,wisconsin,arizona,nevada,colorado,oregon,utah,tennessee,virginia,pennsylvania,new jersey,massachusetts,minnesota,iowa,missouri,kentucky,louisiana,alabama,north carolina,south carolina,oklahoma,kansas,arkansas,mississippi,connecticut,maryland","montana,wyoming,idaho,north dakota,south dakota,nebraska,new mexico,maine,vermont,new hampshire,rhode island,delaware,west virginia")},
    {p:"Name a country in Europe.",t:T("france,germany,italy,spain,england,united kingdom,uk,ireland,poland,greece","portugal,netherlands,belgium,switzerland,austria,sweden,norway,denmark,finland,ukraine,russia,scotland,wales,croatia,hungary,czech republic,czechia,romania","iceland,estonia,latvia,lithuania,slovenia,slovakia,serbia,bosnia,montenegro,albania,north macedonia,macedonia,moldova,belarus,luxembourg,liechtenstein,monaco,andorra,san marino,malta,cyprus,bulgaria,vatican city,kosovo")},
    {p:"Name an animal that lives in the ocean.",t:T("shark,whale,dolphin,fish,octopus,jellyfish,crab,starfish,turtle,sea turtle,seal","squid,stingray,lobster,shrimp,eel,seahorse,orca,walrus,sea lion,clam,coral,manatee,sea otter,swordfish,tuna,sea urchin,oyster","narwhal,anglerfish,krill,barnacle,nudibranch,cuttlefish,manta ray,beluga,sea cucumber,hagfish,lamprey,oarfish,dugong,plankton,sea anemone,anemone,isopod,sunfish,marlin,barracuda,sea star,mussel,scallop")},
    {p:"Name a color.",t:T("red,blue,green,yellow,orange,purple,pink,black,white,brown,gray,grey","teal,turquoise,navy,maroon,magenta,lavender,beige,gold,silver,violet,indigo,cyan,tan,peach,coral,crimson","chartreuse,vermilion,cerulean,mauve,ochre,periwinkle,fuchsia,burgundy,sienna,umber,aquamarine,mahogany,scarlet,amber,ivory,khaki,saffron,taupe,puce")},
    {p:"Name a planet or dwarf planet.",t:T("earth,mars,jupiter,saturn,venus","mercury,uranus,neptune,pluto","ceres,eris,makemake,haumea")},
    {p:"Name a sport.",t:T("soccer,basketball,football,baseball,tennis,volleyball,hockey,golf,swimming","softball,lacrosse,wrestling,track,gymnastics,bowling,badminton,cricket,rugby,skiing,boxing,cheer,cheerleading,skateboarding,surfing","curling,fencing,water polo,polo,archery,rowing,handball,squash,bobsled,luge,biathlon,pickleball,ultimate frisbee,jai alai,kabaddi,triathlon,equestrian")},
    {p:"Name a word that means \"big.\"",t:T("big,large,huge,giant,enormous","gigantic,massive,immense,vast,colossal,tremendous,jumbo,mega","gargantuan,mammoth,titanic,monumental,humongous,prodigious,behemoth,monstrous,hulking,whopping,ginormous,elephantine,astronomical,mountainous")},
    {p:"Name a musical instrument.",t:T("piano,guitar,drums,violin,flute,trumpet","saxophone,clarinet,cello,trombone,harp,ukulele,xylophone,tuba,bass,keyboard,harmonica,oboe","bassoon,piccolo,viola,banjo,mandolin,accordion,didgeridoo,sitar,bagpipes,glockenspiel,timpani,french horn,marimba,triangle,tambourine,lute,harpsichord,theremin,kazoo,cowbell")},
    {p:"Name a part of the human body.",t:T("arm,leg,hand,foot,head,eye,nose,ear,mouth,heart","elbow,knee,shoulder,ankle,wrist,stomach,lungs,lung,brain,liver,finger,toe,chin,neck,kidney","spleen,pancreas,femur,clavicle,sternum,patella,tibia,fibula,uvula,appendix,gallbladder,esophagus,trachea,diaphragm,cornea,pupil,retina,cochlea,larynx")}
  ];
  const PTS={c:10,u:25,r:50}, NAME={c:"COMMON",u:"UNCOMMON",r:"RARE!"}, COL={c:"#a69fcf",u:"#3fe0ff",r:"#ffd23f"};
  const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9\/ ]/g,"").replace(/\s+/g," ").trim().replace(/^(a|an|the) /,"");
  let order=[],cur,typed,phase,timer,result,dug,t=0,keys=kbLayout(292,true),blink=0;
  function judge(ans){
    const a=norm(ans); if(!a) return null;
    if(cur.frac){const m=a.match(/^(\d+)\s*\/\s*(\d+)$/);if(!m)return null;const n=+m[1],d=+m[2];if(!n||d!==2*n)return null;return d<=10?"c":d<=50?"u":"r";}
    const forms=[a,a.replace(/es$/,""),a.replace(/s$/,"")];
    for(const tier of ["r","u","c"]) if(cur.t[tier].some(x=>forms.includes(x))) return tier;
    return null;
  }
  function next(){ if(!order.length) order=shuffle(PROMPTS.map((_,i)=>i)); cur=PROMPTS[order.pop()]; typed=""; phase="ask"; timer=20; result=null; }
  function reset(){order=[];dug=0;next();}
  function startLife(){ if(phase!=="ask"||!cur) next(); }
  function submit(){
    const tier=judge(typed);
    if(tier){api.add(PTS[tier]);dug+=PTS[tier];}
    const examples=cur.frac?["37/74","50/100","125/250"]:shuffle(cur.t.r).slice(0,3);
    result={tier,ans:typed.trim()||"(no answer)",examples};phase="result";timer=2.6;
  }
  function update(dt,inp){
    t+=dt;blink+=dt;
    if(phase==="ask"){
      timer-=dt;
      for(const k of readTyping(inp,keys)){
        if(k==="Enter"){ if(typed.trim()){submit();break;} }
        else if(k==="Backspace") typed=typed.slice(0,-1);
        else if(k.length===1&&typed.length<28&&/[A-Za-z0-9 \/\-']/.test(k)) typed+=k.toLowerCase();
      }
      if(phase==="ask"&&timer<=0) submit();
    } else if(phase==="result"){
      timer-=dt;
      if(timer<=0){ const lost=!result.tier; next(); if(lost){api.lose();return;} }
    }
  }
  function draw(g){
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#1b1438");bg.addColorStop(1,"#0b0920");g.fillStyle=bg;g.fillRect(0,0,W,H);
    // dig meter on the left: deeper = more points
    const depth=Math.min(1,dug/600);g.fillStyle="#2a2150";g.fillRect(14,18,14,280);g.fillStyle="#ffd23f";g.fillRect(14,18,14,280*depth);
    g.fillStyle="#a69fcf";g.font="10px Silkscreen, monospace";g.textAlign="left";g.fillText("DIG",8,312);g.fillText(dug+"m",8,326);
    g.textAlign="center";g.fillStyle="#86f56a";g.font="13px Silkscreen, monospace";g.fillText("RARE FIND · RARER ANSWERS SCORE MORE",W/2,30);
    g.fillStyle="#f4f0ff";g.font="bold 24px Atkinson Hyperlegible, system-ui, sans-serif";wrapText(g,cur.p,W/2,72,520,28);
    if(phase==="ask"){
      g.fillStyle="#2a2150";roundRect(g,90,128,460,52,10);g.fill();g.strokeStyle="#3fe0ff";g.lineWidth=2;g.stroke();
      g.fillStyle="#fff";g.font="bold 24px Atkinson Hyperlegible, system-ui, sans-serif";g.textAlign="left";
      const shown=typed+(Math.floor(blink*2)%2?"":"|");g.fillText(shown||"|",106,162);
      g.textAlign="center";g.fillStyle="#a69fcf";g.font="14px Atkinson Hyperlegible, system-ui, sans-serif";g.fillText("Type your answer, then press Enter.  Common 10 · Uncommon 25 · Rare 50",W/2,206);
      const f=Math.max(0,timer/20);g.fillStyle="#2a2150";g.fillRect(90,222,460,10);g.fillStyle=f<.3?"#ff6170":"#86f56a";g.fillRect(90,222,460*f,10);
      g.fillStyle="#f4f0ff";g.font="12px Silkscreen, monospace";g.fillText(Math.ceil(timer)+"s",W/2,252);
    } else {
      const r=result;g.font="bold 22px Atkinson Hyperlegible, system-ui, sans-serif";g.fillStyle="#f4f0ff";g.fillText("“"+r.ans+"”",W/2,152);
      g.font="34px Silkscreen, monospace";g.fillStyle=r.tier?COL[r.tier]:"#ff6170";g.fillText(r.tier?NAME[r.tier]+" +"+PTS[r.tier]:"NOT ON OUR LIST",W/2,198);
      g.font="15px Atkinson Hyperlegible, system-ui, sans-serif";g.fillStyle="#a69fcf";g.fillText("Rare answers: "+r.examples.join(", "),W/2,236);
      if(!r.tier){g.fillStyle="#ff6170";g.fillText("No points this time, so the round ends.",W/2,262);}
    }
    drawKeyboard(g,keys);
  }
  return {reset,startLife,update,draw,textInput:true,hint:"Type an answer that fits. The rarer your correct answer, the more points. An answer that isn't on the list ends the round."};
}

// ---------- LETTER LOCK (five-letter word puzzle) ----------
function WordGame(api){
  const WORDS=("ANGLE ARRAY BASES CHORD CUBED DIGIT EQUAL GRAPH HALVE INPUT LINES MINUS RATIO SLOPE SOLVE TIMES TOTAL UNITS VALUE WIDTH ROUND PRIME POINT SCALE RANGE SHAPE SPACE PLANE ROOTS SOLID "+
    "APPLE BEACH BRAIN BREAD BRICK CANDY CHAIR CLOUD CRANE DANCE EAGLE EARTH FLAME FROST GHOST GIANT GLOBE GRAPE GRASS HEART HONEY HOUSE JELLY LEMON LIGHT MAGIC MANGO MONEY MUSIC NIGHT OCEAN OLIVE "+
    "PAINT PANDA PARTY PEACH PIANO PIZZA PLANT QUEEN RADIO RIVER ROBOT SALAD SHARK SHEEP SMILE SNAKE SPOON STONE STORM SUGAR TABLE TIGER TOAST TRAIN TRUCK WATER WHALE WORLD ZEBRA SPICE CRISP "+
    "FLOAT BLOCK CHESS CLOCK SKATE BRAVE THUMB TOWER BENCH BOARD CHALK EXTRA FIELD GLASS HAPPY JUICE KNOCK LAUGH MARCH NOTES ORBIT PAPER QUIET RULER STUDY TEACH UPPER VOICE WRITE YOUTH CLASS "+
    "LUNCH RECESS QUILT SPORT SWEET TASTE THINK TRUST UNCLE VIVID WHEAT YIELD BLOOM CHARM DREAM FRESH GRADE LEARN").split(" ").filter(w=>w.length===5);
  const keys=kbLayout(330,false);
  let word,rows,typed,state,msg,msgT,used=[],t=0,flip=0;
  function newWord(){ if(!used.length) used=shuffle(WORDS.slice()); word=used.pop(); rows=[]; typed=""; state="play"; msg=""; msgT=0; }
  function reset(){used=[];newWord();}
  function startLife(){ if(state!=="play") newWord(); }
  function score(guess){
    const res=Array(5).fill("x"), left={};
    for(let i=0;i<5;i++){ if(guess[i]===word[i]) res[i]="g"; else left[word[i]]=(left[word[i]]||0)+1; }
    for(let i=0;i<5;i++) if(res[i]!=="g"&&left[guess[i]]){ res[i]="y"; left[guess[i]]--; }
    return res;
  }
  function keyColor(ch){
    let best=null; for(const r of rows) for(let i=0;i<5;i++) if(r.g[i]===ch){ const s=r.s[i]; if(s==="g") best="g"; else if(s==="y"&&best!=="g") best="y"; else if(!best) best="x"; }
    return best==="g"?"#3f9b4f":best==="y"?"#c9a227":best==="x"?"#1f1a33":null;
  }
  function update(dt,inp){
    t+=dt; if(msgT>0) msgT-=dt; if(flip>0) flip-=dt;
    if(state!=="play"){ if(flip<=0){ const lost=state==="lost"; newWord(); if(lost){ api.lose(); return; } } return; }
    for(const k of readTyping(inp,keys)){
      if(k==="Enter"){
        if(typed.length<5){ msg="Not enough letters"; msgT=1.2; continue; }
        const s=score(typed); rows.push({g:typed,s}); flip=.35;
        if(typed===word){ const pts=50+(7-rows.length)*50; api.add(pts); state="won"; msg="Solved! +"+pts; msgT=2; flip=2; }
        else if(rows.length>=6){ state="lost"; msg="The word was "+word; msgT=2.6; flip=2.6; }
        typed=""; break;
      } else if(k==="Backspace") typed=typed.slice(0,-1);
      else if(/^[a-zA-Z]$/.test(k)&&typed.length<5) typed+=k.toUpperCase();
    }
  }
  function draw(g){
    g.fillStyle="#120e26";g.fillRect(0,0,W,H);
    const ts=44,gap=6,x0=(W-(5*ts+4*gap))/2,y0=18;
    for(let r=0;r<6;r++)for(let c=0;c<5;c++){
      const x=x0+c*(ts+gap),y=y0+r*(ts+gap),row=rows[r];
      let ch="",fill="#120e26",stroke="#3a3256";
      if(row){ch=row.g[c];fill=row.s[c]==="g"?"#3f9b4f":row.s[c]==="y"?"#c9a227":"#2a2440";stroke=fill;}
      else if(r===rows.length&&state==="play"){ch=typed[c]||"";if(ch)stroke="#a69fcf";}
      g.fillStyle=fill;g.fillRect(x,y,ts,ts);g.strokeStyle=stroke;g.lineWidth=2;g.strokeRect(x+1,y+1,ts-2,ts-2);
      if(ch){g.fillStyle="#fff";g.font="bold 24px Atkinson Hyperlegible, system-ui, sans-serif";g.textAlign="center";g.fillText(ch,x+ts/2,y+ts/2+8);}
    }
    g.textAlign="left";g.fillStyle="#86f56a";g.font="12px Silkscreen, monospace";g.fillText("LETTER LOCK",14,24);
    g.fillStyle="#a69fcf";g.font="12px Atkinson Hyperlegible, system-ui, sans-serif";
    g.fillText("Green: right spot",14,46);g.fillText("Gold: in the word",14,62);g.fillText("Gray: not in it",14,78);
    if(msgT>0||state!=="play"){g.textAlign="center";g.fillStyle="rgba(0,0,0,.75)";roundRect(g,W/2-140,y0+128,280,44,10);g.fill();g.fillStyle=state==="won"?"#86f56a":state==="lost"?"#ffd23f":"#fff";
      g.font="bold 20px Atkinson Hyperlegible, system-ui, sans-serif";g.fillText(msg,W/2,y0+157);}
    drawKeyboard(g,keys,keyColor);
  }
  return {reset,startLife,update,draw,textInput:true,hint:"Guess the five-letter word in 6 tries. Type letters and press Enter. Fewer guesses score more. Running out of guesses ends the round."};
}

// ---------- SUNSET DRIVE (open-city delivery driving, school-safe) ----------
function DriveGame(api){
  const TS=48, N=42; // 42x42 tiles world
  // tile types: 0 building, 1 road, 2 park, 3 water, 4 sand
  let map=[], bcol=[];
  function build(){
    map=[];bcol=[];
    for(let y=0;y<N;y++){const row=[],cr=[];for(let x=0;x<N;x++){
      let v=0; const road=(x%7===1||x%7===2)||(y%7===1||y%7===2);
      if(x>=N-4) v=x>=N-2?3:4; else if(y<1||x<1||y>=N-1) v=3; else if(road) v=1; else v=((x*13+y*7)%11===0||(Math.floor(x/7)+Math.floor(y/7))%5===0)?2:0;
      row.push(v);cr.push(["#ff7eb6","#5ee0d6","#b28dff","#ffb86b","#7aa2ff"][(Math.floor(x/7)*3+Math.floor(y/7))%5]);}
      map.push(row);bcol.push(cr);}
    for(let y=1;y<N-1;y++){ map[y][N-5]=1; map[y][N-6]=1; } // beach boulevard
  }
  const at=(px,py)=>{const x=Math.floor(px/TS),y=Math.floor(py/TS);return (x<0||y<0||x>=N||y>=N)?3:map[y][x];};
  const drivable=(px,py)=>{const v=at(px,py);return v===1||v===4;};
  const roadTiles=()=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(map[y][x]===1)out.push([x,y]);return out;};
  let car,traffic,coins,job,hits,t=0,cam,flash=0,banner=0,roads,deliv=0,delivPts=0;
  function spot(){const r=roads[Math.floor(Math.random()*roads.length)];return{x:r[0]*TS+TS/2,y:r[1]*TS+TS/2};}
  function newJob(){ const p=spot(); let d; do{ d=spot(); }while(Math.hypot(d.x-p.x,d.y-p.y)<700); job={stage:"pickup",p,d,t:0}; }
  function reset(){ build(); roads=roadTiles(); coins=[];for(let i=0;i<40;i++)coins.push({...spot(),alive:true}); traffic=[]; for(let i=0;i<22;i++){const s=spot();const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>drivable(s.x+dx*TS,s.y+dy*TS));const d=dirs[Math.floor(Math.random()*dirs.length)]||[1,0];
      traffic.push({x:s.x,y:s.y,dx:d[0],dy:d[1],sp:rand(70,120),col:["#f4f0ff","#ffd23f","#86f56a","#ff9a3c","#3fe0ff"][i%5]});}
    newJob(); startLife(); }
  function startLife(){ car={x:1.5*TS+TS,y:1.5*TS+TS,a:0,v:0}; hits=0; flash=1.2; banner=0; }
  function update(dt,inp){
    t+=dt; if(flash>0)flash-=dt; if(banner>0)banner-=dt; if(deliv>0)deliv-=dt; job.t+=dt;
    const acc=inp.held.up?320:inp.held.down?-380:0;
    car.v+=acc*dt; if(!inp.held.up&&!inp.held.down) car.v*=Math.pow(0.35,dt);
    car.v=clamp(car.v,-130,280);
    const steer=(inp.held.left?-1:0)+(inp.held.right?1:0);
    car.a+=steer*dt*2.6*clamp(Math.abs(car.v)/120,0,1)*Math.sign(car.v||1);
    const off=at(car.x,car.y)===2?0.55:1; // grass slows you down
    const nx=car.x+Math.cos(car.a)*car.v*dt*off, ny=car.y+Math.sin(car.a)*car.v*dt*off;
    const ok=(x,y)=>{for(const [ox,oy] of [[-9,-9],[9,-9],[-9,9],[9,9]]){const v=at(x+ox,y+oy);if(v===0||v===3)return false;}return true;};
    if(ok(nx,ny)){car.x=nx;car.y=ny;} else if(ok(nx,car.y)){car.x=nx;car.v*=.6;} else if(ok(car.x,ny)){car.y=ny;car.v*=.6;} else car.v*=-0.3;
    // traffic follows the roads and turns at corners
    for(const c of traffic){
      const tx=Math.floor(c.x/TS),ty=Math.floor(c.y/TS),cx=tx*TS+TS/2,cy=ty*TS+TS/2;
      const near=Math.abs(c.x-cx)<c.sp*dt+0.5&&Math.abs(c.y-cy)<c.sp*dt+0.5;
      if(near&&(c.lt!==tx+","+ty)){c.lt=tx+","+ty;c.x=cx;c.y=cy;
        const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!(dx===-c.dx&&dy===-c.dy)&&at(cx+dx*TS,cy+dy*TS)===1);
        if(opts.length&&(Math.random()<.35||!opts.some(([dx,dy])=>dx===c.dx&&dy===c.dy))){const o=opts[Math.floor(Math.random()*opts.length)];c.dx=o[0];c.dy=o[1];}
        else if(!opts.length){c.dx=-c.dx;c.dy=-c.dy;}}
      c.x+=c.dx*c.sp*dt;c.y+=c.dy*c.sp*dt;
      if(flash<=0&&Math.hypot(c.x-car.x,c.y-car.y)<22){hits++;flash=1.5;car.v*=-0.4;banner=1.2;
        if(hits>=3){api.lose();return;}}
    }
    for(const k of coins) if(k.alive&&Math.hypot(k.x-car.x,k.y-car.y)<22){k.alive=false;api.add(5);}
    if(coins.every(k=>!k.alive)) coins.forEach(k=>{Object.assign(k,spot());k.alive=true;});
    const tgt=job.stage==="pickup"?job.p:job.d;
    if(Math.hypot(tgt.x-car.x,tgt.y-car.y)<30){
      if(job.stage==="pickup"){job.stage="drop";job.t=0;}
      else {const bonus=Math.max(0,Math.round(60-job.t))*3;delivPts=100+bonus;api.add(delivPts);newJob();deliv=1.6;}
    }
    cam={x:clamp(car.x-W/2,0,N*TS-W),y:clamp(car.y-H/2,0,N*TS-H)};
  }
  function draw(g){
    if(!cam) cam={x:clamp(car.x-W/2,0,N*TS-W),y:clamp(car.y-H/2,0,N*TS-H)};
    g.fillStyle="#1a1530";g.fillRect(0,0,W,H);
    g.save();g.translate(-Math.round(cam.x),-Math.round(cam.y));
    const x0=Math.floor(cam.x/TS),y0=Math.floor(cam.y/TS);
    for(let y=y0;y<=y0+H/TS+1&&y<N;y++)for(let x=x0;x<=x0+W/TS+1&&x<N;x++){
      const v=map[y][x],X=x*TS,Y=y*TS;
      if(v===1){g.fillStyle="#2b2442";g.fillRect(X,Y,TS,TS);
        if((x%7===1)&&!(y%7===1||y%7===2)){g.fillStyle="#ffd23f";for(let k=4;k<TS;k+=16)g.fillRect(X+TS-2,Y+k,3,8);}
        if((y%7===1)&&!(x%7===1||x%7===2)){g.fillStyle="#ffd23f";for(let k=4;k<TS;k+=16)g.fillRect(X+k,Y+TS-2,8,3);}}
      else if(v===0){g.fillStyle="#241d3d";g.fillRect(X,Y,TS,TS);g.fillStyle=bcol[y][x];g.fillRect(X+4,Y+4,TS-8,TS-8);
        g.fillStyle="rgba(0,0,0,.25)";g.fillRect(X+4,Y+TS-12,TS-8,8);g.fillStyle="rgba(255,255,255,.55)";for(let i=0;i<3;i++)g.fillRect(X+10+i*11,Y+12,6,6);}
      else if(v===2){g.fillStyle="#2f6b45";g.fillRect(X,Y,TS,TS);if((x+y)%2===0){g.fillStyle="#7a5a2c";g.fillRect(X+22,Y+20,4,18);g.fillStyle="#4fbf6a";for(let a=0;a<5;a++){g.save();g.translate(X+24,Y+20);g.rotate(a*1.25+.3);g.fillRect(0,-2,14,4);g.restore();}}}
      else if(v===3){g.fillStyle="#1f6f8b";g.fillRect(X,Y,TS,TS);g.fillStyle="rgba(255,255,255,.18)";g.fillRect(X+((t*20+y*13)%TS),Y+10,10,2);}
      else if(v===4){g.fillStyle="#e9c98f";g.fillRect(X,Y,TS,TS);}
    }
    for(const k of coins)if(k.alive){g.fillStyle="#ffd23f";g.beginPath();g.arc(k.x,k.y,6+Math.sin(t*6+k.x)*1,0,7);g.fill();}
    const tgt=job.stage==="pickup"?job.p:job.d, tc=job.stage==="pickup"?"#3fe0ff":"#86f56a";
    g.strokeStyle=tc;g.lineWidth=4;g.beginPath();g.arc(tgt.x,tgt.y,20+Math.sin(t*5)*4,0,7);g.stroke();
    g.fillStyle=tc;g.font="bold 12px Atkinson Hyperlegible, sans-serif";g.textAlign="center";g.fillText(job.stage==="pickup"?"PICK UP":"DROP OFF",tgt.x,tgt.y-30);
    for(const c of traffic){g.save();g.translate(c.x,c.y);g.rotate(Math.atan2(c.dy,c.dx));g.fillStyle=c.col;roundRect(g,-12,-7,24,14,4);g.fill();g.fillStyle="rgba(0,0,0,.45)";g.fillRect(2,-5,6,10);g.restore();}
    if(!(flash>0&&Math.floor(t*12)%2)){g.save();g.translate(car.x,car.y);g.rotate(car.a);g.fillStyle="#ff4fa3";roundRect(g,-14,-8,28,16,5);g.fill();
      g.fillStyle="#1a1530";g.fillRect(3,-6,7,12);g.fillStyle="#ffe7b8";g.fillRect(12,-7,3,4);g.fillRect(12,3,3,4);g.restore();}
    g.restore();
    // arrow toward the target
    const dx=tgt.x-car.x,dy=tgt.y-car.y,d=Math.hypot(dx,dy);
    if(d>200){const ang=Math.atan2(dy,dx),ax=W/2+Math.cos(ang)*170,ay=H/2+Math.sin(ang)*150;g.save();g.translate(ax,ay);g.rotate(ang);g.fillStyle=tc;g.beginPath();g.moveTo(16,0);g.lineTo(-10,-10);g.lineTo(-10,10);g.fill();g.restore();}
    // minimap
    const ms=2.4,mx=W-N*ms-10,my=10;g.fillStyle="rgba(10,8,26,.75)";g.fillRect(mx-4,my-4,N*ms+8,N*ms+8);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const v=map[y][x];if(v===1){g.fillStyle="#5d567a";g.fillRect(mx+x*ms,my+y*ms,ms,ms);}else if(v===3){g.fillStyle="#1f6f8b";g.fillRect(mx+x*ms,my+y*ms,ms,ms);}}
    g.fillStyle=tc;g.fillRect(mx+tgt.x/TS*ms-2,my+tgt.y/TS*ms-2,5,5);g.fillStyle="#ff4fa3";g.fillRect(mx+car.x/TS*ms-2,my+car.y/TS*ms-2,5,5);
    g.fillStyle="rgba(10,8,26,.78)";roundRect(g,6,6,300,46,8);g.fill();
    g.textAlign="left";g.fillStyle=tc;g.font="13px Silkscreen, monospace";g.fillText(job.stage==="pickup"?"GO TO THE BLUE PICK-UP":"DELIVER TO THE GREEN DROP-OFF",12,24);
    g.fillStyle="#ff6170";g.fillText("DENTS "+"■".repeat(hits)+"□".repeat(Math.max(0,3-hits)),12,42);
    if(banner>0){g.textAlign="center";g.font="28px Silkscreen, monospace";g.fillStyle="#ff6170";g.fillText("BUMP! WATCH THE TRAFFIC",W/2,H-40);}
    if(deliv>0){g.textAlign="center";g.font="28px Silkscreen, monospace";g.fillStyle="#86f56a";g.fillText("DELIVERED! +"+delivPts,W/2,H-40);}
  }
  return {reset,startLife,update,draw,hint:"Up to drive, Down to brake or back up, Left/Right to steer. Pick up at the blue circle, deliver to the green one. Grab coins. Three bumps with traffic end the round."};
}

function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function star(g,x,y,R,r,c){g.fillStyle=c;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}
export function bigText(g,s,c){g.textAlign="center";g.font="40px Silkscreen, monospace";g.lineWidth=6;g.strokeStyle="#07061a";g.strokeText(s,W/2,H/2);g.fillStyle=c;g.fillText(s,W/2,H/2);}

export const GAMES={
  maze:{name:"Maze Muncher",desc:"Clear the maze. Dodge the bugs.",color:"var(--yellow)",make:MazeGame},
  rush:{name:"Ring Rush",desc:"Run fast, jump gaps, grab rings.",color:"var(--pink)",make:RunnerGame},
  stack:{name:"Block Stack",desc:"Drop blocks and clear lines.",color:"var(--violet)",make:StackGame},
  snake:{name:"Snake",desc:"Eat, grow, don't bite yourself.",color:"var(--lime)",make:SnakeGame},
  brick:{name:"Brick Breaker",desc:"Bounce the ball, smash bricks.",color:"var(--orange)",make:BrickGame},
  hop:{name:"Sproutish",desc:"Hop through garden levels. Reach the watering can.",color:"var(--cyan)",make:api=>HopGame(api,"sprout")},
  rare:{name:"Rare Find",desc:"Name something that fits. Rare answers score big.",color:"var(--yellow)",make:RareGame},
  word:{name:"Letter Lock",desc:"Crack the five-letter word in six guesses.",color:"var(--lime)",make:WordGame},
  drive:{name:"Sunset Drive",desc:"Cruise a neon city and make deliveries.",color:"var(--pink)",make:DriveGame}
};

