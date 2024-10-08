import { AdbDaemonTransport } from "@yume-chan/adb";
import { AdbDaemonWebUsbConnection, AdbDaemonWebUsbDevice, AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { Adb } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";

import anime, { AnimeInstance } from "animejs";
import { onMount } from "solid-js";
import { MaybeConsumable, ReadableStream } from "@yume-chan/stream-extra";
import { Eror } from "./Error";

class WebUsbProps{
  usingWebUsb!: () => void;
  webUsbCallback!: ( cb: ( url: string ) => void ) => void;
  updateLoadingBar!: ( percent: number, speed: number ) => void;
  startDownload!: () => void;
}

let WebUsb = ( props: WebUsbProps ) => {
  let manager: AdbDaemonWebUsbDeviceManager | undefined = AdbDaemonWebUsbDeviceManager.BROWSER;
  if(!manager)return ( <></> )

  let bgblur: HTMLElement;
  let container: HTMLElement;

  let webUsbSlides: HTMLElement[] = [];
  let webUsbSlidesAnimations: AnimeInstance[][] = [];

  let currentSlide = 0;

  let useWebUsb = async () => {
    advanceSlides();
    if(!manager){
      document.body.appendChild(<div><Eror header="WebUSB Error" body={<div>This browser does <b>not</b> support WebUSB, how did you even get this dialog open?</div> as HTMLElement} /></div> as HTMLElement);
      return;
    }

    const device: AdbDaemonWebUsbDevice | undefined = await manager.requestDevice();

    if(!device){
      deadvanceSlides();
      return;
    }

    console.log(device.serial);
    advanceSlides();

    let CredentialStore: AdbWebCredentialStore = new AdbWebCredentialStore("OculusDowngrader@meta.phazed.xyz");

    try {
      let connection: AdbDaemonWebUsbConnection = await device.connect();
      console.log(connection);

      let transport: AdbDaemonTransport = await AdbDaemonTransport.authenticate({
        serial: device.serial,
        connection,
        credentialStore: CredentialStore,
      });

      let adb: Adb = new Adb(transport);

      props.webUsbCallback(async ( url ) => {
        console.log('Downloading....', url);
        let signal = new AbortController();

        // Download via cors proxy as oculus' cdn doesn't have cors setup for this page

        // Make sure stream parameter is set or the worker will panic  v
        let res = await fetch('https://cors-proxy.phaze.workers.dev/?stream=yes&url=' + encodeURIComponent(url), { signal: signal.signal });

        console.log(res.status);

        let data = res.body!.getReader();
        let currentSize = 0;
        let totalSize = parseInt(res.headers.get('Content-Length')!);

        if(isNaN(totalSize)){
          document.body.appendChild(<div><Eror header="Download Error" body={<div>We cannot access the APK file for you, <b>Are you sure this account owns this app?</b></div> as HTMLElement} /></div> as HTMLElement);
          return;
        }

        props.startDownload();

        let sync = await adb.sync();

        let fileName = Math.random().toString().substring(2);
        let filePath = `/data/local/tmp/${fileName}.apk`;

        let stream = new ReadableStream<MaybeConsumable<Uint8Array>>({
          async pull(controller){
            let { done, value } = await data.read();

            if(done){
              console.log('Downloaded.');
              controller.close();

              return;
            }

            if(!value)return alert('No value in response stream');

            currentSize += value.length;
            controller.enqueue(value);

            let secs = (Date.now() - startTimestamp) / 1000
            let speed = (currentSize / 1000000) / secs;

            props.updateLoadingBar((currentSize / totalSize) * 100, speed);
          },
          cancel( cause ){
            console.log(cause);
            signal.abort();
          }
        },
        {
          size: () => totalSize
        });

        let startTimestamp = Date.now();

        console.log(filePath);

        try{
          console.log('file transferring');

          await sync.write({
            filename: filePath,
            file: stream
          })

          console.log('file transferred');
        } catch(e){
          console.log(e)

          document.body.appendChild(<div><Eror header="Transfer Error" body={<p>The quest device was disconnected before the transfer could be completed. Please reconnect the device and click the button below.</p> as HTMLElement} /></div> as HTMLElement);
          throw e;
        } finally{
          await sync.dispose();
        }

        console.log('File finished transferring');

        anime.set('.downloading', { translateY: '-150px' });
        anime({
          targets: '.downloading',
          easing: 'easeInOutQuad',
          opacity: 0,
          duration: 250,
          translateY: '-200px',
          complete: () => {
            document.querySelector<HTMLElement>('.downloading')!.style.display = 'none';
          }
        })

        document.querySelector<HTMLElement>('.installing')!.style.display = 'flex';
        anime.set('.installing', { translateY: '-100px', opacity: 0 });
        anime({
          targets: '.installing',
          easing: 'easeInOutQuad',
          opacity: 1,
          duration: 250,
          translateY: '-150px'
        })

        try{
          console.log('installing')

          let output = await adb.subprocess
            .spawnAndWait(`pm install ${filePath}`)
            .then(output => output.stdout.trim());

          console.log(output);

          if(output !== 'Sucess'){
            document.body.appendChild(<div><Eror header="Install Error" body={<div>We failed installing the app to your headset. <div class="adb-output">{ output }</div> For help please visit <a href="https://discord.gg/zwRfHQN2UY">this discord server</a></div> as HTMLElement} /></div> as HTMLElement);
          }
        } catch(e){
          console.log(e)

          document.body.appendChild(<div><Eror header="Install Error" body={<p>We failed installing the app to your headset. For help please visit <a href="https://discord.gg/zwRfHQN2UY">this discord server</a></p> as HTMLElement} /></div> as HTMLElement);
          throw e;
        } finally{
          await adb.rm(filePath);
        }

        anime.set('.installing', { translateY: '-150px' });
        anime({
          targets: '.installing',
          easing: 'easeInOutQuad',
          opacity: 0,
          duration: 250,
          translateY: '-200px',
          complete: () => {
            document.querySelector<HTMLElement>('.installing')!.style.display = 'none';
          }
        })

        document.querySelector<HTMLElement>('.done')!.style.display = 'flex';
        anime.set('.done', { translateY: '-100px', opacity: 0 });
        anime({
          targets: '.done',
          easing: 'easeInOutQuad',
          opacity: 1,
          duration: 250,
          translateY: '-150px'
        })
      });

      props.usingWebUsb();
      anime.set(container, { translateX: '-50%', translateY: '-50%' })

      anime({ targets: bgblur, opacity: 0, easing: 'easeInOutQuad', duration: 250, complete: () => bgblur.remove() });
      anime({ targets: container, opacity: 0, easing: 'easeInOutQuad', scale: '0.5', duration: 250, complete: () => container.remove() });
    } catch (error: any) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "NetworkError"
      ) {
        document.body.appendChild(<div><Eror header="Connection Error" body={<div>This device is already in use by another program<br />e.g. Sidequest, ADB</div> as HTMLElement} /></div> as HTMLElement);
      }

      document.body.appendChild(<div><Eror header="Error" body={<div>Something broke. For help please visit <a href="https://discord.gg/zwRfHQN2UY">this discord server</a> and send this: <div class="adb-output">{ error.toString() }</div> in the #support channel</div> as HTMLElement} /></div> as HTMLElement);
      throw error;
    }
  }

  let deadvanceSlides = () => {
    webUsbSlides[currentSlide - 1].style.display = 'block';

    anime.set(webUsbSlides[currentSlide], { translateX: '0', opacity: 1 });
    anime.set(webUsbSlides[currentSlide - 1], { translateX: '-250px', opacity: 0 });

    anime({
      targets: webUsbSlides[currentSlide],
      translateX: '250px',
      opacity: 0,
      easing: 'easeInOutQuad',
      duration: 250,
      complete: () => {
        webUsbSlides[currentSlide + 1].style.display = 'none'
      }
    });

    anime({ targets: webUsbSlides[currentSlide - 1], translateX: '0px', opacity: 1, easing: 'easeInOutQuad', duration: 250 });

    currentSlide--;
  }

  let advanceSlides = () => {
    webUsbSlides[currentSlide + 1].style.display = 'block';

    anime.set(webUsbSlides[currentSlide], { translateX: '0', opacity: 1 });
    anime.set(webUsbSlides[currentSlide + 1], { translateX: '250px', opacity: 0 });

    webUsbSlidesAnimations[currentSlide + 1].forEach(anim => { anim.seek(0); anim.play() });

    anime({
      targets: webUsbSlides[currentSlide],
      translateX: '-250px',
      opacity: 0,
      easing: 'easeInOutQuad',
      duration: 250,
      complete: () => webUsbSlides[currentSlide - 1].style.display = 'none'
    });

    anime({ targets: webUsbSlides[currentSlide + 1], translateX: '0px', opacity: 1, easing: 'easeInOutQuad', duration: 250 });
    currentSlide++;
  }

  onMount(() => {
    webUsbSlidesAnimations = [
      [],
      [ anime({ targets: '.webusb-arrow', rotate: '-45deg', delay: 200, autoplay: false }) ],
      []
    ];

    for (let i = 1; i < webUsbSlides.length; i++) {
      webUsbSlides[i].style.display = 'none';
    }
  })

  return (
    <>
      <div class="webusb-popup-blur" ref={( el ) => bgblur = el}></div>
      <div class="webusb-popup" ref={( el ) => container = el}>
        <div ref={( el ) => webUsbSlides.push(el)}>
          <div style={{ color: 'white' }}>
            <h1>WebADB</h1>
            <p style={{ "margin": '0px' }}>We've detected your browser supports WebUSB, do you want to enable WebADB support?</p>

            <h3 style={{ "margin-bottom": '0px' }}>What does this mean?</h3>
            <p style={{ "margin": '0px' }}>This means that this webpage can install this app to your headset without you having to use extra software</p>
          </div>

          <br />
          <div class="button" style={{ width: '280px' }} onClick={useWebUsb}>Enable WebUSB</div><br /><br />
          <div class="button" style={{ width: '280px', background: '#cfcfcf' }} onClick={() => {
            anime.set(container, { translateX: '-50%', translateY: '-50%' })

            anime({ targets: bgblur, opacity: 0, easing: 'easeInOutQuad', duration: 250, complete: () => bgblur.remove() });
            anime({ targets: container, opacity: 0, easing: 'easeInOutQuad', scale: '0.5', duration: 250, complete: () => container.remove() });
          }}>Don't Enable WebUSB</div>
        </div>
        <div ref={( el ) => webUsbSlides.push(el)}>
          <div style={{ color: 'white' }}>
            <br /><br /><br />
            <div class="webusb-arrow"></div>
            <p>Select the quest device in the popup</p>
          </div>
        </div>
        <div ref={( el ) => webUsbSlides.push(el)}>
          <div style={{ color: 'white' }}>
            <br /><br /><br /><br /><br /><br />
            <p>Please grant permissions inside of the headset.</p>
            <p>Click the <b>"Always allow from this computer"</b> button.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export { WebUsb }