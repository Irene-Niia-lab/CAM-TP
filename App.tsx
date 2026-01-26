
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { TeachingPlan } from './types';
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

const SectionTitle = memo(({ num, title, isPreview }: { num: string, title: string, isPreview: boolean }) => (
  <div className="flex items-center mb-8 mt-10 print:mt-10 print:mb-8">
    <div className="w-1.5 h-6 bg-indigo-600 rounded-full mr-4"></div>
    <div className="flex items-baseline">
      <span className="text-indigo-700 font-bold text-xl mr-3">{num}.</span>
      <h2 className="text-xl font-bold font-zh text-slate-900 tracking-wider">{title}</h2>
    </div>
    <div className="flex-1 ml-6 h-[1px] bg-slate-200 print:bg-slate-300"></div>
  </div>
));

const SubSectionTitle = memo(({ title }: { title: string }) => (
  <h3 className="text-sm font-bold text-indigo-700 mb-6 font-zh">{title}</h3>
));

const LabelRow = memo(({ label, value, onChange, isPreview, placeholder = "..." }: { label: string, value: string, onChange: (v: string) => void, isPreview: boolean, placeholder?: string }) => (
  <div className="flex items-start py-3 border-b border-slate-100 print:border-slate-200">
    <div className="w-36 flex-shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wider pt-1">{label}</div>
    <div className="flex-1 ml-4">
      <AutoResizingTextarea 
        value={value} 
        onChange={onChange} 
        isPreview={isPreview} 
        placeholder={placeholder}
        className="font-content text-base text-slate-800 leading-relaxed"
      />
    </div>
  </div>
));

