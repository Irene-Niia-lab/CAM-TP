
import React, { useState, useEffect } from 'react';
import { TeachingPlan, Game, ImplementationStep } from './types';

const INITIAL_STATE: TeachingPlan = {
  basic: { level: '', unit: '', lessonNo: '', duration: '', className: '', studentCount: '', date: '' },
  objectives: {
    vocab: { core: '', basic: '', satellite: '' },
    patterns: { core: '', basic: '', satellite: '' },
    expansion: { culture: '', daily: '', habits: '' },
  },
  materials: { cards: '', realia: '', multimedia: '', rewards: '' },
  games: [ 
    { name: '', goal: '', prep: '', rules: '' }
  ],
  steps: Array(5).fill(null).map((_, i) => ({
    step: '',
    duration: '',
    design: '',
    instructions: '',
    notes: '',
    blackboard: ''
  })),
  connection: { review: '', preview: '', homework: '', prep: '' },
  feedback: {
    student: { content: '', time: '', plan: '' },
    parent: { content: '', time: '', plan: '' },
    partner: { content: '', time: '', plan: '' },
  },
};

const App: React.FC = () => {
  const [data, setData] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem('teaching-plan-v5');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    localStorage.setItem('teaching-plan-v5', JSON.stringify(data));
    const { level, unit, lessonNo } = data.basic;

    // 格式化函数：避免重复添加前缀
    const formatPart = (val: string, prefix: string) => {
      const clean = (val || '').trim();
      if (!clean) return '';
      // 如果用户已经输入了前缀（不区分大小写），则直接使用
      if (clean.toUpperCase().startsWith(prefix.toUpperCase())) {
        return clean;
      }
      return `${prefix}${clean}`;
    };

    const pLevel = formatPart(level, 'PU');
    const pUnit = formatPart(unit, 'U');
    const pLesson = formatPart(lessonNo, 'L');

    // 组合文件名：02.PU1 U7L1 Teaching Plan
    const fileName = `02.${pLevel} ${pUnit}${pLesson} Teaching Plan`.replace(/\s+/g, ' ').trim();
    document.title = fileName;
  }, [data]);

  const update = (path: string, value: any) => {
    const keys = path.split('.');
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let current: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  /**
   * Helper to ensure only plain text is pasted, stripping all external formatting.
   */
  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>, 
    callback: (v: string) => void
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const target = e.currentTarget;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentVal = target.value;
    const newValue = currentVal.substring(0, start) + text + currentVal.substring(end);
    callback(newValue);

    // If it's a textarea, trigger height resize after update
    if (target instanceof HTMLTextAreaElement) {
        setTimeout(() => {
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
        }, 0);
    }
  };

  const clearSection = (section: keyof TeachingPlan) => {
    if (confirm(`确定要清空该模块的内容吗？`)) {
      setData(prev => ({
        ...prev,
        [section]: INITIAL_STATE[section]
      }));
    }
  };

  const addGame = () => {
    const newGame: Game = { name: '', goal: '', prep: '', rules: '' };
    setData(prev => ({ ...prev, games: [...prev.games, newGame] }));
  };

  const removeGame = (index: number) => {
    if (data.games.length <= 1) return;
    setData(prev => ({
      ...prev,
      games: prev.games.filter((_, i) => i !== index)
    }));
  };

  const addStep = () => {
    const newStep: ImplementationStep = {
      step: '', duration: '', design: '', instructions: '', notes: '', blackboard: ''
    };
    setData(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const removeStep = (index: number) => {
    if (data.steps.length <= 1) return;
    setData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const getValueByPath = (obj: any, path: string) => {
    try {
      return path.split('.').reduce((o, i) => (o ? o[i] : ''), obj) || '';
    } catch (e) {
      return '';
    }
  };

  const handlePrint = () => window.print();

  const PLACEHOLDER = "点击填写内容...";

  const SectionTitle = ({ num, title, onClear }: { num: string, title: string, onClear?: () => void }) => (
    <div className="flex items-center mb-8 mt-4 group/title section-title-container">
      <div className="w-1.5 h-8 bg-indigo-500 rounded-full mr-4 print-indigo-bar"></div>
      <div className="flex items-baseline">
        <span className="text-indigo-500 font-bold text-2xl mr-2 opacity-50 print-indigo-text">{num}.</span>
        <h2 className="text-xl font-bold font-zh text-slate-800 tracking-wide">{title}</h2>
      </div>
      {!isPreview && onClear && (
        <button 
          onClick={onClear}
          className="ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold font-zh no-print"
          title="清空此模块"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          清空模块
        </button>
      )}
      <div className="flex-1 ml-6 h-[1px] bg-slate-100 section-divider"></div>
    </div>
  );

  const EditableLine = ({ label, value, onChange, prefix }: { label: string, value: string, onChange: (v: string) => void, prefix?: string }) => (
    <div className={`group flex items-start py-3 border-b border-slate-50 transition-all ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'} print-line-border`}>
      <div className="flex-shrink-0 font-bold text-[15px] font-zh min-w-[140px] text-slate-600 pt-1 print:text-slate-800">
        {prefix && <span className="mr-2 text-indigo-400 font-normal no-print">{prefix}</span>}
        {label}
      </div>
      <div className="flex-1 ml-4">
        <textarea
          rows={1}
          readOnly={isPreview}
          className={`w-full outline-none border-none resize-none font-content text-lg text-slate-900 bg-transparent placeholder-slate-200 focus:text-indigo-900 overflow-hidden leading-relaxed ${isPreview ? 'cursor-default' : ''} print:text-black print:text-base`}
          value={value}
          onPaste={(e) => handlePaste(e, onChange)}
          onChange={e => {
            onChange(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder={isPreview ? "" : PLACEHOLDER}
        />
      </div>
    </div>
  );

  const ActionButton = ({ onClick, label, variant }: { onClick: () => void, label: string, variant: 'add' | 'remove' }) => (
    <button
      onClick={onClick}
      className={`no-print flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        variant === 'add' 
          ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' 
          : 'bg-red-50 text-red-500 hover:bg-red-100'
      }`}
    >
      {variant === 'add' ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg>
      )}
      {label}
    </button>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-800' : 'bg-slate-50'}`}>
      
      {/* Top Exit Preview Bar */}
      {isPreview && (
        <div className="no-print fixed top-0 left-0 w-full flex justify-center py-4 bg-slate-900/50 backdrop-blur-md z-[60] animate-in fade-in slide-in-from-top-4">
          <button 
            onClick={() => setIsPreview(false)}
            className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm shadow-2xl hover:bg-indigo-50 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            退出预览模式
          </button>
        </div>
      )}

      {/* Floating Control Panel */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-4 z-50 transition-all duration-300 ${isPreview ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100'}`}>
        <button 
          onClick={handlePrint} 
          className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-base flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          导出正式教案
        </button>
        
        <button 
          onClick={() => setIsPreview(true)}
          className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-base flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          预览打印效果
        </button>

        <button 
          onClick={() => { if(confirm('确定要清空所有已填写的内容吗？')) setData(INITIAL_STATE); }} 
          className="bg-white/80 backdrop-blur border border-slate-200 text-slate-400 px-8 py-3 rounded-2xl hover:text-red-500 hover:border-red-100 transition-all text-sm font-medium"
        >
          清空全部
        </button>
      </div>

      <div className={`paper mx-auto bg-white transition-all duration-500 print-paper relative ${isPreview ? 'p-[20mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[25mm] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)]'}`} style={{ maxWidth: '210mm' }}>
        
        {/* Background Watermark - 添加 no-print 类以在导出时隐藏 */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none z-0 text-center no-print">
          <span className="text-[60px] font-bold font-content -rotate-45 whitespace-nowrap">CAMPUPRO ENGLISH<br/>Training & Development Department</span>
        </div>

        {/* Header */}
        <div className="text-center mb-20 relative z-10 print-header">
          <h1 className="text-4xl font-bold font-zh text-slate-900 tracking-[0.15em]">少儿英语线下课课堂教案</h1>
          <div className="mt-4 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-4">
              <span className="h-[1px] w-12 bg-indigo-100 print:bg-slate-200"></span>
              <p className="text-indigo-400 font-content text-xs tracking-[0.1em] uppercase font-bold text-center print:text-slate-500">CAMPUPRO ENGLISH Training & Development Department</p>
              <span className="h-[1px] w-12 bg-indigo-100 print:bg-slate-200"></span>
            </div>
            <p className="text-slate-300 font-content text-[9px] tracking-[0.4em] uppercase font-medium print:hidden">Teaching Plan Template</p>
          </div>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-16 relative z-10 print-section">
          <SectionTitle num="01" title="基础课程信息" onClear={() => clearSection('basic')} />
          <div className={`grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden transition-all ${isPreview ? 'rounded-none border-slate-400' : ''} print-grid-border`}>
            {[
              { label: '课程级别', path: 'basic.level', placeholder: '如: 1' },
              { label: '单元', path: 'basic.unit', placeholder: '如: 7' },
              { label: '课号', path: 'basic.lessonNo', placeholder: '如: 1' },
              { label: '课程时长', path: 'basic.duration', placeholder: 'Min' },
              { label: '授课班级', path: 'basic.className', placeholder: '班级名称' },
              { label: '学员人数', path: 'basic.studentCount', placeholder: '人数' },
              { label: '授课日期', path: 'basic.date', placeholder: 'YYYY-MM-DD' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${idx === 6 ? 'col-span-2' : ''} ${isPreview ? 'border-slate-400' : ''} print-cell-border`}>
                <div className={`w-[110px] bg-slate-50/50 p-4 font-zh font-bold text-sm text-slate-500 flex items-center justify-center text-center print:bg-slate-50 print:text-slate-800`}>
                  {item.label}
                </div>
                <div className="flex-1 p-3">
                  <input 
                    readOnly={isPreview}
                    className="w-full outline-none border-none font-content text-center text-lg text-slate-800 placeholder-slate-200 bg-transparent print:text-black" 
                    value={getValueByPath(data, item.path)} 
                    onPaste={(e) => handlePaste(e, (v) => update(item.path, v))}
                    onChange={e => update(item.path, e.target.value)} 
                    placeholder={isPreview ? "" : item.placeholder} 
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Teaching Objectives */}
        <section className="mb-16 relative z-10 print-section">
          <SectionTitle num="02" title="核心教学目标" onClear={() => clearSection('objectives')} />
          <div className="flex flex-col space-y-12 print:space-y-6">
            <div>
              <h3 className="text-sm font-bold font-zh text-indigo-500 mb-4 uppercase tracking-widest print:text-slate-800">（一）词汇目标 / Vocabulary</h3>
              <EditableLine label="核心单词 (四会)" value={data.objectives.vocab.core} onChange={v => update('objectives.vocab.core', v)} />
              <EditableLine label="基础单词 (三会)" value={data.objectives.vocab.basic} onChange={v => update('objectives.vocab.basic', v)} />
              <EditableLine label="卫星单词 (二会)" value={data.objectives.vocab.satellite} onChange={v => update('objectives.vocab.satellite', v)} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-zh text-indigo-500 mb-4 uppercase tracking-widest print:text-slate-800">（二）句型目标 / Sentences</h3>
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => update('objectives.patterns.core', v)} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => update('objectives.patterns.basic', v)} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => update('objectives.patterns.satellite', v)} />
            </div>
          </div>
        </section>

        {/* 03 Implementation */}
        <section className="mb-16 page-break-before relative z-10 print-section">
          <SectionTitle num="03" title="教学环节实施" onClear={() => clearSection('steps')} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm transition-all ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'} print-table-border`}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-50">
                <tr className="font-zh text-xs font-bold text-slate-400 uppercase tracking-tighter print:text-slate-800">
                  <th className="p-4 w-[12%] text-center border-r border-slate-200 print-cell-border">环节</th>
                  <th className="p-4 w-[8%] text-center border-r border-slate-200 print-cell-border">时长</th>
                  <th className="p-4 w-[22%] text-left border-r border-slate-200 print-cell-border">教学设计</th>
                  <th className="p-4 w-[22%] text-left border-r border-slate-200 print-cell-border">课堂用语</th>
                  <th className="p-4 w-[18%] text-left border-r border-slate-200 print-cell-border">难点/注意</th>
                  <th className="p-4 w-[18%] text-left">板书</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {data.steps.map((step, i) => (
                  <tr key={i} className={`group/step relative transition-colors ${isPreview ? '' : 'hover:bg-slate-50/30'}`}>
                    <td className="p-3 align-top text-center border-r border-slate-200 relative print-cell-border">
                      {!isPreview && data.steps.length > 1 && (
                        <button 
                          onClick={() => removeStep(i)}
                          className="absolute -left-2 top-2 opacity-0 group-hover/step:opacity-100 bg-red-500 text-white p-1 rounded-full shadow-lg z-10 no-print"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                        </button>
                      )}
                      <textarea 
                        readOnly={isPreview} 
                        className="w-full outline-none border-none resize-none font-zh text-[13px] font-bold text-slate-700 text-center bg-transparent print:text-black print:text-[11px]" 
                        value={step.step} 
                        rows={2} 
                        onChange={e => { const s = [...data.steps]; s[i].step = e.target.value; setData({ ...data, steps: s }); }} 
                        placeholder={isPreview ? "" : `步骤`} 
                      />
                    </td>
                    <td className="p-3 align-top border-r border-slate-200 print-cell-border">
                      <textarea 
                        readOnly={isPreview} 
                        className="w-full outline-none border-none resize-none font-content text-sm text-center text-indigo-500 font-bold bg-transparent print:text-black print:text-[11px]" 
                        value={step.duration} 
                        onChange={e => { const s = [...data.steps]; s[i].duration = e.target.value; setData({ ...data, steps: s }); }} 
                        placeholder={isPreview ? "" : "Min"} 
                      />
                    </td>
                    {['design', 'instructions', 'notes', 'blackboard'].map((field, idx) => (
                      <td key={field} className={`p-3 align-top ${idx < 3 ? 'border-r border-slate-200 print-cell-border' : ''}`}>
                        <textarea 
                          readOnly={isPreview} 
                          className="w-full outline-none border-none resize-none font-content text-sm text-slate-600 bg-transparent min-h-[140px] leading-relaxed print:text-black print:text-[10px]" 
                          value={(step as any)[field]} 
                          onPaste={(e) => handlePaste(e, (v) => { const s = [...data.steps]; (s[i] as any)[field] = v; setData({ ...data, steps: s }); })}
                          onChange={e => { const s = [...data.steps]; (s[i] as any)[field] = e.target.value; setData({ ...data, steps: s }); }} 
                          placeholder="..." 
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isPreview && (
            <div className="mt-4 flex justify-center no-print">
              <ActionButton onClick={addStep} label="添加新环节" variant="add" />
            </div>
          )}
        </section>

        {/* 04 Feedback */}
        <section className="mb-16 page-break-before relative z-10 print-section">
          <SectionTitle num="04" title="沟通备忘录" onClear={() => clearSection('feedback')} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm transition-all ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'} print-table-border`}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-zh text-xs font-bold uppercase print:text-slate-800">
                <tr>
                  <th className="p-4 w-[18%] border-r border-slate-200 text-center print-cell-border">沟通对象</th>
                  <th className="p-4 w-[82%]">沟通细节与后续跟进</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {[
                  { label: '学员', p: 'student' },
                  { label: '家长', p: 'parent' },
                  { label: '搭档', p: 'partner' },
                ].map(row => (
                  <tr key={row.p} className={`${isPreview ? '' : 'hover:bg-slate-50/30'}`}>
                    <td className="p-6 font-zh text-center border-r border-slate-200 bg-slate-50/10 print-cell-border print:bg-slate-50">
                      <div className="font-zh font-bold text-slate-500 print:text-slate-800">{row.label}</div>
                    </td>
                    <td className="p-2">
                      <textarea
                        readOnly={isPreview}
                        className="w-full p-3 outline-none border-none resize-none font-content text-base text-slate-600 bg-transparent min-h-[120px] leading-relaxed print:text-black print:text-sm"
                        value={getValueByPath(data, `feedback.${row.p}.content`)}
                        onPaste={(e) => handlePaste(e, (v) => update(`feedback.${row.p}.content`, v))}
                        onChange={e => update(`feedback.${row.p}.content`, e.target.value)}
                        placeholder="..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-24 pt-10 border-t border-slate-100 text-center relative z-10 print-footer">
          <p className="text-slate-400 font-content text-[10px] tracking-[0.1em] uppercase font-bold text-center print:text-slate-500">CAMPUPRO ENGLISH Training & Development Department</p>
        </div>
      </div>

      <style>{`
        /* Print Styles Optimized for Consistency with UI */
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-paper { 
            border: none !important; 
            box-shadow: none !important; 
            width: 100% !important; 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 15mm !important; 
            border-radius: 0 !important;
            transform: none !important;
          }
          .page-break-before { page-break-before: always; }
          @page { margin: 10mm; size: A4; }
          
          input, textarea { background: transparent !important; color: black !important; border: none !important; }
          textarea::placeholder { color: transparent !important; }

          /* Preserve specific elements UI styling */
          .print-indigo-bar { 
            background-color: #6366f1 !important; 
            display: block !important;
          }
          .print-indigo-text { 
            color: #6366f1 !important; 
            opacity: 1 !important;
          }
          .section-divider { 
            background-color: #e2e8f0 !important; 
            display: block !important;
          }
          .print-grid-border {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
          }
          .print-cell-border {
            border-right: 1px solid #e2e8f0 !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .print-table-border {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
          }
          .print-line-border {
            border-bottom: 1px solid #f1f5f9 !important;
          }
          .print-footer {
            border-top: 1px solid #f1f5f9 !important;
            margin-top: 20mm !important;
          }
        }
        
        .font-zh { font-family: "Microsoft YaHei", sans-serif; }
        .font-content { 
          font-family: "Calibri", "Microsoft YaHei", sans-serif; 
          font-style: italic;
        }
        
        textarea::placeholder { 
          font-family: "Microsoft YaHei"; 
          font-size: 0.75rem; 
          opacity: 0.3;
          color: #94a3b8;
          font-style: normal;
        }

        textarea::-webkit-scrollbar { width: 0; height: 0; }
        table { table-layout: fixed; width: 100%; border-spacing: 0; border-collapse: collapse; }
        .paper { min-height: 297mm; }
        
        h1, h2, h3, th, td { color: #1e293b; }
      `}</style>
    </div>
  );
};

export default App;
