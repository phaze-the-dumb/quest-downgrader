let setStore = ( name: string, value: string ) => {
  let d = new Date();
  d.setTime(d.getTime() + 2.628E+09);

  document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + "; SameSite=Strict"
}

let getStore = ( name: string ): string | null => {
  let cookis = decodeURIComponent(document.cookie).split(';');

  for(let cooki of cookis){
    let splitCooki = cooki.split('=');

    if(splitCooki[0].trim() === name){
      return splitCooki[1].trim();
    }
  }

  return null;
}

let tryRemoveStore = ( name: string ) => {
  let d = new Date(0);
  document.cookie = name + '=;expires=' + d.toUTCString() + "; SameSite=Strict"
}

export { setStore, getStore, tryRemoveStore };