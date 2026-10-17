// REZ Homes v3: hash-routed static app. Data via DB (data.js), settings via REZ_CONFIG (config.js).
const CFG=window.REZ_CONFIG, WA=CFG.WHATSAPP_NUMBER, BOOST=CFG.BOOST;
const $=s=>document.querySelector(s), app=$("#app");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const K=n=>"K"+Number(n||0).toLocaleString();
const D=t=>t?new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
const TYPES={boarding:"Boarding house",room:"Room",apartment:"Apartment",house:"House",flat:"Flat",shop:"Shop / Store"};
const CITIES=["Lusaka","Ndola","Kitwe","Kabwe","Livingstone","Chingola","Kasama"];
const CITYLL={Lusaka:[-15.4167,28.2833],Ndola:[-12.96,28.64],Kitwe:[-12.81,28.21],Kabwe:[-14.44,28.45],Livingstone:[-17.85,25.86],Chingola:[-12.53,27.85],Kasama:[-10.21,31.18]};
const PRICES=[["Under K1,000",0,999],["K1,000–2,000",1000,2000],["K2,000–5,000",2000,5000],["K5,000+",5000,1e9]];
const SLIDES=[["img/p3.jpg","Find your next <span>home</span>, fast."],["img/p8.jpg","Rooms for <span>students</span>, close to campus."],["img/p6.jpg","Family homes in <span>7 cities</span>."],["img/p2.jpg","Every listing <span>inspected</span> by REZ."]];
const VSTEPS=[["draft","Draft"],["awaiting_payment","Awaiting verification payment"],["inspection_scheduled","Inspection scheduled"],["verified","Verified"]];
const VLABEL={draft:"Draft",awaiting_payment:"Awaiting verification payment",inspection_scheduled:"Inspection scheduled",verified:"Verified",rejected:"Rejected"};
const SLABEL={draft:"Draft",verification:"In verification",rejected:"Rejected",unpaid:"Verified · pay plan to go live",active:"Active",occupied:"Occupied · hidden",expired:"Expired · fee unpaid"};
let F={cities:[],types:[],price:null,max:20000}, maps=[], timer;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2400)};
const wa=m=>`https://wa.me/${WA}?text=${encodeURIComponent(m)}`;
const isFeat=l=>!!(l.featured||(l.boostUntil&&l.boostUntil>DB.now()));
const sortF=a=>a.sort((x,y)=>(isFeat(y)-isFeat(x)));
const vvv=l=>l.vstatus==="verified"&&!l.flagReverify;
const vstatusLabel=l=>l.vstatus==="awaiting_payment"&&l.payConfirmed?"Fee recorded · booking inspection":VLABEL[l.vstatus];
const tags=l=>`<div class="tags">${l.sample?'<span class="tag s">SAMPLE</span>':""}${isFeat(l)?'<span class="tag f">★ Featured</span>':""}${vvv(l)?'<span class="tag v">✓ Verified by REZ</span>':`<span class="tag p">${esc(vstatusLabel(l))}</span>`}${l.leavingDate?`<span class="tag a">Available ${esc(D(l.leavingDate))}</span>`:""}</div>`;
const card=(l,n=0)=>`<a class="card lcard" href="#/l/${l.id}" style="animation-delay:${n*50}ms"><div class="ph" style="background:url('${esc(l.photos?.[0]||"img/p1.jpg")}')">${tags(l)}</div><div class="cb"><span class="city">${esc(l.city)} · ${TYPES[l.type]||esc(l.type)}</span><h3>${esc(l.title)}</h3><div class="d">Deposit ${K(l.deposit)} · ${l.upfront} month(s) upfront · ${esc(l.yard||"")}</div><div class="pr">${K(l.rent)}<small> /month</small></div></div></a>`;
function clearMaps(){maps.forEach(m=>m.remove());maps=[];clearInterval(timer)}
function mkMap(el,ll,z,sat){const m=L.map(el).setView(ll,z);const b=BASE().addTo(m);if(sat)L.control.layers({"Map":b,"Satellite":SAT()},null,{position:"topright"}).addTo(m);maps.push(m);return m}
L.Icon.Default.imagePath="vendor/images/";
const sv3d=l=>`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${l.lat},${l.lng}`, sat3d=l=>`https://www.google.com/maps/@${l.lat},${l.lng},150m/data=!3m1!1e3`;
const BASE=()=>L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"});
const SAT=()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles © Esri, Maxar, Earthstar Geographics"});
const isStaff=u=>u&&(u.role==="admin"||u.role==="staff");

// ---------- Recommendations ----------
// Rank by city/type/price match, then featured first, then the landlord's plan tier.
const tierOf=l=>l.sample?(l.featured?2:0):(CFG.PLANS.find(p=>p.id===(DB.userById(l.owner)||{}).plan)||{tier:0}).tier;
function recommend(ctx,n=3,exclude){const pool=DB.publicListings().filter(l=>l.id!==exclude);
 const score=l=>(ctx.cities?.includes(l.city)?3:0)+(ctx.types?.includes(l.type)?3:0)+(ctx.rent?(Math.abs(l.rent-ctx.rent)<=ctx.rent*.35?2:0):ctx.max<20000&&l.rent<=ctx.max?2:0);
 return pool.map(l=>({l,s:score(l)})).sort((a,b)=>b.s-a.s||isFeat(b.l)-isFeat(a.l)||tierOf(b.l)-tierOf(a.l)).slice(0,n).map(x=>x.l)}
function homeCtx(){const u=DB.user(),lv=DB.listing(DB.lastViewed()||""),sv=(u?.saved||[]).map(DB.listing).filter(Boolean),seed=[lv,...sv].filter(Boolean);
 return{cities:F.cities.length?F.cities:[...new Set(seed.map(l=>l.city))],types:F.types.length?F.types:[...new Set(seed.map(l=>l.type))],rent:seed[0]?.rent,max:F.max,why:seed.length?"Based on homes you viewed and saved":F.cities.length||F.types.length?"Based on your filters":"Featured and verified picks"}}
const recHTML=(title,why,list)=>list.length?`<section id="recs"><div class="sechead"><h2>${title}</h2><span class="badge">SAMPLE DATA</span></div><p class="note">${esc(why)}</p><div class="grid">${list.map(card).join("")}</div></section>`:"";

