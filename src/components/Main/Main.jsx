import React, { useContext, useState, useEffect } from 'react';
import "./Main.css"
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import MessageRow from './MessageRow'
import ThinkingBlob from './ThinkingBlob'
import { useRef, useCallback } from 'react'


const Main = () => {

  const {onSent,setRecentPrompt,recentPrompt,showResult,loading,resultData,input,setInput,newChat,messages,editUserMessageAndRegenerate, redoAssistantAt, copyAssistantAt, shareAssistantAt, verifyAssistantAt, toast, thinkingPhrase, user, signOut, signInWithGoogle} = useContext(Context)
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const userQueries = messages.filter(m => m.role === 'user').map(m => m.content);

   const loadPrompt = async (prompt) => {
      setRecentPrompt(prompt)
      await onSent(prompt)
    }

  const endRef = useRef(null);
  const scrollToEnd = useCallback(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, loading, resultData, scrollToEnd]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSent();
        setHistoryIndex(-1); 
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (userQueries.length > 0) {
        const newIndex = historyIndex < 0 ? userQueries.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(userQueries[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = Math.min(userQueries.length, historyIndex + 1);
        if (newIndex >= userQueries.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(userQueries[newIndex]);
        }
      }
    }
  };

  return (
    <div className="main">
      <div className="nav">
        <div onClick={()=>newChat()} className="gemini-logo">
          {/* brand moved to sidebar */}
        </div>    
        {!user ? (
          <div
            className="bottom-item recent-entry"
            onClick={signInWithGoogle}
            title="Sign in with Google"
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              lineHeight: 1,
              transform: 'translateY(-2px)'
            }}
          >
            <i className="fa-regular fa-circle-user" style={{ fontSize: 16, opacity: 0.9 }} aria-hidden="true"></i>
            <span style={{ fontSize: 13 }}>Sign in</span>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setMenuOpen(v => !v)}
              onMouseEnter={(e) => e.currentTarget.parentElement.querySelector('.avatar-tip')?.classList.add('show')}
              onMouseLeave={(e) => e.currentTarget.parentElement.querySelector('.avatar-tip')?.classList.remove('show')}
              style={{ cursor: 'pointer' }}
            >
              {(() => {
                const u = user;
                const meta = u?.user_metadata || {};
                const avatar = meta.avatar_url || meta.picture;
                if (avatar) {
                  return <img src={avatar} alt={meta.full_name || u?.email || 'User'} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />;
                }
                const name = meta.full_name || u?.email || '';
                const initials = String(name).trim().slice(0, 1).toUpperCase();
                return (
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                    {initials}
                  </div>
                );
              })()}
            </div>

            {user && (
              <div
                className="avatar-tip"
                style={{
                  position: 'absolute', right: 0, top: '110%', background: 'var(--panel-bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', fontSize: 13, opacity: 0, pointerEvents: 'none', transition: 'opacity .12s ease', zIndex: 20
                }}
              >
                <div style={{ fontWeight: 600 }}>{user.user_metadata?.full_name || user.email}</div>
                {user.email && <div style={{ opacity: 0.8 }}>{user.email}</div>}
              </div>
            )}

            {menuOpen && user && (
              <div
                role="menu"
                style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--panel-bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 0', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.18)', minWidth: 180, zIndex: 30 }}
              >
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{user.user_metadata?.full_name || 'Account'}</div>
                  <div style={{ opacity: 0.8 }}>{user.email}</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer', font: 'inherit' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="main-container">

      {!showResult
      ?<>
        <div className="greet">
            <p><span>Hello there!</span></p>
            <p>How can I help you today?</p>
        </div>
        <div className="cards">
            <div onClick={()=>loadPrompt("Explain what you can do and how you can help me with my research")} className="card">
                <p>Explain what you can do and how you can help me with my research</p>
                <img src={assets.compass_icon} alt="" />
            </div>
            <div onClick={()=>loadPrompt("Help me identify a research topic or research question. Can we brainstorm some ideas?")} className="card">
                <p>Help me identify a research topic or research question. Can we brainstorm some ideas?</p>
                <img src={assets.bulb_icon} alt="" />
            </div>
            <div onClick={()=>loadPrompt("I know my research question but I need help to develop the hypotheses")} className="card">
                <p>I know my research question but I need help to develop the hypotheses</p>
                <img src={assets.message_icon} alt="" />
            </div>
            <div onClick={()=>loadPrompt("Can you help me finetune the details of my research methods?")} className="card">
                <p>Can you help me finetune the details of my research methods?</p>
                <img src={assets.code_icon} alt="" />
            </div>
        </div>
      </>
      :<div className="result">
        {/* Render full conversation */}
        <div className="result-data" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, idx) => {
            const isLast = idx === messages.length - 1;
            const showThinkingInBubble = isLast && m.role === 'assistant' && loading && (!m.content || m.content.trim() === '');
            const bubbleMsg = showThinkingInBubble
              ? { ...m, content: `<span style="display:inline-flex;align-items:center;gap:8px;color:var(--text-secondary);font-size:inherit"><em>${(thinkingPhrase || 'Thinking…')}</em><span class="dotloader" aria-hidden="true" style="margin-left:8px"><span></span><span></span><span></span></span></span>` }
              : m;
            return (
              <div key={idx} style={{ width: '100%' }}>
                <MessageRow
                  m={bubbleMsg}
                  idx={idx}
                  assets={assets}
                  onEdit={(newText) => editUserMessageAndRegenerate(idx, newText)}
                />
                {m.role === 'assistant' && (
                  <div className="action-bar" style={{ display: 'flex', gap: 14, margin: '6px 0 18px 36px', opacity: 0.9, alignItems: 'center' }}>
                    <i className="fa-solid fa-rotate-right action-icon" title="Redo this response" onClick={() => redoAssistantAt(idx)} />
                    <i className="fa-regular fa-copy action-icon" title="Copy to clipboard" onClick={() => copyAssistantAt(idx)} />
                    <i className="fa-solid fa-share-nodes action-icon" title="Share" onClick={() => shareAssistantAt(idx)} />
                    <i className="fa-solid fa-shield-halved action-icon" title="Double-check this response" onClick={() => verifyAssistantAt(idx)} />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>
      }

  
        <div className="main-bottom">
            <div className="search-box">
            <textarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder='Ask me anything about research...'
              onKeyDown={handleKeyDown}
            />

                  <div>
                      <img src={assets.gallery_icon} alt="" />
                      <img src={assets.mic_icon} alt="" />
                      {input?<img onClick={()=>onSent()} src={assets.send_icon} alt="" />:null}
                  </div>
            </div>
            <div className="bottom-info">
              <p>Made by George Michaelides for NBS-7091A and NBS-7095X. 
              ESI uses AI to help you navigate the dissertation process and can makde mistakes.</p>
              <p>⚠️ Remember: Always consult your dissertation supervisor for final guidance and decisions.</p>
            </div>

        </div>
      </div>
      {toast && (
        <div className={`toast ${toast.type}`} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', fontSize: 14, zIndex: 9999, opacity: 0.95 }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default Main
