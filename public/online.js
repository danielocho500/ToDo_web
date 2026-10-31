const $=id=>document.getElementById(id);
const guestKey='todo-priorizer:guest:v1';
let guest=false,emptyState;
let hooks,user=null,spaces=[],active=null,revision=0,busy=false,failed=false,register=false;
let inviteToken=new URLSearchParams(location.hash.slice(1)).get('invite');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const getMembers=()=>active?.members||[];
export const canEdit=()=>(guest||!!user)&&!!active&&!busy&&!failed;
export function requestEdit(){
 if(!user&&!guest){$('authError').textContent='Inicia sesión para crear o editar tareas.';$('authScreen').hidden=false;return false;}
 if(busy||failed){const message=failed?'Hay cambios sin guardar. Exporta tu JSON antes de recargar.':'Estamos guardando. Intenta de nuevo en un momento.';status(message);$('notice').textContent=message;return false;}
 if(!active){$('notice').textContent='Tus tareas aún no están disponibles. Recarga la página para volver a cargarlas.';return false;}
 return true;
}
async function api(path,method='GET',body){if(guest)throw Error('Inicia sesión para acceder a grupos.');const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'todo-priorizer'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401&&user){user=null;$('authScreen').hidden=false;}throw Error(typeof data.detail==='string'?data.detail:response.status===422?'Revisa los datos: hay un campo inválido.':'No se pudo completar la solicitud.');}return response.json();}
function status(text){$('syncStatus').textContent=text;}
export async function queueSave(state){if(!active||busy||failed)return;if(guest){try{localStorage.setItem(guestKey,JSON.stringify(state));status('Guardado solo en este navegador');}catch(e){failed=true;status('No se pudo guardar en este navegador');$('notice').textContent='Exporta el JSON antes de salir para conservar tus cambios.';}return;}busy=true;status('Guardando…');const backup=structuredClone(state);try{const result=await api('/spaces/'+active.id+'/state','PUT',{revision,state:backup});revision=result.revision;status('Guardado');}catch(e){failed=true;status('Cambios sin guardar');$('notice').textContent=e.message+' Exporta el JSON para conservar estos cambios y recarga la página.';}finally{busy=false;}}
async function load(id){const result=await api('/spaces/'+id+'/state');if(guest)return;active=result.space;revision=result.revision;failed=false;hooks.apply(result.state);status('Sincronizado');$('spaces').value=id;}
async function refreshSpaces(preferred){const loadedSpaces=await api('/spaces');if(guest)return;spaces=loadedSpaces;spaces.sort((a,b)=>Number(!!b.personal)-Number(!!a.personal));$('spaces').innerHTML=spaces.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');const id=preferred||active?.id;const next=spaces.find(s=>s.id===id)||spaces[0];if(next)await load(next.id);else{active=null;status('No se pudieron cargar tus tareas. Recarga la página.');}accountView();}
async function enter(){const authenticated=await api('/auth/me');if(guest)return;user=authenticated;$('authScreen').hidden=true;if(inviteToken){try{const joined=await api('/invites/accept','POST',{token:inviteToken});inviteToken=null;history.replaceState(null,'',location.pathname);await refreshSpaces(joined.id);}catch(e){await refreshSpaces();$('accountError').textContent=e.message;$('accountDialog').showModal();}}else await refreshSpaces();}
function accountView(){$('createSpaceForm').hidden=guest;$('joinSpaceForm').hidden=guest;$('logout').textContent=guest?'Salir del modo invitado':'Cerrar sesión';$('accountName').textContent=guest?'Invitado · Datos solo en este navegador. Inicia sesión para usar grupos.':user?.name+' · '+user?.email;$('groupAdmin').hidden=!active||active.personal||active.owner!==user?.id;$('inviteResultLabel').hidden=true;$('membersHeading').hidden=!!active?.personal;$('members').innerHTML=(active?.personal?[]:getMembers()).map(m=>`<div class="memberRow"><span>${esc(m.name)} · ${esc(m.email)}${active.owner===m.id?' · administrador':''}</span>${active.owner===user?.id&&m.id!==user?.id?`<button data-remove="${esc(m.id)}">Quitar</button>`:''}</div>`).join('');}
function lockControls(event){if((busy||failed)&&!event.target.closest('#export,#account,#closeAccount,#logout,#authScreen')){if(event.target.closest('button,input,select,textarea')){event.preventDefault();event.stopImmediatePropagation();const message=failed?'Exporta tus cambios y recarga':'Guardando…';status(message);$('notice').textContent=message;}}}
export async function initOnline(callbacks){hooks=callbacks;emptyState=callbacks.snapshot?structuredClone(callbacks.snapshot()):{tasks:[]};document.addEventListener('click',lockControls,true);document.addEventListener('change',lockControls,true);document.addEventListener('submit',lockControls,true);
$('guestLogin').onclick=()=>{try{const saved=localStorage.getItem(guestKey);hooks.apply(saved?JSON.parse(saved):structuredClone(emptyState));guest=true;user=null;active={id:'guest',personal:true,members:[]};failed=false;$('spaces').innerHTML='<option value="guest">Mis tareas · Invitado</option>';$('spaces').value='guest';$('spaces').disabled=true;$('authScreen').hidden=true;status('Solo en este navegador · Sin acceso a grupos');accountView();}catch(e){$('authError').textContent='No se pudieron abrir tus datos locales: '+e.message;}};
$('authToggle').onclick=()=>{register=!register;$('nameLabel').hidden=!register;$('authName').required=register;$('authHeading').textContent=register?'Crear una cuenta':'Iniciar sesión';$('authSubmit').textContent=register?'Crear cuenta':'Entrar';$('authToggle').textContent=register?'Ya tengo cuenta':'Crear una cuenta';$('authPassword').autocomplete=register?'new-password':'current-password';};
$('authForm').onsubmit=async e=>{e.preventDefault();$('authError').textContent='';$('authSubmit').disabled=true;try{await api('/auth/'+(register?'register':'login'),'POST',{email:$('authEmail').value,password:$('authPassword').value,...(register?{name:$('authName').value}:{})});$('authPassword').value='';await enter();}catch(e){$('authError').textContent=e.message;}finally{$('authSubmit').disabled=false;}};
$('spaces').onchange=async()=>{const id=$('spaces').value;if(busy||failed){$('spaces').value=active?.id||'';return;}try{await load(id);accountView();}catch(e){$('spaces').value=active?.id||'';status(e.message);}};
$('account').onclick=()=>{accountView();$('accountError').textContent='';$('accountDialog').showModal();};$('closeAccount').onclick=()=>$('accountDialog').close();
$('createSpaceForm').onsubmit=async e=>{e.preventDefault();try{const space=await api('/spaces','POST',{name:$('spaceName').value});$('spaceName').value='';await refreshSpaces(space.id);$('accountError').textContent='Grupo creado.';}catch(e){$('accountError').textContent=e.message;}};
$('joinSpaceForm').onsubmit=async e=>{e.preventDefault();try{let token=$('inviteInput').value.trim();if(token.includes('#'))token=new URLSearchParams(token.split('#')[1]).get('invite')||'';const joined=await api('/invites/accept','POST',{token});$('inviteInput').value='';await refreshSpaces(joined.id);$('accountError').textContent='Ya eres parte del grupo.';}catch(e){$('accountError').textContent=e.message;}};
$('inviteButton').onclick=async()=>{try{const result=await api('/spaces/'+active.id+'/invites','POST');$('inviteResult').value=location.origin+'/#invite='+encodeURIComponent(result.token);$('inviteResultLabel').hidden=false;$('accountError').textContent='Válida por 48 horas. Quien tenga el enlace puede unirse.';$('inviteResult').select();}catch(e){$('accountError').textContent=e.message;}};
$('revokeInvites').onclick=async()=>{try{await api('/spaces/'+active.id+'/invites','DELETE');$('inviteResultLabel').hidden=true;$('accountError').textContent='Invitaciones revocadas.';}catch(e){$('accountError').textContent=e.message;}};
$('members').onclick=async e=>{const b=e.target.closest('[data-remove]');if(!b||!confirm('¿Quitar a esta persona del grupo?'))return;try{await api('/spaces/'+active.id+'/members/'+b.dataset.remove,'DELETE');await refreshSpaces();}catch(e){$('accountError').textContent=e.message;}};
$('logout').onclick=async()=>{if(busy){$('notice').textContent='Espera a que termine de guardar antes de salir.';return;}if(guest){if(failed&&!confirm('Hay cambios sin guardar. Exporta el JSON antes de salir. ¿Salir de todos modos?'))return;location.reload();return;}if(failed&&!confirm('Tienes cambios sin guardar. ¿Cerrar sesión?'))return;try{await api('/auth/logout','POST');location.reload();}catch(e){$('accountError').textContent=e.message;$('notice').textContent=e.message;}};
initGoogle();
try{await enter();}catch(e){if(user){$('authError').textContent=e.message;$('authScreen').hidden=false;}else if(!guest)$('authScreen').hidden=false;}
setInterval(async()=>{if(!user||!active||busy||failed||hooks.isEditing()||document.hidden)return;try{const result=await api('/spaces/'+active.id+'/state');if(result.revision!==revision){active=result.space;revision=result.revision;hooks.apply(result.state);status('Sincronizado');}}catch(e){status(e.message);}},15000);
window.addEventListener('beforeunload',e=>{if(busy||failed){e.preventDefault();e.returnValue='';}});
}

async function initGoogle(){
 try{
  const config=await api('/auth/config');
  if(!config.google_client_id)return;
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  script.onerror=()=>{$('googleStatus').textContent='No se pudo cargar Google. Puedes usar correo o entrar como invitado.';};
  script.onload=()=>{
   google.accounts.id.initialize({client_id:config.google_client_id,callback:async result=>{
    $('authError').textContent='';
    try{await api('/auth/google','POST',{credential:result.credential});await enter();}catch(e){$('authError').textContent=e.message;}
   }});
   google.accounts.id.renderButton($('googleLogin'),{theme:'outline',size:'large',text:'signin_with',locale:'es'});
  };
  document.head.appendChild(script);
 }catch(e){$('googleStatus').textContent='Google no está disponible en este momento.';}
}
