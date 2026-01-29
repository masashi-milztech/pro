
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Submission, Plan, Editor, User, PlanType, Message, ArchiveProject, getEstimatedDeliveryDate } from '../types';
import { DetailModal } from './DetailModal';
import { ChatBoard } from './ChatBoard';
import { db } from '../lib/supabase';

interface AdminDashboardProps {
  user: User;
  submissions: Submission[];
  archiveProjects: ArchiveProject[];
  plans: Record<string, Plan>;
  onDelete: (id: string) => void;
  onDeliver: (id: string, updates: Partial<Submission>) => void;
  onRefresh: () => void;
  onAssign: (id: string, editorId: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, notes?: string) => void;
  isSyncing: boolean;
  editors: Editor[];
  onAddEditor: (name: string, specialty: string, email?: string) => void;
  onDeleteEditor: (id: string) => void;
  onUpdateArchive: () => void;
  onUpdatePlans: () => void;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'reviewing' | 'completed' | 'comments' | 'archive' | 'plans';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, submissions, archiveProjects, plans, onDelete, onDeliver, onRefresh, onAssign, onApprove, onReject, isSyncing, editors, onAddEditor, onDeleteEditor, onUpdateArchive, onUpdatePlans
}) => {
  if (!user) return null;

  const [showOnlyMine, setShowOnlyMine] = useState(user?.role === 'editor');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [viewingDetail, setViewingDetail] = useState<Submission | null>(null);
  const [chattingSubmission, setChattingSubmission] = useState<Submission | null>(null);
  const [showEditorManager, setShowEditorManager] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
  
  // Quote States
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [isUpdatingQuote, setIsUpdatingQuote] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Reject Note State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Editor Add Form State
  const [newEditorName, setNewEditorName] = useState('');
  const [newEditorSpecialty, setNewEditorSpecialty] = useState('');
  const [newEditorEmail, setNewEditorEmail] = useState('');

  useEffect(() => {
    loadAllMessages();
    const interval = setInterval(loadAllMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAllMessages = async () => {
    try {
      const msgs = await db.messages.fetchAll() as Message[];
      setAllMessages(msgs);
      
      // Update local last read map from localStorage for Admin/Editor
      const map: Record<string, number> = {};
      submissions.forEach(s => {
        const val = localStorage.getItem(`chat_last_read_${s.id}`);
        if (val) map[s.id] = parseInt(val);
      });
      setLastReadMap(map);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleUpdateQuote = async (id: string) => {
    const amount = parseInt(quoteAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount in cents (e.g., 5000 for $50.00)");
      return;
    }
    
    setIsUpdatingQuote(true);
    try {
      await db.submissions.update(id, { quotedAmount: amount });
      setEditingQuoteId(null);
      setQuoteAmount('');
      setSchemaError(null);
      onRefresh();
    } catch (err: any) {
      console.error("Quote update error:", err);
      setSchemaError(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS "quotedAmount" bigint;`);
    } finally {
      setIsUpdatingQuote(false);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingId) return;
    onReject(rejectingId, rejectNote);
    setRejectingId(null);
    setRejectNote('');
  };

  const handleAddEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorName || !newEditorSpecialty) return;
    onAddEditor(newEditorName, newEditorSpecialty, newEditorEmail);
    setNewEditorName('');
    setNewEditorSpecialty('');
    setNewEditorEmail('');
  };

  const submissionChatInfo = useMemo(() => {
    const info: Record<string, { count: number, lastMessage?: Message, hasNew: boolean }> = {};
    allMessages.forEach(msg => {
      const sId = msg.submission_id;
      if (!sId) return;
      if (!info[sId]) info[sId] = { count: 0, hasNew: false };
      info[sId].count += 1;
      
      if (!info[sId].lastMessage || msg.timestamp > info[sId].lastMessage.timestamp) {
        info[sId].lastMessage = msg;
        
        // Admin/Editor logic: It is "NEW" if the last sender was a user AND it is after our last seen timestamp
        const lastSeen = lastReadMap[sId] || 0;
        info[sId].hasNew = (msg.sender_role === 'user' && msg.timestamp > lastSeen);
      }
    });
    return info;
  }, [allMessages, lastReadMap]);

  const filteredSubmissions = useMemo(() => {
    let result = submissions.filter(s => s.paymentStatus === 'paid' || s.paymentStatus === 'quote_pending');
    if (showOnlyMine && user?.editorRecordId) {
      const myId = String(user.editorRecordId);
      result = result.filter(s => String(s.assignedEditorId) === myId);
    }
    if (statusFilter === 'comments') {
      result = result.filter(s => (submissionChatInfo[s.id]?.count || 0) > 0);
      result.sort((a, b) => (submissionChatInfo[b.id]?.lastMessage?.timestamp || 0) - (submissionChatInfo[a.id]?.lastMessage?.timestamp || 0));
    } else if (statusFilter !== 'all' && statusFilter !== 'archive' && statusFilter !== 'plans') {
      result = result.filter(s => s.status === statusFilter);
    }
    return result;
  }, [submissions, statusFilter, user?.editorRecordId, showOnlyMine, submissionChatInfo]);

  const stats = {
    total: submissions.filter(s => s.paymentStatus !== 'unpaid').length,
    pending: submissions.filter(s => s.status === 'pending' && s.paymentStatus !== 'unpaid').length,
    processing: submissions.filter(s => s.status === 'processing' && s.paymentStatus !== 'unpaid').length,
    completed: submissions.filter(s => s.status === 'completed' && s.paymentStatus !== 'unpaid').length,
  };

  const DeliveryDropZone = ({ submission, type }: { submission: Submission, type: 'remove' | 'add' | 'single' }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const label = type === 'remove' ? 'REMOVED' : type === 'add' ? 'STAGED' : 'FINAL RESULT';
    const currentUrl = type === 'remove' ? submission.resultRemoveUrl : (type === 'add' ? submission.resultAddUrl : (submission.resultAddUrl || submission.resultDataUrl));

    const handleUpload = async (file: File) => {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const path = `results/${submission.id}_${type}.jpg`;
          const publicUrl = await db.storage.upload(path, base64);
          const updates: Partial<Submission> = {};
          if (type === 'remove') updates.resultRemoveUrl = publicUrl;
          else if (type === 'add' || type === 'single') { updates.resultAddUrl = publicUrl; updates.resultDataUrl = publicUrl; }
          let newStatus = submission.status;
          if (submission.plan === PlanType.FURNITURE_BOTH) {
            if ((type === 'remove' || submission.resultRemoveUrl) && (type === 'add' || submission.resultAddUrl)) newStatus = 'reviewing';
          } else { newStatus = 'reviewing'; }
          updates.status = newStatus;
          onDeliver(submission.id, updates);
        } finally { setUploading(false); }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) handleUpload(file); }}
        className={`relative group rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 overflow-hidden min-h-[100px] w-full max-w-[120px] ${
          dragging ? 'border-slate-900 bg-slate-50' : currentUrl ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 bg-white'
        }`}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" alt="" />
            <div className="relative z-10 text-center">
              <span className="text-[7px] font-black text-emerald-600 tracking-widest block uppercase mb-1">{label}</span>
              <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }; input.click(); }} className="text-[8px] font-black text-slate-900 uppercase underline">Replace</button>
            </div>
          </>
        ) : uploading ? (
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <div className="text-center p-2">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">DROP {label}</span>
            <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }; input.click(); }} className="text-[7px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 rounded-lg px-2 py-1">Browse</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto py-8 px-4 md:px-10 space-y-8">
      {viewingDetail && <DetailModal submission={viewingDetail} plans={plans} onClose={() => setViewingDetail(null)} />}
      {chattingSubmission && <ChatBoard submission={chattingSubmission} user={user} plans={plans} onClose={() => { setChattingSubmission(null); loadAllMessages(); }} />}
      
      {/* Team Manager Modal */}
      {showEditorManager && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase jakarta tracking-tight text-slate-900">Studio Team Manager</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Production Visualizers</p>
              </div>
              <button onClick={() => setShowEditorManager(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-900 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 no-scrollbar space-y-12">
              <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Add New Visualizer</h4>
                <form onSubmit={handleAddEditor} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <input 
                    value={newEditorName}
                    onChange={(e) => setNewEditorName(e.target.value)}
                    placeholder="Full Name"
                    className="px-6 py-4 rounded-xl text-sm font-medium border-2 border-transparent focus:border-slate-900 outline-none bg-white shadow-sm"
                    required
                  />
                  <input 
                    value={newEditorSpecialty}
                    onChange={(e) => setNewEditorSpecialty(e.target.value)}
                    placeholder="Specialty (e.g. CGI, Staging)"
                    className="px-6 py-4 rounded-xl text-sm font-medium border-2 border-transparent focus:border-slate-900 outline-none bg-white shadow-sm"
                    required
                  />
                  <input 
                    type="email"
                    value={newEditorEmail}
                    onChange={(e) => setNewEditorEmail(e.target.value)}
                    placeholder="Studio Email"
                    className="px-6 py-4 rounded-xl text-sm font-medium border-2 border-transparent focus:border-slate-900 outline-none bg-white shadow-sm"
                    required
                  />
                  <button type="submit" className="md:col-span-3 py-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-black transition-all">
                    Register Visualizer
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Studio Directory</h4>
                <div className="grid grid-cols-1 gap-4">
                  {editors.map((ed) => (
                    <div key={ed.id} className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-slate-900 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">
                          {ed.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-slate-900">{ed.name}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ed.specialty}</span>
                            <span className="text-[9px] text-slate-200">|</span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">ID: {ed.id}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => onDeleteEditor(ed.id)}
                        className="px-6 py-2 border border-slate-100 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {editors.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">No registered visualizers</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {schemaError && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-8 border-4 border-rose-500">
             <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div className="text-center space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tight jakarta text-slate-900">SQL設定が必要です</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                  見積金額を保存するためのカラムが不足しています。<br/>
                  Supabaseの <b>SQL Editor</b> で以下のコードを実行してから金額をセットしてください。
                </p>
             </div>
             <div className="bg-slate-900 p-6 rounded-2xl overflow-hidden shadow-inner relative group">
                <code className="text-emerald-400 text-[10px] font-mono break-all leading-relaxed block">
                   {schemaError}
                </code>
                <button 
                  onClick={() => { navigator.clipboard.writeText(schemaError); alert("Copied to clipboard!"); }}
                  className="absolute top-4 right-4 text-[8px] font-black text-white/40 hover:text-white uppercase tracking-widest border border-white/10 rounded-lg px-3 py-1.5"
                >
                  Copy SQL
                </button>
             </div>
             <button onClick={() => setSchemaError(null)} className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">閉じる</button>
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6">
              <h3 className="text-xl font-black uppercase jakarta">差し戻し理由の入力</h3>
              <textarea 
                value={rejectNote} 
                onChange={e => setRejectNote(e.target.value)} 
                placeholder="修正が必要な箇所をエディターに伝えてください..." 
                className="w-full bg-slate-50 p-6 rounded-2xl text-sm font-medium outline-none border-2 border-transparent focus:border-rose-500 h-32 resize-none"
              />
              <div className="flex gap-4">
                 <button onClick={() => setRejectingId(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-300">キャンセル</button>
                 <button onClick={handleConfirmReject} className="flex-1 py-4 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">差し戻し実行</button>
              </div>
           </div>
        </div>
      )}

      <header className="flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase jakarta">Production Hub</h1>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto justify-center md:justify-start">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap shadow-sm">
                {k}: <span className="text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
           {user?.role === 'admin' && <button onClick={() => setShowEditorManager(true)} className="flex-1 md:flex-none px-6 py-2.5 bg-white border-2 border-slate-900 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-900 hover:text-white transition-all">Team Manager</button>}
           <button onClick={onRefresh} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Sync</button>
        </div>
      </header>

      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          <button onClick={() => setShowOnlyMine(!showOnlyMine)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showOnlyMine ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
            {user?.role === 'admin' ? 'My Assignments' : 'My Current Queue'}
          </button>
          <div className="w-px h-6 bg-slate-100 mx-1"></div>
          {(['all', 'pending', 'processing', 'reviewing', 'completed', 'comments', 'archive', 'plans'] as FilterStatus[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${statusFilter === s ? 'text-slate-900 bg-slate-50' : 'text-slate-300 hover:text-slate-400'}`}>
               {s === 'archive' ? 'Manage Archive' : s === 'plans' ? 'Manage Plans' : (s === 'comments' ? 'Communications' : s)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
             <thead>
              <tr className="bg-slate-50/50 border-b">
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Visual</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">ID / Plan</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Assignee</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Communication</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Editor Upload</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Final Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSubmissions.map(sub => {
                const dueDate = getEstimatedDeliveryDate(sub.timestamp);
                const dueDateFormatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
                const canAct = sub.status === 'reviewing' && user.role === 'admin';
                const isDone = sub.status === 'completed';
                const isQuotePlan = sub.plan === PlanType.FLOOR_PLAN_CG;
                const quotePending = isQuotePlan && sub.paymentStatus === 'quote_pending' && !isDone;
                const hasNewMessage = submissionChatInfo[sub.id]?.hasNew;
                
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-4 text-center">
                       <button onClick={() => setViewingDetail(sub)} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 hover:border-slate-900 shadow-sm bg-slate-50 inline-block">
                          <img src={sub.dataUrl} className="w-full h-full object-cover" alt="" />
                       </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        sub.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        sub.status === 'reviewing' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>{sub.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block leading-none">{plans[sub.plan]?.title || sub.plan}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">ID: {sub.id}</span>
                        {isQuotePlan && (
                          <span className="text-[7px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-widest">Quote Mode</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                        {dueDateFormatted}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <select value={sub.assignedEditorId || ''} onChange={(e) => onAssign(sub.id, e.target.value)} className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-[9px] font-black uppercase outline-none focus:bg-white transition-all w-full max-w-[140px]">
                          <option value="">Unassigned</option>
                          {editors.map(ed => <option key={ed.id} value={ed.id}>{ed.name}</option>)}
                        </select>
                    </td>
                    <td className="px-6 py-4">
                       <button onClick={() => setChattingSubmission(sub)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 group relative ${hasNewMessage ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white'}`}>
                         <span>CHAT {submissionChatInfo[sub.id]?.count > 0 && `(${submissionChatInfo[sub.id].count})`}</span>
                         {hasNewMessage && (
                           <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
                              <span className="text-[7px] tracking-tight">NEW</span>
                           </div>
                         )}
                       </button>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex items-center justify-center gap-2">
                          {sub.plan === PlanType.FURNITURE_BOTH ? (
                            <> <DeliveryDropZone submission={sub} type="remove" /> <DeliveryDropZone submission={sub} type="add" /> </>
                          ) : <DeliveryDropZone submission={sub} type="single" />}
                       </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <div className="flex flex-col items-end gap-3">
                          {quotePending && (
                            <div className="flex flex-col items-end gap-2 w-full max-w-[200px]">
                              {editingQuoteId === sub.id ? (
                                <div className="flex gap-2 animate-in slide-in-from-right-4 w-full">
                                  <input 
                                    type="number" 
                                    placeholder="Amount in cents"
                                    value={quoteAmount}
                                    onChange={(e) => setQuoteAmount(e.target.value)}
                                    className="flex-grow px-3 py-2 text-[10px] border-2 border-slate-900 rounded-xl outline-none" 
                                  />
                                  <button 
                                    onClick={() => handleUpdateQuote(sub.id)} 
                                    disabled={isUpdatingQuote}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase disabled:opacity-50"
                                  >
                                    Set
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setEditingQuoteId(sub.id)} className="w-full px-4 py-3 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-600 transition-all">
                                   {sub.quotedAmount ? `Update Quote ($${(sub.quotedAmount/100).toFixed(2)})` : "Initialize Quote"}
                                </button>
                              )}
                            </div>
                          )}

                          {isDone ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                               <span className="text-[9px] font-black uppercase tracking-widest">Completed</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-2 transition-all ${canAct ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                               <button 
                                onClick={() => setRejectingId(sub.id)} 
                                className="px-4 py-2 bg-white border border-rose-100 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                               >
                                 Reject
                               </button>
                               <button 
                                onClick={() => onApprove(sub.id)} 
                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                               >
                                 Approve
                               </button>
                            </div>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
