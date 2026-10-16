// SAMPLE DATA - replace with Supabase query later
const WA="260000000000"; // placeholder number
const L=[
{t:"Self-contained student rooms near CBU",c:"Kitwe",k:"boarding",p:1200,b:"Single room · shared kitchen",i:"🏠"},
{t:"Girls' boarding house, Northrise",c:"Ndola",k:"boarding",p:950,b:"Shared room · water & power incl.",i:"🛏️"},
{t:"3-bed family house, Kabulonga",c:"Lusaka",k:"house",p:9500,b:"3 bed · 2 bath · walled",i:"🏡"},
{t:"2-bed flat near UNZA",c:"Lusaka",k:"flat",p:3800,b:"2 bed · 1 bath · parking",i:"🏢"},
{t:"Boarding rooms near Mulungushi Univ.",c:"Kabwe",k:"boarding",p:800,b:"Single room · Wi-Fi",i:"🏠"},
{t:"2-bed house, Dambwa",c:"Livingstone",k:"house",p:4500,b:"2 bed · garden",i:"🏡"}];
const g=document.getElementById("grid");
function wa(msg){return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`}
function render(list){g.innerHTML=list.length?list.map((x,n)=>`<div class="card lcard" style="animation-delay:${n*60}ms"><div class="ph"><span class="tag s">SAMPLE</span>${x.i}</div><div class="cb"><span class="city">${x.c}</span><h3>${x.t}</h3><div class="d">${x.b}</div><div class="pr">K${x.p.toLocaleString()}<small> /month</small></div><a class="pill pill-green" target="_blank" href="${wa("Hi, I'm interested in: "+x.t+" ("+x.c+") listed on REZ Homes")}">Enquire on WhatsApp</a></div></div>`).join(""):"<p class='note'>No listings match. Try another city.</p>"}
let city="";const cities=["All","Lusaka","Ndola","Kitwe","Kabwe","Livingstone","Chingola","Kasama"],cc=document.getElementById("cityChips");
cc.innerHTML=cities.map((c,i)=>`<button type="button" class="chip${i?"":" on"}" data-c="${i?c:""}">${c}</button>`).join("");
cc.onclick=e=>{const b=e.target.closest(".chip");if(!b)return;cc.querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");city=b.dataset.c;filt()};
function filt(){const k=type.value,p=+price.value||1e9;render(L.filter(x=>(!city||x.c===city)&&(!k||x.k===k)&&x.p<=p))}
document.querySelectorAll(".bnav a").forEach(a=>a.onclick=()=>{document.querySelectorAll(".bnav a").forEach(x=>x.classList.remove("on"));a.classList.add("on")});
document.getElementById("search").addEventListener("submit",e=>{e.preventDefault();filt()});
document.getElementById("waMain").href=wa("Hi REZ, I'd like to list my property / ask about a rental.");
render(L);
