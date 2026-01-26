
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { TeachingPlan, Game, ImplementationStep } from './types';
import * as mammoth from 'mammoth';

// --- 初始状态定义 ---
const INITIAL_STATE: TeachingPlan = {
  basic: { level: '', unit: '', lessonNo: '', duration: '', className: '', studentCount: '', date: '' },
  objectives: {
    vocab: { core: '', basic: '', satellite: '' },
    patterns: { core: '', basic: '', satellite: '' },
    expansion: { culture: '', daily: '', habits: '' },
  },
  materials: { cards: '', realia: '', multimedia: '', rewards: '' },
  games: [{ name: '', goal: '', prep: '', rules: '' }],
  steps: Array(5).fill(null).map((_, i) => ({
    step: '', duration: '', design: '', instructions: '', notes: '', blackboard: ''
  })),
  connection: { review: '', preview: '', homework: '', prep: '' },
  feedback: {
    student: { content: '', time: '', plan: '' },
    parent: { content: '', time: '', plan: '' },
    partner: { content: '', time: '', plan: '' },
  },
};

// --- 子组件定义 ---

const AutoResizingTextarea = memo(({ value, onChange, isPreview, className, placeholder = "" }: { 
  value: string, 
  onChange: (v: string) => void, 
  isPreview: boolean, 
  className: string,
  placeholder?: string
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, isPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    onChange(el.value);
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  return (
    <div className="relative w-full inline-block align-top print:block">
      <textarea
        ref={textareaRef}
        rows={1}
        readOnly={isPreview}
        placeholder={isPreview ? "" : placeholder}
        className={`w-full outline-none border-none resize-none bg-transparent overflow-hidden leading-relaxed transition-all block ${className} print:hidden`}
        value={value}
        onChange={handleChange}
      />
      <div className={`hidden print:block whitespace-pre-wrap break-words min-h-[1em] leading-relaxed ${className} print:overflow-visible`}>
        {value || (isPreview ? "" : "")}
      </div>
    </div>
  );
});

const SectionTitle = memo(({ num, title, onClear, isPreview }: { 
  num: string, 
  title: string, 
  onClear?: () => void, 
  isPreview: boolean
}) => (
  <div className="flex items-center mb-6 mt-4 group/title print:mt-10 print:mb-6">
    <div className="w-1.5 h-6 bg-indigo-500 rounded-full mr-4"></div>
    <div className="flex items-baseline">
      <span className="text-indigo-500 font-bold text-xl mr-2 opacity-50">{num}.</span>
      <h2 className="text-lg font-bold font-zh text-slate-800 tracking-wide uppercase">{title}</h2>
    </div>
    {!isPreview && onClear && (
      <button 
        onClick={onClear}
        className="ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-300 hover:text-red-400 flex items-center gap-1 text-[10px] font-bold font-zh no-print"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        清空
      </button>
    )}
    <div className="flex-1 ml-6 h-[1px] bg-slate-100 print:bg-slate-200"></div>
  </div>
));

const EditableLine = memo(({ label, value, onChange, isPreview, placeholder = "点击填写..." }: { label: string, value: string, onChange: (v: string) => void, isPreview: boolean, placeholder?: string }) => {
  return (
    <div className={`group flex items-start py-2 border-b border-slate-50 transition-all print:border-slate-100 ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'}`}>
      <div className="flex-shrink-0 font-bold text-[10px] font-zh min-w-[140px] text-slate-400 pt-1.5 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex-1 ml-4">
        <AutoResizingTextarea 
          value={value} 
          onChange={onChange} 
          isPreview={isPreview} 
          placeholder={placeholder}
          className="font-content text-base text-slate-800 placeholder-slate-200 focus:text-indigo-900"
        />
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [data, setData] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem('teaching-plan-v17');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('teaching-plan-v17', JSON.stringify(data));
    const { level, unit, lessonNo } = data.basic;
    const formatPart = (val: string, prefix: string) => {
      const clean = (val || '').trim();
      if (!clean) return '';
      if (clean.toUpperCase().startsWith(prefix.toUpperCase())) return clean;
      return `${prefix}${clean}`;
    };
    const pLevel = formatPart(level, 'PU');
    const pUnit = formatPart(unit, 'U');
    const pLesson = formatPart(lessonNo, 'L');
    const fileName = `02.${pLevel} ${pUnit}${pLesson} Teaching Plan`.replace(/\s+/g, ' ').trim();
    document.title = fileName;
  }, [data]);

  const updateByPath = (path: string, value: any) => {
    setData(prev => {
      const keys = path.split('.');
      const next = { ...prev };
      let current: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let contentPart: any;
      if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        contentPart = { text: `提取教案信息并转为 JSON：\n\n${result.value.slice(0, 50000)}` };
      } else {
        const base64 = await new Promise<string>((r) => {
          const reader = new FileReader();
          reader.onload = () => r((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        contentPart = { inlineData: { mimeType: file.type, data: base64 } };
      }
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: "将教案内容转为 JSON。" }, contentPart] }],
        config: { responseMimeType: "application/json" }
      });
      setData({ ...INITIAL_STATE, ...JSON.parse(response.text || "{}") });
    } catch (err) { alert('导入失败'); } finally { setIsProcessing(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const addStep = () => setData(prev => ({ ...prev, steps: [...prev.steps, { step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' }] }));
  const removeStep = (index: number) => { if (data.steps.length > 1) setData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) })); };
  const addGame = () => setData(prev => ({ ...prev, games: [...prev.games, { name: '', goal: '', prep: '', rules: '' }] }));
  const removeGame = (index: number) => { if (data.games.length > 1) setData(prev => ({ ...prev, games: prev.games.filter((_, i) => i !== index) })); };

  return (
    <div className={`min-h-screen transition-all duration-700 py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Controls */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-3 z-50 transition-all ${isPreview ? 'opacity-0 scale-90 translate-x-12 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={() => window.print()} className="bg-slate-800 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-xs">导出 PDF 教案</button>
        <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-xs">
          {isProcessing ? '正在处理...' : '智能导入 Word'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".doc,.docx" />
        <button onClick={() => setIsPreview(!isPreview)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl shadow-md hover:text-indigo-600 transition-all font-bold text-xs">{isPreview ? '退出预览' : '预览模式'}</button>
      </div>

      <div className={`paper mx-auto bg-white transition-all duration-1000 relative ${isPreview ? 'p-[12mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[20mm] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.01)]'}`} style={{ maxWidth: '210mm' }}>
        
        {/* Header - 100% 还原用户要求的主副标题 */}
        <div className="text-center mb-16 relative z-10 print:mb-10">
          <h1 className="text-3xl font-bold font-zh text-slate-900 tracking-[0.05em] print:text-2xl">少儿英语线下课课堂教案</h1>
          <p className="text-indigo-400 font-content text-[10px] tracking-[0.1em] uppercase font-bold mt-2 opacity-60">JIANYINGLINGHANG TRAINING & DEVELOPMENT DEPARTMENT</p>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-12 print:mb-8">
          <SectionTitle num="01" title="基础课程信息" isPreview={isPreview} onClear={() => updateByPath('basic', INITIAL_STATE.basic)} />
          <div className="grid grid-cols-2 border border-slate-100 print:border-slate-300 rounded-2xl overflow-hidden print:rounded-none">
            {[
              { label: '课程级别', path: 'basic.level' },
              { label: '单元名称', path: 'basic.unit' },
              { label: '课号', path: 'basic.lessonNo' },
              { label: '课时时长', path: 'basic.duration' },
              { label: '授课班级', path: 'basic.className' },
              { label: '学生人数', path: 'basic.studentCount' },
              { label: '授课日期', path: 'basic.date', span: true },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-50 print:border-slate-300 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${item.span ? 'col-span-2' : ''}`}>
                <div className="w-24 bg-slate-50/50 p-3 font-zh font-bold text-[9px] text-slate-400 flex items-center justify-center text-center uppercase tracking-tighter shrink-0 print:bg-slate-50">
                  {item.label}
                </div>
                <div className="flex-1 p-2">
                  <input readOnly={isPreview} className="w-full text-center font-content text-base outline-none bg-transparent text-slate-700" value={(data.basic as any)[item.path.split('.')[1]]} onChange={e => updateByPath(item.path, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Objectives */}
        <section className="mb-12 print:mb-8">
          <SectionTitle num="02" title="核心教学目标" isPreview={isPreview} onClear={() => updateByPath('objectives', INITIAL_STATE.objectives)} />
          <div className="flex flex-col space-y-8">
            <div>
              <h3 className="text-[10px] font-bold font-zh text-indigo-300 mb-3 uppercase tracking-widest opacity-80">Vocabulary / 词汇目标</h3>
              <EditableLine label="核心单词 (4 skills)" value={data.objectives.vocab.core} onChange={v => updateByPath('objectives.vocab.core', v)} isPreview={isPreview} />
              <EditableLine label="基础单词 (3 skills)" value={data.objectives.vocab.basic} onChange={v => updateByPath('objectives.vocab.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星单词 (2 skills)" value={data.objectives.vocab.satellite} onChange={v => updateByPath('objectives.vocab.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold font-zh text-indigo-300 mb-3 uppercase tracking-widest opacity-80">Sentences / 句型目标</h3>
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => updateByPath('objectives.patterns.core', v)} isPreview={isPreview} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => updateByPath('objectives.patterns.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => updateByPath('objectives.patterns.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold font-zh text-indigo-300 mb-3 uppercase tracking-widest opacity-80">Expansion / 拓展目标</h3>
              <EditableLine label="文化拓展" value={data.objectives.expansion.culture} onChange={v => updateByPath('objectives.expansion.culture', v)} isPreview={isPreview} />
              <EditableLine label="日常表达" value={data.objectives.expansion.daily} onChange={v => updateByPath('objectives.expansion.daily', v)} isPreview={isPreview} />
              <EditableLine label="习惯培养" value={data.objectives.expansion.habits} onChange={v => updateByPath('objectives.expansion.habits', v)} isPreview={isPreview} />
            </div>
          </div>
        </section>

        {/* 03 Games & Materials */}
        <section className="mb-12 print:mb-8 print:overflow-visible">
          <SectionTitle num="03" title="互动与教具准备" isPreview={isPreview} />
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 print:grid-cols-1 print:gap-y-6">
             <div>
                <h3 className="text-[10px] font-bold text-slate-300 mb-4 uppercase tracking-widest border-b border-slate-50 pb-1">教具准备 / Materials</h3>
                <div className="space-y-1">
                  <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
                  <EditableLine label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
                  <EditableLine label="多媒体课件" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
                  <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
                </div>
             </div>
             <div>
                <h3 className="text-[10px] font-bold text-slate-300 mb-4 uppercase tracking-widest border-b border-slate-50 pb-1">互动游戏方案 / Games</h3>
                <div className="space-y-8">
                  {data.games.map((g, i) => (
                    <div key={i} className="group/game border-b border-slate-50 pb-4 print:break-inside-auto">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-indigo-200">GAME #{i+1}</span>
                        {!isPreview && <button onClick={() => removeGame(i)} className="text-red-200 text-[8px] hover:text-red-400">REMOVE</button>}
                      </div>
                      <EditableLine label="游戏名称" value={g.name} onChange={v => { const ng = [...data.games]; ng[i].name = v; updateByPath('games', ng); }} isPreview={isPreview} />
                      <EditableLine label="游戏目的" value={g.goal} onChange={v => { const ng = [...data.games]; ng[i].goal = v; updateByPath('games', ng); }} isPreview={isPreview} />
                      <EditableLine label="所需准备" value={g.prep} onChange={v => { const ng = [...data.games]; ng[i].prep = v; updateByPath('games', ng); }} isPreview={isPreview} />
                      <EditableLine label="规则说明" value={g.rules} onChange={v => { const ng = [...data.games]; ng[i].rules = v; updateByPath('games', ng); }} isPreview={isPreview} />
                    </div>
                  ))}
                  {!isPreview && <button onClick={addGame} className="w-full border border-dashed border-slate-100 py-2 rounded-xl text-[9px] font-bold text-slate-300 uppercase">+ Add Game</button>}
                </div>
             </div>
          </div>
        </section>

        {/* 04 Implementation - 还原截图文案与表格视觉 */}
        <section className="mb-12 print:mb-8 print:overflow-visible">
          <SectionTitle num="04" title="教学环节实施" isPreview={isPreview} onClear={() => updateByPath('steps', INITIAL_STATE.steps)} />
          <div className="space-y-12 print:space-y-0 print:block">
            {data.steps.map((step, i) => (
              <div key={i} className="group/step mb-10 print:mb-8 print:break-inside-auto">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-100 print:border-slate-300 pb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm print:shadow-none">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <AutoResizingTextarea 
                      value={step.step} 
                      onChange={v => { const s = [...data.steps]; s[i].step = v; updateByPath('steps', s); }}
                      isPreview={isPreview}
                      className="font-content text-lg font-bold text-indigo-900 tracking-tight"
                      placeholder="例如: 13. Goodbye (道别)"
                    />
                  </div>
                  {!isPreview && data.steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="no-print text-red-200 hover:text-red-400 text-[8px] font-bold uppercase">Delete</button>
                  )}
                </div>

                <div className="border border-slate-100 print:border-slate-300 rounded-xl overflow-hidden print:rounded-none">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {[
                        { label: '时长', field: 'duration', color: 'text-indigo-600 font-bold' },
                        { label: '环节设计', field: 'design', color: 'text-slate-800' },
                        { label: '课堂指令/用语', field: 'instructions', color: 'text-slate-500 italic' },
                        { label: '难点/注意点', field: 'notes', color: 'text-rose-400' },
                        { label: '板书设计', field: 'blackboard', color: 'text-slate-400' },
                      ].map((row) => (
                        <tr key={row.field} className="align-top print:break-inside-auto">
                          <td className="w-32 bg-slate-50/50 p-4 border-r border-slate-100 print:border-slate-300 font-zh font-bold text-[10px] text-slate-400 text-center flex items-center justify-center h-full pt-6">
                            {row.label}
                          </td>
                          <td className="p-4 flex-1">
                            <AutoResizingTextarea 
                              value={(step as any)[row.field]} 
                              onChange={v => { const s = [...data.steps]; (s[i] as any)[row.field] = v; updateByPath('steps', s); }}
                              isPreview={isPreview}
                              className={`text-base leading-relaxed font-content ${row.color}`}
                              placeholder="..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {!isPreview && (
              <div className="no-print flex justify-center mt-8">
                <button onClick={addStep} className="bg-slate-50 border border-dashed border-slate-200 px-8 py-3 rounded-2xl text-slate-400 font-bold text-xs uppercase hover:bg-white transition-all">+ Add New Step</button>
              </div>
            )}
          </div>
        </section>

        {/* 05 Connection */}
        <section className="mb-12 print:mb-8">
          <SectionTitle num="05" title="教学内容衔接" isPreview={isPreview} />
          <div className="space-y-1">
            <EditableLine label="复习巩固 / Review" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <EditableLine label="内容预习 / Preview" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <EditableLine label="家庭作业 / Homework" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
            <EditableLine label="课前准备 / Prep" value={data.connection.prep} onChange={v => updateByPath('connection.prep', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 Feedback */}
        <section className="mb-12 print:mb-8 print:overflow-visible">
          <SectionTitle num="06" title="课后记录与备忘" isPreview={isPreview} onClear={() => updateByPath('feedback', INITIAL_STATE.feedback)} />
          <div className="border border-slate-100 print:border-slate-300 rounded-2xl overflow-hidden print:rounded-none">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100 print:border-slate-300">
                <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3 w-1/5 border-r border-slate-100 print:border-slate-300">反馈维度</th>
                  <th className="p-3 w-3/5 text-left border-r border-slate-100 print:border-slate-300">反馈内容 / Feedback</th>
                  <th className="p-3 w-1/5">时长与计划</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {[
                  { id: 'student', label: '学员反馈' },
                  { id: 'parent', label: '家长沟通' },
                  { id: 'partner', label: '搭档协作' },
                ].map((row) => (
                  <tr key={row.id} className="align-top print:break-inside-auto">
                    <td className="p-4 bg-slate-50/20 border-r border-slate-100 print:border-slate-300 text-center font-zh font-bold text-[10px] text-slate-500 pt-5">{row.label}</td>
                    <td className="p-4 border-r border-slate-100 print:border-slate-300">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].content} onChange={v => updateByPath(`feedback.${row.id}.content`, v)} isPreview={isPreview} className="text-base text-slate-800" placeholder="..." />
                    </td>
                    <td className="p-4 space-y-4">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].time} onChange={v => updateByPath(`feedback.${row.id}.time`, v)} isPreview={isPreview} className="text-xs text-indigo-400 font-bold" placeholder="时长" />
                      <div className="border-t border-slate-50 mt-2 pt-2">
                        <AutoResizingTextarea value={(data.feedback as any)[row.id].plan} onChange={v => updateByPath(`feedback.${row.id}.plan`, v)} isPreview={isPreview} className="text-[10px] text-slate-300 italic" placeholder="计划" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-50 text-center opacity-30 print:mt-12">
          <p className="text-[8px] font-bold tracking-[0.3em] text-slate-400 uppercase">JIANYINGLINGHANG TRAINING & DEVELOPMENT DEPARTMENT</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; border: none !important; box-shadow: none !important; transform: none !important; min-height: 0 !important; overflow: visible !important; }
          
          section, div, table, tr, td, tbody { 
            page-break-inside: auto !important; 
            break-inside: auto !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          table { display: table !important; border-collapse: collapse !important; }
          tr { display: table-row !important; }
          td { display: table-cell !important; }
          tbody { display: table-row-group !important; }

          .whitespace-pre-wrap { page-break-inside: auto !important; break-inside: auto !important; display: block !important; }
          @page { margin: 10mm; size: A4; }
          textarea::placeholder { color: transparent !important; }
        }
        .paper { min-height: 297mm; }
        textarea::placeholder { color: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
