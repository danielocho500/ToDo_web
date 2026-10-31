import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/native.js',import.meta.url),'utf8');
test('native adapter leaves browser behavior unchanged',()=>{
 const window={};vm.runInNewContext(source,{window});assert.equal(window.ToDoNative,undefined);
});
test('native API targets HTTPS backend and preserves CSRF header and JSON body',async()=>{
 let request;
 const window={Capacitor:{isNativePlatform:()=>true,Plugins:{CapacitorHttp:{
  request:async options=>{request=options;return {status:401,data:{detail:'Inicia sesión'}};}
 }}}};
 vm.runInNewContext(source,{window});
 const response=await window.ToDoNative.request('/api/auth/login',{method:'POST',headers:{'X-Requested-With':'todo-priorizer'},body:'{"email":"test@example.com"}'});
 assert.equal(request.url,'https://todo-priority.onrender.com/api/auth/login');
 assert.equal(request.headers['X-Requested-With'],'todo-priorizer');
 assert.equal(request.data.email,'test@example.com');
 assert.equal(response.status,401);assert.equal(response.ok,false);
 assert.equal((await response.json()).detail,'Inicia sesión');
});
