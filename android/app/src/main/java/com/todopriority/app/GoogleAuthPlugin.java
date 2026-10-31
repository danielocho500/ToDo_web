package com.todopriority.app;

import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name="GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId=call.getString("clientId");
        if(clientId==null||clientId.isBlank()) {call.reject("Google no está configurado");return;}
        getActivity().runOnUiThread(() -> {
            GetCredentialRequest request=new GetCredentialRequest.Builder()
                .addCredentialOption(new GetSignInWithGoogleOption.Builder(clientId).build()).build();
            CredentialManager.create(getContext()).getCredentialAsync(getActivity(),request,null,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse,GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse result) {
                        try {
                            GoogleIdTokenCredential credential=GoogleIdTokenCredential.createFrom(result.getCredential().getData());
                            JSObject response=new JSObject();
                            response.put("credential",credential.getIdToken());
                            call.resolve(response);
                        } catch(Exception e) {call.reject("Google devolvió una credencial no válida");}
                    }
                    @Override public void onError(GetCredentialException e) {
                        call.reject("No se completó el acceso con Google. Comprueba tu conexión y la configuración OAuth de Android.",e.getType());
                    }
                });
        });
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(new ClearCredentialStateRequest(),null,
            ContextCompat.getMainExecutor(getContext()),new CredentialManagerCallback<Void,ClearCredentialException>() {
                @Override public void onResult(Void result) {call.resolve();}
                @Override public void onError(ClearCredentialException e) {call.resolve();}
            });
    }
}
