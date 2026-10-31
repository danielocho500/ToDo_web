// Run only against a dedicated test emulator after forwarding its WebView debug socket to 9222.
import assert from 'node:assert/strict';
const pages=await (await fetch('http://127.0.0.1:9222/json')).json();
const page=pages.find(p=>p.url.startsWith('https://localhost'));
assert.ok(page,'App WebView not found');
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let id=0;const pending=new Map();
socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const callback=pending.get(data.id);pending.delete(data.id);callback?.(data);}};
async function evaluate(expression){
 const callId=++id;
 const result=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(callId);reject(Error('WebView evaluation timed out'));},100000);
  pending.set(callId,result=>{clearTimeout(timer);resolve(result);});
  socket.send(JSON.stringify({id:callId,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
 });
 if(result.error||result.result?.exceptionDetails)throw Error(JSON.stringify(result.error||result.result.exceptionDetails));
 return result.result.result.value;
}
try {
 const info=await evaluate(`({native:!!window.ToDoNative,headingHidden:document.getElementById('authHeading').hidden,googleButton:!!document.getElementById('nativeGoogleLogin'),plugins:Object.keys(Capacitor.Plugins)})`);
 assert.equal(info.googleButton,true);assert.equal(info.native,true);assert.equal(info.headingHidden,true);
 for(const plugin of ['GoogleAuth','CapacitorHttp','Filesystem','Share'])assert.ok(info.plugins.includes(plugin));
 const network=await evaluate(`(async()=>{
  const response=await ToDoNative.request('/api/auth/config',{method:'GET',headers:{'X-Requested-With':'todo-priorizer'}});
  const config=await response.json();return {status:response.status,googleConfigured:!!config.google_client_id};
 })()`);
 assert.equal(network.status,200);assert.equal(network.googleConfigured,true);
 await evaluate(`document.getElementById('guestLogin').click()`);
 assert.equal(await evaluate(`document.getElementById('authScreen').hidden`),true);
 await evaluate(`document.getElementById('add').click();document.getElementById('title').value='Prueba Android local';document.getElementById('form').requestSubmit()`);
 const saved=await evaluate(`({tasks:JSON.parse(localStorage.getItem('todo-priorizer:guest:v1')).tasks.length,scoreVisible:!!document.querySelector('.score'),groupsHidden:document.getElementById('createSpaceForm').hidden})`);
 assert.ok(saved.tasks>=1);assert.equal(saved.scoreVisible,false);assert.equal(saved.groupsHidden,true);
 await evaluate(`setTimeout(()=>location.reload(),50);true`);
 await new Promise(resolve=>setTimeout(resolve,2500));
 await evaluate(`document.getElementById('guestLogin').click()`);
 assert.equal(await evaluate(`document.getElementById('tasks').textContent.includes('Prueba Android local')`),true);
 console.log('PASS: native plugins, HTTPS backend, guest task creation, reload persistence, group restrictions and hidden score.');
} finally {socket.close();}
