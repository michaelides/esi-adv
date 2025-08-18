import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import "./Main.css"
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import MessageRow from './MessageRow'
import ThinkingBlob from './ThinkingBlob'


const Main = () => {

  const {onSent,setRecentPrompt,recentPrompt,showResult,loading,resultData,input,setInput,newChat,messages,editUserMessageAndRegenerate, redoAssistantAt, copyAssistantAt, shareAssistantAt, verifyAssistantAt, toast, thinkingPhrase, user, signOut, signInWithGoogle, sidebarExtended, openSettings} = useContext(Context)
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fileInputRef = useRef(null);
  const settingsIconRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // For now, let's just log the file and prepare to send it.
    // The actual sending will be handled in the updated onSent function.
    console.log('Selected file:', file);

    // We can enhance this to show a preview or file name in the UI.
    // For now, we'll just trigger onSent with the file.
    onSent(input, file);
  };

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

  const handleOpenSettings = () => {
    // Update the position of the settings panel
    if (settingsIconRef.current && window.updateSettingsPosition) {
      const rect = settingsIconRef.current.getBoundingClientRect();
      window.updateSettingsPosition(rect);
    }
    openSettings();
  };

  return (
    <div className="main">
      <div className="nav">
          <div onClick={()=>newChat()} className={`esi-logo ${sidebarExtended ? 'hidden' : ''}`}>
              <img src={assets.network_nodes_logo} alt="Assistant" />
              <span className="esi-text">esi</span>
          </div>
        <div className="nav-right">
        </div>
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
                  loading={loading && isLast && m.role === 'assistant'}
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
            <div className="input-box">
            <textarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder='Ask me anything about research...'
              onKeyDown={handleKeyDown}
            />
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".csv,.spss,.sav,.rdata,.rds,.pdf"
              />
              <i
                className="fa-solid fa-paperclip"
                onClick={() => fileInputRef.current.click()}
                style={{ cursor: 'pointer' }}
                title="Upload file"
              ></i>
              <i
                ref={settingsIconRef}
                className="fa-solid fa-sliders"
                onClick={handleOpenSettings}
                style={{ cursor: 'pointer' }}
              ></i>
              {input || fileInputRef.current?.files?.length > 0 ? (
                <img onClick={() => onSent(input, fileInputRef.current?.files[0])} src={assets.send_icon} alt="Send" />
              ) : null}
            </div>
          </div>
            <div className="bottom-info">
              <p>Made by George Michaelides for NBS-7091A and NBS-7095X.
              ESI uses AI to help you navigate the dissertation process and can make mistakes.</p>
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
