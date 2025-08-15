import React, { useState, useContext } from 'react';
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import ArtifactsPanel from './components/Artifacts/ArtifactsPanel'
import { Context } from './context/Context';
import './App.css'

const App = () => {
  const [isArtifactsVisible, setArtifactsVisible] = useState(true);
  const { artifacts } = useContext(Context);

  const toggleArtifactsPanel = () => {
    setArtifactsVisible(!isArtifactsVisible);
  };

  const closeArtifactsPanel = () => {
    setArtifactsVisible(false);
  };

  return (
    <div className="app">
      <Sidebar/>
      <div className="main-wrap">
        <Main toggleArtifacts={toggleArtifactsPanel} />
      </div>
      <ArtifactsPanel
        isVisible={isArtifactsVisible && artifacts.length > 0}
        onClose={closeArtifactsPanel}
      />
    </div>
  )
}

export default App
