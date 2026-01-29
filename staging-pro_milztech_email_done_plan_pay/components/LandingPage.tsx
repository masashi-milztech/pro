
import React, { useRef, useState, useEffect } from 'react';
import { Plan, ArchiveProject } from '../types';

interface LandingPageProps {
  onStart: () => void;
  archiveProjects: ArchiveProject[];
  plans: Record<string, Plan>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, archiveProjects, plans }) => {
  const showcaseRef = useRef<HTMLDivElement>(null);
  const [showExplorer, setShowExplorer] = useState(false);
  const [viewingProject, setViewingProject] = useState<ArchiveProject | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const scrollToShowcase = () => {
    showcaseRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (showExplorer || viewingProject) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.overflow = 'unset';
    };
  }, [showExplorer, viewingProject]);

  const projectsToDisplay = archiveProjects.length > 0 ? archiveProjects : [
    {
      id: 'p1',
      title: 'Luxury Villa - Floor Plan Evolution',
      category: '3D Floor Plan',
      beforeurl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&q=80&w=1200', 
      afterurl: 'https://storage.googleapis.com/a1aa/image/V3uG33l9rU8XFp6eQ5YtV_I7zN7qfE9k5Q6Y2_E8Q8o.png', 
      description: 'Transformation of a detailed 2D blueprint into a high-fidelity 3D spatial visualization.',
      timestamp: Date.now()
    }
  ];

  const faqs = [
    {
      q: "How long does the delivery take?",
      a: "Typically, we complete the full production and deliver your finalized high-resolution assets within 3 business days of your order. For urgent requirements, please consult with our team via the direct studio chat."
    },
    {
      q: "Can I request revisions?",
      a: "Absolutely. You can request revisions at any time through the direct chat in your studio dashboard. Our architectural visualizers will work with you until the result perfectly aligns with your vision."
    },
    {
      q: "Can I specify furniture styles?",
      a: "Yes. You can upload reference images or text instructions during the asset upload phase. We support diverse professional styles including Japandi, Mid-Century Modern, and Minimalist Luxury."
    },
    {
      q: "Can I consult about custom requests not listed in the plans?",
      a: "Yes, we welcome custom inquiries. If your project requirements fall outside our standard plans, please contact us via email at info@milz.tech with your project details, and our team will provide a tailored consultation."
    },
    {
      q: "What payment methods are supported?",
      a: "We accept major credit cards via Stripe. For corporate clients requiring invoice-based payments or high-volume contracts, please reach out to our accounts team."
    }
  ];

  return (
    <div className="bg-white selection:bg-slate-900 selection:text-white overflow-x-hidden">
      
      {/* 1. Archive Explorer Modal (List View) */}
      {showExplorer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4 md:p-10 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 md:px-12 md:py-8 flex justify-between items-center border-b">
               <div className="space-y-1">
                 <h3 className="text-2xl font-black uppercase tracking-tight jakarta text-slate-900">Showcase Explorer</h3>
                 <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Select a project to view comparison</p>
               </div>
               <button onClick={() => setShowExplorer(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-900 hover:text-white transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar space-y-4">
               {projectsToDisplay.map((proj) => (
                 <div 
                   key={proj.id}
                   onClick={() => { setViewingProject(proj as ArchiveProject); setSliderPos(50); }}
                   className="group flex items-center gap-6 p-4 rounded-3xl bg-slate-50 border border-transparent hover:border-slate-900 hover:bg-white hover:shadow-xl transition-all cursor-pointer"
                 >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-200">
                       <img src={proj.afterurl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-grow">
                       <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-2 block">{proj.category}</span>
                       <h4 className="text-sm md:text-xl font-black uppercase tracking-tight text-slate-900 group-hover:translate-x-1 transition-transform">{proj.title}</h4>
                    </div>
                    <div className="px-6 hidden md:block">
                       <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-slate-900 group-hover:text-slate-900 transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Project Detail View (Comparison & Slider) */}
      {viewingProject && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black animate-in fade-in duration-300">
          <div className="bg-white w-full h-full md:h-[95vh] md:w-[95vw] md:rounded-[4rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 md:px-12 md:py-8 flex justify-between items-center bg-white border-b sticky top-0 z-10">
               <div className="flex items-center gap-6">
                 <button onClick={() => setViewingProject(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                    </svg>
                 </button>
                 <div>
                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block leading-none mb-1">{viewingProject.category}</span>
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight jakarta">{viewingProject.title}</h3>
                 </div>
               </div>
               <button onClick={() => { setViewingProject(null); setShowExplorer(false); }} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 no-scrollbar space-y-16">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] block px-2">Original State (Before)</span>
                     <div className="aspect-[4/3] md:aspect-video bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
                        <img src={viewingProject.beforeurl} className="w-full h-full object-contain" alt="Before" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em] block px-2">Staged Vision (After)</span>
                     <div className="aspect-[4/3] md:aspect-video bg-slate-50 rounded-[2rem] overflow-hidden border border-emerald-50 shadow-sm">
                        <img src={viewingProject.afterurl} className="w-full h-full object-contain" alt="After" />
                     </div>
                  </div>
               </div>

               <div className="space-y-8 pt-8 border-t border-slate-50">
                  <div className="text-center">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Interactive Comparison</h4>
                    <p className="text-xs font-medium italic text-slate-300">Drag the center handle to explore spatial transformation</p>
                  </div>
                  <div 
                    className="relative w-full aspect-[4/3] md:aspect-video max-h-[70vh] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden cursor-ew-resize touch-none select-none shadow-2xl bg-slate-50 border border-slate-100 mx-auto"
                    ref={containerRef}
                    onMouseDown={handleStart}
                    onTouchStart={handleStart}
                  >
                    <img src={viewingProject.afterurl} className="absolute inset-0 w-full h-full object-contain" alt="After" draggable="false" />
                    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                      <img src={viewingProject.beforeurl} className="absolute inset-0 w-full h-full object-cover" alt="Before" draggable="false" />
                    </div>
                    
                    <div className="absolute inset-y-0 z-20 pointer-events-none" style={{ left: `${sliderPos}%` }}>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-slate-900/5 pointer-events-auto">
                        <svg className="w-5 h-5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" />
                        </svg>
                      </div>
                      <div className="absolute inset-y-0 w-1 bg-white/80 backdrop-blur shadow-xl -translate-x-1/2"></div>
                    </div>
                  </div>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-center gap-10 pb-20">
                  <div className="max-w-2xl text-center md:text-left space-y-3">
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Project Context</span>
                     <p className="text-sm md:text-lg font-medium text-slate-500 leading-relaxed italic">{viewingProject.description}</p>
                  </div>
                  <button onClick={() => { setViewingProject(null); setShowExplorer(false); onStart(); }} className="w-full md:w-auto px-16 py-6 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all">Start Project</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-4 md:px-10 pt-10">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10"></div>
          <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover scale-105 animate-pulse-slow" alt="Luxury Interior" />
          <div className="absolute inset-0 bg-gradient-t from-white via-transparent to-transparent z-20"></div>
        </div>

        <div className="relative z-30 max-w-[1400px] mx-auto text-center w-full px-2">
          <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-slate-900 rounded-full mx-auto shadow-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.4em] md:tracking-[0.5em] whitespace-nowrap">Production Studio Active</span>
            </div>
            <div className="relative w-full">
              <h1 className="text-[14vw] sm:text-7xl md:text-9xl lg:text-[11rem] xl:text-[13rem] font-black text-slate-900 tracking-tighter uppercase leading-[0.8] jakarta px-2">
                Staging<span className="text-slate-200">Pro</span>
              </h1>
            </div>
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 px-4">
              <p className="text-sm md:text-2xl lg:text-3xl text-slate-500 font-medium leading-relaxed tracking-tight px-2">
                Architectural Visualization for Professionals. <br className="hidden md:block" />
                Studio-grade staging crafted with meticulous precision.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-8">
                <button onClick={onStart} className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-7 bg-slate-900 text-white rounded-full text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all">Start Project</button>
                <button onClick={scrollToShowcase} className="w-full sm:w-auto px-10 md:px-16 py-5 md:py-7 bg-white/80 backdrop-blur-sm border border-slate-100 text-slate-900 rounded-full text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] hover:border-slate-900 transition-all">Explore Showcase</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 md:py-40 bg-slate-50 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {[
            { tag: 'Studio Quality', title: 'Precision Driven', desc: 'Every pixel is calculated. We maintain architectural integrity while maximizing visual appeal.' },
            { tag: 'Elite Curation', title: 'Global Standards', desc: 'Curated by world-class interior visualizers. We follow international trends to ensure your space stands out.' },
            { tag: 'Direct Access', title: 'Direct Revision', desc: 'Communicate directly with your visualizer to refine every shadow and texture until it meets your vision.' }
          ].map((feature, i) => (
            <div key={i} className="space-y-4 md:space-y-6 text-center md:text-left">
              <span className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">{feature.tag}</span>
              <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter jakarta">{feature.title}</h3>
              <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visuals (Showcase) Section */}
      <section ref={showcaseRef} className="py-20 md:py-40 px-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10 mb-20">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">The Archive</span>
            <h2 className="text-4xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase jakarta">Visuals.</h2>
          </div>
          <div className="text-center md:text-right space-y-6">
             <p className="max-w-md text-slate-400 font-medium leading-relaxed uppercase text-[9px] tracking-widest mx-auto md:ml-auto">
                Selected projects demonstrating our standard. Click to explore our full interactive catalog.
             </p>
             <button onClick={() => setShowExplorer(true)} className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all">Explore All Showcase</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {projectsToDisplay.slice(0, 3).map((sample) => (
            <div 
              key={sample.id}
              onClick={() => { setViewingProject(sample as ArchiveProject); setSliderPos(50); }}
              className="group cursor-pointer bg-white rounded-[2.5rem] border border-slate-50 p-6 hover:border-slate-900 hover:shadow-2xl transition-all duration-500"
            >
              <div className="aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-slate-100 mb-6 relative">
                 <img src={sample.afterurl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={sample.title} />
                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-xl">Expand Evolution</div>
                 </div>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{sample.category}</span>
                <h4 className="text-[13px] font-black uppercase tracking-tight text-slate-900">{sample.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Production Plans */}
      <section className="py-20 md:py-40 px-6 bg-slate-50 overflow-hidden">
        <div className="max-w-[1000px] mx-auto space-y-20">
          <div className="text-center space-y-6">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.8em]">Architectural Frameworks</span>
            <h2 className="text-4xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase jakarta">Production Plans</h2>
          </div>

          <div className="space-y-6">
            {Object.values(plans).map((plan) => (
              <div 
                key={plan.id} 
                className="group relative flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-12 bg-white rounded-[2.5rem] border border-slate-100 hover:border-slate-900 hover:shadow-2xl transition-all duration-500"
              >
                <div className="text-5xl md:text-7xl font-black text-slate-50 group-hover:text-slate-100 transition-colors pointer-events-none select-none jakarta">
                  {plan.number}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg text-[7px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-all">Studio Protocol</div>
                  <h3 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight jakarta leading-tight">{plan.title}</h3>
                  <p className="text-slate-400 text-[11px] md:text-sm font-medium leading-relaxed italic max-w-xl">{plan.description}</p>
                </div>

                <div className="flex flex-col items-center md:items-end gap-6 min-w-[180px] w-full md:w-auto pt-8 md:pt-0 border-t md:border-t-0 md:border-l border-slate-50 md:pl-12">
                   <div className="text-right">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-1">Standard Rate</span>
                      <span className="text-3xl md:text-4xl font-black text-slate-900 jakarta tracking-tighter">
                        {plan.price}
                      </span>
                   </div>
                   <button onClick={onStart} className="w-full px-8 py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all">
                      Initialize
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-40 px-6 max-w-[1000px] mx-auto">
        <div className="text-center mb-20 space-y-4">
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.8em]">Frequently Asked Questions</span>
           <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase jakarta">Support Archive</h2>
        </div>
        <div className="space-y-4">
           {faqs.map((faq, idx) => (
             <div key={idx} className="border-b border-slate-100">
               <button 
                 onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                 className="w-full py-8 flex justify-between items-center text-left group"
               >
                 <span className="text-sm md:text-xl font-black uppercase tracking-tight text-slate-900 group-hover:translate-x-2 transition-transform">{faq.q}</span>
                 <span className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all ${activeFaq === idx ? 'bg-slate-900 text-white border-slate-900 rotate-45' : 'text-slate-300'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                   </svg>
                 </span>
               </button>
               {activeFaq === idx && (
                 <div className="pb-10 animate-in slide-in-from-top-4 duration-300">
                   <p className="text-sm md:text-lg text-slate-500 font-medium leading-relaxed max-w-3xl italic">{faq.a}</p>
                 </div>
               )}
             </div>
           ))}
        </div>
      </section>

      {/* Impact Banner Section - High-End Aesthetic (Refined Spacing) */}
      <section className="py-8 md:py-12 bg-slate-900 overflow-hidden relative">
         <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
         </div>
         <div className="max-w-[1400px] mx-auto px-6 text-center space-y-6 animate-in fade-in duration-1000">
            <div className="space-y-2">
               <p className="text-[7px] md:text-[8px] font-medium text-slate-600 uppercase tracking-[2.5em] translate-x-[1.25em] mb-4">
                  AI · EXPERIENCE · EXTREME
               </p>
               <div className="jakarta flex flex-col items-center gap-2">
                  <span className="text-[16vw] md:text-[11vw] font-[900] text-white tracking-tighter uppercase leading-[1.1]">CREATIVITY</span>
                  <span className="text-[16vw] md:text-[11vw] font-[200] text-slate-500 tracking-tighter uppercase leading-[1.1]">TECHNOLOGY</span>
               </div>
            </div>
            <div className="pt-6">
               <button onClick={onStart} className="px-8 py-3.5 bg-white text-slate-900 rounded-full text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all">Join the Circle</button>
            </div>
         </div>
      </section>

      {/* Footer - Maximum Minimalism (Signature Style) */}
      <footer className="py-12 md:py-16 px-6 bg-white border-t border-slate-50">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center">
          <div className="flex items-center gap-6 text-slate-900">
             <span className="w-4 h-[1.5px] bg-slate-900"></span>
             <span className="text-[12px] md:text-[18px] font-black uppercase tracking-[0.8em] whitespace-nowrap translate-x-[0.4em]">
                POWERED BY MILZ.TECH
             </span>
             <span className="w-4 h-[1.5px] bg-slate-900"></span>
          </div>
          <div className="mt-8 text-center opacity-30">
             <p className="text-[7px] font-bold text-slate-900 uppercase tracking-[0.5em]">© 2025 MILZ.TECH. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
