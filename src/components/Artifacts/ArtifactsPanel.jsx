import React, { useContext } from 'react';
import { Context } from '../../context/Context';
import './ArtifactsPanel.css';

const ArtifactsPanel = () => {
  const { artifacts } = useContext(Context);

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="artifacts-panel">
      <h2>Artifacts</h2>
      <div className="artifacts-list">
        {artifacts.map((artifact, index) => (
          <div key={index} className="artifact-item">
            <h3>{artifact.type}</h3>
            {artifact.type === 'code' ? (
              <pre><code>{artifact.content}</code></pre>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtifactsPanel;
