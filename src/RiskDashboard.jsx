import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Shield, TrendingDown, TrendingUp, Target, Activity, Zap,
  Flame, Minus, Plus, ChevronDown, Eye, AlertTriangle,
  CheckCircle2, Rocket, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const E0=87500,K0=0.33,SMIN=20000,SMAX=10000000;
const LOG_MIN=Math.log10(SMIN),LOG_MAX=Math.log10(SMAX);
const fmt=v=>{if(!isFinite(v))return'\u2014';if(v<1)return'0';const a=Math.abs(v);if(a>=1e12)return`${+(v/1e12).toFixed(1)}T`;if(a>=1e9)return`${+(v/1e9).toFixed(1)}B`;if(a>=1e6)return`${+(v/1e6).toFixed(2)}M`;if(a>=1e3)return`${+(v/1e3).toFixed(a%1000===0?0:1)}K`;return`${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')}`;};
const rN=e=>{if(e<=20000)return 1;if(e<=50000)return 1-.5*((e-20000)/30000);if(e<=87500)return.5-(.5-K0)*((e-50000)/37500);return K0*Math.pow(E0/e,2/3);};
const rO=e=>Math.min(1,K0*Math.pow(E0/Math.max(e,1),1/3));
const rF=()=>K0;
const r$N=e=>rN(e)*e;
const lg=v=>Math.log10(Math.max(v,1));
const unlg=v=>Math.pow(10,v);
const s2e=s=>Math.round(unlg(LOG_MIN+(s/1000)*(LOG_MAX-LOG_MIN)));
const e2s=e=>((Math.log10(Math.max(e,SMIN))-LOG_MIN)/(LOG_MAX-LOG_MIN))*1000;
const mb32=seed=>{let s=seed|0;return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296;};};
const ptile=(arr,p)=>{if(!arr.length)return 0;const s=[...arr].sort((a,b)=>a-b),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?s[lo]:s[lo]+(i-lo)*(s[hi]-s[lo]);};
const geoGrowth=(r,wr,rr)=>(r>=1?-Infinity:r<=0?0:wr*Math.log(1+r*rr)+(1-wr)*Math.log(1-r));
const lossesToWipe=e=>{let q=e;for(let n=1;n<=200;n++){q=q*(1-rN(q));if(q<=1)return n;}return 200;};
const calcStreak=(e,n,win,rr)=>{let q=e;for(let i=0;i<n;i++){q=win?q*(1+rN(q)*rr):q*(1-rN(q));q=Math.max(q,1);}return q;};
const fmtGeo=g=>(!isFinite(g)||g<-10)?'\u2620 Wipe':`${((Math.exp(g)-1)*100)>=0?'+':''}${((Math.exp(g)-1)*100).toFixed(1)}%`;

const LXT=[20e3,100e3,250e3,500e3,1e6,2.5e6,5e6,10e6].map(v=>lg(v));
const QK=[{v:20000,l:'$20K'},{v:87500,l:'$87.5K'},{v:250000,l:'$250K'},{v:1000000,l:'$1M'},{v:5000000,l:'$5M'},{v:10000000,l:'$10M'}];
const FM=[{v:20000,l:'$20K',ph:'pre'},{v:50000,l:'$50K',ph:'pre'},{v:87500,l:'$87.5K',ph:'anchor'},{v:100000,l:'$100K',ph:'model'},{v:250000,l:'$250K',ph:'model'},{v:500000,l:'$500K',ph:'model'},{v:1000000,l:'$1M',ph:'model'},{v:3000000,l:'$3M',ph:'model'},{v:5000000,l:'$5M',ph:'model'},{v:10000000,l:'$10M',ph:'model'}];
const MILES=[{v:100000,l:'$100K'},{v:250000,l:'$250K'},{v:500000,l:'$500K'},{v:1000000,l:'$1M'},{v:4000000,l:'$4M'},{v:10000000,l:'$10M'}];
const TT={backgroundColor:'#0f172a',border:'1px solid #1e293b',borderRadius:12,fontSize:12,padding:'10px 14px',color:'#f1f5f9',fontFamily:'ui-monospace, monospace'};
const AX={fontSize:10,fill:'#64748b',fontFamily:'ui-monospace, monospace'};
const cm={top:10,right:10,left:-20,bottom:0};

const GPS_Z=[
  {eq:20000,l:'$20K',s:'1-Loss Wipe',c:'#ef4444',tc:'text-rose-400'},
  {eq:50000,l:'$50K',s:'Danger Zone',c:'#eab308',tc:'text-amber-400'},
  {eq:87500,l:'$87.5K',s:'Basecamp',c:'#10b981',tc:'text-emerald-400'},
  {eq:100000,l:'$100K',s:'Goal',c:'#22c55e',tc:'text-emerald-300'}
];

const GPSJourney=({equity,compact=false})=>{
  const g=useMemo(()=>{
    const W=compact?120:260,H=compact?180:380;
    const CX=compact?W/2:W*0.38,PAD=12,IH=H-PAD*2;
    const pfx=compact?'gc':'gf';
    const eqToT=eq=>Math.max(0,Math.min(1,(lg(Math.max(eq,SMIN))-lg(20000))/(lg(110000)-lg(20000))));
    const youT=eqToT(equity),youY=PAD+(1-youT)*IH;
    const hw=t=>{
      const sc=compact?0.55:1,BN=0.54;
      const ss=s=>3*s*s-2*s*s*s;
      if(t<=BN){const s=t/BN;return(22-14*ss(s))*sc;}
      const s=(t-BN)/(1-BN);return(8+30*ss(s))*sc;
    };
    const N=80,L=[],R=[];
    for(let i=0;i<=N;i++){
      const t=i/N,y=PAD+(1-t)*IH,w=hw(t);
      L.push((CX-w).toFixed(1)+','+y.toFixed(1));
      R.unshift((CX+w).toFixed(1)+','+y.toFixed(1));
    }
    const poly=L.join(' ')+' '+R.join(' ');
    const youClr=equity<=35000?'#ef4444':equity<=65000?'#eab308':'#10b981';
    const zones=GPS_Z.map(z=>{const t=eqToT(z.eq);return{...z,zy:PAD+(1-t)*IH,zhw:hw(t)};});
    return{W,H,CX,PAD,pfx,youY,youClr,poly,L,R,zones};
  },[equity,compact]);
  return (
    <div className="relative mx-auto" style={{width:g.W,height:g.H}}>
      <svg width={g.W} height={g.H}>
        <defs>
          <linearGradient id={g.pfx+'f'} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity=".65"/>
            <stop offset="30%" stopColor="#eab308" stopOpacity=".45"/>
            <stop offset="65%" stopColor="#22c55e" stopOpacity=".35"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity=".25"/>
          </linearGradient>
          <linearGradient id={g.pfx+'e'} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="40%" stopColor="#eab308"/>
            <stop offset="70%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#10b981"/>
          </linearGradient>
          <filter id={g.pfx+'g'}>
            <feGaussianBlur stdDeviation={compact?4:6} result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id={g.pfx+'r'} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={g.youClr} stopOpacity=".5"/>
            <stop offset="100%" stopColor={g.youClr} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <polygon points={g.poly} fill={'url(#'+g.pfx+'f)'} filter={'url(#'+g.pfx+'g)'} opacity=".3"/>
        <polygon points={g.poly} fill={'url(#'+g.pfx+'f)'}/>
        <polyline points={g.L.join(' ')} fill="none" stroke={'url(#'+g.pfx+'e)'} strokeWidth="1" strokeOpacity=".35"/>
        <polyline points={g.R.join(' ')} fill="none" stroke={'url(#'+g.pfx+'e)'} strokeWidth="1" strokeOpacity=".35"/>
        <line x1={g.CX} y1={g.PAD} x2={g.CX} y2={g.H-g.PAD} stroke="white" strokeDasharray={compact?'4 6':'6 8'} strokeOpacity=".12"/>
        {g.zones.map((z,i)=>(
          <line key={i} x1={g.CX-z.zhw} y1={z.zy} x2={g.CX+z.zhw} y2={z.zy} stroke={z.c} strokeOpacity=".25" strokeDasharray="2 3"/>
        ))}
        <circle cx={g.CX} cy={g.youY} r={compact?18:28} fill={'url(#'+g.pfx+'r)'}/>
        <circle className="gps-pulse" cx={g.CX} cy={g.youY} r={compact?7:11} fill={g.youClr} filter={'url(#'+g.pfx+'g)'}/>
        <circle cx={g.CX} cy={g.youY} r={compact?3:4.5} fill="white"/>
      </svg>
      {!compact && (
        <div className="absolute inset-0 pointer-events-none font-mono">
          <motion.div
            className="absolute text-xs font-bold text-white"
            style={{left:g.CX-30}}
            animate={{top:g.youY-22}}
            transition={{type:'spring',stiffness:300,damping:25}}
          >YOU</motion.div>
          {g.zones.map((z,i)=>(
            <div key={i} className="absolute" style={{left:g.CX+z.zhw+10,top:z.zy-12}}>
              <div className={'text-sm font-bold '+z.tc}>{z.l}</div>
              <div className={'text-xs opacity-60 '+z.tc}>{z.s}</div>
            </div>
          ))}
        </div>
      )}
      {compact && (
        <motion.div
          className="absolute font-mono font-bold pointer-events-none text-white"
          style={{left:'50%',fontSize:9,transform:'translateX(-50%)'}}
          animate={{top:g.youY-14}}
          transition={{type:'spring',stiffness:300,damping:25}}
        >YOU</motion.div>
      )}
    </div>
  );
};

