import React from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import './App.css'

const App = () => {
  return (
    <div className="app">
      <Sidebar/>
      <div className="main-wrap">
        <Main />
      </div>
    </div>
  )
}

export default App
