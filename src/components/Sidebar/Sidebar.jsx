import React, { useContext, useState } from 'react'
import "./Sidebar.css"
import {assets} from '../../assets/assets'
import { Context } from '../../context/Context'
import SettingsPanel from '../Settings/SettingsPanel'

const Kebab = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="12" cy="19" r="2"/>
  </svg>
);

const ChevronDown = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronUp = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const RecentEntry = ({ s, isActive, onActivate }) => {
  const [open, setOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { sessions, setActiveSessionId } = useContext(Context);
  const live = sessions.find(x => x.id === s.id) || s;
  const [draftTitle, setDraftTitle] = useState(live.title || '');
  const inputRef = React.useRef(null);
  const { showToast } = useContext(Context);
  const toggle = (e) => { e.stopPropagation(); setOpen(v => !v); };
  const close = () => setOpen(false);

  React.useEffect(() => { if (isRenaming && inputRef.current) inputRef.current.focus(); }, [isRenaming]);
  React.useEffect(() => { if (!isRenaming) setDraftTitle(live.title || ''); }, [live.title, isRenaming]);

  // Actions
  const download = (e) => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(s.title || 'chat').replace(/[^a-z0-9-_]+/gi,'_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    close();
  };
  const pin = (e) => { e.stopPropagation(); window.appCtx?.pinSession?.(s.id); close(); };
  const startRename = (e) => { e.stopPropagation(); setDraftTitle(live.title || ''); setIsRenaming(true); close(); };
  const commitRename = () => {
    const val = String(draftTitle || '').trim();
    window.appCtx?.renameSessionWithValue?.(s.id, val);
    setDraftTitle(val);
    setIsRenaming(false);
  };
  const cancelRename = () => { setIsRenaming(false); setDraftTitle(live.title || ''); };
  const remove = (e) => { e.stopPropagation(); window.appCtx?.deleteSession?.(s.id); close(); };

  return (
    <div onClick={onActivate} className={`recent-entry ${isActive ? 'active' : ''}`}>
      <img src={assets.message_icon} alt="" />
      {isRenaming ? (
        <input
          key={`${s.id}-edit`}
          ref={inputRef}
          className="rename-input"
          value={draftTitle}
          onChange={(e)=>setDraftTitle(e.target.value)}
          onClick={(e)=>e.stopPropagation()}
          onKeyDown={(e)=>{
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
          }}
          onBlur={()=>{
            const liveTitle = String(live.title || '');
            const next = String(draftTitle || '').trim();
            if (next !== liveTitle) commitRename(); else setIsRenaming(false);
          }}
        />
      ) : (
        <p key={`${s.id}-view`} className="title">{(live.title || 'New chat').length > 28 ? (live.title || 'New chat').slice(0, 28) + '...' : (live.title || 'New chat')}</p>
      )}
      {s.pinned && (
        <span className="pin-badge" title="Pinned">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-3-7 3V3a1 1 0 0 1 1-1z"/></svg>
        </span>
      )}
      <span className="more-btn" onClick={toggle} title="More">
        <Kebab/>
      </span>
      {open && (
        <div className="menu" onClick={(e)=>e.stopPropagation()}>
          <div className="item" onClick={download}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M4 17h16v3H4z"/></svg>
            Download
          </div>
          <div className="item" onClick={pin}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-3-7 3V3a1 1 0 0 1 1-1z"/></svg>
            Pin
          </div>
          <div className="item" onClick={startRename}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
            Rename
          </div>
          <div className="item" onClick={remove} style={{color:'#b00020'}}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 7h12l-1 14H7L6 7zM9 7V5h6v2h5v2H4V7h5z"/></svg>
            Delete
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {

    const[extended, setExtended] = useState(true)
    const { onSent, setRecentPrompt, newChat, sessions, activeSessionId, setActiveSession, openSettings, user, signInWithGoogle, signOut, showAllSessions, setShowAllSessions, isSettingsOpen, uploadedFiles, removeUploadedFile } = useContext(Context)
    const [filesOpen, setFilesOpen] = useState(true);
    const [recentOpen, setRecentOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadPrompt = async (prompt) => {
      setRecentPrompt(prompt)
      await onSent(prompt)
    }

  return (
    <div className={`sidebar ${!extended ? 'collapsed' : ''}`}>
      <div className="top">
        <div className="sidebar-icons">
          <div className="sidebar-toggle">
            <i
              onClick={() => setExtended(prev => !prev)}
              className="fi fi-rr-sidebar menu"
              title="Toggle sidebar"
            />
          </div>
          
          <div className="search-box">
            <i
              className="fa-solid fa-search search-icon"
              onClick={() => !extended && setExtended(true)}
            ></i>
            {extended && (
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            )}
          </div>

          <div className="new-chat" onClick={()=>newChat()} title="New chat">
            <i className="fi fi-rr-plus new-chat-icon" />
            {extended && <p>New Chat</p>}
          </div>
        </div>

        <div className="recent" ref={(el)=>{ /* optional ref */ }}>
          <div className="recent-title" onClick={() => setRecentOpen(!recentOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fi fi-rr-messages"></i>
              {extended && <span className="recent-title-text">Recent</span>}
            </div>
            {extended && (recentOpen ? <ChevronUp /> : <ChevronDown />)}
          </div>
          {recentOpen && (() => {
            const filteredSessions = sessions.filter(s =>
              s.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            const pinned = filteredSessions.filter(x => x.pinned);
            const others = filteredSessions.filter(x => !x.pinned);

            // Determine how many non-pinned to show when collapsed (fixed default)
            const maxRows = 8;
            const visibleOthers = showAllSessions ? others : others.slice(0, maxRows);

            return (
              <>
                {pinned.length > 0 && (
                  <div className="section">
                    {pinned.map((s) => (
                      <RecentEntry
                        key={s.id}
                        s={s}
                        isActive={s.id === activeSessionId}
                        onActivate={() => setActiveSession(s.id)}
                      />
                    ))}
                  </div>
                )}

                {pinned.length > 0 && others.length > 0 && (
                  <div className="divider"/>
                )}

                {others.length > 0 && (
                  <div className="section">
                    {visibleOthers.map((s) => (
                      <RecentEntry
                        key={s.id}
                        s={s}
                        isActive={s.id === activeSessionId}
                        onActivate={() => setActiveSession(s.id)}
                      />
                    ))}
                    {others.length > visibleOthers.length && (
                      <div className="recent-entry" onClick={() => setShowAllSessions(true)} style={{ justifyContent: 'center', fontWeight: 600 }}>
                        <span>More…</span>
                      </div>
                    )}
                    {showAllSessions && others.length > 0 && (
                      <div className="recent-entry" onClick={() => setShowAllSessions(false)} style={{ justifyContent: 'center', fontWeight: 600 }}>
                        <span>Less</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
          
          <div className="recent-title" onClick={() => setFilesOpen(!filesOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fi fi-rr-file"></i>
              {extended && <span className="recent-title-text">Uploaded Files</span>}
            </div>
            {extended && (filesOpen ? <ChevronUp /> : <ChevronDown />)}
          </div>
          {filesOpen && (
            <div className="section">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="recent-entry">
                  <img src={assets.gallery_icon} alt="file icon" />
                  <p className="title">{file.name}</p>
                  <span className="more-btn" onClick={() => removeUploadedFile(file.name)} title="Remove file">
                    <img src={assets.x_icon} alt="remove" />
                  </span>
                </div>
              ))}
              {uploadedFiles.length === 0 && <p style={{textAlign: 'center', fontSize: '13px', opacity: 0.7, margin: '10px 0'}}>No files uploaded</p>}
            </div>
          )}
        </div>
        
      </div>
      <div className="bottom">
        <div className="bottom-item recent-entry" onClick={openSettings}>
            <img src={assets.setting_icon} alt="" />
            <p>Settings</p>
        </div>
        {isSettingsOpen && <SettingsPanel />}
      </div>
    </div>
  )
}

export default Sidebar