const App: React.FC = () => {
  const [data, setData] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem('teaching-plan-final-v1');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('teaching-plan-final-v1', JSON.stringify(data));
    const { level, unit, lessonNo } = data.basic;
    document.title = `02.PU${level || ''} U${unit || ''}L${lessonNo || ''} Teaching Plan`;
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
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: "将教案内容转为 JSON。" }, { text: result.value }] }],
        config: { responseMimeType: "application/json" }
      });
      setData({ ...INITIAL_STATE, ...JSON.parse(response.text || "{}") });
    } catch (err) { alert('导入失败'); } finally { setIsProcessing(false); }
  };

  return (
    <div className={`min-h-screen py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Controls */}
      <div className="no-print fixed top-8 right-8 flex flex-col gap-3 z-50">
        <button onClick={() => window.print()} className="bg-indigo-700 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-indigo-800 transition-all font-bold text-xs">导出 PDF</button>
        <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-slate-900 transition-all font-bold text-xs">{isProcessing ? '处理中...' : '导入 Word'}</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".docx" />
        <button onClick={() => setIsPreview(!isPreview)} className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl shadow-md font-bold text-xs">{isPreview ? '退出预览' : '预览'}</button>
      </div>

      <div className="paper mx-auto bg-white p-[20mm] print:p-[10mm] shadow-2xl print:shadow-none" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* Header */}
        <div className="text-center mb-16 print:mb-12">
          <h1 className="text-3xl font-bold font-zh text-slate-900 tracking-wider">少儿英语线下课课堂教案</h1>
          <p className="text-indigo-600 font-content text-[11px] tracking-[0.1em] uppercase font-bold mt-2 opacity-80">JIANYINGLINGHANG TRAINING & DEVELOPMENT DEPARTMENT</p>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-14">
          <SectionTitle num="01" title="基础课程信息" isPreview={isPreview} />
          <div className="grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden print:rounded-none print:border-slate-400">
            {[
              { label: '课程级别', path: 'basic.level', p: 'PU3' },
              { label: '单元', path: 'basic.unit', p: 'U0' },
              { label: '课号', path: 'basic.lessonNo', p: 'L1' },
              { label: '时长', path: 'basic.duration', p: '90min' },
              { label: '授课班级', path: 'basic.className', p: '/' },
              { label: '人数', path: 'basic.studentCount', p: '/' },
              { label: '日期', path: 'basic.date', span: true, p: '/' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 print:border-slate-400 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${item.span ? 'col-span-2' : ''}`}>
                <div className="w-24 bg-slate-50 p-4 font-zh font-bold text-[10px] text-slate-500 flex items-center justify-center text-center uppercase print:bg-slate-50">
                  {item.label}
                </div>
                <div className="flex-1 p-3">
                  <input readOnly={isPreview} className="w-full text-center font-content text-lg outline-none bg-transparent text-slate-900" value={(data.basic as any)[item.path.split('.')[1]]} onChange={e => updateByPath(item.path, e.target.value)} placeholder={item.p} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Objectives */}
        <section className="mb-14">
          <SectionTitle num="02" title="核心教学目标" isPreview={isPreview} />
          
          <div className="space-y-12">
            <div>
              <SubSectionTitle title="(一) 词汇目标 / VOCABULARY" />
              <LabelRow label="核心单词 (4 SKILLS)" value={data.objectives.vocab.core} onChange={v => updateByPath('objectives.vocab.core', v)} isPreview={isPreview} />
              <LabelRow label="基础单词 (3 SKILLS)" value={data.objectives.vocab.basic} onChange={v => updateByPath('objectives.vocab.basic', v)} isPreview={isPreview} />
              <LabelRow label="卫星单词 (2 SKILLS)" value={data.objectives.vocab.satellite} onChange={v => updateByPath('objectives.vocab.satellite', v)} isPreview={isPreview} />
            </div>

            <div>
              <SubSectionTitle title="(二) 句型目标 / SENTENCES" />
              <LabelRow label="核心句型" value={data.objectives.patterns.core} onChange={v => updateByPath('objectives.patterns.core', v)} isPreview={isPreview} />
              <LabelRow label="基础句型" value={data.objectives.patterns.basic} onChange={v => updateByPath('objectives.patterns.basic', v)} isPreview={isPreview} />
              <LabelRow label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => updateByPath('objectives.patterns.satellite', v)} isPreview={isPreview} />
            </div>

            <div>
              <SubSectionTitle title="(三) 拓展目标 / EXPANSION" />
              <LabelRow label="文化拓展" value={data.objectives.expansion.culture} onChange={v => updateByPath('objectives.expansion.culture', v)} isPreview={isPreview} />
              <LabelRow label="日常表达" value={data.objectives.expansion.daily} onChange={v => updateByPath('objectives.expansion.daily', v)} isPreview={isPreview} />
              <LabelRow label="行为习惯" value={data.objectives.expansion.habits} onChange={v => updateByPath('objectives.expansion.habits', v)} isPreview={isPreview} />
            </div>
          </div>
        </section>

        {/* 03 Preparation */}
        <section className="mb-14 print:break-inside-auto">
          <SectionTitle num="03" title="教具与互动准备" isPreview={isPreview} />
          
          <SubSectionTitle title="(一) 教具清单" />
          <div className="space-y-2 mb-12">
            <LabelRow label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
            <LabelRow label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
            <LabelRow label="多媒体设备" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
            <LabelRow label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
          </div>

          <SubSectionTitle title="(二) 互动游戏" />
          <div className="space-y-8">
            {data.games.map((g, i) => (
              <div key={i} className="bg-slate-50/60 border border-slate-200 p-8 rounded-[2rem] print:rounded-none print:border-slate-400 print:bg-white print:break-inside-avoid shadow-sm print:shadow-none">
                <div className="text-[10px] font-bold text-indigo-500 uppercase mb-6 tracking-widest">GAME {i+1}</div>
                <div className="space-y-6">
                  {[
                    { label: '游戏名称', key: 'name' },
                    { label: '游戏目的', key: 'goal' },
                    { label: '游戏准备', key: 'prep' },
                    { label: '游戏规则', key: 'rules' },
                  ].map(field => (
                    <div key={field.key} className="flex gap-6">
                      <div className="w-20 shrink-0 text-[10px] font-bold text-indigo-700/80 uppercase tracking-tighter pt-1">{field.label}</div>
                      <AutoResizingTextarea 
                        value={(g as any)[field.key]} 
                        onChange={v => { const ng = [...data.games]; (ng[i] as any)[field.key] = v; updateByPath('games', ng); }}
                        isPreview={isPreview}
                        className="text-sm text-slate-800 font-content leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!isPreview && <button onClick={() => updateByPath('games', [...data.games, { name: '', goal: '', prep: '', rules: '' }])} className="w-full py-4 border border-dashed border-slate-300 rounded-2xl text-xs font-bold text-slate-400 uppercase hover:bg-slate-50">+ 添加游戏</button>}
          </div>
        </section>

        {/* 04 Implementation */}
        <section className="mb-14 print:overflow-visible">
          <SectionTitle num="04" title="教学环节实施" isPreview={isPreview} />
          <div className="space-y-14 print:space-y-0 print:block">
            {data.steps.map((step, i) => (
              <div key={i} className="mb-12 print:mb-10 print:break-inside-auto print:block">
                <div className="font-zh font-bold text-slate-900 text-lg mb-4 flex items-center gap-3">
                  <span className="text-indigo-700">{i+1}.</span>
                  <AutoResizingTextarea 
                    value={step.step} 
                    onChange={v => { const s = [...data.steps]; s[i].step = v; updateByPath('steps', s); }}
                    isPreview={isPreview}
                    className="flex-1 font-bold text-slate-900"
                    placeholder="环节标题 (例如: Greeting 问候)"
                  />
                </div>
                
                <div className="border border-slate-200 rounded-2xl overflow-hidden print:rounded-none print:border-slate-400">
                  <table className="w-full border-collapse">
                    <tbody className="divide-y divide-slate-100 print:divide-slate-400">
                      {[
                        { label: '时长', field: 'duration', color: 'text-indigo-700 font-bold' },
                        { label: '环节设计', field: 'design', color: 'text-slate-900' },
                        { label: '课堂指令/用语', field: 'instructions', color: 'text-slate-600 italic' },
                        { label: '难点/注意点', field: 'notes', color: 'text-rose-600' },
                        { label: '板书设计', field: 'blackboard', color: 'text-slate-500' },
                      ].map((row) => (
                        <tr key={row.field} className="align-top print:break-inside-auto">
                          <td className="w-28 bg-slate-50 p-4 border-r border-slate-100 print:border-slate-400 font-zh font-bold text-[10px] text-slate-500 text-center flex items-center justify-center pt-6 uppercase">
                            {row.label}
                          </td>
                          <td className="p-4 flex-1">
                            <AutoResizingTextarea 
                              value={(step as any)[row.field]} 
                              onChange={v => { const s = [...data.steps]; (s[i] as any)[row.field] = v; updateByPath('steps', s); }}
                              isPreview={isPreview}
                              className={`text-base leading-relaxed font-content ${row.color}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 05 Connection */}
        <section className="mb-14">
          <SectionTitle num="05" title="教学内容衔接" isPreview={isPreview} />
          <div className="space-y-2">
            <LabelRow label="课堂复习 / REVIEW" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <LabelRow label="内容预习 / PREVIEW" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <LabelRow label="家庭作业 / HOMEWORK" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
            <LabelRow label="下次课前准备 / PREP" value={data.connection.prep} onChange={v => updateByPath('connection.prep', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 Feedback */}
        <section className="mb-14 print:break-inside-avoid">
          <SectionTitle num="06" title="课后沟通备忘录" isPreview={isPreview} />
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:rounded-none print:border-slate-400">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 print:border-slate-400">
                <tr className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                  <th className="p-4 w-[15%] border-r border-slate-200 print:border-slate-400">维度</th>
                  <th className="p-4 w-[55%] text-left border-r border-slate-200 print:border-slate-400">反馈内容 / FEEDBACK</th>
                  <th className="p-4 w-[15%] border-r border-slate-200 print:border-slate-400">时间</th>
                  <th className="p-4 w-[15%]">后续计划</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-400">
                {[
                  { id: 'student', label: '学员反馈' },
                  { id: 'parent', label: '家长沟通' },
                  { id: 'partner', label: '搭档协作' },
                ].map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="p-4 bg-slate-50/40 border-r border-slate-200 print:border-slate-400 text-center font-zh font-bold text-[11px] text-slate-700 pt-6">{row.label}</td>
                    <td className="p-4 border-r border-slate-200 print:border-slate-400">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].content} onChange={v => updateByPath(`feedback.${row.id}.content`, v)} isPreview={isPreview} className="text-sm text-slate-900" />
                    </td>
                    <td className="p-4 border-r border-slate-200 print:border-slate-400">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].time} onChange={v => updateByPath(`feedback.${row.id}.time`, v)} isPreview={isPreview} className="text-xs text-center text-slate-600" />
                    </td>
                    <td className="p-4">
                      <AutoResizingTextarea value={(data.feedback as any)[row.id].plan} onChange={v => updateByPath(`feedback.${row.id}.plan`, v)} isPreview={isPreview} className="text-xs text-center text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-slate-100 text-center opacity-40 print:mt-12">
          <p className="text-[9px] font-bold tracking-[0.4em] text-slate-500 uppercase">JIANYINGLINGHANG TRAINING & DEVELOPMENT DEPARTMENT</p>
          <p className="text-[7px] mt-2 text-slate-400 font-zh">内部教研材料 · 严禁外传</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { width: 100% !important; max-width: none !important; margin: 0 !important; border: none !important; transform: none !important; overflow: visible !important; }
          section, div, table, tr, td, tbody { page-break-inside: auto !important; break-inside: auto !important; }
          .break-inside-avoid { break-inside: avoid !important; }
          @page { margin: 10mm; size: A4; }
          textarea::placeholder { color: transparent !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
