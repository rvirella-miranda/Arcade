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

function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function star(g,x,y,R,r,c){g.fillStyle=c;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}
export function bigText(g,s,c){g.textAlign="center";g.font="40px Silkscreen, monospace";g.lineWidth=6;g.strokeStyle="#07061a";g.strokeText(s,W/2,H/2);g.fillStyle=c;g.fillText(s,W/2,H/2);}

export const GAMES={
  maze:{name:"Maze Muncher",desc:"Clear the maze. Dodge the bugs.",color:"var(--yellow)",make:MazeGame},
  rush:{name:"Ring Rush",desc:"Run fast, jump gaps, grab rings.",color:"var(--pink)",make:RunnerGame},
  stack:{name:"Block Stack",desc:"Drop blocks and clear lines.",color:"var(--violet)",make:StackGame},
  snake:{name:"Snake",desc:"Eat, grow, don't bite yourself.",color:"var(--lime)",make:SnakeGame},
  brick:{name:"Brick Breaker",desc:"Bounce the ball, smash bricks.",color:"var(--orange)",make:BrickGame}
};

