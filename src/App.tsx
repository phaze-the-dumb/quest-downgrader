let App = () => {
  let token: string;

  let url = new URL(window.location.href);
  let blob = url.searchParams.get('blob');

  let finalDownloadUrl = '';
  let downloadButton: HTMLElement;

  if(blob){
    localStorage.setItem('blob', blob);
    document.write("Authentication finished, you may close this window now");

    return;
  }

  let binary = url.searchParams.get('bin_id')!;

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

    finalDownloadUrl = 'https://securecdn.oculus.com/binaries/download/?id=' + binary + '&access_token=' + token;
    downloadButton.style.display = 'inline-block';
  }

  return (
    <>
      <div onClick={startLogin} class="button">Start</div><br />
      <div style={{ display: 'none' }} ref={( el ) => downloadButton = el} onClick={() => window.open(finalDownloadUrl)} class="button">Download</div><br />
    </>
  )
}

export default App
