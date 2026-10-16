// REZ data layer. Everything is stored in localStorage today.
// To move to Supabase, re-implement these functions with the Supabase client;
// the UI only calls DB.* so nothing else needs to change.
const DB=(()=>{
const K=k=>"rez_"+k, get=(k,d)=>{try{return JSON.parse(localStorage.getItem(K(k)))??d}catch(e){return d}}, set=(k,v)=>localStorage.setItem(K(k),JSON.stringify(v));
const uid=()=>Math.random().toString(36).slice(2,10);
const SAMPLE=[
{id:"s1",title:"Self-contained student rooms near CBU",city:"Kitwe",type:"room",rent:1200,deposit:1200,upfront:3,yard:"Shared yard, 600 m²",address:"Riverside, Kitwe",lat:-12.808,lng:28.237,photos:["img/p5.jpg"],criteria:["Student ID","Guardian contact","1 reference"],amenities:["Wi-Fi","Water incl.","Security guard"],verified:true,featured:true},
{id:"s2",title:"Girls' boarding house, Northrise",city:"Ndola",type:"boarding",rent:950,deposit:500,upfront:2,yard:"Walled plot, 30 × 40 m",address:"Northrise, Ndola",lat:-12.948,lng:28.651,photos:["img/p2.jpg"],criteria:["Student ID","Guardian contact"],amenities:["Water & power incl.","Shared kitchen"],verified:false},
{id:"s3",title:"3-bed family house, Kabulonga",city:"Lusaka",type:"house",rent:9500,deposit:9500,upfront:3,yard:"Garden, 1,200 m²",address:"Kabulonga, Lusaka",lat:-15.415,lng:28.335,photos:["img/p7.jpg"],criteria:["Payslip or bank statement","NRC","2 references"],amenities:["Borehole","Parking ×2","Walled & gated"],verified:true},
{id:"s4",title:"2-bed apartment near UNZA",city:"Lusaka",type:"apartment",rent:3800,deposit:3800,upfront:2,yard:"Shared compound",address:"Great East Rd, Lusaka",lat:-15.392,lng:28.329,photos:["img/p4.jpg"],criteria:["Payslip","NRC"],amenities:["Parking","Solar backup"],verified:false},
{id:"s5",title:"Boarding rooms near Mulungushi Univ.",city:"Kabwe",type:"boarding",rent:800,deposit:400,upfront:3,yard:"Plot, 20 × 30 m",address:"Kabwe",lat:-14.44,lng:28.45,photos:["img/p1.jpg"],criteria:["Student ID"],amenities:["Wi-Fi"],verified:false},
{id:"s6",title:"2-bed house, Dambwa",city:"Livingstone",type:"house",rent:4500,deposit:4500,upfront:1,yard:"Garden, 800 m²",address:"Dambwa, Livingstone",lat:-17.84,lng:25.84,photos:["img/p6.jpg"],criteria:["Payslip","NRC","1 reference"],amenities:["Garden","Water tank"],verified:true}
].map(x=>({...x,sample:true,status:"active",owner:"sample"}));
const listings=()=>[...SAMPLE,...get("listings",[])];
return{
 listings, listing:id=>listings().find(x=>x.id===id),
 addListing(l){const a=get("listings",[]);const n={...l,id:"u"+uid(),status:"pending",verified:false,created:Date.now()};a.push(n);set("listings",a);return n},
 updateListing(id,p){set("listings",get("listings",[]).map(x=>x.id===id?{...x,...p}:x))},
 user:()=>get("session",null)&&get("users",[]).find(u=>u.id===get("session")),
 signUp({name,email,password,role,google}){const us=get("users",[]);if(us.find(u=>u.email===email))throw Error("An account with this email already exists");const u={id:uid(),name,email,password,role,google:!!google,saved:[],trips:[],meets:{}};us.push(u);set("users",us);set("session",u.id);return u},
 signIn(email,password){const u=get("users",[]).find(u=>u.email===email&&u.password===password);if(!u)throw Error("Wrong email or password");set("session",u.id);return u},
 signOut(){localStorage.removeItem(K("session"))},
 updateUser(p){const s=get("session");set("users",get("users",[]).map(u=>u.id===s?{...u,...p}:u))},
 applications:()=>get("apps",[]),
 apply(a){const x=get("apps",[]);const n={...a,id:uid(),status:"Submitted",created:Date.now()};x.push(n);set("apps",x);return n},
 setAppStatus(id,status){set("apps",get("apps",[]).map(a=>a.id===id?{...a,status}:a))}
}})();
