import * as cooki from './cookilib';

let App = () => {
  let token: string;

  let url = new URL(window.location.href);
  let blob = url.searchParams.get('blob');

  let returnUrl = url.searchParams.get('return');

  let finalDownloadUrl = '';

  if(blob){
    localStorage.setItem('blob', blob);

    return ( <p style={{ color: 'white' }}>Flow finished, you may close this popup now.</p>);
  }

  let binary = url.searchParams.get('bin_id')!;

  let tryUseSavedToken = () => {
    let token = cooki.getStore("token");
    if(!token)return startLogin();

    if(returnUrl){
      window.location.href = returnUrl + '?access_token=' + token;
      return;
    };

    finalDownloadUrl = 'https://securecdn.oculus.com/binaries/download/?id=' + binary + '&access_token=' + token;
    window.open(finalDownloadUrl);
  }

  let startLogin = async () => {
    let res = await fetch(`https://cors-proxy.phaze.workers.dev/?url=https://meta.graph.meta.com/webview_tokens_query`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br"
      },
      body: JSON.stringify({ access_token: "FRL|512466987071624|01d4a1f7fd0682aea7ee8ae987704d63" })
    });

    let resJson: any = await res.json();

    token = resJson.native_sso_token;
    let win = window.open(`https://meta-login-spoof.phaze.workers.dev/native_sso/confirm?native_app_id=512466987071624&native_sso_etoken=${resJson.native_sso_etoken}&utm_source=skyline_splash`, "Meta Login", "width=500,height=700")!
    win.focus();

    let i = setInterval(() => {
      let blob = localStorage.getItem('blob');

      if(blob){
        win.close();
        window.clearInterval(i);

        localStorage.removeItem('blob');

        console.log(blob);
        getToken(blob);
      }
    }, 100)
  }

  let getToken = async ( blob: string ) => {
    try{
      let res = await fetch(`https://cors-proxy.phaze.workers.dev/?url=https://meta.graph.meta.com/webview_blobs_decrypt`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br"
        },
        body: JSON.stringify({
          access_token: "FRL|512466987071624|01d4a1f7fd0682aea7ee8ae987704d63",
          blob,
          request_token: token
        })
      });

      let resJson: any = await res.json();
      console.log(resJson);

      doThingToToken(resJson.access_token)
    } catch(e){
      console.error('Invalid String');
    }
  }

  let doThingToToken = async ( accessToken: string ) => {
    let res = await fetch(`https://cors-proxy.phaze.workers.dev/?url=https://meta.graph.meta.com/graphql`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br"
      },
      body: JSON.stringify({
        access_token: accessToken,
        doc_id: "5787825127910775",
        variables: "{\"app_id\":\"1582076955407037\"}"
      })
    });

    let resJson: any = await res.json();
    let token = resJson.data.xfr_create_profile_token.profile_tokens[0].access_token;

    doOtherThingToToken(token);
  }

  let doOtherThingToToken = async ( accessToken: string ) => {
    if(returnUrl){
      window.location.href = returnUrl + '?access_token=' + accessToken;
      return;
    };

    let res = await fetch(`https://cors-proxy.phaze.workers.dev/?url=https://graph.oculus.com/authenticate_application%3Fapp_id=1481000308606657%26access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br"
      }
    });

    let resJson: any = await res.json();
    let token = resJson.access_token;

    console.log(token);
    cooki.setStore("token", token);

    finalDownloadUrl = 'https://securecdn.oculus.com/binaries/download/?id=' + binary + '&access_token=' + token;
    window.open(finalDownloadUrl);
  }

  return (
    <>
      <div class="cover"></div>
      <div class="stage">
        <h1 style={{ color: 'white' }}>Quest App Downloader.</h1>

        <div onClick={tryUseSavedToken} class="button">Download</div><br /><br />

        <p style={{ color: 'white', margin: '10px' }}>
          <b>PLEASE NOTE: </b>This app is not affiliated with meta or oculus in any way. Your login details are never saved outisde of this browser and are only proxied through cloudflare workers so we can obtain an access token to verify you own the app you are trying to download.
        </p>
      </div>

      <div class="error">
        <p style={{ color: 'white' }}>Download not working?</p>

        <div onClick={startLogin} class="button">Try This.</div><br /><br />
      </div>

      <div class="thanks">Thanks to kaitlyn for figuring this method out.</div>
    </>
  )
}

export default App
