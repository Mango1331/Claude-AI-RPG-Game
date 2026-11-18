// One derived view of the existing host state. Save completion alone is not turn completion.
export function actionStatusView({unknown=false,worldRunning=false,saving=false,saveFailed=false,worldPending=false,worldFailed=false,phase='Bereit'}={}) {
    if(unknown)return {text:'Remoteabschluss unbekannt – kein automatischer neuer Versuch',blocked:true,retry:true};
    if(saveFailed)return {text:phase.startsWith('Speichern offen')?phase:'Speicherung offen – Abschluss prüfen',blocked:true,retry:true};
    if(worldRunning)return {text:'Weltabgleich läuft; Text bleibt als Entwurf erhalten',blocked:true,retry:false};
    if(saving)return {text:'Speichern läuft; Text bleibt als Entwurf erhalten',blocked:true,retry:false};
    if(worldPending || worldFailed)return {text:worldFailed?'Weltabgleich fehlgeschlagen – Abschluss ausdrücklich fortsetzen':'Weltabgleich offen – Abschluss prüfen / fortsetzen',blocked:true,retry:true};
    return {text:phase==='Gespeichert'?'Gespeichert':phase,blocked:false,retry:false};
}
