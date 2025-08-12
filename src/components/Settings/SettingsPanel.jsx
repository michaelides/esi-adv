import React, { useContext } from 'react';
import { Context } from '../../context/Context';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const { darkMode, toggleDarkMode, verbosity, setVerbosity, temperature, setTemperature, closeSettings } = useContext(Context);
  const labels = { 1: 'Laconic', 2: 'Concise', 3: 'Balanced', 4: 'Detailed', 5: 'Very verbose' };
  const tempLabels = { 0.0: 'Deterministic', 0.5: 'Conservative', 1.0: 'Balanced', 1.5: 'Creative', 2.0: 'Very Creative' };

  return (
    <div className="settings-panel-sidebar" onClick={(e) => e.stopPropagation()}>
      <div className="settings-header">
        <h3>Settings</h3>
        <button className="close-btn" onClick={closeSettings}>×</button>
      </div>
      <div className="settings-body">
        <div className="setting-row">
          <label htmlFor="dark-toggle">Dark mode</label>
          <label className="switch">
            <input id="dark-toggle" type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
            <span className="slider" />
          </label>
        </div>
        <div className="setting-row">
          <label htmlFor="verbosity-range">Verbosity ({labels[verbosity] || verbosity})</label>
          <input
            id="verbosity-range"
            type="range"
            min={1}
            max={5}
            step={1}
            value={verbosity}
            onChange={(e) => setVerbosity(Number(e.target.value))}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="temperature-range">Creativity: {(temperature ?? 1.0).toFixed(2)}</label>
          <input
            id="temperature-range"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature ?? 1.0}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
