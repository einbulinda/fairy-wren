import './App.css'
import fairyLogo from '../public/fairy-wren-logo-removebg.png'

function App() {

  return (
    <>
      <div>
        <a href="/" target="_blank">
          <img src={fairyLogo} className="logo" alt="Fairy Wren logo" />
        </a>
      </div>
      <h1>Fairy Wren Ltd</h1>
      <div className="card">
        <p>
         Coming soon ...
        </p>
      </div>
    </>
  )
}

export default App