// ---------- Home ----------
function home(){
 app.innerHTML=`<section class="carousel fade" id="car">${SLIDES.map((s,i)=>`<div class="slide${i?"":" on"}" style="background-image:url('${s[0]}')"></div>`).join("")}
 <div class="ovl"><p class="eyebrow">Rentals · Boarding houses · Zambia</p><h1 id="hl">${SLIDES[0][1]}</h1><p class="lead">Rooms for students. Homes for families moving to a new city. See the deposit, upfront months and requirements before you visit.</p><a class="pill pill-gold" href="#search">Search homes</a></div>
 <div class="dots">${SLIDES.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div></section>
 <form id="search" class="card search fade" onsubmit="return false">
  <span class="lbl">City</span><div class="chips" id="cityChips">${["All",...CITIES].map(c=>`<button type="button" class="chip${(c==="All"?!F.cities.length:F.cities.includes(c))?" on":""}" data-c="${c}">${c}</button>`).join("")}</div>
  <span class="lbl">Type</span><div class="fl" id="typeT">${Object.entries(TYPES).map(([k,v])=>`<button type="button" class="chip t${F.types.includes(k)?" on":""}" data-t="${k}">${v}</button>`).join("")}</div>
  <span class="lbl">Price</span><div class="dd"><button type="button" class="ddb" id="ddb"><span id="ddl">Any price</span><span>▾</span></button>
   <div class="ddp hide" id="ddp"><div class="fl">${PRICES.map((p,i)=>`<button type="button" class="chip pr" data-i="${i}">${p[0]}</button>`).join("")}</div>
   <span class="lbl">Max rent: <b id="mx">${K(F.max)}</b></span><input type="range" id="rng" min="500" max="20000" step="250" value="${F.max}">
   <div class="btns" style="margin-top:10px"><button type="button" class="pill pill-ghost sm" id="pclr">Clear</button><button type="button" class="pill pill-green sm" id="pok">Apply</button></div></div></div>
 </form>
 <div id="recwrap">${(c=>recHTML("Recommended for you",c.why,recommend(c)))(homeCtx())}</div>
 <section id="listings"><div class="sechead"><h2>Listings</h2><span class="badge">SAMPLE DATA</span></div><p class="note">Example listings for demonstration only, not real properties. Homes, rooms and shop/store spaces. Featured listings show first. Only listings inspected by REZ staff carry the ✓ Verified badge.</p><div id="grid" class="grid"></div></section>
 ${pricingHTML()}
 <section id="contact" class="card cta"><h2>Questions? Let's talk.</h2><p>Landlord wanting to list, or tenant looking for a place?</p><a class="pill pill-gold" href="${wa("Hi REZ, I'd like to list my property / ask about a rental.")}" target="_blank">Chat on WhatsApp</a><p class="note light">REZ customer service · ${esc(CFG.WHATSAPP_DISPLAY)} (placeholder number)</p></section>`;
 let i=0;const sl=app.querySelectorAll(".slide"),dt=app.querySelectorAll(".dots i");
 timer=setInterval(()=>{sl[i].classList.remove("on");dt[i].classList.remove("on");i=(i+1)%sl.length;sl[i].classList.add("on");dt[i].classList.add("on");$("#hl").innerHTML=SLIDES[i][1]},4500);
 $("#cityChips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const c=b.dataset.c;if(c==="All")F.cities=[];else F.cities=F.cities.includes(c)?F.cities.filter(x=>x!==c):[...F.cities,c];home2()};
 $("#typeT").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const t=b.dataset.t;F.types=F.types.includes(t)?F.types.filter(x=>x!==t):[...F.types,t];b.classList.toggle("on");grid()};
 const p=$("#ddp");$("#ddb").onclick=()=>p.classList.toggle("hide");
 p.querySelectorAll(".pr").forEach(b=>b.onclick=()=>{p.querySelectorAll(".pr").forEach(x=>x.classList.remove("on"));b.classList.add("on");F.price=+b.dataset.i;});
 $("#rng").oninput=e=>{F.max=+e.target.value;$("#mx").textContent=K(F.max)};
 $("#pclr").onclick=()=>{F.price=null;F.max=20000;p.classList.add("hide");home2()};
 $("#pok").onclick=()=>{p.classList.add("hide");grid()};
 grid();
}
function home2(){const y=scrollY;clearMaps();home();scrollTo(0,y)}
function grid(){
 const r=F.price!=null?PRICES[F.price]:null;
 $("#ddl").textContent=r?r[0]+(F.max<20000?` · max ${K(F.max)}`:""):F.max<20000?`Up to ${K(F.max)}`:"Any price";
 const list=sortF(DB.publicListings().filter(l=>(!F.cities.length||F.cities.includes(l.city))&&(!F.types.length||F.types.includes(l.type))&&(!r||(l.rent>=r[1]&&l.rent<=r[2]))&&l.rent<=F.max));
 $("#grid").innerHTML=list.length?list.map(card).join(""):"<p class='note'>No listings match. Try other filters.</p>";
}
const pricingHTML=()=>`<section id="pricing"><div class="sechead"><h2>List your property</h2><span class="badge">PROPOSED</span></div>
<p class="note">Landlords pay a monthly subscription to advertise. Tenants search free. All prices are proposals, not final, and no fees are charged yet.</p><div class="tiers t4">
${CFG.PLANS.map(p=>`<div class="card tier${p.popular?" best":""}">${p.popular?'<span class="pop">Most popular</span>':p.tag?`<span class="pop start">${esc(p.tag)}</span>`:""}<h3>${esc(p.name)} <span class="badge">PROPOSED</span></h3><p class="amt">${K(p.price)}<small>/mo</small></p><ul>${p.perks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
<div class="card tier"><h3>Boost / Featured <span class="badge">PROPOSED</span></h3><p class="amt">${K(BOOST.week)}<small>/week</small></p><ul><li>Shown first in search</li><li>Gold ★ Featured badge</li><li>${K(BOOST.month)} for a month</li></ul></div></div>
<div class="card box vfee"><div><h3>✓ Property verification <span class="badge">PROPOSED</span></h3><p class="note" style="margin:0">One-time fee when a property is listed for the first time. A REZ staff member visits, checks the photos and claims are true, and the listing earns the Verified badge. If a tenant finds it doesn't match, it's taken off the site.</p></div><p class="amt">${K(CFG.VERIFICATION_FEE)}<small> once</small></p></div>
<p class="note">Pay by MTN Mobile Money, Airtel Money, Visa/Card or Binance Pay once payments launch.</p></section>`;

// ---------- Payments (placeholder) ----------
function payFlow({purpose,amount,listingId,label,planId,onDone}){const u=DB.user();
 sheet(`<h3>${esc(label)}</h3><p class="amt" style="margin:0">${K(amount)}</p><p class="note" style="margin:0">Choose how to pay</p>
 <div class="paygrid">${CFG.PAY_METHODS.map(m=>`<button class="paybtn" data-m="${m.id}" style="--pc:${m.color}"><i>${m.icon}</i>${esc(m.name)}</button>`).join("")}</div>
 <span class="badge" style="justify-self:start">PROPOSED PRICE</span><button class="pill pill-ghost" id="cx">Cancel</button>`);
 $("#cx").onclick=closeSheet;
 document.querySelectorAll(".paybtn").forEach(b=>b.onclick=()=>{const m=CFG.PAY_METHODS.find(x=>x.id===b.dataset.m);
  const p=DB.createPayment({purpose,listingId,landlord:u?.id,amount,method:m.id,planId});
  const msg=`Hi REZ, I'd like to pay ${K(amount)} for ${label} by ${m.name}. Reference: ${p.ref}`;
  sheet(`<div class="soon"><i style="background:${m.color}">${m.icon}</i><h3>Payments launching soon</h3><p class="note">${CFG.PAYMENTS_ENABLED?"Online payments are not configured on this build.":"Online payments are not live yet."} Contact REZ on WhatsApp to pay by ${esc(m.name)} and quote this reference:</p>
  <div class="refcode" id="refc">${p.ref}</div><p class="note" style="margin:0">${esc(label)} · ${K(amount)} · nothing has been charged</p></div>
  <a class="pill pill-green" id="wap" target="_blank" href="${wa(msg)}">Contact REZ on WhatsApp</a><button class="pill pill-ghost" id="cp">Copy reference</button><button class="pill pill-ghost" id="cx">Done</button>`);
  $("#cp").onclick=()=>{navigator.clipboard?.writeText(p.ref);toast("Reference copied")};
  $("#cx").onclick=()=>{closeSheet();onDone&&onDone(p)};$("#wap").onclick=()=>{closeSheet();onDone&&onDone(p)};
 });
}

