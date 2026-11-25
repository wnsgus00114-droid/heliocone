"use strict";
(() => {
  const root=document.getElementById("entry");
  const canvas=document.getElementById("solar-scene");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer=matchMedia("(hover: hover) and (pointer: fine)");
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx){root.classList.add("scene-unavailable");return;}
  let width=0,height=0,dpr=1,frame=0,active=false;
  const time=17.5;
  let targetX=0,targetY=0,lookX=0,lookY=0;
  let lastFrame=0,motionElapsed=0,intro=reduced.matches?1:0;
  const easeOut=t=>1-Math.pow(1-t,3);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const rgb=(a,b,t=0)=>`rgb(${a.map((v,i)=>Math.round(mix(v,b[i],t))).join(",")})`;
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=v=>{const length=Math.hypot(...v);return v.map(x=>x/length);};
  const palette=()=>{
    const warmth=clamp((Math.abs(time-12)-1.5)/4.5,0,1);
    return {warmth,sky:rgb([20,55,65],[26,37,46],warmth),horizon:rgb([124,177,166],[226,146,78],warmth),ground:rgb([33,63,57],[62,64,43],warmth)};
  };
  function draw(){
    if(!width||!height)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const mobile=width<768,{warmth,sky,horizon,ground}=palette();
    const phase=motionElapsed/8000;
    const orbit=reduced.matches?0:Math.sin(motionElapsed/14000)*.055;
    const view=.12+orbit;
    const skyFill=ctx.createLinearGradient(0,0,0,height);
    skyFill.addColorStop(0,sky);skyFill.addColorStop(.34,rgb([41,83,88],[101,88,74],warmth));skyFill.addColorStop(.59,horizon);skyFill.addColorStop(1,ground);
    ctx.fillStyle=skyFill;ctx.fillRect(0,0,width,height);
    const sunX=width*(mobile?.83:.79)+Math.sin((time-12)*.14)*width*.13;
    const sunY=height*(mobile?.41:.25)+warmth*height*.13;
    const sunRadius=mobile?48:Math.min(88,width*.066);
    const glow=ctx.createRadialGradient(sunX,sunY,sunRadius*.5,sunX,sunY,width*.43);
    glow.addColorStop(0,'rgba(255,210,125,.75)');glow.addColorStop(.2,'rgba(255,188,91,.25)');glow.addColorStop(.6,'rgba(240,145,68,.07)');glow.addColorStop(1,'rgba(255,190,104,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    // Broad, quiet shafts of light connect the sun to the physical array.
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let ray=0;ray<5;ray++){
      const beam=ctx.createLinearGradient(sunX,sunY,sunX-width*.4+ray*width*.14,height*.9);
      beam.addColorStop(0,'rgba(255,210,144,.035)');beam.addColorStop(.6,'rgba(255,221,162,.07)');beam.addColorStop(1,'rgba(255,213,145,0)');
      ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(sunX-15,sunY);ctx.lineTo(sunX-width*.55+ray*width*.19,height*.91);ctx.lineTo(sunX-width*.36+ray*width*.19,height*.91);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    const disc=ctx.createRadialGradient(sunX-15,sunY-17,5,sunX,sunY,sunRadius);
    disc.addColorStop(0,'#fff5ca');disc.addColorStop(.75,'#ffdb8d');disc.addColorStop(1,'#f7bc69');
    ctx.fillStyle=disc;ctx.shadowColor='rgba(255,194,98,.5)';ctx.shadowBlur=34;
    ctx.beginPath();ctx.arc(sunX,sunY,sunRadius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    const horizonY=height*(mobile?.58:.54);
    for(let layer=0;layer<3;layer++){
      ctx.beginPath();ctx.moveTo(0,height);
      for(let x=0;x<=width+10;x+=10){
        const t=x/width;
        const y=horizonY+layer*22+(Math.sin(t*8+layer*.9)*11+Math.sin(t*18+layer*2)*4)*(layer+1)*.5;
        ctx.lineTo(x,y);
      }
      ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle=rgb([66-layer*12,106-layer*13,91-layer*11],[112-layer*19,109-layer*15,76-layer*11],warmth);ctx.fill();
    }
    const groundFade=ctx.createLinearGradient(0,horizonY,0,height);
    groundFade.addColorStop(0,'rgba(38,68,56,0)');groundFade.addColorStop(1,ground);
    ctx.fillStyle=groundFade;ctx.fillRect(0,horizonY,width,height-horizonY);
    const camera=[mix(16,6,view)+lookX*3.8,mix(13,19,view)+lookY*2.4,mix(19,26,view)];
    const forward=norm(subtract([0,0,0],camera)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
    const centerX=width*(mobile?.58:.745),centerY=height*(mobile?.73:.57);
    const focal=mobile?width*1.07:Math.min(width*.69,height*1.3);
    function project(v){const q=subtract(v,camera),depth=dot(q,forward);return [centerX+dot(q,right)*focal/depth,centerY-dot(q,up)*focal/depth,depth];}
    function polygon(points,fill,stroke,lineWidth=1){
      const p=points.map(project);ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
    }
    function line(a,b,color,lineWidth=1){const p=project(a),q=project(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
    // A surveyed pad, cable channels, and mounting legs anchor the scene in its subject.
    polygon([[-10,-.02,-8],[10,-.02,-8],[10,-.02,8],[-10,-.02,8]],rgb([41,72,63],[75,77,50],warmth),'rgba(193,202,139,.24)',.7);
    for(let g=-9;g<=9;g+=3){line([g,0,-8],[g,0,8],'rgba(177,196,139,.12)',.7);}
    for(let g=-8;g<=8;g+=4){line([-10,0,g],[10,0,g],'rgba(177,196,139,.12)',.7);}
    const modules=[];
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const x=(col-2.5)*2.75,z=(row-1)*4.65;
      modules.push({x,z,row,col,depth:project([x,1,z])[2]});
    }
    modules.sort((a,b)=>b.depth-a.depth);
    const sunShift=(time-12)*.5;
    modules.forEach(({x,z})=>polygon([[x-1.25+sunShift,0,z-1.75],[x+1.25+sunShift,0,z-1.75],[x+1.8+sunShift,0,z+2.2],[x-.7+sunShift,0,z+2.2]],'rgba(4,18,17,.36)'));
    for(const m of modules){
      const {x,z,col,row}=m;
      const arrival=easeOut(clamp((intro-(row*.11+col*.035))/.55,0,1));
      const lift=(1-arrival)*3.3;
      const point=(u,v,dy=0)=>[x+u*2.38,1.08-v*.35+dy+lift,z+v*1.85];
      [-.75,.75].forEach(u=>{line([x+u,0,z-.9],[x+u,1.25,z-.9],'#637264',2);line([x+u,0,z+1],[x+u,.83,z+1],'#667363',2);line([x+u,.02,z+1],[x+u,1.25,z-.9],'rgba(100,113,94,.6)',1);});
      polygon([point(-.5,-1,-.11),point(.5,-1,-.11),point(.5,1,-.11),point(-.5,1,-.11)],'#697b72','#6d7e72',1);
      polygon([point(-.5,-1),point(.5,-1),point(.5,1),point(-.5,1)],'#102e35','#899b83',1.2);
      const sweep=phase%1;
      const specular=Math.max(0,1-Math.abs((col*.12+row*.14)-(sweep*1.8-.3))/.13);
      const glint=clamp(.24+(.5-col*.09)+(time-12)*.023+specular*.36,0,.94);
      for(let r=0;r<10;r++)for(let c=0;c<5;c++){
        const u=-.48+c*.192,v=-.97+r*.194;
        const shimmer=clamp(glint+(r/10)*.12+((r+c)%3)*.012,0,.8);
        const base=warmth>.55?[20,49,52]:[13,45,57];
        const reflection=warmth>.55?[193,178,105]:[132,190,186];
        polygon([point(u,v),point(u+.179,v),point(u+.179,v+.18),point(u,v+.18)],rgb(base,reflection,shimmer));
        line(point(u+.06,v),point(u+.06,v+.18),'rgba(172,199,181,.13)',.35);
        line(point(u+.12,v),point(u+.12,v+.18),'rgba(172,199,181,.13)',.35);
      }
      line(point(-.5,-1),point(.5,-1),'rgba(241,223,160,.95)',1.5);
      line(point(.5,-1),point(.5,1),'rgba(210,224,192,.7)',1.25);
      line(point(-.5,1),point(.5,1),'rgba(29,53,40,.9)',1.5);
      if(specular>.28){
        ctx.save();ctx.shadowColor='rgba(255,221,142,.65)';ctx.shadowBlur=10;
        line(point(-.5,-1),point(.5,-1),`rgba(255,235,170,${specular*.75})`,1.8);ctx.restore();
      }
      if(col===4&&row===1){polygon([point(-.45,-.94,.004),point(-.12,-.94,.004),point(.38,.94,.004),point(.05,.94,.004)],`rgba(226,238,211,${.09+warmth*.04})`);}
    }
    // Bright survey traces, subtle airborne flecks, and a dark foreground establish depth.
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let lane=0;lane<3;lane++){
      const z=(lane-1)*4.65+2.1;
      line([-9,0.02,z],[9,0.02,z],'rgba(240,203,102,.2)',.8);
      const progress=(phase+lane*.2)%1,head=-9+progress*18;
      const pulseOpacity=Math.min(progress*12,(1-progress)*12,1)*.85;
      line([Math.max(-9,head-1),0.025,z],[head,0.025,z],`rgba(255,228,143,${pulseOpacity})`,1.5);
    }
    for(let i=0;i<(mobile?10:24);i++){
      const px=width*(.46+((i*.239)%1)*.55)+Math.sin(phase*4+i)*4;
      const drift=(i*.173+phase*.035)%1;
      const py=height*(.35+drift*.36),fade=Math.min(drift*12,(1-drift)*12,1);
      ctx.fillStyle=`rgba(255,225,164,${(.11+(i%4)*.035)*fade})`;ctx.beginPath();ctx.arc(px,py,i%4===0?1.7:.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    const wash=ctx.createLinearGradient(0,height*.73,0,height);
    wash.addColorStop(0,'rgba(13,31,28,0)');wash.addColorStop(1,'rgba(10,27,25,.88)');
    ctx.fillStyle=wash;ctx.fillRect(0,height*.73,width,height*.27);
    const side=ctx.createLinearGradient(0,0,width*.7,0);side.addColorStop(0,'rgba(8,25,27,.55)');side.addColorStop(1,'rgba(8,25,27,0)');ctx.fillStyle=side;ctx.fillRect(0,0,width,height);
  }

  function renderFrame(now){
    frame=0;if(!active||document.hidden)return;
    // Keep the ambient scene moving at a restrained 30 fps, without replaying the entrance.
    if(lastFrame&&now-lastFrame<32){schedule();return;}
    if(!reduced.matches){
      motionElapsed+=lastFrame?Math.min(now-lastFrame,100):0;
      intro=Math.min(1,motionElapsed/1500);
    }
    lastFrame=now;
    lookX=reduced.matches?0:mix(lookX,targetX,.16);
    lookY=reduced.matches?0:mix(lookY,targetY,.16);
    draw();
    if(!reduced.matches)schedule();
  }
  function schedule(){if(active&&!document.hidden&&!frame)frame=requestAnimationFrame(renderFrame);}
  function resize(){
    if(!active)return;
    const box=root.getBoundingClientRect();width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);schedule();
  }
  root.addEventListener('pointermove',event=>{if(!active||!finePointer.matches||reduced.matches)return;const rect=root.getBoundingClientRect();targetX=(event.clientX-rect.left)/width-.5;targetY=(event.clientY-rect.top)/height-.5;schedule();});
  root.addEventListener('pointerleave',()=>{targetX=0;targetY=0;schedule();});
  function setActive(value){active=value;lastFrame=0;if(active)resize();else if(frame){cancelAnimationFrame(frame);frame=0;}}
  new ResizeObserver(resize).observe(root);
  document.addEventListener('heliocone:view',event=>setActive(event.detail==='home'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;lastFrame=0;}else schedule();});
  reduced.addEventListener('change',()=>{targetX=0;targetY=0;lastFrame=0;if(reduced.matches){intro=1;}schedule();});
  setActive(document.body.dataset.view==='home');
})();
