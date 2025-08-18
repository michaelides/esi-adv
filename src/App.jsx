import React, { useState, useContext, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import SettingsPanel from './components/Settings/SettingsPanel'
import { Context } from './context/Context';
import './App.css'

const App = () => {
  const { isSettingsOpen, closeSettings } = useContext(Context);
  const settingsRef = useRef(null);
  const [settingsPosition, setSettingsPosition] = useState({ top: 0, left: 0 });

  const handleSettingsBackdropClick = (e) => {
    if (e.target.classList.contains('settings-backdrop')) {
      closeSettings();
    }
  };

  // Set up a global function to update settings position
  useEffect(() => {
    const updateSettingsPosition = (rect) => {
      setSettingsPosition({
        top: rect.bottom,
        left: rect.left
      });
    };

    // Expose function globally for Main component to call
    window.updateSettingsPosition = updateSettingsPosition;

    return () => {
      delete window.updateSettingsPosition;
    };
  }, []);

  return (
    <div className="app">
      <Sidebar/>
      <div className="main-wrap">
        <Main />
      </div>
      {isSettingsOpen && (
        <div className="settings-backdrop" onClick={handleSettingsBackdropClick}>
          <div
            style={{
              position: 'absolute',
              top: settingsPosition.top,
              left: settingsPosition.left,
              zIndex: 1001
            }}
          >
            <SettingsPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
