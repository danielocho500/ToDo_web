// This file is inert in the browser. Android uses native networking and account UI.
(() => {
  const cap=window.Capacitor;
  if(!cap?.isNativePlatform())return;
  const http=cap.Plugins.CapacitorHttp;
  const google=cap.Plugins.GoogleAuth;
  const files=cap.Plugins.Filesystem;
  const share=cap.Plugins.Share;
  window.ToDoNative={
    async request(path,options){
      const result=await http.request({url:'https://todo-priority.onrender.com'+path,
        method:options.method,headers:options.headers,
        ...(options.body===undefined?{}:{data:JSON.parse(options.body)}),
        responseType:'json',connectTimeout:30000,readTimeout:90000});
      return {ok:result.status>=200&&result.status<300,status:result.status,
        json:async()=>typeof result.data==='string'?JSON.parse(result.data):result.data};
    },
    signIn:clientId=>google.signIn({clientId}),
    signOut:()=>google.signOut(),
    async exportJSON(data){
      const result=await files.writeFile({path:'to-do-priorizer-'+new Date().toISOString().slice(0,10)+'.json',
        directory:'CACHE',encoding:'utf8',data:JSON.stringify(data,null,2)});
      await share.share({title:'Mis tareas',files:[result.uri],dialogTitle:'Guardar o compartir tareas'});
    }
  };
})();
