import React, { useState } from 'react'
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import ArtifactsPanel from './components/Artifacts/ArtifactsPanel'
import './App.css'

const App = () => {
  const [showArtifacts, setShowArtifacts] = useState(false);

  return (
    <div className="app">
      <Sidebar/>
      <div className="main-wrap">
        <Main toggleArtifacts={() => setShowArtifacts(prev => !prev)} />
      </div>
      {showArtifacts && <ArtifactsPanel />}
    </div>
  )
}

export default App
