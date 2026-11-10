const MAIN_ASSET=/\/assets\/index-[A-Za-z0-9_-]+\.js/;

function currentMainAsset(){
 return [...document.scripts].map(script=>script.src).map(src=>{try{return new URL(src).pathname;}catch{return '';}}).find(path=>MAIN_ASSET.test(path))??'';
}

export function watchForDeploymentUpdates(){
 const current=currentMainAsset();
 if(!current||import.meta.env.DEV)return()=>{};
 let checking=false;
 const check=async()=>{
  if(checking||document.visibilityState==='hidden')return;
  checking=true;
  try{
   const response=await fetch(`/?deployment-check=${Date.now()}`,{cache:'no-store',headers:{Accept:'text/html'}});
   if(!response.ok)return;
   const html=await response.text(),next=html.match(MAIN_ASSET)?.[0]??'';
   if(next&&next!==current)window.location.reload();
  }catch{/* A indisponibilidade momentânea não deve interromper o sistema. */}
  finally{checking=false;}
 };
 const onVisibility=()=>{if(document.visibilityState==='visible')void check();};
 window.addEventListener('focus',check);
 document.addEventListener('visibilitychange',onVisibility);
 const timer=window.setInterval(check,5*60*1000);
 return()=>{window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',onVisibility);clearInterval(timer);};
}
