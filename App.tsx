
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { TeachingPlan, Game, ImplementationStep } from './types';
import * as mammoth from 'mammoth';

// --- 初始状态定义 (严格遵循 types.ts) ---
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
    const saved = localStorage.getItem('teaching-plan-v14');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('teaching-plan-v14', JSON.stringify(data));
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
        contentPart = { text: `提取教案信息填充 JSON：\n\n${result.value.slice(0, 50000)}` };
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
        contents: [{ parts: [{ text: "提取教案内容。严格按照 JSON 格式返回。" }, contentPart] }],
        config: { responseMimeType: "application/json" }
      });
      const extracted = JSON.parse(response.text || "{}");
      setData({ ...INITIAL_STATE, ...extracted });
    } catch (err) { alert('智能导入失败'); } finally { setIsProcessing(false); }
  };

  const addStep = () => setData(prev => ({ ...prev, steps: [...prev.steps, { step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' }] }));
  const removeStep = (index: number) => { if (data.steps.length > 1) setData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) })); };
  const addGame = () => setData(prev => ({ ...prev, games: [...prev.games, { name: '', goal: '', prep: '', rules: '' }] }));
  const removeGame = (index: number) => { if (data.games.length > 1) setData(prev => ({ ...prev, games: prev.games.filter((_, i) => i !== index) })); };

  return (
    <div className={`min-h-screen transition-all duration-700 py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Controls */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-3 z-50 transition-all ${isPreview ? 'opacity-0 scale-90 translate-x-12 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={() => window.print()} className="bg-slate-800 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-xs flex items-center gap-2">导出 PDF 教案</button>
        <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-xs">
          {isProcessing ? '正在处理...' : '智能导入 Word'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".doc,.docx" />
        <button onClick={() => setIsPreview(!isPreview)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl shadow-md hover:text-indigo-600 transition-all font-bold text-xs">{isPreview ? '退出预览' : '预览模式'}</button>
      </div>

      <div className={`paper mx-auto bg-white transition-all duration-1000 relative ${isPreview ? 'p-[12mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[20mm] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.01)]'}`} style={{ maxWidth: '210mm' }}>
        
        {/* Header */}
        <div className="text-center mb-16 relative z-10 print:mb-10">
          <h1 className="text-3xl font-bold font-zh text-slate-900 tracking-[0.2em] print:text-2xl">课堂教学方案设计</h1>
          <p className="text-indigo-400 font-content text-[9px] tracking-[0.2em] uppercase font-bold mt-2 opacity-50">JIANYINGLINGHANG Professional Development</p>
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

        {/* 02 Objectives - 完整保留 9 个原始字段 */}
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

        {/* 03 Games & Materials - 还原四项教具 */}
        <section className="mb-12 print:mb-8">
          <SectionTitle num="03" title="互动与教具准备" isPreview={isPreview} />
          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
             <div>
                <h3 className="text-[10px] font-bold text-slate-300 mb-3 uppercase tracking-widest">教具准备 / Materials</h3>
                <div className="space-y-1">
                  <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
                  <EditableLine label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
                  <EditableLine label="多媒体课件" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
                  <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
                </div>
             </div>
             <div>
                <h3 className="text-[10px] font-bold text-slate-300 mb-3 uppercase tracking-widest">游戏方案 / Games</h3>
                <div className="space-y-4">
                  {data.games.map((g, i) => (
                    <div key={i} className="border-b border-slate-50 pb-2">
                      <EditableLine label={`游戏名称 ${i+1}`} value={g.name} onChange={v => { const ng = [...data.games]; ng[i].name = v; updateByPath('games', ng); }} isPreview={isPreview} />
                      <EditableLine label="游戏规则" value={g.rules} onChange={v => { const ng = [...data.games]; ng[i].rules = v; updateByPath('games', ng); }} isPreview={isPreview} />
                    </div>
                  ))}
                  {!isPreview && <button onClick={addGame} className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-2 hover:text-indigo-600">+ Add Game</button>}
                </div>
             </div>
          </div>
        </section>

        {/* 04 Implementation - 彻底解决分页问题的重构 */}
        <section className="mb-12 print:mb-8 print:overflow-visible">
          <SectionTitle num="04" title="教学环节实施" isPreview={isPreview} onClear={() => updateByPath('steps', INITIAL_STATE.steps)} />
          <div className="space-y-12 print:space-y-0 print:block">
            {data.steps.map((step, i) => (
              <div key={i} className="group/step relative print:break-inside-auto print:block print:mb-8">
                {/* 环节标题行 - 采用线条引导设计 */}
                <div className="flex items-center gap-4 mb-4 print:mb-2 border-b border-slate-50 print:border-slate-300 pb-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-800 text-xs shadow-sm print:shadow-none">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <AutoResizingTextarea 
                      value={step.step} 
                      onChange={v => { const s = [...data.steps]; s[i].step = v; updateByPath('steps', s); }}
                      isPreview={isPreview}
                      className="font-content text-lg font-bold text-indigo-900 tracking-tight"
                      placeholder="环节标题 (例如: Warm-up)"
                    />
                  </div>
                  {!isPreview && data.steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="no-print text-red-200 hover:text-red-400 text-[8px] font-bold uppercase transition-colors">Delete</button>
                  )}
                </div>

                {/* 核心改动：使用表格且强制在打印模式下 display: table/row/cell 保持结构但允许 tr 跨页断开 */}
                <div className="ml-4 pl-8 border-l-2 border-slate-50 print:border-slate-100 print:ml-2 print:pl-4 print:overflow-visible print:block">
                  <table className="w-full border-collapse print:table-auto print:block">
                    <tbody className="divide-y divide-slate-50 print:divide-slate-200 print:block">
                      {[
                        { label: '预计时长', field: 'duration', color: 'text-indigo-500 font-bold' },
                        { label: '教学环节设计', field: 'design', color: 'text-slate-800' },
                        { label: '课堂指令用语', field: 'instructions', color: 'text-slate-500 italic' },
                        { label: '注意事项', field: 'notes', color: 'text-rose-400' },
                        { label: '板书设计', field: 'blackboard', color: 'text-slate-400' },
                      ].map((row) => (
                        <tr key={row.field} className="align-top print:break-inside-auto print:flex print:flex-row print:w-full">
                          <td className="py-3 pr-4 w-24 text-[9px] font-bold text-slate-300 uppercase tracking-widest pt-4 shrink-0 text-right select-none print:text-slate-400">
                            {row.label}
                          </td>
                          <td className="py-3 flex-1 print:overflow-visible print:break-inside-auto">
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
              <div className="no-print flex justify-center mt-12">
                <button onClick={addStep} className="group/add flex items-center gap-2 text-indigo-400 border border-dashed border-indigo-200 px-10 py-4 rounded-3xl hover:bg-indigo-50 transition-all font-bold text-xs uppercase">
                  添加教学步骤
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 05 Connection - 还原四项衔接字段 */}
        <section className="mb-12 print:mb-8">
          <SectionTitle num="05" title="教学内容衔接" isPreview={isPreview} />
          <div className="space-y-1">
            <EditableLine label="复习巩固 / Review" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <EditableLine label="内容预习 / Preview" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <EditableLine label="家庭作业 / Homework" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
            <EditableLine label="课前准备 / Prep" value={data.connection.prep} onChange={v => updateByPath('connection.prep', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 Feedback - 还原三项反馈字段 */}
        <section className="mb-12 print:mb-8 print:overflow-visible">
          <SectionTitle num="06" title="课后记录与备忘" isPreview={isPreview} />
          <div className="border border-slate-100 print:border-slate-300 rounded-2xl overflow-hidden print:rounded-none">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100 print:border-slate-300">
                <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3 w-1/4 border-r border-slate-100 print:border-slate-300">反馈维度</th>
                  <th className="p-3 w-2/4 text-left border-r border-slate-100 print:border-slate-300">反馈内容 / Feedback</th>
                  <th className="p-3 w-1/4">后续计划 / Plan</th>
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
                    <td className="p-4">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].plan} onChange={v => updateByPath(`feedback.${row.id}.plan`, v)} isPreview={isPreview} className="text-[10px] text-indigo-400 italic" placeholder="..." />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-20 pt-8 border-t border-slate-50 text-center opacity-20 print:mt-12 print:pt-4">
          <p className="text-[8px] font-bold tracking-[0.4em] text-slate-400">JIANYINGLINGHANG · PROFESSIONAL TEACHING FRAMEWORK</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; border: none !important; box-shadow: none !important; transform: none !important; min-height: 0 !important; overflow: visible !important; }
          
          /* 核心分页修正 */
          section, div, table, tr, td, tbody { 
            page-break-inside: auto !important; 
            break-inside: auto !important;
            overflow: visible !important;
            display: block !important;
            height: auto !important;
          }
          
          /* 恢复打印时表格的基本逻辑结构，但保持流式断行 */
          table { display: table !important; }
          tr { display: table-row !important; }
          td { display: table-cell !important; }
          tbody { display: table-row-group !important; }

          .whitespace-pre-wrap { page-break-inside: auto !important; break-inside: auto !important; display: block !important; }
          @page { margin: 10mm; size: A4; }
          h2, h3 { break-after: avoid; }
          textarea::placeholder { color: transparent !important; }
        }
        .paper { min-height: 297mm; }
        textarea::placeholder { color: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
