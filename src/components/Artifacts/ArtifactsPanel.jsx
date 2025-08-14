import React, { useContext } from 'react';
import { Context } from '../../context/Context';
import './ArtifactsPanel.css';

const ArtifactsPanel = () => {
  const { artifacts, darkMode } = useContext(Context);

  if (artifacts.length === 0) {
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
    <div className={`artifacts-panel ${darkMode ? 'dark' : ''}`}>
      <h2>Artifacts</h2>
      <div className="artifacts-list">
        {artifacts.map((artifact, index) => renderArtifact(artifact, index))}
      </div>
    </div>
  );
};

export default ArtifactsPanel;
