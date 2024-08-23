class ErorrProps{
  header!: string;
  body!: HTMLElement;
}

let Eror = ( props: ErorrProps ) => {
  return (
    <>
      <div class="error-blur"></div>
      <div class="error-container">
        <h1>{ props.header }</h1>
        <div>{ props.body }</div>
        <div onClick={() => window.location.reload()} class="button">Reload</div>
      </div>
    </>
  )
}

export { Eror }