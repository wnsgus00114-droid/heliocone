"use strict";
(() => {
  const root=document.getElementById("entry");
  const canvas=document.getElementById("solar-scene");
  const slider=document.getElementById("light-time");
  const output=document.getElementById("light-value");
  const viewButton=document.getElementById("scene-view");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer=matchMedia("(hover: hover) and (pointer: fine)");
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx){root.classList.add("scene-unavailable");return;}
  let width=0,height=0,dpr=1,frame=0,active=false;
  let targetTime=14,time=14,targetView=0,view=0,targetX=0,targetY=0,lookX=0,lookY=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const rgb=(a,b,t=0)=>`rgb(${a.map((v,i)=>Math.round(mix(v,b[i],t))).join(",")})`;
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>{const length=Math.hypot(...v);return v.map(x=>x/length);};
  const palette=()=>{
    const warmth=clamp((Math.abs(time-12)-1.5)/4.5,0,1);
    return {warmth,sky:rgb([216,229,227],[181,191,182],warmth),horizon:rgb([240,241,220],[246,205,164],warmth),ground:rgb([180,198,171],[188,175,139],warmth)};
  };
  function draw(){
    if(!width||!height)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const mobile=width<768,{warmth,sky,horizon,ground}=palette();
    const skyFill=ctx.createLinearGradient(0,0,0,height);
    skyFill.addColorStop(0,sky);skyFill.addColorStop(.54,horizon);skyFill.addColorStop(1,ground);
    ctx.fillStyle=skyFill;ctx.fillRect(0,0,width,height);
    const sunX=width*(mobile?.83:.8)+Math.sin((time-12)*.14)*width*.13;
    const sunY=height*(mobile?.41:.25)+warmth*height*.13;
    const glow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,width*.37);
    glow.addColorStop(0,`rgba(255,245,206,${mix(.6,.7,warmth)})`);glow.addColorStop(.28,'rgba(255,241,207,.21)');glow.addColorStop(1,'rgba(255,244,216,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=rgb([249,247,220],[255,226,170],warmth);
    ctx.beginPath();ctx.arc(sunX,sunY,mobile?30:43,0,Math.PI*2);ctx.fill();
    const horizonY=height*(mobile?.58:.54);
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();ctx.moveTo(0,height);
      for(let x=0;x<=width+10;x+=10){
        const t=x/width;
        const y=horizonY+layer*22+(Math.sin(t*8+layer*.9)*11+Math.sin(t*18+layer*2)*4)*(layer+1)*.5;
        ctx.lineTo(x,y);
      }
      ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle=rgb([202-layer*7,215-layer*6,192-layer*7],[206-layer*9,195-layer*8,163-layer*8],warmth);ctx.fill();
    }
    const groundFade=ctx.createLinearGradient(0,horizonY,0,height);
    groundFade.addColorStop(0,'rgba(188,204,173,0)');groundFade.addColorStop(1,ground);
    ctx.fillStyle=groundFade;ctx.fillRect(0,horizonY,width,height-horizonY);
    const camera=[mix(16,6,view)+lookX*1.8,mix(13,19,view)+lookY,mix(19,26,view)];
    const forward=norm(subtract([0,0,0],camera)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
    const centerX=width*(mobile?.58:.745),centerY=height*(mobile?.62:.57);
    const focal=mobile?width*1.07:Math.min(width*.69,height*1.3);
    function project(v){const q=subtract(v,camera),depth=dot(q,forward);return [centerX+dot(q,right)*focal/depth,centerY-dot(q,up)*focal/depth,depth];}
    function polygon(points,fill,stroke,lineWidth=1){
      const p=points.map(project);ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
    }
    function line(a,b,color,lineWidth=1){const p=project(a),q=project(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
    // A surveyed pad, cable channels, and mounting legs anchor the scene in its subject.
    polygon([[-10,-.02,-8],[10,-.02,-8],[10,-.02,8],[-10,-.02,8]],rgb([187,200,176],[196,182,149],warmth),'rgba(101,125,95,.22)',.7);
    for(let g=-9;g<=9;g+=3){line([g,0,-8],[g,0,8],'rgba(91,113,80,.1)',.7);}
    for(let g=-8;g<=8;g+=4){line([-10,0,g],[10,0,g],'rgba(91,113,80,.1)',.7);}
    const modules=[];
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const x=(col-2.5)*2.75,z=(row-1)*4.65;
      modules.push({x,z,row,col,depth:project([x,1,z])[2]});
    }
    modules.sort((a,b)=>b.depth-a.depth);
    const sunShift=(time-12)*.5;
    modules.forEach(({x,z})=>polygon([[x-1.25+sunShift,0,z-1.75],[x+1.25+sunShift,0,z-1.75],[x+1.8+sunShift,0,z+2.2],[x-.7+sunShift,0,z+2.2]],'rgba(61,76,52,.13)'));
    for(const m of modules){
      const {x,z,col,row}=m;
      const point=(u,v,dy=0)=>[x+u*2.38,1.08-v*.35+dy,z+v*1.85];
      [-.75,.75].forEach(u=>{line([x+u,0,z-.9],[x+u,1.25,z-.9],'#637264',2);line([x+u,0,z+1],[x+u,.83,z+1],'#667363',2);line([x+u,.02,z+1],[x+u,1.25,z-.9],'rgba(100,113,94,.6)',1);});
      polygon([point(-.5,-1,-.11),point(.5,-1,-.11),point(.5,1,-.11),point(-.5,1,-.11)],'#697b72','#6d7e72',1);
      polygon([point(-.5,-1),point(.5,-1),point(.5,1),point(-.5,1)],'#1f393a','#9ead9b',1.2);
      const glint=clamp(.2+(.5-col*.09)+(time-12)*.023,0,.65);
      for(let r=0;r<10;r++)for(let c=0;c<5;c++){
        const u=-.48+c*.192,v=-.97+r*.194;
        const shimmer=clamp(glint+(r/10)*.12+((r+c)%3)*.012,0,.8);
        const base=warmth>.55?[38,58,51]:[27,57,63];
        const reflection=warmth>.55?[120,139,111]:[103,141,145];
        polygon([point(u,v),point(u+.179,v),point(u+.179,v+.18),point(u,v+.18)],rgb(base,reflection,shimmer));
        line(point(u+.06,v),point(u+.06,v+.18),'rgba(172,199,181,.13)',.35);
        line(point(u+.12,v),point(u+.12,v+.18),'rgba(172,199,181,.13)',.35);
      }
      line(point(-.5,-1),point(.5,-1),'rgba(225,234,211,.85)',1.25);
      line(point(.5,-1),point(.5,1),'rgba(219,232,209,.65)',1.15);
      line(point(-.5,1),point(.5,1),'rgba(29,53,40,.9)',1.5);
      if(col===4&&row===1){polygon([point(-.45,-.94,.004),point(-.12,-.94,.004),point(.38,.94,.004),point(.05,.94,.004)],`rgba(226,238,211,${.09+warmth*.04})`);}
    }
    // Soft atmosphere, kept away from text and controls.
    const wash=ctx.createLinearGradient(0,height*.79,0,height);
    wash.addColorStop(0,'rgba(199,213,183,0)');wash.addColorStop(1,rgb([205,218,191],[215,202,169],warmth));
    ctx.fillStyle=wash;ctx.fillRect(0,height*.79,width,height*.21);
  }
  function renderFrame(){
    frame=0;if(!active||document.hidden)return;
    const immediate=reduced.matches;
    time=immediate?targetTime:mix(time,targetTime,.12);
    view=immediate?targetView:mix(view,targetView,.09);
    lookX=immediate?0:mix(lookX,targetX,.1);lookY=immediate?0:mix(lookY,targetY,.1);
    draw();
    if(Math.abs(time-targetTime)>.005||Math.abs(view-targetView)>.002||Math.abs(lookX-targetX)>.003||Math.abs(lookY-targetY)>.003)schedule();
  }
  function schedule(){if(active&&!document.hidden&&!frame)frame=requestAnimationFrame(renderFrame);}
  function resize(){
    if(!active)return;
    const box=root.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);schedule();
  }
  function setTime(value){
    targetTime=clamp(Number(value),6,18);slider.value=targetTime;
    const minutes=Math.round(targetTime*60),display=`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
    output.value=display;output.textContent=display;
    slider.setAttribute("aria-valuetext",`${display}, 가상 태양광 장면`);
    root.querySelectorAll('[data-light]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.light)===targetTime)));
    schedule();
  }
  slider.addEventListener('input',()=>setTime(slider.value));
  root.querySelectorAll('[data-light]').forEach(button=>button.addEventListener('click',()=>setTime(button.dataset.light)));
  viewButton.addEventListener('click',()=>{targetView=targetView?0:1;viewButton.setAttribute('aria-pressed',String(Boolean(targetView)));viewButton.querySelector('span:last-child').textContent=targetView?'기본 시점':'시점 전환';schedule();});
  root.addEventListener('pointermove',event=>{if(!active||!finePointer.matches||reduced.matches)return;const rect=root.getBoundingClientRect();targetX=(event.clientX-rect.left)/width-.5;targetY=(event.clientY-rect.top)/height-.5;schedule();});
  root.addEventListener('pointerleave',()=>{targetX=0;targetY=0;schedule();});
  function setActive(value){active=value;if(active)resize();else if(frame){cancelAnimationFrame(frame);frame=0;}}
  new ResizeObserver(resize).observe(root);
  document.addEventListener('heliocone:view',event=>setActive(event.detail==='home'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else schedule();});
  reduced.addEventListener('change',()=>{targetX=0;targetY=0;schedule();});
  setActive(document.body.dataset.view==='home');
})();
