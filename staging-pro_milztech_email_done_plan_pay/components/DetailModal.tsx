
import React, { useState, useRef, useEffect } from 'react';
import { Submission, Plan, PlanType } from '../types';

interface DetailModalProps {
  submission: Submission;
  plans: Record<string, Plan>;
  onClose: () => void;
  onTriggerCheckout?: (orderId: string, planTitle: string, amount: number) => Promise<void>;
}

type DeliveryStage = 'remove' | 'add';

export const DetailModal: React.FC<DetailModalProps> = ({ submission, plans, onClose, onTriggerCheckout }) => {
  const isBoth = submission.plan === PlanType.FURNITURE_BOTH;
  const [activeStage, setActiveStage] = useState<DeliveryStage>(
    (isBoth && submission.resultRemoveUrl && !submission.resultAddUrl) ? 'remove' : 'add'
  );
  const [sliderPos, setSliderPos] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const afterImageUrl = activeStage === 'remove' ? submission.resultRemoveUrl : (submission.resultAddUrl || submission.resultDataUrl);
  const needsPayment = submission.plan === PlanType.FLOOR_PLAN_CG && submission.paymentStatus === 'quote_pending' && submission.quotedAmount;

  const handleDownload = async (url: string, prefix: string) => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const planTitle = plans[submission.plan]?.title || 'Staging';
      const cleanTitle = planTitle.replace(/\s+/g, '_');
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Result_${cleanTitle}_${submission.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.current) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    updatePosition(clientX);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    updatePosition(clientX);
  };

  const handleEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-black animate-in fade-in duration-300 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-black sticky top-0 z-50">
        <div className="flex flex-col text-left">
          <h2 className="text-white text-[11px] md:text-sm font-black uppercase tracking-tight truncate max-w-[200px] md:max-w-md">{plans[submission.plan]?.title || submission.plan}</h2>
          <span className="text-[7px] md:text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none mt-0.5">{submission.id}</span>
        </div>
        <button onClick={onClose} className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white md:rounded-t-[3rem] mt-1 shadow-2xl pb-24 no-scrollbar">
        <div className="max-w-5xl mx-auto p-4 md:p-12 space-y-6 md:space-y-12">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6 p-4 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem]">
            <div className="space-y-0.5 text-left">
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-300">Ordered</span>
              <p className="text-[9px] md:text-[10px] font-black text-slate-900">{new Date(submission.timestamp).toLocaleDateString()}</p>
            </div>
            <div className="space-y-0.5 text-left">
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-300">Phase</span>
              <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase truncate">{submission.status.replace('_', ' ')}</p>
            </div>
            <div className="space-y-0.5 text-left">
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-300">Amount</span>
              <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase">
                {submission.quotedAmount ? `$ ${(submission.quotedAmount/100).toFixed(2)}` : (plans[submission.plan]?.price || '-')}
              </p>
            </div>
            <div className="space-y-0.5 text-left">
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-300">Payment</span>
              <p className={`text-[9px] md:text-[10px] font-black uppercase truncate ${submission.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {submission.paymentStatus.replace('_', ' ')}
              </p>
            </div>
          </div>

          {needsPayment && (
             <div className="p-6 md:p-8 bg-indigo-50 border-2 border-indigo-100 rounded-[1.5rem] md:rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in">
                <div className="space-y-2 text-center md:text-left">
                   <h4 className="text-lg md:text-xl font-black uppercase jakarta text-indigo-900">Payment Required</h4>
                   <p className="text-[11px] md:text-sm font-medium text-indigo-600 italic">Quote finalized. Proceed to payment.</p>
                </div>
                <button 
                  onClick={() => onTriggerCheckout?.(submission.id, plans[submission.plan]?.title || 'Staging Service', submission.quotedAmount!)}
                  className="w-full md:w-auto px-10 py-4 md:py-5 bg-indigo-500 text-white rounded-[1rem] md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-600 transition-all"
                >
                  Complete Payment
                </button>
             </div>
          )}

          <div className="space-y-4 md:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="space-y-2 w-full text-left">
                <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter jakarta leading-none">Visualization</h3>
                {isBoth && submission.status !== 'quote_request' && (
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-fit">
                    <button onClick={() => setActiveStage('remove')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${activeStage === 'remove' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>01. Remove</button>
                    <button onClick={() => setActiveStage('add')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${activeStage === 'add' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>02. Staging</button>
                  </div>
                )}
              </div>
            </div>

            <div 
              className="relative w-full aspect-[4/3] md:aspect-video rounded-[1.5rem] md:rounded-3xl overflow-hidden bg-slate-950 shadow-2xl group cursor-ew-resize touch-none select-none border border-slate-900" 
              ref={containerRef}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
            >
              {afterImageUrl ? (
                <>
                  {/* 下層: 元の画像 (Before) を完全に不透明な背景で囲む */}
                  <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                    <img src={submission.dataUrl} className="w-full h-full object-contain" alt="Before" draggable="false" />
                  </div>
                  
                  {/* 上層: 制作後の画像 (After) レイヤー */}
                  <div 
                    className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950" 
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  >
                    {/* この内部ラッパーにも背景色を持たせることで、比率が異なっても下の画像が見えるのを完全に防ぐ */}
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                      <img src={afterImageUrl} className="w-full h-full object-contain" alt="After" draggable="false" />
                    </div>
                  </div>

                  {/* スライダーハンドル */}
                  <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: `${sliderPos}%` }}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 bg-white rounded-full shadow-2xl flex items-center justify-center border-[3px] md:border-4 border-slate-900/5 pointer-events-auto">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" /></svg>
                    </div>
                    <div className="absolute inset-y-0 w-0.5 md:w-1 bg-white/80 backdrop-blur shadow-xl -translate-x-1/2"></div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                  <img src={submission.dataUrl} className="absolute inset-0 w-full h-full object-contain opacity-30 grayscale" alt="" />
                  <div className="relative z-10 flex flex-col items-center p-4">
                    <div className="w-8 h-8 border-[3px] border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-sm">
                      {submission.status === 'quote_request' ? 'Awaiting Quote' : 'In Production'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleDownload(submission.dataUrl, 'SOURCE')} disabled={isDownloading} className="py-4 md:py-5 border-2 border-slate-100 rounded-[1rem] md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50">
                Download Source
              </button>
              {afterImageUrl && (
                <button onClick={() => handleDownload(afterImageUrl, 'RESULT')} disabled={isDownloading} className="py-4 md:py-5 bg-slate-900 text-white rounded-[1rem] md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all disabled:opacity-50">
                   Download Result
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
