// REZ Homes v2: hash-routed static app. Data via DB (data.js).
const WA="260000000000"; // placeholder number
const $=s=>document.querySelector(s), app=$("#app");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const K=n=>"K"+Number(n||0).toLocaleString();
const TYPES={boarding:"Boarding house",room:"Room",apartment:"Apartment",house:"House",flat:"Flat"};
const CITIES=["Lusaka","Ndola","Kitwe","Kabwe","Livingstone","Chingola","Kasama"];
const CITYLL={Lusaka:[-15.4167,28.2833],Ndola:[-12.96,28.64],Kitwe:[-12.81,28.21],Kabwe:[-14.44,28.45],Livingstone:[-17.85,25.86],Chingola:[-12.53,27.85],Kasama:[-10.21,31.18]};
const PRICES=[["Under K1,000",0,999],["K1,000–2,000",1000,2000],["K2,000–5,000",2000,5000],["K5,000+",5000,1e9]];
const BOOST={week:50,month:150}; // PROPOSED
const SLIDES=[["img/p3.jpg","Find your next <span>home</span>, fast."],["img/p8.jpg","Rooms for <span>students</span>, close to campus."],["img/p6.jpg","Family homes in <span>7 cities</span>."],["img/p2.jpg","Landlords: <span>list in minutes</span>."]];
let F={cities:[],types:[],price:null,max:20000}, maps=[], timer;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2200)};
const wa=m=>`https://wa.me/${WA}?text=${encodeURIComponent(m)}`;
const visible=()=>DB.listings().filter(l=>l.status==="active"||l.owner===(DB.user()||{}).id);
const sortF=a=>a.sort((x,y)=>(isFeat(y)-isFeat(x)));
const isFeat=l=>!!(l.featured||(l.boostUntil&&l.boostUntil>Date.now()));
const tags=l=>`<div class="tags">${l.sample?'<span class="tag s">SAMPLE</span>':""}${isFeat(l)?'<span class="tag f">★ Featured</span>':""}${l.status==="pending"?'<span class="tag p">Pending verification</span>':l.verified?'<span class="tag v">✓ Verified</span>':'<span class="tag u">Unverified</span>'}</div>`;
const card=(l,n=0)=>`<a class="card lcard" href="#/l/${l.id}" style="animation-delay:${n*50}ms"><div class="ph" style="background:url('${esc(l.photos?.[0]||"img/p1.jpg")}')">${tags(l)}</div><div class="cb"><span class="city">${esc(l.city)} · ${TYPES[l.type]||esc(l.type)}</span><h3>${esc(l.title)}</h3><div class="d">Deposit ${K(l.deposit)} · ${l.upfront} month(s) upfront · ${esc(l.yard||"")}</div><div class="pr">${K(l.rent)}<small> /month</small></div></div></a>`;
function clearMaps(){maps.forEach(m=>m.remove());maps=[];clearInterval(timer)}
function mkMap(el,ll,z){const m=L.map(el).setView(ll,z);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(m);maps.push(m);return m}
L.Icon.Default.imagePath="vendor/images/";

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
 <section id="listings"><div class="sechead"><h2>Listings</h2><span class="badge">SAMPLE DATA</span></div><p class="note">Example listings for demonstration only, not real properties. Featured listings show first.</p><div id="grid" class="grid"></div></section>
 ${pricingHTML()}
 <section id="contact" class="card cta"><h2>Questions? Let's talk.</h2><p>Landlord wanting to list, or tenant looking for a place?</p><a class="pill pill-gold" href="${wa("Hi REZ, I'd like to list my property / ask about a rental.")}" target="_blank">Chat on WhatsApp</a><p class="note light">Placeholder number (+260 XXX XXX XXX).</p></section>`;
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
 const list=sortF(visible().filter(l=>(!F.cities.length||F.cities.includes(l.city))&&(!F.types.length||F.types.includes(l.type))&&(!r||(l.rent>=r[1]&&l.rent<=r[2]))&&l.rent<=F.max));
 $("#grid").innerHTML=list.length?list.map(card).join(""):"<p class='note'>No listings match. Try other filters.</p>";
}
const pricingHTML=()=>`<section id="pricing"><div class="sechead"><h2>List your property</h2><span class="badge">PROPOSED</span></div>
<p class="note">Landlords pay a simple monthly subscription. Tenants search free. Pricing not final.</p><div class="tiers">
<div class="card tier"><h3>Starter</h3><p class="amt">K150<small>/mo</small></p><ul><li>1 listing</li><li>5 photos</li><li>WhatsApp enquiries</li></ul></div>
<div class="card tier best"><span class="pop">Most popular</span><h3>Landlord</h3><p class="amt">K350<small>/mo</small></p><ul><li>Up to 5 listings</li><li>15 photos each</li><li>"Verified" badge after site check</li></ul></div>
<div class="card tier"><h3>Pro</h3><p class="amt">K750<small>/mo</small></p><ul><li>Unlimited listings</li><li>Featured on homepage</li><li>Social media promotion</li></ul></div>
<div class="card tier"><h3>Boost / Featured <span class="badge">PROPOSED</span></h3><p class="amt">K${BOOST.week}<small>/week</small></p><ul><li>Shown first in search</li><li>Gold ★ Featured badge</li><li>K${BOOST.month} for a month</li></ul></div></div>
<p class="note">First month free for early landlords (proposal). Pay by MTN or Airtel mobile money.</p></section>`;

// ---------- Detail ----------
function detail(id){
 const l=DB.listing(id);if(!l){app.innerHTML="<p class='note'>Listing not found.</p>";return}
 const u=DB.user(),meets=(u?.meets||{})[id]||[],saved=u?.saved?.includes(id);
 app.innerHTML=`<div class="detail fade"><a href="#/" class="note">← Back</a><div class="hero-img" style="background-image:url('${esc(l.photos?.[0])}')"><div class="ph" style="height:auto;background:none!important;position:absolute;inset:0">${tags(l)}</div></div>
 ${l.photos?.length>1?`<div class="thumbs" style="margin-top:8px">${l.photos.map(p=>`<img src="${esc(p)}" alt="">`).join("")}</div>`:""}
 <div class="dgrid"><div><p class="city" style="margin-top:16px">${esc(l.city)} · ${TYPES[l.type]||""} · ${esc(l.address)}</p><h2>${esc(l.title)}</h2>
 <div class="kv"><div><small>Monthly rent</small><b>${K(l.rent)}</b></div><div><small>Security deposit</small><b>${K(l.deposit)}</b></div><div><small>Upfront</small><b>${l.upfront} month(s)</b></div><div><small>Yard / plot</small><b style="font-size:15px">${esc(l.yard||"—")}</b></div></div>
 <div class="card box"><small class="note">Move-in cost estimate: ${K(l.rent*l.upfront)} rent upfront + ${K(l.deposit)} deposit = <b>${K(l.rent*l.upfront+(+l.deposit))}</b></small></div>
 <div class="card box"><h3>Do you meet the criteria?</h3>${(l.criteria||[]).map((c,i)=>`<label class="ck"><input type="checkbox" data-i="${i}" ${meets.includes(i)?"checked":""} ${u?"":"disabled"}>${esc(c)}</label>`).join("")||"<p class='note'>No special requirements.</p>"}
 <p class="note" id="mt">${u?`You meet ${meets.length} of ${(l.criteria||[]).length}.`:'<a href="#/account" style="color:var(--g);font-weight:700">Sign in</a> to check criteria and apply.'}</p>
 <div class="btns">${l.owner!==u?.id?`<button class="pill pill-green" id="apply">Apply</button>`:""}<button class="pill pill-ghost" id="sv">${saved?"♥ Saved":"♡ Save"}</button><a class="pill pill-ghost" target="_blank" href="${wa("Hi, I'm interested in: "+l.title+" ("+l.city+") on REZ Homes")}">WhatsApp</a></div></div>
 <div class="card box"><h3>Amenities</h3><div class="fl">${(l.amenities||[]).map(a=>`<span class="chip">${esc(a)}</span>`).join("")||"<p class='note'>Not listed.</p>"}</div></div></div>
 <div><div class="card box"><h3>Location</h3><div class="mini" id="mini"></div><button class="pill pill-gold" style="width:100%;margin-top:12px" id="dir">Directions</button></div></div></div></div>`;
 const m=mkMap("mini",[l.lat,l.lng],14);L.marker([l.lat,l.lng]).addTo(m);
 $("#dir").onclick=()=>dirSheet(l);
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
 <form class="f" id="af"><input name="name" required placeholder="Full name" value="${esc(u.name)}"><input name="phone" required placeholder="Phone (e.g. 097...)"><input name="moveIn" type="date" required><input name="people" type="number" min="1" value="1" placeholder="Number of people"><textarea name="msg" rows="3" placeholder="Message to landlord (occupation / school, etc.)"></textarea><button class="pill pill-green">Submit application</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#cx").onclick=closeSheet;
 $("#af").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));DB.apply({...d,listingId:l.id,listingTitle:l.title,landlord:l.owner,tenant:u.id,tenantEmail:u.email,meets:meets.map(i=>l.criteria[i]),criteriaTotal:(l.criteria||[]).length});closeSheet();toast("Application sent");location.hash="#/account"};
}

// ---------- Map ----------
function mapView(){
 app.innerHTML=`<div class="fade"><div class="sechead" style="margin-top:20px"><h2>Map</h2><span class="badge">SAMPLE DATA</span></div><div class="mapbig" id="bigmap"></div></div>`;
 const m=mkMap("bigmap",[-13.9,28.0],6),ls=visible();
 ls.forEach(l=>L.marker([l.lat,l.lng]).addTo(m).bindPopup(`<b>${esc(l.title)}</b><br>${K(l.rent)}/month · ${esc(l.city)}<br><a href="#/l/${l.id}">View</a> · <a href="#" class="pdir" data-id="${l.id}">Directions</a>`));
 m.on("popupopen",e=>{const a=e.popup.getElement().querySelector(".pdir");if(a)a.onclick=ev=>{ev.preventDefault();dirSheet(DB.listing(a.dataset.id))}});
}

// ---------- Saved ----------
function savedView(){const u=DB.user(),trips=u?u.trips||[]:JSON.parse(localStorage.getItem("rez_guestTrips")||"[]"),sv=(u?.saved||[]).map(DB.listing).filter(Boolean);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><h2>Saved</h2><div class="card box"><h3>Saved trips</h3><div class="list">${trips.map(t=>`<div class="it"><a href="#/l/${t.id}"><b>${esc(t.title)}</b></a><a class="pill pill-green sm" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}">Start trip</a></div>`).join("")||"<p class='note'>No saved trips yet. Tap Directions on a listing, then Save trip for later.</p>"}</div></div>
 <div class="card box"><h3>Saved homes</h3>${u?`<div class="grid">${sv.map(card).join("")||"<p class='note'>Nothing saved yet.</p>"}</div>`:"<p class='note'><a href='#/account' style='color:var(--g);font-weight:700'>Sign in</a> to save homes.</p>"}</div></div>`}

// ---------- Account ----------
function account(){const u=DB.user();if(!u)return authView("in");
 const apps=DB.applications().filter(a=>a.tenant===u.id);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Hi, ${esc(u.name.split(" ")[0])}</h2><button class="pill pill-ghost sm" id="so">Sign out</button></div>
 <div class="card box"><h3>Profile</h3><p>${esc(u.email)}${u.google?' · <span class="demo">Google (demo)</span>':""}</p><span class="lbl">Role</span><div class="seg" id="role"><button class="${u.role==="tenant"?"on":""}" data-r="tenant">Tenant</button><button class="${u.role==="landlord"?"on":""}" data-r="landlord">Landlord</button></div>
 ${u.role==="landlord"?`<a class="pill pill-gold" style="margin-top:12px" href="#/landlord">Open landlord dashboard</a>`:""}</div>
 <div class="card box"><h3>My applications</h3><div class="list">${apps.map(a=>`<div class="it"><a href="#/l/${a.listingId}">${esc(a.listingTitle)}<br><small class="note">Move-in ${esc(a.moveIn)}</small></a><span class="st">${esc(a.status)}</span></div>`).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 <div class="card box"><h3>Saved</h3><p class="note">${(u.saved||[]).length} homes · ${(u.trips||[]).length} trips. <a href="#/saved" style="color:var(--g);font-weight:700">Open Saved</a></p></div></div>`;
 $("#so").onclick=()=>{DB.signOut();toast("Signed out");route()};
 $("#role").onclick=e=>{const b=e.target.closest("button");if(b){DB.updateUser({role:b.dataset.r});account()}};
}
function authView(mode){
 app.innerHTML=`<div class="fade" style="max-width:440px;margin:30px auto"><div class="card box"><div class="seg" id="mode"><button class="${mode==="in"?"on":""}" data-m="in">Sign in</button><button class="${mode==="up"?"on":""}" data-m="up">Create account</button></div>
 <form class="f" id="auth" style="margin-top:14px">${mode==="up"?`<input name="name" required placeholder="Full name"><span class="lbl">I am a</span><div class="seg" id="r"><button type="button" class="on" data-r="tenant">Tenant</button><button type="button" data-r="landlord">Landlord</button></div>`:""}
 <input name="email" type="email" required placeholder="Email"><input name="password" type="password" required minlength="6" placeholder="Password (min 6)">
 <p class="note" id="err" style="color:#c33;margin:0"></p><button class="pill pill-green">${mode==="up"?"Create account":"Sign in"}</button></form>
 <p class="note" style="text-align:center">or</p><button class="pill gbtn" id="g"><b style="color:#4285F4">G</b>&nbsp; Continue with Google</button>
 <p class="demo" style="margin-top:8px">Demo: real Google sign-in comes with the backend</p></div></div>`;
 let role="tenant";const r=$("#r");if(r)r.onclick=e=>{const b=e.target.closest("button");if(!b)return;r.querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");role=b.dataset.r};
 $("#mode").onclick=e=>{const b=e.target.closest("button");if(b)authView(b.dataset.m)};
 $("#auth").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{mode==="up"?DB.signUp({...d,role}):DB.signIn(d.email,d.password);toast("Welcome!");route()}catch(x){$("#err").textContent=x.message}};
 $("#g").onclick=()=>{const email="demo.google.user@example.com";try{DB.signIn(email,"google-demo")}catch(x){DB.signUp({name:"Demo Google User",email,password:"google-demo",role:"tenant",google:true})}toast("Signed in (Google demo)");route()};
}