// ---------- Detail ----------
function detail(id){
 const l=DB.listing(id),u=DB.user();
 if(!l||(l.status!=="active"&&l.owner!==u?.id&&!isStaff(u))){app.innerHTML="<div class='card box' style='margin-top:20px'><h3>This listing isn't available right now</h3><p class='note'>It may be occupied or waiting for verification. <a href='#/' style='color:var(--g);font-weight:700'>Browse other homes</a></p></div>";return}
 if(l.owner!==u?.id&&!isStaff(u))DB.trackView(id);
 const meets=(u?.meets||{})[id]||[],saved=u?.saved?.includes(id);
 app.innerHTML=`<div class="detail fade"><a href="#/" class="note">← Back</a>${l.status!=="active"?`<div class="demo" style="margin:8px 0">Not public: ${esc(SLABEL[l.status])}. Only you and REZ staff can see this.</div>`:""}<div class="hero-img" style="background-image:url('${esc(l.photos?.[0])}')"><div class="ph" style="height:auto;background:none!important;position:absolute;inset:0">${tags(l)}</div></div>
 ${l.photos?.length>1?`<div class="thumbs" style="margin-top:8px">${l.photos.map(p=>`<img src="${esc(p)}" alt="">`).join("")}</div>`:""}
 <div class="dgrid"><div><p class="city" style="margin-top:16px">${esc(l.city)} · ${TYPES[l.type]||""} · ${esc(l.address)}</p><h2>${esc(l.title)}</h2>
 <div class="kv"><div><small>Monthly rent</small><b>${K(l.rent)}</b></div><div><small>Security deposit</small><b>${K(l.deposit)}</b></div><div><small>Upfront</small><b>${l.upfront} month(s)</b></div><div><small>Yard / plot</small><b style="font-size:15px">${esc(l.yard||"—")}</b></div></div>
 ${l.leavingDate?`<div class="card box"><b>Available from ${esc(D(l.leavingDate))}</b><p class="note" style="margin:4px 0 0">The current tenant is moving out. Apply now to be next.</p></div>`:""}
 ${vvv(l)&&!l.sample&&l.inspection?`<div class="card box"><h3>✓ Verified by REZ</h3><p class="note" style="margin:0">Inspected by ${esc(l.inspection.inspector)} on ${esc(D(l.inspection.date))}. Photos and claims checked on site.</p></div>`:""}
 <div class="card box"><small class="note">Move-in cost estimate: ${K(l.rent*l.upfront)} rent upfront + ${K(l.deposit)} deposit = <b>${K(l.rent*l.upfront+(+l.deposit))}</b></small></div>
 <div class="card box"><h3>Do you meet the criteria?</h3>${(l.criteria||[]).map((c,i)=>`<label class="ck"><input type="checkbox" data-i="${i}" ${meets.includes(i)?"checked":""} ${u?"":"disabled"}>${esc(c)}</label>`).join("")||"<p class='note'>No special requirements.</p>"}
 <p class="note" id="mt">${u?`You meet ${meets.length} of ${(l.criteria||[]).length}.`:'<a href="#/account" style="color:var(--g);font-weight:700">Sign in</a> to check criteria and apply.'}</p>
 <div class="btns">${l.owner!==u?.id?`<button class="pill pill-green" id="apply">Apply</button>`:""}<button class="pill pill-ghost" id="sv">${saved?"♥ Saved":"♡ Save"}</button><a class="pill pill-ghost" id="enq" target="_blank" href="${wa("Hi, I'm interested in: "+l.title+" ("+l.city+") on REZ Homes")}">WhatsApp</a><button class="pill pill-ghost sm" id="rep">Report: doesn't match</button></div></div>
 <div class="card box"><h3>Amenities</h3><div class="fl">${(l.amenities||[]).map(a=>`<span class="chip">${esc(a)}</span>`).join("")||"<p class='note'>Not listed.</p>"}</div></div></div>
 <div><div class="card box"><h3>Location</h3><div class="mini" id="mini"></div><button class="pill pill-gold" style="width:100%;margin-top:12px" id="dir">Directions</button><a class="pill pill-ghost" style="width:100%;margin-top:8px" id="sv3d" target="_blank" rel="noopener" href="${sv3d(l)}">🧭 View in 3D / Street View</a><p class="note" style="margin:6px 0 0;font-size:12px">Street View coverage varies in Zambia. No imagery? <a href="${sat3d(l)}" target="_blank" rel="noopener" id="sat3d" style="color:var(--g);font-weight:700">Open 3D satellite view</a>. Use the layer button on the map for satellite.</p></div></div></div>${recHTML("Similar homes","Same city, type or price range",recommend({cities:[l.city],types:[l.type],rent:l.rent},3,l.id))}</div>`;
 const m=mkMap("mini",[l.lat,l.lng],15,true);L.marker([l.lat,l.lng]).addTo(m);
 $("#dir").onclick=()=>dirSheet(l);
 $("#enq").onclick=()=>DB.addEnquiry({listingId:id,landlord:l.owner,channel:"whatsapp",tenant:u?.id||null});
 $("#rep").onclick=()=>{location.href=wa(`Hi REZ, I'd like to report a listing that doesn't match: ${l.title} (${l.id}).`)};
 $("#sv").onclick=()=>{if(!u)return location.hash="#/account";const s=u.saved||[];DB.updateUser({saved:saved?s.filter(x=>x!==id):[...s,id]});toast(saved?"Removed from saved":"Saved");detail(id)};
 app.querySelectorAll(".ck input").forEach(c=>c.onchange=()=>{const v=[...app.querySelectorAll(".ck input:checked")].map(x=>+x.dataset.i);DB.updateUser({meets:{...(DB.user().meets||{}),[id]:v}});$("#mt").textContent=`You meet ${v.length} of ${l.criteria.length}.`});
 const ab=$("#apply");if(ab)ab.onclick=()=>u?applySheet(l):location.hash="#/account";
}
function sheet(html){const s=$("#sheet");s.innerHTML=`<div class="in">${html}</div>`;s.classList.remove("hide");s.onclick=e=>{if(e.target===s)closeSheet()}}
const closeSheet=()=>$("#sheet").classList.add("hide");
function dirSheet(l){
 sheet(`<h3>Directions to ${esc(l.title)}</h3><p class="note">${esc(l.address)}</p><a class="pill pill-green" id="go" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}">Start trip now</a><button class="pill pill-gold" id="later">Save trip for later</button><button class="pill pill-ghost" id="cx">Cancel</button>`);
 $("#go").onclick=closeSheet;$("#cx").onclick=closeSheet;
 $("#later").onclick=()=>{const u=DB.user();const t={id:l.id,title:l.title,lat:l.lat,lng:l.lng,at:Date.now()};if(u)DB.updateUser({trips:[...(u.trips||[]).filter(x=>x.id!==l.id),t]});else{const g=JSON.parse(localStorage.getItem("rez_guestTrips")||"[]").filter(x=>x.id!==l.id);g.push(t);localStorage.setItem("rez_guestTrips",JSON.stringify(g))}closeSheet();toast("Trip saved. Find it in Saved.")};
}
function applySheet(l){const u=DB.user(),meets=(u.meets||{})[l.id]||[];
 sheet(`<h3>Apply: ${esc(l.title)}</h3><p class="note">You ticked ${meets.length} of ${(l.criteria||[]).length} criteria. The landlord sees this.</p>
 <form class="f" id="af"><input name="name" required placeholder="Full name" value="${esc(u.name)}"><input name="phone" required placeholder="Phone (e.g. 097...)" value="${esc(u.phone||"")}"><input name="moveIn" type="date" required><input name="people" type="number" min="1" value="1" placeholder="Number of people"><textarea name="msg" rows="3" placeholder="Message to landlord (occupation / school, etc.)"></textarea><button class="pill pill-green">Submit application</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#cx").onclick=closeSheet;
 $("#af").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));DB.apply({...d,listingId:l.id,listingTitle:l.title,landlord:l.owner,tenant:u.id,tenantEmail:u.email,meets:meets.map(i=>l.criteria[i]),criteriaTotal:(l.criteria||[]).length});closeSheet();toast("Application sent");location.hash="#/account"};
}

// ---------- Map ----------
function mapView(){
 app.innerHTML=`<div class="fade"><div class="sechead" style="margin-top:20px"><h2>Map</h2><span class="badge">SAMPLE DATA</span></div><div class="mapbig" id="bigmap"></div></div>`;
 const m=mkMap("bigmap",[-13.9,28.0],6,true),ls=DB.publicListings();
 ls.forEach(l=>L.marker([l.lat,l.lng]).addTo(m).bindPopup(`<b>${esc(l.title)}</b><br>${K(l.rent)}/month · ${esc(l.city)}<br><a href="#/l/${l.id}">View</a> · <a href="#" class="pdir" data-id="${l.id}">Directions</a><br><a href="${sv3d(l)}" target="_blank" rel="noopener" class="p3d">🧭 3D / Street View</a> · <a href="${sat3d(l)}" target="_blank" rel="noopener">Satellite</a><br><small style="color:#6B7A72">Street View coverage varies</small>`));
 m.on("popupopen",e=>{const a=e.popup.getElement().querySelector(".pdir");if(a)a.onclick=ev=>{ev.preventDefault();dirSheet(DB.listing(a.dataset.id))}});
}

// ---------- Saved ----------
function savedView(){const u=DB.user(),trips=u?u.trips||[]:JSON.parse(localStorage.getItem("rez_guestTrips")||"[]"),sv=(u?.saved||[]).map(DB.listing).filter(Boolean);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><h2>Saved</h2><div class="card box"><h3>Saved trips</h3><div class="list">${trips.map(t=>`<div class="it"><a href="#/l/${t.id}"><b>${esc(t.title)}</b></a><a class="pill pill-green sm" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}">Start trip</a></div>`).join("")||"<p class='note'>No saved trips yet. Tap Directions on a listing, then Save trip for later.</p>"}</div></div>
 <div class="card box"><h3>Saved homes</h3>${u?`<div class="grid">${sv.map(card).join("")||"<p class='note'>Nothing saved yet.</p>"}</div>`:"<p class='note'><a href='#/account' style='color:var(--g);font-weight:700'>Sign in</a> to save homes.</p>"}</div></div>`}

// ---------- Account / profile ----------
function account(){const u=DB.user();if(!u)return authView("in");
 const apps=DB.applications().filter(a=>a.tenant===u.id);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Hi, ${esc(u.name.split(" ")[0])}</h2><button class="pill pill-ghost sm" id="so">Sign out</button></div>
 <div class="card box"><h3>Profile</h3><p>${esc(u.email)}${u.google?' · <span class="demo">Google (demo)</span>':""}</p>
 ${isStaff(u)?`<p class="note">Role: REZ staff/admin (demo)</p><a class="pill pill-gold" href="#/admin">Open staff portal</a>`:`<form class="f" id="pf" style="margin:10px 0"><input name="phone" placeholder="Phone / WhatsApp (e.g. 097...)" value="${esc(u.phone||"")}"><button class="pill pill-ghost sm">Save phone</button></form>
 <span class="lbl">Role</span><div class="seg" id="role"><button class="${u.role==="tenant"?"on":""}" data-r="tenant">Tenant</button><button class="${u.role==="landlord"?"on":""}" data-r="landlord">Landlord</button></div>
 ${u.role==="landlord"?`<a class="pill pill-gold" style="margin-top:12px" href="#/landlord">Open landlord portal</a>`:""}`}</div>
 <div class="card box"><h3>My applications</h3><div class="list">${apps.map(a=>`<div class="it"><a href="#/l/${a.listingId}">${esc(a.listingTitle)}<br><small class="note">Move-in ${esc(a.moveIn)}</small></a><span class="st">${esc(a.status)}</span></div>`).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 <div class="card box"><h3>Saved</h3><p class="note">${(u.saved||[]).length} homes · ${(u.trips||[]).length} trips. <a href="#/saved" style="color:var(--g);font-weight:700">Open Saved</a></p></div></div>`;
 $("#so").onclick=()=>{DB.signOut();toast("Signed out");route()};
 const r=$("#role");if(r)r.onclick=e=>{const b=e.target.closest("button");if(b){DB.updateUser({role:b.dataset.r});account()}};
 const pf=$("#pf");if(pf)pf.onsubmit=e=>{e.preventDefault();DB.updateUser({phone:new FormData(pf).get("phone")});toast("Saved")};
}
function authView(mode){
 app.innerHTML=`<div class="fade" style="max-width:440px;margin:30px auto"><div class="card box"><div class="seg" id="mode"><button class="${mode==="in"?"on":""}" data-m="in">Sign in</button><button class="${mode==="up"?"on":""}" data-m="up">Create account</button></div>
 <form class="f" id="auth" style="margin-top:14px">${mode==="up"?`<input name="name" required placeholder="Full name"><span class="lbl">I am a</span><div class="seg" id="r"><button type="button" class="on" data-r="tenant">Tenant</button><button type="button" data-r="landlord">Landlord</button></div><input name="phone" placeholder="Phone / WhatsApp (optional)">`:""}
 <input name="email" type="email" required placeholder="Email"><input name="password" type="password" required minlength="6" placeholder="Password (min 6)">
 <p class="note" id="err" style="color:#c33;margin:0"></p><button class="pill pill-green">${mode==="up"?"Create account":"Sign in"}</button></form>
 <p class="note" style="text-align:center">or</p><button class="pill gbtn" id="g"><b style="color:#4285F4">G</b>&nbsp; Continue with Google</button>
 <p class="demo" style="margin-top:8px">Demo: real Google sign-in comes with the backend</p></div>
 <p class="note" style="text-align:center"><a href="#/admin" id="stafflink" style="color:var(--mut)">REZ staff</a></p></div>`;
 let role="tenant";const r=$("#r");if(r)r.onclick=e=>{const b=e.target.closest("button");if(!b)return;r.querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");role=b.dataset.r};
 $("#mode").onclick=e=>{const b=e.target.closest("button");if(b)authView(b.dataset.m)};
 $("#auth").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{mode==="up"?DB.signUp({...d,role}):DB.signIn(d.email,d.password);toast("Welcome!");route()}catch(x){$("#err").textContent=x.message}};
 $("#g").onclick=()=>{const email="demo.google.user@example.com";try{DB.signIn(email,"google-demo")}catch(x){DB.signUp({name:"Demo Google User",email,password:"google-demo",role:"tenant",google:true})}toast("Signed in (Google demo)");route()};
}

