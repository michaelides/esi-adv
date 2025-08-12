import React, { useState } from 'react';

const MessageRow = ({ m, idx, assets, onEdit }) => {
  // Consume optional action handlers from context via props if passed down in the future
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content || '');

  const save = () => {
    const text = (draft || '').trim();
    if (!text) return setEditing(false);
    setEditing(false);
    onEdit(text);
  };

  return (
    <div
      className={`msg-row ${m.role}`}
      style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', width: '100%', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
    >
      {/* Left avatar for assistant */}
      {m.role !== 'user' && (
        <img src={assets.gemini_icon} alt="" style={{ width: 28, height: 28 }} />
      )}

      {/* Content area */}
      {m.role === 'assistant' ? (
        <div
          className="assistant-bubble"
          style={{ maxWidth: '90%', width: '90%', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span dangerouslySetInnerHTML={{ __html: m.content }} />
        </div>
      ) : (
        <div style={{ display: 'flex', maxWidth: '80%', width: '100%', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8 }}>
          {/* Edit icon outside, left of bubble, bottom-aligned */}
          {!editing && (
            <i
              className="fa-regular fa-pen-to-square action-icon"
              alt="Edit"
              title="Edit message"
              onClick={() => { setDraft(m.content || ''); setEditing(true); }}
            />
          )}
          {/* User bubble */}
          <div className={editing ? "user-bubble full-width" : "user-bubble"} style={{ width: 'auto', maxWidth: '100%' }}>
            {editing ? (
              <div className="full-width" style={{ width: '100%' }}>
                <div className="search-box full-width" style={{ width: '100%', borderRadius: 16 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={Math.min(8, Math.max(2, draft.split('\n').length))}
                    style={{ flex: 1, width: '100%', maxHeight: 120 }}
                  />
                  <div style={{ display: 'none' }} />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <img
                    src={assets.check_icon}
                    alt="Accept"
                    title="Accept and regenerate"
                    onClick={save}
                    style={{ width: 20, height: 20, cursor: 'pointer', opacity: 0.9 }}
                  />
                  <img
                    src={assets.x_icon}
                    alt="Cancel"
                    title="Cancel"
                    onClick={() => setEditing(false)}
                    style={{ width: 20, height: 20, cursor: 'pointer', opacity: 0.9 }}
                  />
                </div>
              </div>
            ) : (
              <div>{m.content}</div>
            )}
          </div>
        </div>
      )}

      {/* Right avatar for user */}
    </div>
  );
};

export default MessageRow;
