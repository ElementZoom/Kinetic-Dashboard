// before the first paint: apply the saved theme colours, so the page never flashes the wrong background while the big script below is still loading
(function(){try{var r=document.documentElement,s=r.style,o=JSON.parse(localStorage.getItem("dashPal")||"{}"),m=o.mode||"dark",st=localStorage.getItem("dashStyle"),
D={dark:{bg:"#141218",glow:"#2e2540",ink:"#e6e0e9",accent:"#d0bcff"},light:{bg:"#fef7ff",glow:"#e8def8",ink:"#1d1b20",accent:"#6750a4"}},
h=function(x){return [1,3,5].map(function(i){return parseInt(x.substr(i,2),16)}).join(",")};
if(m==="auto")m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
if(m==="time"){var q=new Date(),n=q.getHours()*60+q.getMinutes(),t=function(x,d){var a=String(x||d).split(":");return (+a[0]||0)*60+(+a[1]||0)},f=t(o.from,"18:00"),e=t(o.to,"06:00");m=(f<=e?(n>=f&&n<e):(n>=f||n<e))?"dark":"light"}
if(m==="sun"){m=localStorage.getItem("dashSunDark")==="0"?"light":"dark"}
var p=o[m]||(o.bg&&m==="dark"?o:{}),d=D[m]||D.dark,g=function(k){return p[k]||d[k]};
r.setAttribute("data-mode",m);s.colorScheme=m;s.setProperty("--w",m==="light"?"0,0,0":"255,255,255");
s.setProperty("--bg",g("bg"));s.setProperty("--bg2",g("glow"));s.setProperty("--ink",g("ink"));s.setProperty("--ink-rgb",h(g("ink")));s.setProperty("--mint",g("accent"));
if(st)r.setAttribute("data-style",st)}catch(e){}})();
