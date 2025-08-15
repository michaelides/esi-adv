import React, { useContext, useState, useRef, useCallback } from 'react';
import { Context } from '../../context/Context';
import './ArtifactsPanel.css';

const ArtifactsPanel = ({ isVisible, onClose }) => {
  const { artifacts, darkMode } = useContext(Context);
  const [width, setWidth] = useState(400); // Initial width
  const panelRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth > 300 && newWidth < window.innerWidth - 100) { // Min and max width
        setWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width]);

  if (!isVisible || artifacts.length === 0) {
    return null;
  }

  const renderArtifact = (artifact, index) => {
    switch (artifact.type) {
      case 'dataframe':
        return (
          <div key={index} className="artifact-item">
            <h3>{artifact.label || 'Dataframe'}</h3>
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        );
      case 'document':
        // This will now be used for text content of PDFs, so let's hide it for now.
        // We can decide to show it later if we want.
        return null;
      case 'pdf':
        return (
            <div key={index} className="artifact-item artifact-pdf">
                <h3>{artifact.filename}</h3>
                <iframe
                    src={artifact.content}
                    width="100%"
                    height="500px"
                    title={artifact.filename}
                ></iframe>
            </div>
        );
      case 'error':
        return (
          <div key={index} className="artifact-item artifact-error">
            <h3>Error</h3>
            <p>{artifact.content}</p>
          </div>
        );
      case 'code':
        return (
          <div key={index} className="artifact-item">
            <h3>{artifact.type}</h3>
            <pre><code>{artifact.content}</code></pre>
          </div>
        );
      default:
        return (
          <div key={index} className="artifact-item">
            <h3>{artifact.type || 'Artifact'}</h3>
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        );
    }
  };

  return (
    <div
      ref={panelRef}
      className={`artifacts-panel ${darkMode ? 'dark' : ''}`}
      style={{ width: `${width}px` }}
    >
      <div className="resize-handle" onMouseDown={onMouseDown} />
      <div className="panel-header">
        <h2>Artifacts</h2>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      <div className="artifacts-list">
        {artifacts.map((artifact, index) => renderArtifact(artifact, index))}
      </div>
    </div>
  );
};

export default ArtifactsPanel;