const Tip=({text})=>(
  <span className="group relative inline-flex items-center ml-1 cursor-help">
    <Info className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors"/>
    <span className="absolute bottom-full left-1/2 mb-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 p-2.5 z-50 pointer-events-none font-sans normal-case tracking-normal leading-relaxed" style={{transform:'translateX(-50%)'}}>
      {text}
      <span className="absolute top-full left-1/2 -mt-px border-4 border-transparent border-t-slate-800" style={{transform:'translateX(-50%)'}}/>
    </span>
  </span>
);

const ChartLegend=()=>(
  <div className="flex flex-wrap justify-center gap-5 mt-4">
    {[{c:'border-emerald-500',l:'\u2154 Power'},{c:'border-blue-500',l:'\u2153 Power'},{c:'border-amber-500 border-dashed',l:'Fixed 33%'}].map((x,i)=>(
      <div key={i} className="flex items-center gap-2">
        <div className={'w-5 h-0 border-t-2 '+x.c}/>
        <span className="text-xs text-slate-500 font-medium">{x.l}</span>
      </div>
    ))}
  </div>
);

const MetricCard=({label,value,sub,barColor,tip,children})=>(
  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 relative overflow-hidden flex flex-col justify-center">
    {barColor && <div className={'absolute top-0 left-0 w-1 h-full rounded-r '+barColor}/>}
    <div className="text-xs text-slate-500 font-medium mb-1 flex items-center">{label}{tip && <Tip text={tip}/>}</div>
    {children || (
      <>
        <div className={'text-2xl font-bold font-mono tracking-tight tabular-nums '+(value&&value.className?value.className:'text-slate-100')}>{value&&value.text?value.text:value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </>
    )}
  </div>
);

export default function RiskDashboard(){
  const [eq,setEq]=useState(87500);
  const [wr,setWr]=useState(60);
  const [rr,setRr]=useState(1.5);
  const [tab,setTab]=useState('milestones');
  const [showOrigin,setShowOrigin]=useState(false);
  const [eqInput,setEqInput]=useState('87,500');
  const [isEqFocused,setIsEqFocused]=useState(false);
  const [simSeed,setSimSeed]=useState(555);

  useEffect(()=>{if(!isEqFocused)setEqInput(fmt(eq).replace(',', ''));},[eq,isEqFocused]);
  const handleEqChange=e=>{const val=e.target.value.replace(/[^0-9]/g,'');setEqInput(val);const num=parseInt(val,10);if(!isNaN(num)&&num>0)setEq(Math.min(SMAX,Math.max(SMIN,num)));};
  const stepEq=dir=>setEq(prev=>Math.min(SMAX,Math.max(SMIN,prev+(dir*(prev>=1e6?100000:prev>=100000?10000:5000)))));

  const dEq=useDeferredValue(eq),dWr=useDeferredValue(wr),dRr=useDeferredValue(rr);
  const isCalc=eq!==dEq||wr!==dWr||rr!==dRr;
  const rp=rN(eq)*100,rd=r$N(eq),gain=rd*rr,ltw=lossesToWipe(eq);
  const d3=((eq-calcStreak(eq,3,false,rr))/eq)*100,d5=((eq-calcStreak(eq,5,false,rr))/eq)*100;
  const kellyPct=((wr/100*(1+rr)-1)/rr)*100,kellyMult=kellyPct>0?(rp/kellyPct):Infinity;
  const anchorPos=((lg(E0)-LOG_MIN)/(LOG_MAX-LOG_MIN))*100;
  const curPos=Math.max(2,Math.min(98,((lg(eq)-LOG_MIN)/(LOG_MAX-LOG_MIN))*100));
  const isPre=eq<E0*.95,isAnc=eq>=E0*.95&&eq<=E0*1.05;
  const zName=isPre?'Pre-Model':isAnc?'Anchor':'Formula Decay';
  const ZIcon=isPre?Flame:isAnc?Target:Shield;

  const hm=useMemo(()=>{
    const b=dRr,w=dWr/100,NP=500,NT=100;
    const sim=fn=>{const rand=mb32(42);return Array.from({length:NP},()=>{let e=dEq;const ea=[e];for(let t=0;t<NT;t++){const f=fn(e);e=rand()<w?e*(1+f*b):e*(1-f);e=Math.min(Math.max(e,1),1e15);ea.push(e);}return ea;});};
    const fp=sim(rF),op=sim(rO),np=sim(rN);
    const chart=[];for(let t=0;t<=NT;t+=2)chart.push({t,fl:lg(ptile(fp.map(p=>p[t]),.5)),ol:lg(ptile(op.map(p=>p[t]),.5)),nl:lg(ptile(np.map(p=>p[t]),.5))});
    const fT=fp.map(p=>p[NT]),nT=np.map(p=>p[NT]),oT=op.map(p=>p[NT]);
    const mdd=paths=>paths.map(ea=>{let pk=ea[0],mx=0;for(const e of ea){if(e>pk)pk=e;mx=Math.max(mx,(pk-e)/pk);}return mx;});
    const fMap=FM.map(m=>{const r=rN(m.v),drd=r*m.v,e1l=Math.max(1,m.v*(1-r)),e3l=calcStreak(m.v,3,false,dRr),e3w=calcStreak(m.v,3,true,dRr);return{...m,r,rd:drd,gd:drd*dRr,e1l,dd3:(m.v-e3l)/m.v*100,dd1:(m.v-e1l)/m.v*100,gu3:(e3w-m.v)/m.v*100,e3l,e3w,g:geoGrowth(r,w,dRr),ltw:lossesToWipe(m.v)};});
    const SP=2000,sr=mb32(777);let reached=0;
    for(let i=0;i<SP;i++){let ce=SMIN,alive=true;for(let t=0;t<200&&alive;t++){const cr=rN(ce);ce=sr()<w?ce*(1+cr*b):ce*(1-cr);ce=Math.max(ce,1);if(ce>=E0){reached++;alive=false;}if(ce<=1)alive=false;}}
    const rC=(nL,fn)=>{let e=dEq;for(let i=0;i<nL;i++)e*=1-fn(e);const tr=e,dd=(dEq-tr)/dEq*100;let rw=0,eq2=tr;while(eq2<dEq*.999&&rw<500){eq2*=1+fn(eq2)*b;rw++;}return{dd,w:rw};};
    return{chart,
      term:{f:{m:ptile(fT,.5),p25:ptile(fT,.25),p75:ptile(fT,.75)},n:{m:ptile(nT,.5),p25:ptile(nT,.25),p75:ptile(nT,.75)},o:{m:ptile(oT,.5),p25:ptile(oT,.25),p75:ptile(oT,.75)}},
      mdd:{f:{m:ptile(mdd(fp),.5),p90:ptile(mdd(fp),.9)},n:{m:ptile(mdd(np),.5),p90:ptile(mdd(np),.9)}},
      fMap,surv:(reached/SP*100),
      rec:{f3:rC(3,rF),o3:rC(3,rO),n3:rC(3,rN),f5:rC(5,rF),o5:rC(5,rO),n5:rC(5,rN)}};
  },[dEq,dWr,dRr]);

  const milestoneData=useMemo(()=>{
    const w=dWr/100,b=dRr;
    const bestWins=(fn,target)=>{if(dEq>=target)return 0;let e=dEq,t=0;while(e<target&&t<9999){e*=(1+fn(e)*b);t++;}return t;};
    const NP=500,MT=400;
    const runMC=(fn,seed)=>{const rng=mb32(seed);const paths=Array.from({length:NP},()=>{let e=dEq;const cross={};MILES.forEach(m=>{if(e>=m.v)cross[m.v]=0;});for(let t=1;t<=MT;t++){const r=fn(e);e=rng()<w?e*(1+r*b):e*(1-r);e=Math.max(e,1);MILES.forEach(m=>{if(!(m.v in cross)&&e>=m.v)cross[m.v]=t;});if(e<=1)break;}return cross;});return target=>{if(dEq>=target)return{reached:100,median:0,p25:0,p75:0};const times=paths.map(p=>p[target]).filter(t=>t!==undefined);return{reached:(times.length/NP)*100,median:times.length>3?Math.round(ptile(times,.5)):null,p25:times.length>3?Math.round(ptile(times,.25)):null,p75:times.length>3?Math.round(ptile(times,.75)):null};};};
    const mcN=runMC(rN,simSeed),mcF=runMC(rF,simSeed+111);
    return MILES.map(m=>({...m,achieved:dEq>=m.v,progress:Math.min(100,(dEq/m.v)*100),bestN:bestWins(rN,m.v),bestF:bestWins(rF,m.v),mcN:mcN(m.v),mcF:mcF(m.v)}));
  },[dEq,dWr,dRr,simSeed]);

  const msA=milestoneData.filter(m=>m.achieved),msF=milestoneData.filter(m=>!m.achieved);

  const originTrades=useMemo(()=>{
    const t1s=20000,t1r=rN(t1s),t1e=t1s+t1s*t1r*dRr;const t2s=Math.round(t1e),t2r=rN(t2s),t2e=t2s+t2s*t2r*dRr;const t3s=Math.round(t2e),t3r=rN(t3s);
    const ph=e=>e>=E0*1.05?'model':e>=E0*.95?'anchor':'pre';const col=p=>p==='pre'?'text-amber-400':'text-emerald-400';
    return{trades:[{t:'Trade 1',eq:fmt(t1s),r:(t1r*100).toFixed(0)+'%',res:fmt(t1e),c:'text-amber-400',ac:'border-amber-500/30'},{t:'Trade 2',eq:fmt(t2s),r:(t2r*100).toFixed(0)+'%',res:fmt(t2e),c:col(ph(t2s)),ac:ph(t2s)!=='pre'?'border-emerald-500/30':'border-amber-500/30'},{t:'Trade 3+',eq:fmt(t3s),r:(t3r*100).toFixed(1)+'%',res:ph(t3s)==='model'?'Formula On':'At Anchor',c:col(ph(t3s)),ac:ph(t3s)!=='pre'?'border-emerald-500/30':'border-amber-500/30'}]};
  },[dRr]);

  const curveData=useMemo(()=>Array.from({length:150},(_,i)=>{const lx=LOG_MIN+(i/149)*(LOG_MAX-LOG_MIN),e=unlg(lx);return{lx,fixed:33,old:rO(e)*100,cur:rN(e)*100,rdol:r$N(e)};}),[]);
  const ddP=useMemo(()=>{const p=[];let ef=dEq,eo=dEq,en=dEq;for(let i=0;i<=7;i++){p.push({n:i,fixed:(dEq-ef)/dEq*100,old:(dEq-eo)/dEq*100,cur:(dEq-en)/dEq*100});ef*=1-rF();eo*=1-rO(eo);en*=1-rN(en);}return p;},[dEq]);
  const [gYT,gYD]=useMemo(()=>{const all=hm.chart.flatMap(d=>[d.fl,d.ol,d.nl]);const mn=Math.floor(Math.min(...all)),mx=Math.ceil(Math.max(...all)),ticks=[];for(let d=mn;d<=mx+1;d++)[1,3].forEach(f=>{const v=d+Math.log10(f);if(v>=mn-.3&&v<=mx+.3)ticks.push(v);});return[ticks,[Math.min(...all)-.15,Math.max(...all)+.15]];},[hm]);
  const cost=hm.term.f.m>0?((hm.term.f.m-hm.term.n.m)/hm.term.f.m*100):0;

  const TABS=[{id:'milestones',l:'Milestones',ic:Zap},{id:'fullmap',l:'Data Matrix',ic:Eye},{id:'curves',l:'Risk Curves',ic:Activity},{id:'stress',l:'Stress Test',ic:TrendingDown},{id:'growth',l:'Projections',ic:TrendingUp},{id:'compare',l:'Compare',ic:Shield}];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30 overflow-x-hidden flex flex-col lg:flex-row">
      <style dangerouslySetInnerHTML={{__html:'.no-sb::-webkit-scrollbar{display:none}.no-sb{-ms-overflow-style:none;scrollbar-width:none}@keyframes gPulse{0%,100%{opacity:.3}50%{opacity:.65}}.gps-pulse{animation:gPulse 2.5s infinite}'}}/>

      <div className="w-full lg:w-96 shrink-0 flex flex-col lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto no-sb border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950 z-20">
        <div className="p-5 lg:p-6 space-y-6 flex flex-col h-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><Shield className="w-6 h-6 text-emerald-400"/></div>
            <div><h1 className="text-xl font-extrabold tracking-tight text-white">Risk Engine</h1><p className="text-slate-500 text-xs font-medium mt-0.5">{'\u2154'} Power Decay Model</p></div>
          </div>
          <div className="bg-slate-900/70 rounded-2xl p-5 border border-slate-800/80 flex-1 flex flex-col space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2.5"><span className="text-xs text-slate-500 font-medium">Model Phase</span><span className={'text-xs font-semibold flex items-center gap-1.5 '+(isPre?'text-amber-400':isAnc?'text-emerald-400':'text-cyan-400')}><ZIcon className="w-3.5 h-3.5"/> {zName}</span></div>
              <div className="relative h-2 rounded-full bg-slate-950 overflow-visible border border-slate-800">
                <div className="absolute inset-y-0 left-0 rounded-l-full bg-amber-500/15" style={{width:anchorPos+'%'}}/>
                <div className="absolute inset-y-0 rounded-r-full bg-emerald-500/10" style={{left:anchorPos+'%',right:0}}/>
                <div className="absolute top-1/2 w-0.5 h-4 bg-emerald-500/70 rounded" style={{left:anchorPos+'%',transform:'translate(-50%,-50%)'}}/>
                <motion.div className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-500" style={{left:curPos+'%',y:'-50%',x:'-50%'}} layout transition={{type:'spring',stiffness:400,damping:30}}/>
              </div>
              <div className="flex justify-between mt-1.5"><span className="text-xs text-amber-500/40">$20K</span><span className="text-xs text-slate-600">$87.5K</span><span className="text-xs text-emerald-500/40">$10M</span></div>
            </div>
            <div className="space-y-3">
              <label className="text-xs text-slate-500 font-medium">Portfolio Equity</label>
              <div className="relative flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                <button onClick={()=>stepEq(-1)} className="p-3 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Minus className="w-4 h-4"/></button>
                <span className="text-lg font-bold text-slate-600 select-none">$</span>
                <input type="text" value={eqInput} onChange={handleEqChange} onFocus={()=>setIsEqFocused(true)} onBlur={()=>setIsEqFocused(false)} className="w-full bg-transparent text-center text-2xl font-bold font-mono tabular-nums tracking-tight text-white py-2.5 outline-none"/>
                <button onClick={()=>stepEq(1)} className="p-3 text-slate-500 hover:text-white transition-colors active:scale-95" tabIndex={-1}><Plus className="w-4 h-4"/></button>
              </div>
              <input type="range" min={0} max={1000} step="any" value={e2s(eq)} onChange={e=>setEq(s2e(+e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-slate-800 accent-emerald-500 cursor-pointer"/>
              <div className="flex flex-wrap gap-1.5 justify-center">{QK.map(q=>(<button key={q.v} onClick={()=>setEq(q.v)} className={'text-xs px-2 py-1 rounded-md font-mono font-medium transition-all '+(Math.abs(eq-q.v)<q.v*.05?'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30':'text-slate-500 hover:text-slate-300 hover:bg-slate-800')}>{q.l}</button>))}</div>
            </div>
            <div className="h-px bg-slate-800/60"/>
            <div className="space-y-5">{[{label:'Win Rate',val:wr+'%',min:45,max:70,step:1,cur:wr,set:v=>setWr(+v)},{label:'Risk:Reward',val:rr.toFixed(1)+':1',min:10,max:40,step:1,cur:rr*10,set:v=>setRr(+v/10)}].map((s,i)=>(<div key={i}><div className="flex justify-between items-center mb-2"><label className="text-xs text-slate-500 font-medium">{s.label}</label><span className="text-sm text-emerald-400 font-bold font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 tabular-nums">{s.val}</span></div><input type="range" min={s.min} max={s.max} step={s.step} value={s.cur} onChange={e=>s.set(e.target.value)} className="w-full h-1.5 rounded-full appearance-none bg-slate-800 accent-emerald-500 cursor-pointer"/></div>))}</div>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden mt-auto">
              <button onClick={()=>setShowOrigin(!showOrigin)} className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/30 transition-colors text-left">
                <div className="flex items-center gap-2.5"><Rocket className="w-4 h-4 text-emerald-400"/><div><div className="text-xs font-semibold text-white">Pre-Model Origin</div><div className={'text-xs font-medium mt-0.5 '+(hm.surv>=50?'text-emerald-500/70':hm.surv>=30?'text-amber-500/70':'text-rose-500/70')}>{hm.surv.toFixed(1)}% survival</div></div></div>
                <motion.div animate={{rotate:showOrigin?180:0}} transition={{duration:.2}}><ChevronDown className="w-4 h-4 text-slate-500"/></motion.div>
              </button>
              <AnimatePresence>{showOrigin && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.25,ease:'easeInOut'}} className="overflow-hidden">
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-slate-800/50">
                    {dEq < 110000 && (
                      <div className="flex justify-center pt-2"><GPSJourney equity={dEq} compact={true}/></div>
                    )}
                    <div className="grid grid-cols-3 gap-2">{originTrades.trades.map((x,i)=>(
                      <div key={i} className={'bg-slate-900 rounded-lg p-2.5 text-center border '+x.ac}>
                        <div className="text-xs text-slate-500 font-medium mb-1">{x.t}</div>
                        <div className={'text-xs font-bold font-mono '+x.c}>{x.eq}</div>
                        <div className={'text-xs font-mono mt-1 '+x.c}>{x.r}</div>
                        <div className="text-xs text-emerald-500 mt-1.5 font-semibold">{'\u2192'} {x.res}</div>
                      </div>
                    ))}</div>
                    <p className="text-xs text-slate-500 text-center leading-relaxed">Reaching anchor from $20K requires flawless runs. <span className="text-rose-400 font-semibold">1 loss at $20K = total wipe.</span></p>
                  </div>
                </motion.div>
              )}</AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full min-w-0 px-4 py-5 md:px-6 lg:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <MetricCard label="Active Risk %" barColor={rp>33.1?'bg-amber-500':'bg-emerald-500'}>
            <div className={'text-2xl font-bold font-mono tracking-tight tabular-nums '+(rp>33.1?'text-amber-400':'text-emerald-400')}>{rp.toFixed(1)}%</div>
            <div className={'text-xs mt-1 font-medium '+(kellyMult>1.05?'text-amber-500/80':kellyMult<.95?'text-emerald-500/80':'text-emerald-400/80')}>{kellyPct>0?(kellyMult>1.05?'\u26A0 '+kellyMult.toFixed(2)+'\u00D7 Kelly':kellyMult<.95?'\u2713 '+kellyMult.toFixed(2)+'\u00D7 Kelly':'\u2713 Optimal Kelly'):'\u2620 No edge'}</div>
          </MetricCard>
          <MetricCard label="Capital at Risk" barColor="bg-rose-500" sub="max single-trade loss" value={{text:fmt(rd),className:'text-rose-400'}}/>
          <MetricCard label="Projected Gain" barColor="bg-emerald-500" sub={'at '+rr.toFixed(1)+':1 reward'} value={{text:'+'+fmt(gain),className:'text-emerald-400'}}/>
          <MetricCard label="Drawdown Sequence" tip="Account drop after consecutive losses." barColor="bg-amber-500">
            <div className="flex items-center gap-4 mt-1">
              <div><div className="text-lg font-bold font-mono text-amber-400 tabular-nums">{'\u2212'}{d3.toFixed(0)}%</div><div className="text-xs text-slate-500 mt-0.5">3 losses</div></div>
              <div className="w-px h-8 bg-slate-700/50"/>
              <div><div className="text-lg font-bold font-mono text-rose-400 tabular-nums">{'\u2212'}{d5.toFixed(0)}%</div><div className="text-xs text-slate-500 mt-0.5">5 losses</div></div>
            </div>
          </MetricCard>
          <MetricCard label="Kelly Criterion" tip="Max risk before geometric growth turns negative." barColor="bg-cyan-500" sub="mathematical ceiling" value={{text:kellyPct>0?kellyPct.toFixed(1)+'%':'None',className:kellyPct>0?'text-cyan-400':'text-rose-500'}}/>
          <MetricCard label="Ruin Horizon" tip="Consecutive losses to reach zero." barColor={ltw<=3?'bg-rose-500':ltw<=10?'bg-amber-500':'bg-emerald-500'}>
            <div className={'text-2xl font-bold font-mono tracking-tight tabular-nums mt-1 '+(ltw<=3?'text-rose-500':ltw<=6?'text-amber-400':'text-emerald-400')}>{ltw>=200?'200+':ltw} <span className="text-sm font-sans text-slate-500 font-medium">losses</span></div>
            <div className="text-xs text-slate-500 mt-0.5">until total wipe</div>
          </MetricCard>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-px no-sb border-b border-slate-800/80 mb-0 relative">
          {TABS.map(t=>{const Ic=t.ic;const on=tab===t.id;return(
            <button key={t.id} onClick={()=>setTab(t.id)} className={'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap relative rounded-t-lg '+(on?'text-emerald-400 bg-slate-900/60':'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30')}>
              <Ic className="w-3.5 h-3.5"/> {t.l}
              {on && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" transition={{type:'spring',stiffness:500,damping:35}}/>}
            </button>
          );})}
        </div>

        <div className={'bg-slate-900/60 rounded-b-2xl rounded-tr-2xl border border-t-0 border-slate-800 p-5 lg:p-7 flex-1 relative transition-all duration-200 '+(isCalc?'opacity-40 blur-sm':'')}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.15}}>

              {tab==='milestones' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h3 className="text-lg font-bold text-white">Milestone Roadmap</h3><p className="text-sm text-slate-500 mt-1">Projected from {fmt(dEq)} at {wr}% WR, {rr.toFixed(1)}:1 RR.</p></div>
                    <button onClick={()=>setSimSeed(s=>s+1)} className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors">Re-Roll Sim</button>
                  </div>
                  {msA.length>0 && <div className="flex flex-wrap gap-2">{msA.map(m=>(<div key={m.v} className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold font-mono px-3 py-1.5 rounded-lg border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5"/> {m.l}</div>))}</div>}
                  {msF.length>0 ? (<>
                    <div className="flex flex-col lg:flex-row gap-5 items-stretch">
                      {dEq < 110000 && (
                        <div className="shrink-0 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-3">
                          <GPSJourney equity={dEq} compact={false}/>
                        </div>
                      )}
                      <div className="flex-1 bg-slate-950 rounded-xl p-5 lg:p-6 border border-emerald-500/20 ring-1 ring-emerald-500/10">
                        <div className="flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-emerald-400"/><span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Next Target</span></div>
                        <div className="flex flex-wrap items-baseline gap-3 mb-4"><span className="text-3xl font-bold text-white font-mono tracking-tight">{msF[0].l}</span><span className="text-sm text-slate-500">from {fmt(dEq)}</span></div>
                        <div className="flex items-center gap-3 mb-5">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" initial={{width:0}} animate={{width:Math.max(1,msF[0].progress)+'%'}} transition={{duration:.8,ease:'easeOut'}}/></div>
                          <span className="text-sm text-slate-400 font-mono tabular-nums w-14 text-right">{msF[0].progress.toFixed(1)}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-slate-900/60 rounded-lg p-3"><div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">{msF[0].bestN}</div><div className="text-xs text-slate-500 mt-1">wins min</div></div>
                          <div className="bg-slate-900/60 rounded-lg p-3"><div className="text-2xl font-bold font-mono text-white tabular-nums">{msF[0].mcN.median!=null?'~'+msF[0].mcN.median:'\u2014'}</div><div className="text-xs text-slate-500 mt-1">trades exp</div>{msF[0].mcN.p25!=null && <div className="text-xs text-slate-600 font-mono mt-0.5">{msF[0].mcN.p25+'\u2013'+msF[0].mcN.p75}</div>}</div>
                          <div className="bg-slate-900/60 rounded-lg p-3"><div className={'text-2xl font-bold font-mono tabular-nums '+(msF[0].mcN.reached>60?'text-emerald-400':msF[0].mcN.reached>30?'text-amber-400':'text-rose-400')}>{msF[0].mcN.reached.toFixed(0)}%</div><div className="text-xs text-slate-500 mt-1">probability</div></div>
                        </div>
                      </div>
                    </div>
                    {msF.length>1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{msF.slice(1).map(m=>(
                        <div key={m.v} onClick={()=>{setEq(m.v);setEqInput(fmt(m.v).replace(',', ''));}} className="bg-slate-950 rounded-xl p-4 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors group">
                          <div className="flex justify-between items-center mb-2.5"><span className="text-lg font-bold text-white font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{m.l}</span><span className="text-xs text-slate-600 font-mono tabular-nums">{m.progress.toFixed(1)}%</span></div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-3"><div className="h-full bg-emerald-500/60 rounded-full" style={{width:Math.max(.5,m.progress)+'%'}}/></div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div><div className="text-base font-bold font-mono text-emerald-400 tabular-nums">{m.bestN}</div><div className="text-xs text-slate-600">wins</div></div>
                            <div><div className="text-base font-bold font-mono text-slate-300 tabular-nums">{m.mcN.median!=null?'~'+m.mcN.median:'\u2014'}</div><div className="text-xs text-slate-600">trades</div></div>
                            <div><div className={'text-base font-bold font-mono tabular-nums '+(m.mcN.reached>60?'text-emerald-400':m.mcN.reached>30?'text-amber-400':'text-rose-400')}>{m.mcN.reached.toFixed(0)}%</div><div className="text-xs text-slate-600">reach</div></div>
                          </div>
                        </div>
                      ))}</div>
                    )}
                    <div className="pt-4 border-t border-slate-800/60">
                      <div className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1.5">Speed vs Safety<Tip text="Compares wins needed and reach probability between models."/></div>
                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950"><table className="w-full text-sm font-mono whitespace-nowrap"><thead className="text-xs text-slate-500 border-b border-slate-800 bg-slate-900/80"><tr><th className="py-2.5 px-4 text-left font-medium">Target</th><th className="py-2.5 px-4 text-right font-medium text-emerald-400">{'\u2154'} Wins</th><th className="py-2.5 px-4 text-right font-medium text-amber-400">Fixed</th><th className="py-2.5 px-4 text-right font-medium">Extra</th><th className="py-2.5 px-4 text-right font-medium text-emerald-400">{'\u2154'} Reach</th><th className="py-2.5 px-4 text-right font-medium text-amber-400">Fix Reach</th></tr></thead><tbody className="divide-y divide-slate-800/30">{msF.map((m,i)=>{const delta=m.bestN-m.bestF;return(
                        <tr key={m.v} className={i%2?'bg-slate-900/30':''}>
                          <td className="py-2.5 px-4 font-semibold text-white">{m.l}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">{m.bestN}</td>
                          <td className="py-2.5 px-4 text-right text-amber-400">{m.bestF}</td>
                          <td className={'py-2.5 px-4 text-right font-semibold '+(delta>0?'text-amber-500':'text-emerald-400')}>{delta>0?'+'+delta:delta===0?'\u2014':delta}</td>
                          <td className={'py-2.5 px-4 text-right font-bold '+(m.mcN.reached>60?'text-emerald-400':m.mcN.reached>30?'text-amber-400':'text-rose-400')}>{m.mcN.reached.toFixed(0)}%</td>
                          <td className={'py-2.5 px-4 text-right '+(m.mcF.reached>60?'text-emerald-400':m.mcF.reached>30?'text-amber-400':'text-rose-400')}>{m.mcF.reached.toFixed(0)}%</td>
                        </tr>
                      );})}</tbody></table></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="border-l-2 border-amber-500/40 bg-amber-500/5 rounded-r-xl p-4"><div className="text-xs font-semibold text-amber-300 mb-1">Speed {'\u2014'} Fixed 33%</div><p className="text-xs text-slate-400 leading-relaxed font-sans">Reaches milestones in fewer wins due to higher constant risk, but carries substantially higher wipe probability.</p></div>
                      <div className="border-l-2 border-emerald-500/40 bg-emerald-500/5 rounded-r-xl p-4"><div className="text-xs font-semibold text-emerald-300 mb-1">Safety {'\u2014'} {'\u2154'} Power</div><p className="text-xs text-slate-400 leading-relaxed font-sans">Requires more wins because risk decays as equity grows, but prevents catastrophic drawdowns.</p></div>
                    </div>
                    <p className="text-xs text-slate-600 text-center font-mono">500 paths {'\u00D7'} 400 trades {'\u00B7'} Seed #{simSeed}</p>
                  </>) : (
                    <div className="text-center py-16"><div className="text-5xl mb-4">{'\uD83C\uDFC6'}</div><div className="text-xl font-bold text-emerald-400 mb-2">All Milestones Achieved</div><p className="text-sm text-slate-500">Portfolio has surpassed every tracked milestone.</p></div>
                  )}
                </div>
              )}

              {tab==='fullmap' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h3 className="text-lg font-bold text-white">Full System Matrix</h3><p className="text-sm text-slate-500 mt-1">Risk parameters across every portfolio level.</p></div>
                    <div className="flex gap-3">{[{i:Flame,l:'Pre-Model',c:'text-amber-500'},{i:Target,l:'Anchor',c:'text-emerald-500'},{i:Shield,l:'Formula',c:'text-cyan-500'}].map((p,idx)=>(<div key={idx} className="flex items-center gap-1"><p.i className={'w-3.5 h-3.5 '+p.c}/><span className={'text-xs font-medium '+p.c}>{p.l}</span></div>))}</div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950"><table className="w-full text-sm font-mono whitespace-nowrap"><thead className="bg-slate-900/90 text-xs text-slate-400 border-b border-slate-800 sticky top-0 z-10"><tr><th className="py-3 px-4 text-left font-medium sticky left-0 bg-slate-900 z-20 border-r border-slate-800/50">Portfolio</th><th className="py-3 px-4 text-right font-medium">Risk %</th><th className="py-3 px-4 text-right font-medium">Risk $</th><th className="py-3 px-4 text-right font-medium">Gain $</th><th className="py-3 px-4 text-right font-medium">1-Loss</th><th className="py-3 px-4 text-right font-medium">3-Loss</th><th className="py-3 px-4 text-right font-medium">Geo Edge</th><th className="py-3 px-4 text-right font-medium">Ruin</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/30">{hm.fMap.map((m,i)=>{
                    const isA=Math.abs(dEq-m.v)<m.v*.08;
                    const tc=m.ph==='pre'?'text-amber-400':m.ph==='anchor'?'text-emerald-400':'text-cyan-400';
                    const bc=m.ph==='pre'?'bg-amber-500':m.ph==='anchor'?'bg-emerald-500':'bg-cyan-500';
                    const Ico=m.ph==='pre'?Flame:m.ph==='anchor'?Target:Shield;
                    return (
                      <tr key={m.v} onClick={()=>{setEq(m.v);setEqInput(fmt(m.v).replace(',', ''));}} className={'cursor-pointer transition-colors '+(isA?'bg-emerald-500/10':i%2?'bg-slate-800/15':'')+' '+(!isA?'hover:bg-slate-800/40':'')} style={isA?{boxShadow:'inset 4px 0 0 #10b981'}:{}}>
                        <td className={'py-3 px-4 font-semibold flex items-center gap-2 sticky left-0 z-10 border-r border-slate-800/30 transition-colors '+(isA?'bg-emerald-950/80':i%2?'bg-slate-900':'bg-slate-950')+' '+tc}><Ico className="w-3.5 h-3.5"/> {m.l}</td>
                        <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-2"><div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden flex-shrink-0"><div className={'h-full rounded-full '+bc} style={{width:Math.max(4,m.r*100)+'%'}}/></div><span className={'font-semibold w-12 '+(m.r>K0?'text-amber-400':'text-emerald-400')}>{(m.r*100).toFixed(1)}%</span></div></td>
                        <td className="py-3 px-4 text-right text-rose-400">{fmt(m.rd)}</td>
                        <td className="py-3 px-4 text-right text-emerald-400">+{fmt(m.gd)}</td>
                        <td className="py-3 px-4 text-right">{m.e1l<100?<span className="text-rose-500 font-bold">WIPED</span>:<span className="text-slate-300">{fmt(m.e1l)} <span className="text-slate-500 text-xs">{'\u2212'}{m.dd1.toFixed(0)}%</span></span>}</td>
                        <td className="py-3 px-4 text-right">{m.e3l<100?<span className="text-rose-500 font-bold">WIPED</span>:<span className="text-slate-300">{fmt(m.e3l)} <span className="text-slate-500 text-xs">{'\u2212'}{m.dd3.toFixed(0)}%</span></span>}</td>
                        <td className={'py-3 px-4 text-right font-semibold '+(m.g<0?'text-rose-400':'text-emerald-400')}>{fmtGeo(m.g)}</td>
                        <td className={'py-3 px-4 text-right font-bold '+(m.ltw<=3?'text-rose-500':m.ltw<=10?'text-amber-400':'text-slate-500')}>{m.ltw>=200?'200+':m.ltw}</td>
                      </tr>
                    );
                  })}</tbody></table></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                    <div className="border-l-2 border-rose-500/40 bg-rose-500/5 rounded-r-xl p-4 flex gap-3 items-start"><AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5"/><div><div className="text-xs font-semibold text-rose-300 mb-1">Pre-Anchor Death Spiral</div><p className="text-xs text-slate-400 leading-relaxed font-sans">Below {fmt(E0)}, risk escalates with every loss. A single loss at $20K guarantees total wipe.</p></div></div>
                    <div className="border-l-2 border-emerald-500/40 bg-emerald-500/5 rounded-r-xl p-4 flex gap-3 items-start"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"/><div><div className="text-xs font-semibold text-emerald-300 mb-1">Structural Protection</div><p className="text-xs text-slate-400 leading-relaxed font-sans">Above anchor, {'\u2154'} power decay drops percentage exposure while dollar risk grows via cube-root.</p></div></div>
                  </div>
                </div>
              )}

              {tab==='curves' && (
                <div className="space-y-10">
                  <div>
                    <h3 className="text-lg font-bold text-white">Percentage Risk Decay</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5">Fraction of capital exposed collapses as portfolio scales.</p>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={curveData} margin={cm}><defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={.35}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="lx" type="number" domain={[LOG_MIN,LOG_MAX]} ticks={LXT} tickFormatter={v=>fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10}/><YAxis tickFormatter={v=>v+'%'} stroke="#475569" tick={AX} domain={[0,100]} axisLine={false} tickLine={false}/><RTooltip contentStyle={TT} formatter={v=>[v.toFixed(1)+'%','Risk %']} labelFormatter={v=>fmt(unlg(v))} isAnimationActive={false} cursor={{stroke:'#475569',strokeDasharray:'4 4'}}/><ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4" label={{value:'You',position:'top',fill:'#94a3b8',fontSize:10}}/><ReferenceLine x={lg(E0)} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={.5}/><Area type="monotone" dataKey="cur" stroke="#10b981" fill="url(#gP)" strokeWidth={2.5} isAnimationActive={false} activeDot={{r:5,fill:'#10b981',stroke:'#fff',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div>
                  </div>
                  <div className="pt-4 border-t border-slate-800/50">
                    <h3 className="text-lg font-bold text-white">Absolute Dollar Risk</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5">Despite percentage decay, dollar risk grows via cube-root scaling.</p>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={curveData} margin={cm}><defs><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={.3}/><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="lx" type="number" domain={[LOG_MIN,LOG_MAX]} ticks={LXT} tickFormatter={v=>fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10}/><YAxis tickFormatter={fmt} stroke="#475569" tick={AX} axisLine={false} tickLine={false}/><RTooltip contentStyle={TT} formatter={v=>[fmt(v),'Risk $']} labelFormatter={v=>fmt(unlg(v))} isAnimationActive={false} cursor={{stroke:'#475569',strokeDasharray:'4 4'}}/><ReferenceLine x={lg(dEq)} stroke="#94a3b8" strokeDasharray="4 4"/><ReferenceLine x={lg(E0)} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={.5}/><Area type="monotone" dataKey="rdol" stroke="#0ea5e9" fill="url(#gD)" strokeWidth={2.5} isAnimationActive={false} activeDot={{r:5,fill:'#0ea5e9',stroke:'#fff',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div>
                  </div>
                </div>
              )}

              {tab==='stress' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-white">Consecutive Drawdown Curves</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5">0{'\u20137'} back-to-back losses from {fmt(dEq)}.</p>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={ddP} margin={cm}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="n" stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10}/><YAxis tickFormatter={v=>'\u2212'+v.toFixed(0)+'%'} stroke="#475569" tick={AX} axisLine={false} tickLine={false}/><RTooltip contentStyle={TT} formatter={(v,nm)=>['\u2212'+v.toFixed(1)+'%',{fixed:'Fixed 33%',old:'\u2153 Power',cur:'\u2154 Power'}[nm]]} labelFormatter={v=>'After '+v+' losses'} isAnimationActive={false}/><Line type="monotone" dataKey="fixed" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={{r:3,fill:'#f59e0b',strokeWidth:0}} isAnimationActive={false}/><Line type="monotone" dataKey="old" stroke="#3b82f6" strokeWidth={2} dot={{r:3,fill:'#3b82f6',strokeWidth:0}} isAnimationActive={false}/><Line type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} dot={{r:4,fill:'#10b981',strokeWidth:0}} isAnimationActive={false} activeDot={{r:6,stroke:'#fff',strokeWidth:2}}/></LineChart></ResponsiveContainer></div><ChartLegend/>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-500 font-medium mb-4">Recovery After 5 Losses ({rr.toFixed(1)}:1 RR)</div>
                      <table className="w-full text-sm font-mono whitespace-nowrap"><thead><tr className="text-xs text-slate-500 border-b border-slate-800"><th className="pb-2.5 text-left font-medium">Model</th><th className="pb-2.5 font-medium">Drawdown</th><th className="pb-2.5 text-right font-medium">Wins to Recover</th></tr></thead><tbody className="divide-y divide-slate-800/30">{[{l:'Fixed 33%',c:'text-amber-500',r:hm.rec.f5},{l:'\u2153 Power',c:'text-blue-500',r:hm.rec.o5},{l:'\u2154 Power',c:'text-emerald-400',r:hm.rec.n5,bold:true}].map((x,i)=>(<tr key={i}><td className={'py-2.5 '+x.c+(x.bold?' font-bold':'')}>{x.l}</td><td className="py-2.5 text-rose-400">{'\u2212'}{x.r.dd.toFixed(1)}%</td><td className={'py-2.5 text-right font-bold '+x.c}>{x.r.w}</td></tr>))}</tbody></table>
                    </div>
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-500 font-medium mb-4">Monte Carlo Max Drawdown</div>
                      <div className="grid grid-cols-2 gap-3 flex-1">{[{l:'Fixed 33%',d:hm.mdd.f,c:'text-amber-500',bg:'bg-slate-900/60 border-slate-800'},{l:'\u2154 Power',d:hm.mdd.n,c:'text-emerald-400',bg:'bg-emerald-500/10 border-emerald-500/20'}].map((x,i)=>(<div key={i} className={'rounded-lg flex flex-col items-center justify-center p-4 border '+x.bg}><div className={'text-xs font-medium mb-1 '+x.c}>{x.l}</div><div className={'text-2xl font-bold font-mono tabular-nums '+x.c}>{'\u2212'}{(x.d.m*100).toFixed(0)}%</div><div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">90th: {'\u2212'}{(x.d.p90*100).toFixed(0)}%</div></div>))}</div>
                    </div>
                  </div>
                </div>
              )}

              {tab==='growth' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Terminal Wealth Projection</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5">Median equity across 500 paths over 100 trades (log scale).</p>
                    <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={hm.chart} margin={cm}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="t" stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10}/><YAxis type="number" domain={gYD} ticks={gYT} tickFormatter={v=>fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false}/><RTooltip contentStyle={TT} formatter={(v,nm)=>[fmt(unlg(v)),{fl:'Fixed 33%',ol:'\u2153 Power',nl:'\u2154 Power'}[nm]]} labelFormatter={v=>'Trade #'+v} isAnimationActive={false} cursor={{stroke:'#475569',strokeDasharray:'4 4'}}/><ReferenceLine y={lg(dEq)} stroke="#475569" strokeDasharray="2 4" strokeOpacity={.3}/><ReferenceLine y={lg(dEq*2)} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={.3} label={{value:'2\u00D7 Target',position:'right',style:{fill:'#10b981',fontSize:10}}}/><Line type="monotone" dataKey="fl" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false}/><Line type="monotone" dataKey="ol" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false}/><Line type="monotone" dataKey="nl" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{r:5,fill:'#10b981',stroke:'#fff',strokeWidth:2}}/></LineChart></ResponsiveContainer></div><ChartLegend/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
                    <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                      <div className="text-xs text-slate-500 font-medium mb-3 text-center">Terminal Wealth {'\u00B7'} Median (IQR)</div>
                      <div className="space-y-3">{[{l:'Fixed 33%',c:'text-amber-500',v:hm.term.f.m,lo:hm.term.f.p25,hi:hm.term.f.p75},{l:'\u2153 Power',c:'text-blue-400',v:hm.term.o.m,lo:hm.term.o.p25,hi:hm.term.o.p75},{l:'\u2154 Power',c:'text-emerald-400',v:hm.term.n.m,lo:hm.term.n.p25,hi:hm.term.n.p75}].map((x,i)=>(
                        <div key={i} className="flex justify-between items-center font-mono text-sm">
                          <span className={'font-medium text-xs '+x.c}>{x.l}</span>
                          <div className="text-right">
                            <div className={'font-bold text-base tracking-tight '+x.c}>{fmt(x.v)}</div>
                            <div className="text-xs text-slate-600 tabular-nums">{fmt(x.lo)} {'\u2013'} {fmt(x.hi)}</div>
                          </div>
                        </div>
                      ))}</div>
                    </div>
                    <div className={'rounded-xl p-5 border flex flex-col justify-center '+(cost>0?'bg-amber-500/5 border-amber-500/20':'bg-emerald-500/5 border-emerald-500/20')}>
                      {cost>0 ? (<>
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-medium text-amber-500">Protection Cost</span><span className="text-xl font-bold font-mono text-amber-400 tabular-nums">{'\u2212'}{cost.toFixed(1)}%</span></div>
                        <p className="text-xs text-amber-500/70 leading-relaxed font-sans">{'\u2154'} power sacrifices median terminal wealth to suppress drawdowns and prioritize survival.</p>
                      </>) : (<>
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-medium text-emerald-500">Outperformance</span><span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">+{Math.abs(cost).toFixed(1)}%</span></div>
                        <p className="text-xs text-emerald-500/70 leading-relaxed font-sans">Fixed 33% is over-Kelly {'\u2014'} {'\u2154'} power outperforms by avoiding the penalty of over-sizing.</p>
                      </>)}
                    </div>
                  </div>
                </div>
              )}

              {tab==='compare' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Three-Model Comparison</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5">Risk allocation across all three frameworks.</p>
                    <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={curveData} margin={cm}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="lx" type="number" domain={[LOG_MIN,LOG_MAX]} ticks={LXT} tickFormatter={v=>fmt(unlg(v))} stroke="#475569" tick={AX} axisLine={false} tickLine={false} dy={10}/><YAxis tickFormatter={v=>v+'%'} stroke="#475569" tick={AX} domain={[0,100]} axisLine={false} tickLine={false}/><RTooltip contentStyle={TT} formatter={(v,nm)=>[v.toFixed(1)+'%',{fixed:'Fixed 33%',old:'\u2153 Power',cur:'\u2154 Power'}[nm]]} labelFormatter={v=>fmt(unlg(v))} isAnimationActive={false} cursor={{stroke:'#475569',strokeDasharray:'4 4'}}/><ReferenceLine x={lg(dEq)} stroke="#475569" strokeDasharray="4 4" strokeOpacity={.5} label={{value:'You',position:'insideTopLeft',style:{fill:'#94a3b8',fontSize:10}}}/><ReferenceLine x={lg(E0)} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={.4} label={{value:'Anchor',position:'insideTopRight',style:{fill:'#10b981',fontSize:10}}}/><ReferenceLine y={33} stroke="#475569" strokeDasharray="2 4" strokeOpacity={.3}/><Line type="monotone" dataKey="fixed" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="6 4" isAnimationActive={false}/><Line type="monotone" dataKey="old" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false}/><Line type="monotone" dataKey="cur" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{r:5,fill:'#10b981',stroke:'#fff',strokeWidth:2}}/></LineChart></ResponsiveContainer></div><ChartLegend/>
                  </div>
                  <div className="overflow-x-auto pt-4 border-t border-slate-800/60"><table className="w-full text-sm font-mono whitespace-nowrap"><thead className="text-xs text-slate-500 border-b border-slate-800 bg-slate-950"><tr><th className="py-2.5 px-4 text-left font-medium">Portfolio</th><th className="py-2.5 px-4 text-right font-medium text-amber-500/80">Fixed</th><th className="py-2.5 px-4 text-right font-medium text-blue-400/80">{'\u2153'} Power</th><th className="py-2.5 px-4 text-right font-medium text-emerald-400">{'\u2154'} Power</th><th className="py-2.5 px-4 text-right font-medium">Risk $</th></tr></thead><tbody className="divide-y divide-slate-800/30">{QK.map((q,i)=>{const isA=Math.abs(dEq-q.v)<q.v*.08;return(
                    <tr key={q.v} onClick={()=>{setEq(q.v);setEqInput(fmt(q.v).replace(',', ''));}} className={'cursor-pointer transition-colors '+(isA?'bg-emerald-500/10':i%2?'bg-slate-900/40':'')+' hover:bg-slate-800/40'} style={isA?{boxShadow:'inset 3px 0 0 #10b981'}:{}}>
                      <td className={'py-2.5 px-4 font-semibold '+(isA?'text-emerald-400':'text-slate-300')}>{q.l}</td>
                      <td className="py-2.5 px-4 text-right text-amber-500 tabular-nums">33.0%</td>
                      <td className="py-2.5 px-4 text-right text-blue-400 tabular-nums">{(rO(q.v)*100).toFixed(1)}%</td>
                      <td className={'py-2.5 px-4 text-right font-bold tabular-nums '+(rN(q.v)>K0?'text-amber-400':'text-emerald-400')}>{(rN(q.v)*100).toFixed(1)}%</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 tabular-nums">{fmt(r$N(q.v))}</td>
                    </tr>
                  );})}</tbody></table></div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
        <p className="text-center text-slate-600 text-xs mt-4 pb-4 font-mono">{wr}% WR {'\u00B7'} {rr.toFixed(1)} RR {'\u00B7'} {'\u2154'} Power Decay {'\u00B7'} Master v3</p>
      </div>
    </div>
  );
}