// ---------- Landlord portal ----------
const daysListed=l=>l.verifiedAt||l.sample?Math.max(0,Math.floor((DB.now()-(l.verifiedAt||l.created))/DB.DAY)):0;
function vstepper(l){if(l.vstatus==="rejected")return`<div class="steps"><span class="s bad">✕ Rejected</span></div>`;const i=VSTEPS.findIndex(s=>s[0]===l.vstatus);
 return`<div class="steps">${VSTEPS.map((s,j)=>`<span class="s${j<i?" done":j===i?" cur":""}">${j<i?"✓ ":""}${s[1]}</span>`).join("")}</div>`}
function landlord(){const u=DB.user();if(!u){toast("Sign in as a landlord first");return authView("up")}
 if(isStaff(u))return location.hash="#/admin";
 if(u.role!=="landlord")return app.innerHTML=`<div class="card box" style="margin-top:20px"><h3>Landlord portal</h3><p class="note">Your account is set to Tenant.</p><button class="pill pill-gold" id="sw">Switch to landlord</button></div>`,$("#sw").onclick=()=>{DB.updateUser({role:"landlord"});landlord()};
 const mine=DB.listings().filter(l=>l.owner===u.id),apps=DB.applications().filter(a=>a.landlord===u.id),enq=DB.enquiries().filter(e=>e.landlord===u.id),pl=DB.plan(u),sub=DB.subActive(u);
 const tv=mine.reduce((a,l)=>a+l.views,0),act=mine.filter(l=>l.status==="active").length;
 const wk=DB.viewlog().filter(v=>mine.some(l=>l.id===v.id)&&v.at>DB.now()-7*DB.DAY).length;
 const payments=DB.payments().filter(p=>p.landlord===u.id);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Landlord portal</h2><span class="badge">DEMO DATA ON THIS DEVICE</span></div>
 <div class="card box profile"><div class="av">${esc(u.name[0]||"?")}</div><div style="flex:1"><h3 style="margin:0">${esc(u.name)}</h3><p class="note" style="margin:2px 0">${esc(u.email)} · ${esc(u.phone||"no phone yet")}</p>
  <p style="margin:6px 0 0"><b>${esc(pl.name)}</b> plan · ${K(pl.price)}/mo <span class="badge">PROPOSED</span> · ${sub?`<span class="st">Paid until ${D(u.subPaidUntil)}</span>`:`<span class="st warn">${u.subPaidUntil?"Expired "+D(u.subPaidUntil):"Not paid yet"}</span>`}</p></div>
  <div class="btns"><button class="pill pill-green sm" id="paysub">${sub?"Pay next month":"Pay 1 month"} (${K(pl.price)})</button></div></div>
 <div class="seg" id="plan" style="margin-bottom:14px">${CFG.PLANS.map(p=>`<button class="${p.id===pl.id?"on":""}" data-p="${p.id}">${esc(p.name)} ${K(p.price)}</button>`).join("")}</div>
 <div class="kpis"><div class="card"><small>Total views</small><b>${tv}</b><em>${wk} this week</em></div><div class="card"><small>Enquiries</small><b>${enq.length}</b><em>WhatsApp taps</em></div><div class="card"><small>Applications</small><b>${apps.length}</b><em>${apps.filter(a=>a.status==="Accepted").length} accepted</em></div><div class="card"><small>Active listings</small><b>${act}/${pl.listings>99?"∞":pl.listings}</b><em>${tv?Math.round(100*(enq.length+apps.length)/tv):0}% view→contact</em></div></div>
 ${upgradeHTML(u,pl,mine,tv)}
 <div class="card box"><div class="sechead"><h3>My listings</h3><button class="pill pill-gold sm" id="addbtn">+ Add listing</button></div>
 <div class="mylist">${mine.map(l=>{const la=apps.filter(a=>a.listingId===l.id).length,le=enq.filter(e=>e.listingId===l.id).length;return`<div class="ml" data-id="${l.id}"><img src="${esc(l.photos?.[0]||"img/p1.jpg")}"><div class="mlb"><div class="sechead"><a href="#/l/${l.id}"><b>${esc(l.title)}</b></a><span class="st s-${l.status}">${esc(SLABEL[l.status])}</span></div>
  <small class="note">${esc(l.city)} · ${K(l.rent)}/mo${isFeat(l)?" · ★ Featured":""}${l.leavingDate?` · tenant leaving ${D(l.leavingDate)}`:""}</small>${vstepper(l)}
  <div class="mstats"><span><b>${l.views}</b> views</span><span><b>${le}</b> enquiries</span><span><b>${la}</b> applications</span><span><b>${daysListed(l)}</b> days listed</span><span>Verification: <b>${esc(vstatusLabel(l))}</b></span><span>Fee due: <b>${l.vstatus==="awaiting_payment"&&!l.payConfirmed?`${K(CFG.VERIFICATION_FEE)} verification now`:["draft","verification","rejected"].includes(l.status)?"after verification":l.status==="occupied"?"paused while occupied":sub?D(u.subPaidUntil):`${K(pl.price)} now`}</b></span></div>
  ${l.vstatus==="rejected"&&l.inspection?.notes?`<p class="note" style="margin:6px 0">Inspector notes: ${esc(l.inspection.notes)}</p>`:""}${l.inspection?.scheduledFor&&l.vstatus==="inspection_scheduled"?`<p class="note" style="margin:6px 0">Inspection ${D(l.inspection.scheduledFor)} with ${esc(l.inspection.inspector)}</p>`:""}
  <div class="btns">${actionsFor(l,sub)}</div></div></div>`}).join("")||"<p class='note'>No listings yet. Add your first property below.</p>"}</div></div>
 <div class="card box hide" id="addbox"><h3>Add a property</h3>${listingForm()}</div>
 <div class="card box"><h3>Received applications</h3><div class="list">${apps.map(a=>`<div class="it"><div><b>${esc(a.name)}</b> · ${esc(a.phone)}<br><small class="note">${esc(a.listingTitle)} · move-in ${esc(a.moveIn)} · meets ${a.meets.length}/${a.criteriaTotal}: ${esc(a.meets.join(", "))}</small><br><small>${esc(a.msg)}</small></div>${a.status==="Submitted"?`<span class="btns"><button class="pill pill-green sm" data-acc="${a.id}">Accept</button><button class="pill pill-ghost sm" data-dec="${a.id}">Decline</button></span>`:`<span class="st">${esc(a.status)}</span>`}</div>`).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 <div class="card box"><h3>Payment references</h3><div class="list">${payments.slice().reverse().map(p=>`<div class="it"><div><b>${p.ref}</b><br><small class="note">${esc(p.purpose)} · ${K(p.amount)} · ${esc(p.method)} · ${D(p.created)}</small></div><span class="st ${p.status==="pending"?"warn":""}">${p.status==="pending"?"Awaiting payment":"Recorded · Boaz to verify"}</span></div>`).join("")||"<p class='note'>None yet. Nothing is charged in this demo.</p>"}</div></div>
 ${careHTML()}
 ${pricingHTML()}</div>`;
 app.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const np=CFG.PLANS.find(p=>p.id===b.dataset.up);DB.updateUser({plan:np.id});payFlow({purpose:"subscription",amount:np.price,label:`${np.name} plan, 1 month`,planId:np.id,onDone:rerender})});
 if(!mine.length)$("#addbox").classList.remove("hide");
 $("#addbtn").onclick=()=>{$("#addbox").classList.remove("hide");$("#addbox").scrollIntoView({behavior:"smooth"});setTimeout(()=>maps.forEach(m=>m.invalidateSize()),300)};
 $("#plan").onclick=e=>{const b=e.target.closest("button");if(!b)return;DB.updateUser({plan:b.dataset.p});toast("Plan set to "+b.textContent+" (applies from your next payment)");rerender()};
 $("#paysub").onclick=()=>payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month`,planId:pl.id,onDone:rerender});
 bindListingForm(u);
 app.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>listingAction(b.dataset.act,DB.listing(b.closest(".ml").dataset.id),u));
 app.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>{DB.setAppStatus(b.dataset.acc,"Accepted");rerender()});
 app.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{DB.setAppStatus(b.dataset.dec,"Declined");rerender()});
}
function upgradeHTML(u,pl,mine,tv){const live=Math.max(1,mine.filter(l=>["active","occupied","expired"].includes(l.status)).length),vpl=tv/live;
 const gain=(p)=>{if(p.listings>99)return"Upgrade to get unlimited listings, top spot on the homepage and a gold ★ Featured badge, so tenants see you first";const extra=p.listings-pl.listings;return vpl>0?`Upgrade to get about ${Math.round(vpl*extra)} more views: room for ${extra} more listings at your current ${Math.round(vpl)} views per listing (estimate)`:`Upgrade to get more views: room for ${extra} more listings, so more tenants find you`};
 return`<div class="card box"><div class="sechead"><h3>Grow with REZ</h3><span class="badge">PROPOSED PRICES</span></div><p class="note" style="margin-top:0">Start small, upgrade when you're ready. Each step puts your properties in front of more tenants.</p>
 <div class="ladder">${CFG.PLANS.map((p,i)=>`<div class="rung${p.id===pl.id?" cur":""}${p.tier<pl.tier?" past":""}"><div class="sechead"><b>${i+1}. ${esc(p.name)}</b><span>${K(p.price)}/mo</span></div>${p.popular?'<span class="tag f" style="margin:4px 0">Most popular</span>':p.tag?`<span class="tag v" style="margin:4px 0">${esc(p.tag)}</span>`:""}<ul>${p.perks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  ${p.id===pl.id?'<p class="note" style="margin:6px 0 0"><b>Your plan</b></p>':p.tier>pl.tier?`<p class="gain">${esc(gain(p))}</p><button class="pill pill-green sm" data-up="${p.id}">Upgrade to ${esc(p.name)}</button>`:""}</div>${i<CFG.PLANS.length-1?'<div class="arrow">›</div>':""}`).join("")}</div></div>`}
const CARE=[["🧹","Keep it clean and fresh","First impressions count. Sweep, air out the rooms and clear the yard before every viewing. A tidy place rents faster and for a better price."],
 ["📸","Great photos sell","Shoot in daylight with doors and curtains open. Show every room, the bathroom, kitchen, yard and the street. Our inspectors check that photos match, so keep them honest and up to date."],
 ["⚡","Reply quickly","Tenants message several landlords at once. Answering on WhatsApp within an hour often decides who gets the tenant. Turn on notifications for REZ enquiries."],
 ["🔧","Fix small things early","A dripping tap, a broken lock or a loose socket puts tenants off and grows into a big bill. Check water, power, locks and the roof every few months."],
 ["🤝","Be clear about money","Put the rent, deposit and upfront months in your listing and stick to them. Give receipts. Clear terms build trust and bring referrals."],
 ["📅","Plan ahead for move-outs","When a tenant gives notice, tap \"Tenant leaving soon\" so new tenants can apply before the room goes empty."]];
const careHTML=()=>`<div class="card box"><h3>Property care tips from REZ</h3><p class="note" style="margin-top:0">A well-kept home earns more and fills faster. Here's what works for landlords across Zambia.</p><div class="care">${CARE.map(c=>`<div><i>${c[0]}</i><b>${esc(c[1])}</b><p>${esc(c[2])}</p></div>`).join("")}</div></div>`;
const rerender=()=>{const y=scrollY;clearMaps();route(true);scrollTo(0,y)};
function actionsFor(l,sub){const b=(a,t,c="pill-ghost")=>`<button class="pill ${c} sm" data-act="${a}">${t}</button>`;
 switch(l.status){
  case"draft":return b("submit","Submit for verification","pill-green");
  case"verification":return l.vstatus==="awaiting_payment"&&!l.payConfirmed?b("payverify",`Pay verification fee ${K(CFG.VERIFICATION_FEE)}`,"pill-green"):`<span class="note">REZ staff will contact you to inspect the property.</span>`;
  case"rejected":return b("resubmit","Fix & resubmit");
  case"unpaid":return`<button class="pill pill-green sm" data-act="paysub">Pay 1 month to go live (${K(DB.plan(DB.user()).price)})</button>`;
  case"active":return b("occupied","Mark occupied (hide)")+(isFeat(l)?"":b("boost",`Boost ${K(BOOST.week)}/wk`,"pill-gold"));
  case"occupied":return b("reactivate","Reactivate","pill-green")+b("leaving","Tenant leaving soon","pill-gold");
  case"expired":return b("reactivate",`Reactivate (pay 1 month)`,"pill-green")+b("occupied","It's occupied");
 }return""}
function listingAction(a,l,u){const pl=DB.plan(u);
 if(a==="submit"||a==="resubmit"){DB.submitForVerification(l.id);toast("Submitted for verification");return rerender()}
 if(a==="payverify")return payFlow({purpose:"verification",amount:CFG.VERIFICATION_FEE,listingId:l.id,label:`Verification: ${l.title}`,onDone:rerender});
 if(a==="boost")return payFlow({purpose:"boost",amount:BOOST.week,listingId:l.id,label:`Boost 1 week: ${l.title}`,onDone:rerender});
 if(a==="paysub")return payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month`,planId:pl.id,onDone:rerender});
 if(a==="occupied"){DB.markOccupied(l.id,"landlord");toast("Hidden from search. It stays verified.");return rerender()}
 const after=r=>{if(r.limit)return toast(`Your ${pl.name} plan allows ${pl.listings} active listing(s). Upgrade or hide another.`);
  if(r.reverify){toast("REZ asked to re-inspect this property before it goes live");return rerender()}
  if(r.needPayment){rerender();return payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month (reactivate)`,planId:pl.id,onDone:rerender})}
  toast("Live again");rerender()};
 if(a==="reactivate")return after(DB.reactivate(l.id));
 if(a==="leaving"){sheet(`<h3>Tenant leaving soon</h3><p class="note">Relist early so new tenants can apply before the move-out date. The listing shows "Available from" that date.</p><form class="f" id="lvf"><input type="date" name="d" required min="${new Date(DB.now()).toISOString().slice(0,10)}"><button class="pill pill-green">Relist now</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
  $("#cx").onclick=closeSheet;$("#lvf").onsubmit=e=>{e.preventDefault();const d=new FormData(e.target).get("d");closeSheet();after(DB.reactivate(l.id,{leavingDate:d}))}}
}
function listingForm(){return`<form class="f" id="lf"><input name="title" required placeholder="Title (e.g. 2 rooms near CBU)">
 <span class="lbl">Type</span><div class="fl" id="lt">${Object.entries(TYPES).map(([k,v],i)=>`<button type="button" class="chip t${i?"":" on"}" data-t="${k}">${v}</button>`).join("")}</div>
 <span class="lbl">City</span><div class="fl" id="lc">${CITIES.map((c,i)=>`<button type="button" class="chip t${i?"":" on"}" data-c="${c}">${c}</button>`).join("")}</div>
 <input name="address" required placeholder="Address / area"><span class="lbl">Drop a pin (tap the map)</span><div id="pinmap"></div><small class="note" id="pinl">No pin yet: defaults to the city centre.</small>
 <div class="row"><input name="rent" type="number" required min="0" placeholder="Monthly rent (K)"><input name="deposit" type="number" required min="0" placeholder="Security deposit (K)"></div>
 <div class="row"><input name="upfront" type="number" required min="0" max="12" placeholder="Upfront months"><input name="yard" placeholder="Yard / plot size (e.g. 30 × 40 m)"></div>
 <input name="criteria" placeholder="Criteria, comma separated (Student ID, Payslip, References)"><input name="amenities" placeholder="Amenities, comma separated (Wi-Fi, Borehole)">
 <span class="lbl">Photos (compressed and stored on this device)</span><input type="file" id="ph" accept="image/*" multiple><div class="thumbs" id="thumbs"></div>
 <div class="card box" style="background:var(--gold2);box-shadow:none;margin:4px 0"><b>Verification ${K(CFG.VERIFICATION_FEE)} <span class="badge">PROPOSED</span></b><p class="note" style="margin:4px 0 0">${CFG.VERIFICATION_FEE_SCOPE==="property"?"Each new property":"Your first listing"} pays a one-time fee. A REZ staff member visits to confirm the photos and details are true, then your listing goes live with the ✓ Verified badge once your monthly plan is paid.</p></div>
 <div class="btns"><button class="pill pill-green" data-mode="submit">Submit for verification</button><button class="pill pill-ghost" data-mode="draft">Save as draft</button></div></form>`}
function bindListingForm(u){let type="boarding",city=CITIES[0],pin=null,photos=[],mode="submit";
 const pick=(id,attr,set)=>$(id).onclick=e=>{const b=e.target.closest(".chip");if(!b)return;$(id).querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");set(b.dataset[attr])};
 const m=mkMap("pinmap",CITYLL[city],12);let mk;
 pick("#lt","t",v=>type=v);pick("#lc","c",v=>{city=v;if(!pin)m.setView(CITYLL[v],12)});
 m.on("click",e=>{pin=[+e.latlng.lat.toFixed(5),+e.latlng.lng.toFixed(5)];mk?mk.setLatLng(e.latlng):mk=L.marker(e.latlng).addTo(m);$("#pinl").textContent=`Pin: ${pin.join(", ")}`});
 $("#ph").onchange=async e=>{for(const f of [...e.target.files].slice(0,6))photos.push(await compress(f));$("#thumbs").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 $("#lf").querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>mode=b.dataset.mode);
 $("#lf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const ll=pin||CITYLL[city];const sp=s=>(s||"").split(",").map(x=>x.trim()).filter(Boolean);
  try{DB.addListing({title:d.title,type,city,address:d.address,lat:ll[0],lng:ll[1],rent:+d.rent,deposit:+d.deposit,upfront:+d.upfront,yard:d.yard,criteria:sp(d.criteria),amenities:sp(d.amenities),photos:photos.length?photos:["img/p1.jpg"],owner:u.id},{draft:mode==="draft"});toast(mode==="draft"?"Saved as draft":"Submitted for verification");rerender()}catch(x){toast("Storage full: use fewer or smaller photos")}};
}
function compress(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,900/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.7))};i.onerror=rej;i.src=r.result};r.readAsDataURL(f)})}


// ---------- Staff / admin (demo role) ----------
let ATAB="queue";
function admin(){const u=DB.user();
 if(!isStaff(u))return app.innerHTML=`<div class="card box" style="max-width:480px;margin:30px auto"><h3>REZ staff portal</h3><p class="note">For REZ staff and admins only. In this demo there is no real staff login, so anyone can enter demo staff mode on this device. Real staff accounts come with Supabase (role = staff/admin).</p><button class="pill pill-green" id="sd">Enter demo staff mode</button></div>`,$("#sd").onclick=()=>{DB.staffDemo();toast("Demo staff mode");route()};
 const all=DB.listings(),own=all.filter(l=>!l.sample),pays=DB.payments(),users=DB.users(),U=id=>users.find(x=>x.id===id)||{name:"(sample)",phone:""};
 const queue=own.filter(l=>l.vstatus==="awaiting_payment"||l.vstatus==="inspection_scheduled");
 const overdue=own.filter(l=>l.status==="expired");
 const occ=own.filter(l=>l.status==="occupied");
 const pend=pays.filter(p=>p.status==="pending");
 const T=[["queue","Verification queue",queue.length],["listings","All listings",all.length],["payments","Payments",pend.length],["overdue","Overdue fees",overdue.length],["occupied","Occupied follow-up",occ.length],["tools","Demo tools",""]];
 const wal=(p,m)=>p?`<a class="pill pill-ghost sm" target="_blank" href="https://wa.me/${esc(String(p).replace(/\D/g,"").replace(/^0/,"260"))}?text=${encodeURIComponent(m)}">WhatsApp landlord</a>`:`<span class="note">no phone</span>`;
 const row=(l,extra)=>{const o=U(l.owner);return`<div class="ml" data-id="${l.id}"><img src="${esc(l.photos?.[0]||"img/p1.jpg")}"><div class="mlb"><div class="sechead"><a href="#/l/${l.id}"><b>${esc(l.title)}</b></a><span class="st s-${l.status}">${esc(SLABEL[l.status])}</span></div><small class="note">${esc(l.city)} · ${esc(l.address)} · landlord ${esc(o.name)} ${esc(o.phone||"")} · ${K(l.rent)}/mo · ${l.views} views</small>${extra}</div></div>`};
 let body="";
 if(ATAB==="queue")body=queue.map(l=>{const vp=pays.filter(p=>p.listingId===l.id&&p.purpose==="verification"&&p.status==="pending");
  return row(l,`<p class="note" style="margin:6px 0"><b>${esc(vstatusLabel(l))}</b>${l.flagReverify?" · re-verification requested":""}</p>`+
  (l.vstatus==="awaiting_payment"&&!l.payConfirmed?(vp.length?`<div class="btns">${vp.map(p=>`<button class="pill pill-green sm" data-rec="${p.id}">Record payment ${p.ref}</button>`).join("")}</div>`:`<span class="note">Landlord hasn't started the ${K(CFG.VERIFICATION_FEE)} payment yet.</span>`):
   l.vstatus==="awaiting_payment"?`<form class="f inl" data-sched="${l.id}"><input type="date" name="date" required><input name="inspector" required placeholder="Inspector name"><button class="pill pill-green sm">Schedule inspection</button></form>`:
   `<p class="note" style="margin:0">Booked ${D(l.inspection?.scheduledFor)} · ${esc(l.inspection?.inspector)}</p><button class="pill pill-green sm" data-insp="${l.id}">Record inspection result</button>`))}).join("")||"<p class='note'>Queue is empty.</p>";
 if(ATAB==="listings")body=all.map(l=>row(l,`<p class="note" style="margin:6px 0">Verification: ${esc(vstatusLabel(l))}${l.inspection?.inspector?` · inspected by ${esc(l.inspection.inspector)} ${D(l.inspection.date)}`:""}</p>${l.sample?"":`<div class="btns">${l.status==="active"?`<button class="pill pill-ghost sm" data-occ="${l.id}">Mark occupied</button>`:""}${l.vstatus==="verified"&&!l.flagReverify?`<button class="pill pill-ghost sm" data-flag="${l.id}">Flag for re-verification</button>`:""}<button class="pill pill-ghost sm" data-hist="${l.id}">History</button></div>`}`)).join("");
 if(ATAB==="payments")body=`<p class="note">Payments arrive outside the site for now (mobile money etc.). Staff records the <b>transaction ID, amount and timestamp</b> against the reference, and Boaz verifies all three before anything counts as paid.</p><div class="list">${pays.slice().reverse().map(p=>`<div class="it"><div><b>${p.ref}</b> · ${esc(p.purpose)} · ${K(p.amount)} · ${esc(p.method)}<br><small class="note">${esc(U(p.landlord).name)} · created ${D(p.created)}${p.transaction_id?` · txn <b>${esc(p.transaction_id)}</b> · ${K(p.paid_amount)} · ${esc(p.paid_at)} · by ${esc(p.recorded_by)} · Boaz: not yet verified`:""}</small></div>${p.status==="pending"?`<button class="pill pill-green sm" data-rec="${p.id}">Record payment</button>`:`<span class="st">Recorded</span>`}</div>`).join("")||"<p class='note'>No payment references yet.</p>"}</div>`;
 if(ATAB==="overdue")body=`<p class="note">Fee unpaid, so these are hidden. Follow up by WhatsApp, email or a call. If the landlord says it's occupied, mark it occupied: it stays verified in the database.</p>`+(overdue.map(l=>{const o=U(l.owner);return row(l,`<p class="note" style="margin:6px 0">Plan expired ${D(o.subPaidUntil)}</p><div class="btns">${wal(o.phone,`Hi ${o.name}, this is REZ Homes. Your listing "${l.title}" is hidden because this month's fee is unpaid. Is it still available, or is it occupied?`)}<button class="pill pill-ghost sm" data-occ="${l.id}">Landlord says occupied</button><button class="pill pill-ghost sm" data-note="${l.id}">Log follow-up</button></div>`)}).join("")||"<p class='note'>No overdue listings.</p>");
 if(ATAB==="occupied")body=`<p class="note">Occupied listings stay verified but hidden. Check in about ${CFG.OCCUPIED_FOLLOWUP_DAYS} days after they were marked occupied, in case a tenant is leaving.</p>`+(occ.map(l=>{const o=U(l.owner),due=(l.occupiedSince||0)+CFG.OCCUPIED_FOLLOWUP_DAYS*DB.DAY;return row(l,`<p class="note" style="margin:6px 0">Occupied since ${D(l.occupiedSince)} (by ${esc(l.hiddenBy||"?")}) · check-in ${due<DB.now()?"<b style='color:#c33'>due now</b>":"due "+D(due)}</p><div class="btns">${wal(o.phone,`Hi ${o.name}, REZ Homes here. Is your tenant at "${l.title}" staying, or will it be available soon?`)}<button class="pill pill-ghost sm" data-note="${l.id}">Log check-in</button></div>`)}).join("")||"<p class='note'>No occupied listings.</p>");
 if(ATAB==="tools")body=`<p class="note">Demo clock offset: ${Math.round(DB.clockOffset()/DB.DAY)} days. Advance it to test fee expiry and follow-ups.</p><div class="btns"><button class="pill pill-gold sm" id="adv">Advance 31 days</button><button class="pill pill-ghost sm" id="rst">Reset clock</button><button class="pill pill-ghost sm" id="out">Leave staff mode</button></div>`;
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>REZ staff portal</h2><span class="badge">DEMO ADMIN</span></div>
 <div class="kpis"><div class="card"><small>To verify</small><b>${queue.length}</b></div><div class="card"><small>Live</small><b>${all.filter(l=>l.status==="active").length}</b></div><div class="card"><small>Overdue</small><b>${overdue.length}</b></div><div class="card"><small>Payments to record</small><b>${pend.length}</b></div></div>
 <div class="tabs">${T.map(t=>`<button class="${ATAB===t[0]?"on":""}" data-t="${t[0]}">${t[1]}${t[2]!==""?` <i>${t[2]}</i>`:""}</button>`).join("")}</div>
 <div class="card box"><div class="mylist">${body}</div></div></div>`;
 app.querySelector(".tabs").onclick=e=>{const b=e.target.closest("button");if(b){ATAB=b.dataset.t;admin()}};
 app.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>recordSheet(pays.find(p=>p.id===b.dataset.rec)));
 app.querySelectorAll("[data-sched]").forEach(f=>f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));DB.scheduleInspection(f.dataset.sched,d);toast("Inspection scheduled");admin()});
 app.querySelectorAll("[data-insp]").forEach(b=>b.onclick=()=>inspectSheet(DB.listing(b.dataset.insp)));
 app.querySelectorAll("[data-occ]").forEach(b=>b.onclick=()=>{DB.markOccupied(b.dataset.occ,"staff");toast("Marked occupied · stays verified");admin()});
 app.querySelectorAll("[data-flag]").forEach(b=>b.onclick=()=>{const r=prompt("Reason for re-verification?","Tenant report: photos don't match");if(r){DB.flagReverify(b.dataset.flag,r);toast("Flagged: next reactivation needs inspection");admin()}});
 app.querySelectorAll("[data-note]").forEach(b=>b.onclick=()=>{const r=prompt("Follow-up note");if(r){DB.updateListing(b.dataset.note,x=>({notes:[...(x.notes||[]),{at:DB.now(),text:"Follow-up: "+r,by:u.name}]}));toast("Logged");admin()}});
 app.querySelectorAll("[data-hist]").forEach(b=>b.onclick=()=>{const l=DB.listing(b.dataset.hist);sheet(`<h3>History: ${esc(l.title)}</h3><div class="list">${(l.notes||[]).map(n=>`<div class="it"><small>${D(n.at)} · ${esc(n.by)}</small><span>${esc(n.text)}</span></div>`).join("")||"<p class='note'>No history.</p>"}</div><button class="pill pill-ghost" id="cx">Close</button>`);$("#cx").onclick=closeSheet});
 const ad=$("#adv");if(ad){ad.onclick=()=>{DB.advanceClock(31);toast("Clock +31 days");admin()};$("#rst").onclick=()=>{DB.resetClock();admin()};$("#out").onclick=()=>{DB.signOut();location.hash="#/account"}}
}
function recordSheet(p){const u=DB.user();
 sheet(`<h3>Record payment ${p.ref}</h3><p class="note">${esc(p.purpose)} · ${K(p.amount)} due · ${esc(p.method)}. Enter the details from the mobile money / bank / Binance record. All three are required for Boaz to verify.</p>
 <form class="f" id="rf"><input name="transaction_id" required placeholder="Transaction ID (e.g. MP241017.1234.A12345)"><input name="amount" type="number" required step="0.01" placeholder="Amount received (K)" value=""><input name="paid_at" type="datetime-local" required><p class="note" id="rerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Save payment record</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#cx").onclick=closeSheet;
 $("#rf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{DB.recordPayment(p.id,{...d,recorded_by:u.name});closeSheet();toast("Payment recorded · awaiting Boaz verification");admin()}catch(x){$("#rerr").textContent=x.message}};
}
function inspectSheet(l){const u=DB.user();let photos=[];
 sheet(`<h3>Inspection: ${esc(l.title)}</h3><p class="note">Confirm the photos and claims (rent, deposit, yard, amenities) match what you saw on site.</p>
 <form class="f" id="if"><div class="seg" id="res"><button type="button" class="on" data-r="verified">✓ Verified</button><button type="button" data-r="rejected">✕ Rejected</button></div>
 <input name="inspector" required placeholder="Inspector" value="${esc(l.inspection?.inspector||u.name)}"><input name="date" type="date" required value="${esc(l.inspection?.scheduledFor||"")}">
 <textarea name="notes" rows="3" required placeholder="Inspection notes (what matched, what didn't)"></textarea><span class="lbl">Inspection photos</span><input type="file" id="iph" accept="image/*" multiple><div class="thumbs" id="ith"></div>
 <button class="pill pill-green">Save result</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 let result="verified";$("#res").onclick=e=>{const b=e.target.closest("button");if(!b)return;$("#res").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");result=b.dataset.r};
 $("#iph").onchange=async e=>{for(const f of [...e.target.files].slice(0,4))photos.push(await compress(f));$("#ith").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 $("#cx").onclick=closeSheet;
 $("#if").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));DB.completeInspection(l.id,{...d,result,photos});closeSheet();toast(result==="verified"?"Verified ✓":"Rejected");admin()};
}

// ---------- Router ----------
function route(keep){if(keep!==true)closeSheet();const h=location.hash.replace(/^#\/?/,""),[r,id]=h.split("/");
 if(h==="search"||h==="listings"||h==="pricing"||h==="contact"){if(!$("#car")){clearMaps();home()}document.getElementById(h==="search"?"search":h)?.scrollIntoView();return}
 clearMaps();if(keep!==true)scrollTo(0,0);({"":home,map:mapView,saved:savedView,account,landlord,admin,l:()=>detail(id)}[r]||home)();
 document.querySelectorAll(".bnav a,.dnav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#/"+(r||"")));
 const u=DB.user(),pb=$("#pbtn");if(pb){pb.textContent=u?(u.name||"?")[0].toUpperCase():"☺";pb.href=u?(isStaff(u)?"#/admin":u.role==="landlord"?"#/landlord":"#/account"):"#/account";pb.title=u?"My profile":"Sign in"}
}
addEventListener("hashchange",()=>route());route();
