import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/online.js',import.meta.url),'utf8');
function setup(){
 const elements=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{hidden:true,value:'',textContent:'',showModal(){this.open=true;},focus(){this.focused=true;}});
  return elements.get(id);
 };
 const group={id:'personal',name:'Personal',owner:'user',members:[]};
 let created=false;
 const context=vm.createContext({URLSearchParams,location:{hash:''},
  document:{getElementById:element,addEventListener(){}},window:{addEventListener(){}},setInterval(){},
  fetch:async(url,options)=>{
   let result;
   if(url==='/api/auth/me')result={id:'user',name:'Test',email:'test@example.com'};
   else if(url==='/api/spaces'&&options.method==='POST'){created=true;result=group;}
   else if(url==='/api/spaces')result=created?[group]:[];
   else if(url==='/api/spaces/personal/state')result={space:group,revision:0,state:{tasks:[]}};
   else throw new Error('Unexpected request: '+url);
   return {ok:true,json:async()=>result};
  }
 });
 vm.runInContext(source.replaceAll('export ','')+'\nglobalThis.apiTest={initOnline,requestEdit,canEdit};',context);
 return {api:context.apiTest,element};
}

test('without a session, editing explains that sign-in is required',()=>{
 const {api,element}=setup();
 assert.equal(api.requestEdit(),false);
 assert.equal(element('authScreen').hidden,false);
 assert.match(element('authError').textContent,/Inicia sesión/);
});

test('closing onboarding then requesting a task reopens group setup; creating a group enables editing',async()=>{
 const {api,element}=setup();
 await api.initOnline({apply(){}});
 element('accountDialog').open=false;
 assert.equal(api.canEdit(),false);
 assert.equal(api.requestEdit(),false);
 assert.equal(element('accountDialog').open,true);
 assert.match(element('accountError').textContent,/Personal/);
 assert.equal(element('spaceName').focused,true);
 element('spaceName').value='Personal';
 await element('createSpaceForm').onsubmit({preventDefault(){}});
 assert.equal(api.canEdit(),true);
 assert.equal(api.requestEdit(),true);
});
