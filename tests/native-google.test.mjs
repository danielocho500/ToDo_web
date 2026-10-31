import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Android shows Google before any network request and permits retry on failure',async()=>{
 const elements=new Map();let calls=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',appendChild(child){this.child=child;}});return elements.get(id);};
 const context=vm.createContext({URLSearchParams,location:{hash:''},window:{ToDoNative:{request:async()=>{calls++;throw Error('Sin conexión');}}},
  document:{getElementById:element,createElement:()=>({})}});
 const source=readFileSync(new URL('../public/online.js',import.meta.url),'utf8');
 vm.runInContext(source.replaceAll('export ','')+'\nglobalThis.startGoogle=initGoogle;',context);
 await context.startGoogle();
 const button=element('googleLogin').child;
 assert.equal(button.id,'nativeGoogleLogin');assert.equal(calls,0);
 await button.onclick();assert.equal(calls,1);assert.equal(button.disabled,false);
 assert.equal(element('authError').textContent,'Sin conexión');
 await button.onclick();assert.equal(calls,2);assert.equal(button.disabled,false);
});
