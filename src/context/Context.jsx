import React, { createContext, useState, useEffect, useRef } from "react";  
import runChat, { runChatWithHistory } from "../config/gemini";
import { marked } from 'marked';
import { supabase } from '../lib/supabaseClient';
export const Context = createContext();


const ContextProvider = (props) => {

    const [input, setInput] = useState('');
    const [recentPrompt, setRecentPrompt] = useState('');
    const [prevPrompt, setPrevPrompts] = useState(["what is React.js?"]);
    const [sessions, setSessions] = useState([]); // [{id,title,messages,createdAt}]
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState('');
    const [messages, setMessages] = useState([]); // [{ role: 'user'|'assistant'|'tool', content: string }]
    const [thinkingPhrase, setThinkingPhrase] = useState('');
    const [thinkingPhrases, setThinkingPhrases] = useState(null);
    const [toast, setToast] = useState(null); // { message, type }
    const [darkMode, setDarkMode] = useState(() => {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('darkMode') : null;
        return saved === 'true';
    });
    const [verbosity, setVerbosity] = useState(() => {
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('verbosity') : null;
            const num = parseInt(raw ?? '3', 10);
            return Number.isFinite(num) ? Math.min(5, Math.max(1, num)) : 3;
        } catch { return 3; }
    });
    const [temperature, setTemperature] = useState(() => {
        try {
            const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('temperature') : null;
            const num = parseFloat(raw ?? '1.0');
            return Number.isFinite(num) ? Math.min(2.0, Math.max(0.0, num)) : 1.0;
        } catch { return 1.0; }
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // UI state: limit sessions in sidebar by default
    const [showAllSessions, setShowAllSessions] = useState(false);

    // Auth state
    const [user, setUser] = useState(null); // supabase user or null
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        try { localStorage.setItem('darkMode', String(darkMode)); } catch {}
    }, [darkMode]);

    useEffect(() => {
        try { localStorage.setItem('verbosity', String(verbosity)); } catch {}
    }, [verbosity]);

    useEffect(() => {
        try { localStorage.setItem('temperature', String(temperature)); } catch {}
    }, [temperature]);

    // Prefetch thinking phrases once on mount to avoid first-click race
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') + '/thinking');
                const data = await res.json();
                const arr = Array.isArray(data?.phrases) ? data.phrases : ['Thinking…'];
                setThinkingPhrases(arr);
            } catch {
                setThinkingPhrases(['Thinking…']);
            }
        })();
    }, []);

    // Init Supabase auth listener
    useEffect(() => {
        if (!supabase) { setAuthReady(true); return; }
        // Get initial session
        supabase.auth.getSession().then(({ data }) => {
            setUser(data?.session?.user || null);
            setAuthReady(true);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                // On login, migrate any local session to remote
                try { migrateLocalToRemote(); } catch {}
                // Then fetch remote sessions
                try { fetchRemoteSessions(); } catch {}
            } else {
                // On logout, keep local only
                setActiveSessionId(null);
                setMessages([]);
            }
        });
        return () => { sub?.subscription?.unsubscribe?.(); };
    }, []);

    // After auth resolves, fetch sessions on first load if user exists
    useEffect(() => {
        if (authReady && user) {
            fetchRemoteSessions();
        }
    }, [authReady, user]);

    // Do not create any session on first load; show landing until user selects or sends

    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);
    const toggleDarkMode = () => setDarkMode(v => !v);

    const showToast = (message, type = 'info', ms = 2000) => {
        setToast({ message, type });
        if (showToast._t) clearTimeout(showToast._t);
        showToast._t = setTimeout(() => setToast(null), ms);
    };

    const handleApiResponse = (response, sid, isEdit = false, editedHistory = null) => {
        const responseHtml = marked.parse(response || '', { breaks: true });

        if (isEdit) {
            const finalMessages = [...editedHistory, { role: 'assistant', content: responseHtml }];
            setMessages(finalMessages);
            setSessions(prev => prev.map(x => x.id === sid ? { ...x, messages: finalMessages } : x));
        } else {
            setMessages(prev => {
                const out = [...prev];
                const idx = out.length - 1;
                if (idx >= 0 && out[idx].role === 'assistant') out[idx] = { ...out[idx], content: responseHtml };
                return out;
            });
            setSessions(prev => prev.map(s => s.id === sid ? ({ ...s, messages: [...s.messages.slice(0, -1), { role: 'assistant', content: responseHtml }] }) : s));
        }
    };

    const newChat = async () => {
        // Reset UI to landing/new chat. Do not create DB rows.
        setActiveSessionId(null);
        setLoading(false);
        setShowResult(false);
        setRecentPrompt('');
        setResultData('');
        setMessages([]);
    }
    

    const onSent = async (prompt) => {

        // Determine prompt text
        const text = (prompt ?? input ?? '').trim();
        console.log('onSent called with prompt:', prompt, 'text:', text);
        if (!text) return;

        // Clear input and show loading
        setInput('')
        setResultData('')
        setLoading(true)
        setShowResult(true)
        // Pick a thinking phrase lazily
        ;(async () => {
            try {
                if (!thinkingPhrases) {
                    const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') + '/thinking');
                    const data = await res.json();
                    const arr = Array.isArray(data?.phrases) ? data.phrases : ['Thinking…'];
                    setThinkingPhrases(arr);
                    const pick = arr[Math.floor(Math.random() * arr.length)] || 'Thinking…';
                    setThinkingPhrase(pick);
                } else {
                    const pick = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)] || 'Thinking…';
                    setThinkingPhrase(pick);
                }
            } catch {
                setThinkingPhrase('Thinking…');
            }
        })();
        setRecentPrompt(text)

        // Append user turn and assistant placeholder atomically to ensure order
        const userTurn = { role: 'user', content: text };
        const nextMessages = [...messages, userTurn];
        setMessages(prev => [...prev, userTurn, { role: 'assistant', content: '' }]);

        // Call backend with full history
        // Ensure an active session exists without resetting UI
        let sid = activeSessionId;
        if (!sid) {
            sid = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
            setActiveSessionId(sid);
            // create local session immediately so UI has an id
            setSessions(prev => [{ id: sid, title: text.slice(0,60) || 'New chat', messages: [], createdAt: Date.now() }, ...prev]);
            // persist in background if authenticated
            if (user) {
                try { await supabase.from('chat_sessions').insert({ id: sid, user_id: user.id, title: text.slice(0,60) || 'New chat' }); } catch {}
            }
        }

        // Update the active session with the user turn (local state)
        if (sid) {
            setSessions(prev => prev.map(s => s.id === sid ? ({
                ...s,
                messages: nextMessages,
                title: (!s.manualTitle && (!s.title || s.title === 'New chat')) ? (text.slice(0,60) || s.title) : s.title,
            }) : s));
        }

        // After ensuring placeholder in UI state, sync session state with both new entries
        const sid2 = sid;
        if (sid2) setSessions(prev => prev.map(s => s.id === sid2 ? ({ ...s, messages: [...(s.messages||[]), userTurn, { role: 'assistant', content: '' }] }) : s));

        // Build a clean, text-only history for the backend (strip any HTML in prior assistant msgs)
        const stripHtml = (html) => {
            if (typeof html !== 'string') return '';
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return (tmp.textContent || tmp.innerText || '').trim();
        };
        const cleanHistory = nextMessages.map(m => ({
            role: m.role,
            content: m.role === 'assistant' ? stripHtml(m.content) : (m.content || ''),
        }));

        // Persist user turn immediately if authenticated
        if (user && sid2) {
            try { await persistMessage(sid2, userTurn, (messages.length)); } catch {}
            try { await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sid2).eq('user_id', user.id); } catch {}
            try {
                const live = (sessions.find(x => x.id === sid2) || {});
                if (!live?.manualTitle && (!live?.title || live?.title === 'New chat')) {
                    await persistSessionTitleIfNeeded(sid2, text);
                }
            } catch {}
        }

        // Call non-streaming endpoint
        try {
            console.log('Calling runChatWithHistory with cleanHistory:', cleanHistory, 'verbosity:', verbosity, 'temperature:', temperature);
            const res = await runChatWithHistory(cleanHistory, { verbosity, temperature });
            const response = String(res?.text ?? '');
            handleApiResponse(response, sid2);
        } catch (error) {
            console.error('Error in onSent:', error);
            const fallback = "Sorry, I can't complete that request. Please try again.";
            handleApiResponse(fallback, sid2);
        } finally {
            setLoading(false);
        }
    }
    

    



    // Switch active session and sync UI state/messages
    const setActiveSession = async (id) => {
        setActiveSessionId(id);
        setResultData('');
        setLoading(true);
        try {
            // Always fetch fresh messages from DB for reliability
            if (supabase && user) {
                const { data: msgs } = await supabase
                    .from('chat_messages')
                    .select('role, content, idx, created_at')
                    .eq('session_id', id)
                    .order('idx', { ascending: true });
                const arr = (msgs || []).map(m => ({ role: m.role, content: m.content }));
                setMessages(arr);
                setSessions(prev => prev.map(s => s.id === id ? ({ ...s, messages: arr }) : s));
                setShowResult(arr.length > 0);
                const lastUser = [...arr].reverse().find(m => m.role === 'user');
                setRecentPrompt(lastUser?.content || '');
            }
        } finally {
            setLoading(false);
        }
    }

    // Supabase helpers: persistence and auth
    const fetchRemoteSessions = async () => {
        if (!supabase || !user) return;
        const { data: sessionsData } = await supabase
            .from('chat_sessions')
            .select('id, title, pinned, created_at')
            .eq('user_id', user.id)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false });
        const out = [];
        for (const s of (sessionsData || [])) {
            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('role, content, idx, created_at')
                .eq('session_id', s.id)
                .order('idx', { ascending: true });
            out.push({ id: s.id, title: s.title || 'New chat', manualTitle: (s.title && s.title !== 'New chat') || false, pinned: !!s.pinned, createdAt: new Date(s.created_at).getTime(), messages: (msgs || []).map(m => ({ role: m.role, content: m.content })) });
        }
        // Populate sidebar; do not auto-select a session. Keep landing empty.
        setSessions(out);
    };

    const persistSessionStub = async (id, title) => {
        if (!supabase || !user) return;
        await supabase.from('chat_sessions').upsert({ id, user_id: user.id, title: title || 'New chat' }, { onConflict: 'id' });
    };
    const persistSessionTitleIfNeeded = async (id, firstPrompt) => {
        if (!supabase || !user || !id) return;
        const title = String(firstPrompt || '').slice(0, 60) || 'New chat';
        await supabase.from('chat_sessions').update({ title }).eq('id', id).eq('user_id', user.id);
    };
    const persistMessage = async (sessionId, msg, idx) => {
        if (!supabase || !user || !sessionId) return;
        await supabase.from('chat_messages').insert({ session_id: sessionId, role: msg.role, content: msg.content, idx: idx ?? 0 });
    };

    const migrateLocalToRemote = async () => {
        try {
            if (!user || !sessions.length) return;
            // Only migrate non-UUID-like temporary ids (but ours are UUID-ish). We'll always upsert stub and check if remote msgs exist.
            const current = sessions.find(s => s.id === activeSessionId) || sessions[0];
            if (!current) return;
            await persistSessionStub(current.id, current.title);
            // Check if messages already exist
            const { data: existing } = await supabase
                .from('chat_messages')
                .select('id')
                .eq('session_id', current.id)
                .limit(1);
            if (existing && existing.length > 0) return; // already migrated
            for (let i = 0; i < (current.messages || []).length; i++) {
                const m = current.messages[i];
                await persistMessage(current.id, m, i);
            }
        } catch (e) { /* ignore */ }
    };

    const signInWithGoogle = async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };
    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
    };

    const contextValue = {
        prevPrompt,
        setPrevPrompts,
        onSent,
        setRecentPrompt,
        recentPrompt,
        showResult,
        loading,
        resultData,
        thinkingPhrase,
        input,
        setInput,
        newChat,
        messages,
        setMessages,
        sessions,
        setSessions,
        activeSessionId,
        setActiveSessionId,
        setActiveSession,
        editUserMessageAndRegenerate: undefined, // placeholder, will be set below
        // auth
        user,
        authReady,
        signInWithGoogle,
        signOut,
        redoAssistantAt: undefined,
        copyAssistantAt: undefined,
        shareAssistantAt: undefined,
        verifyAssistantAt: undefined,
        toast,
        showToast,
        darkMode,
        toggleDarkMode,
        verbosity,
        setVerbosity,
        isSettingsOpen,
        openSettings,
        closeSettings,
        // sidebar session toggle
        showAllSessions,
        setShowAllSessions,
    }

    // Add editing function after we have access to state setters
    contextValue.editUserMessageAndRegenerate = async (userIndex, newContent) => {
        const sid = activeSessionId || (sessions[0]?.id);
        if (!sid) return;
        const s = sessions.find(x => x.id === sid);
        if (!s) return;
        if (userIndex < 0 || userIndex >= s.messages.length) return;
        if (s.messages[userIndex]?.role !== 'user') return;

        const edited = s.messages.slice(0, userIndex + 1).map((m, i) =>
            i === userIndex ? { ...m, content: newContent.trim() } : m
        );

        const newTitle = userIndex === 0
            ? (newContent.trim().slice(0, 60) || 'New chat')
            : s.title;

        const updatedSession = { ...s, messages: edited, title: newTitle };
        setSessions(prev => prev.map(x => x.id === sid ? updatedSession : x));
        setShowResult(true);
        setRecentPrompt(newContent.trim());
        setResultData('');

        // Append assistant placeholder atomically to ensure order
        const nextMessages = [...edited, { role: 'assistant', content: '' }];
        setMessages(nextMessages);
        if (sid) setSessions(prev => prev.map(s => s.id === sid ? ({ ...s, messages: nextMessages }) : s));

        setLoading(true);

        // Pick a thinking phrase lazily
        ;(async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                const res = await fetch(baseUrl + '/thinking');
                const data = await res.json();
                const arr = Array.isArray(data?.phrases) ? data.phrases : ['Thinking…'];
                setThinkingPhrases(arr);
                const pick = arr[Math.floor(Math.random() * arr.length)] || 'Thinking…';
                setThinkingPhrase(pick);
            } catch (error) {
                setThinkingPhrase('Thinking…');
            }
        })();

        try {
            const res = await runChatWithHistory(edited, { verbosity, temperature });
            let response = String(res?.text ?? '');
            handleApiResponse(response, sid, true, edited);
        } catch (e) {
            const fallback = "Sorry, I can't complete that request. Please try again.";
            handleApiResponse(fallback, sid, true, edited);
            setResultData(fallback);
        } finally {
            setLoading(false);
        }
    };

    // Actions under assistant messages
    contextValue.copyAssistantAt = async (index) => {
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant') return;
        const tmp = document.createElement('div');
        tmp.innerHTML = msg.content || '';
        const text = tmp.textContent || tmp.innerText || '';
        try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard', 'success'); } catch { showToast('Copy failed', 'error'); }
    };

    contextValue.shareAssistantAt = async (index) => {
        const sid = activeSessionId || (sessions[0]?.id);
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant') return;
        const payload = {
            sessionId: sid,
            index,
            role: msg.role,
            content: msg.content,
            createdAt: Date.now(),
        };
        const text = JSON.stringify(payload, null, 2);
        if (navigator.share) {
            try { await navigator.share({ title: 'ESI response', text }); showToast('Shared', 'success'); return; } catch {}
        }
        try { await navigator.clipboard.writeText(text); showToast('Link copied', 'success'); } catch { showToast('Share failed', 'error'); }
    };

    contextValue.redoAssistantAt = async (index) => {
        // Find nearest prior user message
        let cut = -1;
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i]?.role === 'user') { cut = i; break; }
        }
        if (cut < 0) return;
        const truncated = messages.slice(0, cut + 1);
        // Prepare assistant placeholder
        setMessages([...truncated, { role: 'assistant', content: '' }]);
        // Persist to session
        const sid = activeSessionId || (sessions[0]?.id);
        if (sid) setSessions(prev => prev.map(s => s.id === sid ? ({ ...s, messages: [...truncated, { role: 'assistant', content: '' }] }) : s));

        setLoading(true);
        setResultData('');
        showToast('Regenerating…', 'info');
        // Pick a thinking phrase lazily
        ;(async () => {
            try {
                if (!thinkingPhrases) {
                    const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') + '/thinking');
                    const data = await res.json();
                    const arr = Array.isArray(data?.phrases) ? data.phrases : ['Thinking…'];
                    setThinkingPhrases(arr);
                    const pick = arr[Math.floor(Math.random() * arr.length)] || 'Thinking…';
                    setThinkingPhrase(pick);
                } else {
                    const pick = thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)] || 'Thinking…';
                    setThinkingPhrase(pick);
                }
            } catch {
                setThinkingPhrase('Thinking…');
            }
        })();

        // Clean history (strip HTML from prior assistant messages)
        const stripHtml = (html) => {
            if (typeof html !== 'string') return '';
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return (tmp.textContent || tmp.innerText || '').trim();
        };
        const cleanHistory = truncated.map(m => ({
            role: m.role,
            content: m.role === 'assistant' ? stripHtml(m.content) : (m.content || ''),
        }));

        // Call non-streaming endpoint
        try {
            const res = await runChatWithHistory(cleanHistory, { verbosity, temperature });
            const response = String(res?.text ?? '');
            handleApiResponse(response, sid);
        } catch (error) {
            console.error('Error in redoAssistantAt:', error);
            const fallback = "Sorry, I can't complete that request. Please try again.";
            handleApiResponse(fallback, sid);
        } finally {
            setLoading(false);
            showToast('Regenerated', 'success');
        }

    };

    contextValue.verifyAssistantAt = async (index) => {
        const upto = messages.slice(0, index + 1);
        const prompt = 'Double-check the previous assistant response. Identify any factual errors or missing citations. Provide corrected information with sources.';
        const verifyHistory = [...upto, { role: 'user', content: prompt }];
        // Insert assistant placeholder so thinking phrase can show in bubble
        const sid = activeSessionId || (sessions[0]?.id);
        const withPlaceholder = [...verifyHistory, { role: 'assistant', content: '' }];
        setMessages(withPlaceholder);
        if (sid) setSessions(prev => prev.map(s => s.id === sid ? ({ ...s, messages: withPlaceholder }) : s));

        setLoading(true);
        setResultData('');
        showToast('Verifying…', 'info');
        // Pick a thinking phrase lazily
        ;(async () => {
            try {
                if (!thinkingPhrases) {
                    const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') + '/thinking');
                    const data = await res.json();
                    const arr = Array.isArray(data?.phrases) ? data.phrases : ['Thinking…'];
                    setThinkingPhrases(arr);
                    setThinkingPhrase(arr[Math.floor(Math.random() * arr.length)] || 'Thinking…');
                } else {
                    setThinkingPhrase(thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)] || 'Thinking…');
                }
            } catch { setThinkingPhrase('Thinking…'); }
        })();
        try {
            const res = await runChatWithHistory(verifyHistory, { verbosity, temperature });
            let response = String(res?.text ?? '');
            const responseHtml = marked.parse(response || '', { breaks: true });
            const final = [...verifyHistory, { role: 'assistant', content: responseHtml }];
            setMessages(final);
            if (sid) setSessions(prev => prev.map(s => s.id === sid ? ({ ...s, messages: final }) : s));
            showToast('Verification added', 'success');
        } finally {
            setLoading(false);
        }
    };

    // Session management utilities for sidebar menu
    contextValue.pinSession = (id) => {
        setSessions(prev => prev.map(s => s.id === id ? ({ ...s, pinned: !s.pinned }) : s)
            .sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || (b.createdAt - a.createdAt))
        );
        showToast('Pin toggled', 'success');
    };
    contextValue.renameSession = async (id) => {
        const s = sessions.find(x => x.id === id);
        const current = s?.title || '';
        const next = prompt('Rename chat:', current);
        if (next == null) return;
        contextValue.renameSessionWithValue(id, next);
    };
    contextValue.renameSessionWithValue = async (id, value) => {
        const title = String(value ?? '').trim() || 'New chat';
        setSessions(prev => prev.map(x => x.id === id ? ({ ...x, title, manualTitle: title !== 'New chat' }) : x));
        try {
            if (supabase && user) {
                await supabase.from('chat_sessions').update({ title }).eq('id', id).eq('user_id', user.id);
            }
        } catch {}
        showToast('Renamed', 'success');
    };
    contextValue.deleteSession = async (id) => {
        try {
            if (supabase && user) {
                await supabase
                    .from('chat_sessions')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);
                // chat_messages will cascade via FK on delete
            }
        } catch {}
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
            const next = sessions.find(x => x.id !== id);
            setActiveSessionId(next?.id || null);
            setMessages(next?.messages || []);
        }
        showToast('Deleted', 'success');
    };

    // Expose actions globally for the simple handler wiring
    if (typeof window !== 'undefined') {
        window.appCtx = {
            redoAssistantAt: contextValue.redoAssistantAt,
            copyAssistantAt: contextValue.copyAssistantAt,
            shareAssistantAt: contextValue.shareAssistantAt,
            verifyAssistantAt: contextValue.verifyAssistantAt,
            pinSession: contextValue.pinSession,
            renameSession: contextValue.renameSession,
            deleteSession: contextValue.deleteSession,
        };
    }

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    )

}

export default ContextProvider