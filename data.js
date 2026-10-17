// REZ data layer (v3). Everything is stored in this browser's localStorage today.
// To move to Supabase, re-implement these functions with the Supabase client
// (see ../supabase/README.md for the table-by-table mapping). The UI only calls DB.*.
const DB=(()=>{
const C=window.REZ_CONFIG, DAY=864e5;
const K=k=>"rez_"+k, get=(k,d)=>{try{return JSON.parse(localStorage.getItem(K(k)))??d}catch(e){return d}}, set=(k,v)=>localStorage.setItem(K(k),JSON.stringify(v));
const uid=()=>Math.random().toString(36).slice(2,10);
const now=()=>Date.now()+get("clock",0); // demo clock offset (admin can advance it to test expiry)
const SAMPLE=[
{id:"s1",title:"Self-contained student rooms near CBU",city:"Kitwe",type:"room",rent:1200,deposit:1200,upfront:3,yard:"Shared yard, 600 m²",address:"Riverside, Kitwe",lat:-12.808,lng:28.237,photos:["img/p5.jpg"],criteria:["Student ID","Guardian contact","1 reference"],amenities:["Wi-Fi","Water incl.","Security guard"],vstatus:"verified",featured:true},
{id:"s2",title:"Girls' boarding house, Northrise",city:"Ndola",type:"boarding",rent:950,deposit:500,upfront:2,yard:"Walled plot, 30 × 40 m",address:"Northrise, Ndola",lat:-12.948,lng:28.651,photos:["img/p2.jpg"],criteria:["Student ID","Guardian contact"],amenities:["Water & power incl.","Shared kitchen"],vstatus:"verified"},
{id:"s3",title:"3-bed family house, Kabulonga",city:"Lusaka",type:"house",rent:9500,deposit:9500,upfront:3,yard:"Garden, 1,200 m²",address:"Kabulonga, Lusaka",lat:-15.415,lng:28.335,photos:["img/p7.jpg"],criteria:["Payslip or bank statement","NRC","2 references"],amenities:["Borehole","Parking ×2","Walled & gated"],vstatus:"verified"},
{id:"s4",title:"2-bed apartment near UNZA",city:"Lusaka",type:"apartment",rent:3800,deposit:3800,upfront:2,yard:"Shared compound",address:"Great East Rd, Lusaka",lat:-15.392,lng:28.329,photos:["img/p4.jpg"],criteria:["Payslip","NRC"],amenities:["Parking","Solar backup"],vstatus:"verified"},
{id:"s5",title:"Boarding rooms near Mulungushi Univ.",city:"Kabwe",type:"boarding",rent:800,deposit:400,upfront:3,yard:"Plot, 20 × 30 m",address:"Kabwe",lat:-14.44,lng:28.45,photos:["img/p1.jpg"],criteria:["Student ID"],amenities:["Wi-Fi"],vstatus:"verified"},
{id:"s6",title:"2-bed house, Dambwa",city:"Livingstone",type:"house",rent:4500,deposit:4500,upfront:1,yard:"Garden, 800 m²",address:"Dambwa, Livingstone",lat:-17.84,lng:25.84,photos:["img/p6.jpg"],criteria:["Payslip","NRC","1 reference"],amenities:["Garden","Water tank"],vstatus:"verified"},
{id:"s7",title:"Shop space on Cha Cha Cha Road",city:"Lusaka",type:"shop",rent:7000,deposit:7000,upfront:3,yard:"Shop floor 45 m², shared parking",address:"Cha Cha Cha Rd, Lusaka CBD",lat:-15.4214,lng:28.2836,photos:["img/p9.jpg"],criteria:["PACRA business registration","NRC","Trading licence (council)"],amenities:["Street frontage","Roller shutter","Prepaid ZESCO meter","Toilet"],vstatus:"verified"}
].map(x=>({...x,sample:true,owner:"sample",created:Date.now()-20*DAY}));
// migrate v2 records (status "pending", verified flag) once
(()=>{const a=get("listings",[]);if(a.some(l=>!l.vstatus)){set("listings",a.map(l=>l.vstatus?l:{...l,vstatus:l.verified?"verified":"awaiting_payment",payConfirmed:false}))}})();
const users=()=>get("users",[]), userById=id=>users().find(u=>u.id===id);
const plan=u=>C.PLANS.find(p=>p.id===(u?.plan||"starter"))||C.PLANS[0];
const subActive=u=>!!u&&(u.subPaidUntil||0)>now();
const raw=()=>get("listings",[]);
// Lifecycle status (computed): draft | verification | rejected | unpaid (verified, first month not paid) | active | occupied | expired
function status(l){
 if(l.sample)return"active";
 if(l.vstatus==="draft")return"draft";
 if(l.vstatus==="rejected")return"rejected";
 if(l.vstatus!=="verified")return"verification";
 if(l.hidden)return"occupied";
 const u=userById(l.owner);return subActive(u)?"active":u?.subPaidUntil?"expired":"unpaid";
}
const listings=()=>[...SAMPLE,...raw()].map(l=>({...l,status:status(l),views:(get("views",{})[l.id]||0),verified:l.vstatus==="verified"}));
const listing=id=>listings().find(x=>x.id===id);
const upd=(id,p)=>set("listings",raw().map(x=>x.id===id?{...x,...(typeof p==="function"?p(x):p)}:x));
const log=(id,text,by)=>upd(id,x=>({notes:[...(x.notes||[]),{at:now(),text,by:by||(DB.user()||{}).name||"system"}]}));
const feeRequired=(ownerId)=>C.VERIFICATION_FEE>0&&(C.VERIFICATION_FEE_SCOPE==="property"||!raw().some(l=>l.owner===ownerId&&l.everVerified));
const ref=()=>"REZ-"+new Date(now()).toISOString().slice(2,10).replace(/-/g,"")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
const activeCount=ownerId=>listings().filter(l=>l.owner===ownerId&&l.status==="active").length;

const DB={
 now,DAY,plan,subActive,feeRequired,
 listings,listing,
 publicListings:()=>listings().filter(l=>l.status==="active"),
 // ----- landlord: create / submit -----
 addListing(l,{draft}={}){const a=raw();const n={...l,id:"u"+uid(),created:now(),vstatus:draft?"draft":"awaiting_payment",payConfirmed:false,notes:[]};a.push(n);set("listings",a);if(!draft)DB.submitForVerification(n.id);return n},
 updateListing:upd,
 submitForVerification(id){const l=listing(id);const need=feeRequired(l.owner)&&!l.feePaid;upd(id,{vstatus:"awaiting_payment",payConfirmed:!need,submittedAt:now()});log(id,need?`Submitted. Verification fee K${C.VERIFICATION_FEE} due.`:"Submitted. No verification fee due; awaiting inspection booking.")},
 // ----- staff: verification -----
 scheduleInspection(id,{date,inspector}){upd(id,{vstatus:"inspection_scheduled",inspection:{...(listing(id).inspection||{}),scheduledFor:date,inspector}});log(id,`Inspection scheduled for ${date} with ${inspector}.`)},
 completeInspection(id,{result,inspector,date,notes,photos}){const ok=result==="verified";upd(id,x=>({vstatus:ok?"verified":"rejected",everVerified:x.everVerified||ok,flagReverify:false,hidden:ok?false:x.hidden,verifiedAt:ok?now():x.verifiedAt,inspection:{...(x.inspection||{}),inspector,date,notes,photos:photos||[],result,recordedAt:now()}}));log(id,`Inspection ${ok?"passed: Verified":"failed: Rejected"} by ${inspector} on ${date}. ${notes||""}`)},
 flagReverify(id,reason){upd(id,{flagReverify:true});log(id,"Flagged for re-verification: "+reason)},
 // ----- lifecycle -----
 markOccupied(id,by){upd(id,{hidden:true,occupiedSince:now(),leavingDate:null,hiddenBy:by});log(id,`Marked occupied (hidden) by ${by}.`)},
 // returns {ok:true}|{needPayment:true}|{reverify:true}|{limit:true}
 reactivate(id,{leavingDate}={}){const l=listing(id),u=userById(l.owner);
  if(l.flagReverify){upd(id,{vstatus:"awaiting_payment",payConfirmed:true,hidden:true,leavingDate:leavingDate||null});log(id,"Reactivation requested; admin flagged re-verification, so it returns to the inspection queue (no fee).");return{reverify:true}}
  if((l.status==="occupied"||l.status==="expired")&&activeCount(l.owner)>=plan(u).listings)return{limit:true};
  upd(id,{hidden:false,leavingDate:leavingDate||null,reactivatedAt:now()});log(id,leavingDate?`Tenant leaving ${leavingDate}: relisted early.`:"Reactivated by landlord.");
  return subActive(u)?{ok:true}:{needPayment:true}},
 // ----- payments (placeholder: nothing is charged) -----
 createPayment({purpose,listingId,landlord,amount,method,planId}){const p={id:uid(),ref:ref(),purpose,listingId:listingId||null,landlord,amount,method,planId:planId||null,status:"pending",created:now()};set("payments",[...get("payments",[]),p]);return p},
 payments:()=>get("payments",[]),
 // Staff records a payment that arrived outside the site (e.g. mobile money). Boaz verifies transaction_id + amount + timestamp.
 recordPayment(pid,{transaction_id,amount,paid_at,recorded_by}){
  if(!transaction_id||!amount||!paid_at)throw Error("Transaction ID, amount and timestamp are all required");
  const ps=get("payments",[]),p=ps.find(x=>x.id===pid);if(!p)throw Error("Payment not found");
  if(+amount!==+p.amount)throw Error(`Amount K${amount} does not match the K${p.amount} due`);
  if(ps.some(x=>x.transaction_id===transaction_id))throw Error("This transaction ID is already recorded");
  Object.assign(p,{status:"recorded",transaction_id,paid_amount:+amount,paid_at,recorded_by,recorded_at:now(),boaz_verified:false});set("payments",ps);
  if(p.purpose==="verification"&&p.listingId){upd(p.listingId,{payConfirmed:true,feePaid:true});log(p.listingId,`Verification fee recorded (txn ${transaction_id}).`,recorded_by)}
  if(p.purpose==="subscription"){const u=userById(p.landlord);const from=Math.max(now(),u.subPaidUntil||0);DB.updateUser({subPaidUntil:from+C.LISTING_PERIOD_DAYS*DAY,plan:p.planId||u.plan},u.id)}
  if(p.purpose==="boost"&&p.listingId){const l=listing(p.listingId);upd(p.listingId,{boostUntil:Math.max(now(),l.boostUntil||0)+7*DAY})}
  return p},
 // ----- metrics -----
 lastViewed:()=>get("lastViewed",null),
 trackView(id){set("lastViewed",id);const k="rez_seen_"+id;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,1);const v=get("views",{});v[id]=(v[id]||0)+1;set("views",v);set("viewlog",[...get("viewlog",[]).slice(-2000),{id,at:now()}])},
 addEnquiry(e){set("enquiries",[...get("enquiries",[]),{...e,id:uid(),at:now()}])},
 enquiries:()=>get("enquiries",[]),
 viewlog:()=>get("viewlog",[]),
 // ----- accounts -----
 users, userById,
 user:()=>get("session",null)&&userById(get("session")),
 signUp({name,email,password,role,google,phone}){const us=users();if(us.find(u=>u.email===email))throw Error("An account with this email already exists");const u={id:uid(),name,email,password,role,phone:phone||"",google:!!google,plan:"starter",subPaidUntil:0,saved:[],trips:[],meets:{},created:now()};us.push(u);set("users",us);set("session",u.id);return u},
 signIn(email,password){const u=users().find(u=>u.email===email&&u.password===password);if(!u)throw Error("Wrong email or password");set("session",u.id);return u},
 signOut(){localStorage.removeItem(K("session"))},
 updateUser(p,id){const s=id||get("session");set("users",users().map(u=>u.id===s?{...u,...p}:u))},
 staffDemo(){const email="staff.demo@rez.example";let u=users().find(x=>x.email===email);if(!u){const us=users();u={id:"staff-demo",name:"REZ Staff (demo)",email,password:"",role:"admin",saved:[],trips:[],meets:{}};us.push(u);set("users",us)}set("session",u.id);return u},
 applications:()=>get("apps",[]),
 apply(a){const x=get("apps",[]);const n={...a,id:uid(),status:"Submitted",created:now()};x.push(n);set("apps",x);return n},
 setAppStatus(id,status){set("apps",get("apps",[]).map(a=>a.id===id?{...a,status}:a))},
 advanceClock(days){set("clock",get("clock",0)+days*DAY)}, resetClock(){set("clock",0)}, clockOffset:()=>get("clock",0)
};
return DB})();
