// Fo_Fata — client Supabase public. La clé publishable est conçue pour le navigateur.
// Ne jamais placer une clé secret/service_role dans ce fichier.
const SUPABASE_URL = "https://xcptolgkonbyytpbviav.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_EPhpFs4WgeC54mQvpOo5nQ__ObWF_cD";
const sbClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let cat = "Tout", q = "", likes = new Set(), currentUser = null, listingCache = [], categoryCache = [];
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

function toast(s) {
  $("toast").textContent = s; $("toast").classList.remove("hidden");
  clearTimeout(window.tt); window.tt = setTimeout(() => $("toast").classList.add("hidden"), 4000);
}
function modal(t,d,html) {
  $("modalTitle").textContent=t; $("modalDesc").textContent=d;
  $("modalContent").innerHTML=html; $("backdrop").classList.remove("hidden");
}
function close(){ $("backdrop").classList.add("hidden"); }
function escapeHtml(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function friendlyCategory(name){return name || "Autres";}
function conditionLabel(v){return ({neuf:"Neuf",tres_bon_etat:"Très bon état",bon_etat:"Bon état",occasion:"Occasion"})[v] || "Article";}

async function refreshUser(){
  if(!sbClient) return;
  const {data:{user}} = await sbClient.auth.getUser();
  currentUser = user || null;
  $("loginBtn").textContent = currentUser ? "Mon compte / Déconnexion" : "Se connecter";
}
async function loadCategories(){
  if(!sbClient) return;
  const {data,error}=await sbClient.from("categories").select("id,name,slug").order("name");
  if(error){console.warn("Chargement catégories:",error.message);return;}
  categoryCache=data||[];
  const select=$("productCategory");
  if(select){select.innerHTML='<option value="">Choisir une catégorie</option>'+categoryCache.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");}
}
async function loadListings(){
  if(!sbClient){renderConnectionError("La bibliothèque Supabase ne s’est pas chargée. Vérifiez la connexion Internet.");return;}
  $("grid").innerHTML='<div class="loading">Chargement des annonces depuis Fo_Fata…</div>';
  const {data,error}=await sbClient.from("listings")
    .select("id,title,description,price_xof,condition,city,created_at,category_id,status,categories(name)")
    .eq("status","published").order("created_at",{ascending:false}).limit(100);
  if(error){
    console.error(error);
    $("grid").innerHTML='<div class="loading">Impossible de charger les annonces. Vérifiez les autorisations RLS et l’accès Data API dans Supabase.</div>';
    $("empty").classList.add("hidden"); return;
  }
  listingCache=(data||[]).map(x=>({...x, categoryName:x.categories?.name||"Autres"}));
  render();
}
function renderConnectionError(msg){$("grid").innerHTML=`<div class="loading">${escapeHtml(msg)}</div>`;}
function render(){
  const arr=listingCache.filter(x=>(cat==="Tout"||x.categoryName===cat)&&(`${x.title} ${x.categoryName} ${x.city||""} ${x.description||""}`).toLowerCase().includes(q.toLowerCase()));
  const sort=$("sortSelect").value;
  if(sort==="low")arr.sort((a,b)=>a.price_xof-b.price_xof);
  if(sort==="high")arr.sort((a,b)=>b.price_xof-a.price_xof);
  const emojis={"Téléphones":"📱","Électronique":"🎧","Mode":"👟","Maison":"🛋️","Véhicules":"🚗","Immobilier":"🏠"};
  const classes={"Téléphones":"","Électronique":"blue","Mode":"green","Maison":"purple","Véhicules":"green","Immobilier":"purple"};
  $("grid").innerHTML=arr.map(x=>`<article class="card"><div class="productpic ${classes[x.categoryName]||""}"><span class="badge">${escapeHtml(conditionLabel(x.condition))}</span><button class="heart ${likes.has(x.id)?"liked":""}" data-heart="${escapeHtml(x.id)}" aria-label="Ajouter aux favoris">${likes.has(x.id)?"♥":"♡"}</button>${emojis[x.categoryName]||"🛍️"}</div><div class="info"><small>${escapeHtml(x.categoryName)}</small><h3>${escapeHtml(x.title)}</h3><div class="price">${fmt(Number(x.price_xof||0))}</div><div class="meta"><span>📍 ${escapeHtml(x.city||"Côte d’Ivoire")}</span><span>${new Date(x.created_at).toLocaleDateString("fr-FR")}</span></div></div></article>`).join("");
  $("empty").classList.toggle("hidden",arr.length>0);
  document.querySelectorAll("[data-heart]").forEach(b=>b.onclick=()=>{const id=b.dataset.heart;likes.has(id)?likes.delete(id):likes.add(id);render();});
  document.querySelectorAll("[data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===cat));
}
function login(){
  modal("Bienvenue sur Fo_Fata","Connectez-vous avec votre adresse e-mail.",`<form id="loginForm"><label for="loginEmail">Adresse e-mail</label><input id="loginEmail" type="email" required autocomplete="email" placeholder="nom@exemple.com"><label for="loginPassword">Mot de passe</label><input id="loginPassword" type="password" required minlength="6" autocomplete="current-password" placeholder="Votre mot de passe"><button class="primary">Se connecter</button></form><div class="switch">Pas encore de compte ? <button id="registerSwitch">Créer un compte</button></div><div class="switch"><button id="forgotSwitch">Mot de passe oublié ?</button></div>`);
  $("loginForm").onsubmit=async e=>{e.preventDefault();const email=$("loginEmail").value.trim(),password=$("loginPassword").value;const {error}=await sbClient.auth.signInWithPassword({email,password});if(error){toast(error.message);return;}await refreshUser();close();toast("Connexion réussie.");};
  $("registerSwitch").onclick=register;
  $("forgotSwitch").onclick=forgotPassword;
}
function register(){
  modal("Créer votre compte","Votre essai gratuit de 30 jours commence à la création du compte.",`<form id="registerForm"><div class="row"><div><label for="firstName">Prénom</label><input id="firstName" required autocomplete="given-name" placeholder="Prénom"></div><div><label for="lastName">Nom</label><input id="lastName" required autocomplete="family-name" placeholder="Nom"></div></div><label for="regEmail">Adresse e-mail</label><input id="regEmail" type="email" required autocomplete="email" placeholder="nom@exemple.com"><label for="regPhone">Téléphone (facultatif)</label><input id="regPhone" type="tel" placeholder="Ex. 07 00 00 00 00"><label for="regPassword">Mot de passe</label><input id="regPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="6 caractères minimum"><button class="primary">Créer mon compte</button></form><div class="switch">Déjà inscrit ? <button id="loginSwitch">Se connecter</button></div>`);
  $("registerForm").onsubmit=async e=>{
    e.preventDefault();
    const display_name=($("firstName").value+" "+$("lastName").value).trim();
    const email=$("regEmail").value.trim(),password=$("regPassword").value,phone=$("regPhone").value.trim();
    const {data,error}=await sbClient.auth.signUp({email,password,options:{data:{display_name,phone}}});
    if(error){toast(error.message);return;}
    if(data.session){currentUser=data.user;await refreshUser();close();toast("Compte créé. Votre essai de 30 jours commence maintenant.");}
    else {close();toast("Compte créé. Consultez votre e-mail pour confirmer l’inscription, puis connectez-vous.");}
  };
  $("loginSwitch").onclick=login;
}
function forgotPassword(){
  modal("Réinitialiser le mot de passe","Nous enverrons un lien de réinitialisation à votre adresse e-mail.",`<form id="forgotForm"><label for="forgotEmail">Adresse e-mail</label><input id="forgotEmail" type="email" required placeholder="nom@exemple.com"><button class="primary">Envoyer le lien</button></form>`);
  $("forgotForm").onsubmit=async e=>{e.preventDefault();const {error}=await sbClient.auth.resetPasswordForEmail($("forgotEmail").value.trim());if(error){toast(error.message);return;}close();toast("Si cette adresse est enregistrée, un e-mail de réinitialisation sera envoyé.");};
}
async function accountAction(){
  if(!currentUser){login();return;}
  const {error}=await sbClient.auth.signOut();
  if(error){toast(error.message);return;}
  await refreshUser();toast("Vous êtes déconnecté.");
}
async function getSubscription(){
  const {data,error}=await sbClient.from("subscriptions").select("trial_started_at,paid_until").eq("user_id",currentUser.id).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("Aucun abonnement n’a été créé pour ce compte. Vérifiez le déclencheur d’inscription Supabase.");
  const now=Date.now(),trialStart=new Date(data.trial_started_at).getTime(),trialEnd=trialStart+30*24*60*60*1000;
  const paidEnd=data.paid_until?new Date(data.paid_until).getTime():0;
  return {active:now<trialEnd||now<paidEnd,trialEnd,paidEnd};
}
async function publish(){
  if(!sbClient){toast("Connexion Supabase indisponible.");return;}
  await refreshUser();
  if(!currentUser){login();toast("Connectez-vous ou créez un compte avant de publier.");return;}
  let sub;
  try{sub=await getSubscription();}catch(e){toast(e.message);return;}
  if(!sub.active){modal("Abonnement requis","Votre essai gratuit est terminé. L’abonnement coûte 500 FCFA pour 30 jours.",`<p>Les paiements seront activés après la connexion d’un prestataire de paiement. Aucun paiement ne peut être effectué depuis ce prototype.</p><button class="primary" id="subOk">Compris</button>`);$("subOk").onclick=close;return;}
  modal("Déposer une annonce","Pendant votre essai gratuit ou avec un abonnement actif, vous pouvez publier.",`<form id="publishForm"><label for="productTitle">Titre de l’article</label><input id="productTitle" required minlength="3" maxlength="120" placeholder="Ex. Téléphone en très bon état"><div class="row"><div><label for="productCategory">Catégorie</label><select id="productCategory" required><option value="">Chargement…</option></select></div><div><label for="productPrice">Prix (FCFA)</label><input id="productPrice" type="number" min="0" step="1" required placeholder="25000"></div></div><label for="productLocation">Ville / quartier</label><input id="productLocation" required placeholder="Ex. Abidjan, Cocody"><label for="productCondition">État</label><select id="productCondition" required><option value="neuf">Neuf</option><option value="tres_bon_etat">Très bon état</option><option value="bon_etat">Bon état</option><option value="occasion">Occasion</option></select><label for="productDescription">Description</label><textarea id="productDescription" placeholder="Décrivez votre article…"></textarea><button class="primary">Publier l’annonce</button></form>`);
  await loadCategories();
  $("publishForm").onsubmit=async e=>{
    e.preventDefault();
    const payload={seller_id:currentUser.id,title:$("productTitle").value.trim(),category_id:Number($("productCategory").value),price_xof:Number($("productPrice").value),city:$("productLocation").value.trim(),condition:$("productCondition").value,description:$("productDescription").value.trim()||null,status:"published"};
    if(!payload.category_id){toast("Choisissez une catégorie.");return;}
    const {error}=await sbClient.from("listings").insert(payload);
    if(error){console.error(error);toast("Publication refusée par Supabase : "+error.message);return;}
    close();toast("Annonce publiée.");await loadListings();
  };
}
$("searchForm").onsubmit=e=>{e.preventDefault();q=$("searchInput").value.trim();render();$("annonces").scrollIntoView({behavior:"smooth"});};
$("searchInput").oninput=e=>{q=e.target.value.trim();render();};
$("categories").onclick=e=>{const b=e.target.closest("[data-cat]");if(b){cat=b.dataset.cat;render();$("annonces").scrollIntoView({behavior:"smooth"});}};
$("sortSelect").onchange=render;
$("loginBtn").onclick=accountAction;
["publishBtn","heroPublishBtn","bannerPublishBtn"].forEach(id=>$(id).onclick=publish);
$("close").onclick=close;$("backdrop").onclick=e=>{if(e.target===$("backdrop"))close();};document.onkeydown=e=>{if(e.key==="Escape")close();};
if(sbClient){
  sbClient.auth.onAuthStateChange(()=>{setTimeout(refreshUser,0);});
  refreshUser().then(loadCategories).then(loadListings);
}else{renderConnectionError("Impossible de charger Supabase. Vérifiez votre connexion Internet.");}
