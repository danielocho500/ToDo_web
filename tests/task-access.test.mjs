import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/online.js',import.meta.url),'utf8');
function setup(){
 const elements=new Map(),stored=new Map(),calls=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{hidden:true,value:'',textContent:'',showModal(){this.open=true;},focus(){this.focused=true;}});
  return elements.get(id);
 };
 const personal={id:'personal',name:'Mis tareas',owner:'user',members:[],personal:true};
 const group={id:'shared',name:'Compartidas',owner:'user',members:[]};
 let created=false;
 const context=vm.createContext({URLSearchParams,structuredClone,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},location:{hash:''},
  document:{getElementById:element,addEventListener(){}},window:{addEventListener(){}},setInterval(){},
  fetch:async(url,options)=>{
   calls.push(url);let result;
   if(url==='/api/auth/config')result={google_client_id:''};
   else if(url==='/api/auth/me')result={id:'user',name:'Test',email:'test@example.com'};
   else if(url==='/api/spaces'&&options.method==='POST'){created=true;result=group;}
   else if(url==='/api/spaces')result=created?[group,personal]:[personal];
   else if(url==='/api/spaces/personal/state')result={space:personal,revision:0,state:{tasks:[]}};
   else if(url==='/api/spaces/shared/state')result={space:group,revision:0,state:{tasks:[]}};
   else throw new Error('Unexpected request: '+url);
   return {ok:true,json:async()=>result};
  }
 });
 vm.runInContext(source.replaceAll('export ','')+'\nglobalThis.apiTest={initOnline,requestEdit,canEdit,queueSave};',context);
 return {api:context.apiTest,element,stored,calls};
}

test('without a session, editing explains that sign-in is required',()=>{
 const {api,element}=setup();
 assert.equal(api.requestEdit(),false);
 assert.equal(element('authScreen').hidden,false);
 assert.match(element('authError').textContent,/Inicia sesión/);
});

test('individual tasks are editable immediately and shared groups remain optional',async()=>{
 const {api,element}=setup();
 await api.initOnline({apply(){}});
 assert.equal(api.canEdit(),true);
 assert.equal(api.requestEdit(),true);
 assert.notEqual(element('accountDialog').open,true);
 assert.equal(element('spaces').value,'personal');
 assert.equal(element('groupAdmin').hidden,true);
 assert.equal(element('membersHeading').hidden,true);
 element('spaceName').value='Compartidas';
 await element('createSpaceForm').onsubmit({preventDefault(){}});
 assert.equal(element('spaces').value,'shared');
 assert.equal(element('groupAdmin').hidden,false);
 element('spaces').value='personal';
 await element('spaces').onchange();
 assert.equal(api.requestEdit(),true);
 assert.equal(element('groupAdmin').hidden,true);
});


test('guest saves and reloads locally and cannot call group APIs',async()=>{
 const {api,element,stored,calls}=setup();let applied;
 await api.initOnline({apply:state=>{applied=state;},snapshot:()=>({tasks:[]})});
 element('guestLogin').onclick();
 assert.equal(api.canEdit(),true);
 assert.equal(element('createSpaceForm').hidden,true);
 assert.equal(element('joinSpaceForm').hidden,true);
 const before=calls.length;
 await api.queueSave({tasks:[{id:'local'}]});
 element('guestLogin').onclick();
 assert.equal(applied.tasks[0].id,'local');
 await element('createSpaceForm').onsubmit({preventDefault(){}});
 await element('joinSpaceForm').onsubmit({preventDefault(){}});
 assert.equal(calls.length,before);
 assert.match(element('accountError').textContent,/Inicia/);
 assert.equal(stored.size,1);
});

test('storage failure reports unsaved data without sending it to the server',async()=>{
 const {api,element,calls,stored}=setup();
 await api.initOnline({apply(){},snapshot:()=>({tasks:[]})});
 element('guestLogin').onclick();stored.set=()=>{throw Error('Quota exceeded');};
 const before=calls.length;await api.queueSave({tasks:[]});
 assert.equal(calls.length,before);assert.equal(api.canEdit(),false);
 assert.match(element('notice').textContent,/Exporta/);
});