// ---------- Landlord ----------
function landlord(){const u=DB.user();if(!u){toast("Sign in as a landlord first");return authView("up")}
 if(u.role!=="landlord")return app.innerHTML=`<div class="card box" style="margin-top:20px"><h3>Landlord dashboard</h3><p class="note">Your account is set to Tenant.</p><button class="pill pill-gold" id="sw">Switch to landlord</button></div>`,$("#sw").onclick=()=>{DB.updateUser({role:"landlord"});landlord()};
 const mine=DB.listings().filter(l=>l.owner===u.id),apps=DB.applications().filter(a=>a.landlord===u.id);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><h2>Landlord dashboard</h2>
 <div class="card box"><h3>Add listing</h3><form class="f" id="lf"><input name="title" required placeholder="Title (e.g. 2 rooms near CBU)">
 <span class="lbl">Type</span><div class="fl" id="lt">${Object.entries(TYPES).map(([k,v],i)=>`<button type="button" class="chip t${i?"":" on"}" data-t="${k}">${v}</button>`).join("")}</div>
 <span class="lbl">City</span><div class="fl" id="lc">${CITIES.map((c,i)=>`<button type="button" class="chip t${i?"":" on"}" data-c="${c}">${c}</button>`).join("")}</div>
 <input name="address" required placeholder="Address / area"><span class="lbl">Drop a pin (tap the map)</span><div id="pinmap"></div><small class="note" id="pinl">No pin yet: defaults to the city centre.</small>
 <div class="row"><input name="rent" type="number" required min="0" placeholder="Monthly rent (K)"><input name="deposit" type="number" required min="0" placeholder="Security deposit (K)"></div>
 <div class="row"><input name="upfront" type="number" required min="0" max="12" placeholder="Upfront months"><input name="yard" placeholder="Yard / plot size (e.g. 30 × 40 m)"></div>
 <input name="criteria" placeholder="Criteria, comma separated (Student ID, Payslip, References)"><input name="amenities" placeholder="Amenities, comma separated (Wi-Fi, Borehole)">
 <span class="lbl">Photos (compressed and stored on this device)</span><input type="file" id="ph" accept="image/*" multiple><div class="thumbs" id="thumbs"></div>
 <label class="ck"><input type="checkbox" name="boost"> Boost / Featured for 1 week: K${BOOST.week} <span class="badge">PROPOSED</span></label>
 <button class="pill pill-green">Submit listing</button><p class="note">New listings show as Pending verification until REZ checks them. Boost payment is not collected in this demo.</p></form></div>
 <div class="card box"><h3>My listings</h3><div class="list">${mine.map(l=>`<div class="it"><a href="#/l/${l.id}"><b>${esc(l.title)}</b><br><small class="note">${K(l.rent)}/mo · ${l.status==="pending"?"Pending verification":"Active"}${isFeat(l)?" · ★ Featured":""}</small></a>${isFeat(l)?"":`<button class="pill pill-gold sm" data-boost="${l.id}">Boost K${BOOST.week}/wk</button>`}</div>`).join("")||"<p class='note'>No listings yet.</p>"}</div></div>
 <div class="card box"><h3>Received applications</h3><div class="list">${apps.map(a=>`<div class="it"><div><b>${esc(a.name)}</b> · ${esc(a.phone)}<br><small class="note">${esc(a.listingTitle)} · move-in ${esc(a.moveIn)} · meets ${a.meets.length}/${a.criteriaTotal}: ${esc(a.meets.join(", "))}</small><br><small>${esc(a.msg)}</small></div>${a.status==="Submitted"?`<span class="btns"><button class="pill pill-green sm" data-acc="${a.id}">Accept</button><button class="pill pill-ghost sm" data-dec="${a.id}">Decline</button></span>`:`<span class="st">${esc(a.status)}</span>`}</div>`).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 ${pricingHTML()}</div>`;
 let type="boarding",city=CITIES[0],pin=null,photos=[];
 const pick=(id,attr,set)=>$(id).onclick=e=>{const b=e.target.closest(".chip");if(!b)return;$(id).querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");set(b.dataset[attr])};
 const m=mkMap("pinmap",CITYLL[city],12);let mk;
 pick("#lt","t",v=>type=v);pick("#lc","c",v=>{city=v;if(!pin)m.setView(CITYLL[v],12)});
 m.on("click",e=>{pin=[+e.latlng.lat.toFixed(5),+e.latlng.lng.toFixed(5)];mk?mk.setLatLng(e.latlng):mk=L.marker(e.latlng).addTo(m);$("#pinl").textContent=`Pin: ${pin.join(", ")}`});
 $("#ph").onchange=async e=>{for(const f of [...e.target.files].slice(0,6))photos.push(await compress(f));$("#thumbs").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 $("#lf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const ll=pin||CITYLL[city];const sp=s=>(s||"").split(",").map(x=>x.trim()).filter(Boolean);
  try{DB.addListing({title:d.title,type,city,address:d.address,lat:ll[0],lng:ll[1],rent:+d.rent,deposit:+d.deposit,upfront:+d.upfront,yard:d.yard,criteria:sp(d.criteria),amenities:sp(d.amenities),photos:photos.length?photos:["img/p1.jpg"],owner:u.id,boostUntil:d.boost?Date.now()+7*864e5:0});toast("Listing submitted: pending verification");clearMaps();landlord()}catch(x){toast("Storage full: use fewer or smaller photos")}};
 app.querySelectorAll("[data-boost]").forEach(b=>b.onclick=()=>{DB.updateListing(b.dataset.boost,{boostUntil:Date.now()+7*864e5});toast("Boosted for 1 week (demo, no payment taken)");clearMaps();landlord()});
 app.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>{DB.setAppStatus(b.dataset.acc,"Accepted");clearMaps();landlord()});
 app.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{DB.setAppStatus(b.dataset.dec,"Declined");clearMaps();landlord()});
}
function compress(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,900/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.7))};i.onerror=rej;i.src=r.result};r.readAsDataURL(f)})}

// ---------- Router ----------
function route(){closeSheet();const h=location.hash.replace(/^#\/?/,""),[r,id]=h.split("/");
 if(h==="search"||h==="listings"||h==="pricing"||h==="contact"){if(!$("#car")){clearMaps();home()}document.getElementById(h==="search"?"search":h)?.scrollIntoView();return}
 clearMaps();scrollTo(0,0);({"":home,map:mapView,saved:savedView,account,landlord,l:()=>detail(id)}[r]||home)();
 document.querySelectorAll(".bnav a,.dnav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#/"+(r||"")));
}
addEventListener("hashchange",route);route();
