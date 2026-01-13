
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { TeachingPlan, Game, ImplementationStep } from './types';

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
  steps: Array(5).fill(null).map(() => ({
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

const SectionTitle = memo(({ num, title, onClear, isPreview }: { num: string, title: string, onClear?: () => void, isPreview: boolean }) => (
  <div className="flex items-center mb-8 mt-4 group/title">
    <div className="w-1.5 h-8 bg-indigo-500 rounded-full mr-4"></div>
    <div className="flex items-baseline">
      <span className="text-indigo-500 font-bold text-2xl mr-2 opacity-50">{num}.</span>
      <h2 className="text-xl font-bold font-zh text-slate-800 tracking-wide">{title}</h2>
    </div>
    {!isPreview && onClear && (
      <button 
        onClick={onClear}
        className="ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold font-zh no-print"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        清空
      </button>
    )}
    <div className="flex-1 ml-6 h-[1px] bg-slate-100"></div>
  </div>
));

const EditableLine = memo(({ label, value, onChange, isPreview, placeholder = "点击填写..." }: { label: string, value: string, onChange: (v: string) => void, isPreview: boolean, placeholder?: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    onChange(el.value);
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  return (
    <div className={`group flex items-start py-3 border-b border-slate-50 transition-all ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'}`}>
      <div className="flex-shrink-0 font-bold text-[13px] font-zh min-w-[160px] text-slate-500 pt-1.5 uppercase tracking-tighter">
        {label}
      </div>
      <div className="flex-1 ml-4">
        <textarea
          ref={textareaRef}
          rows={1}
          readOnly={isPreview}
          className={`w-full outline-none border-none resize-none font-content text-lg text-slate-900 bg-transparent placeholder-slate-200 focus:text-indigo-900 overflow-hidden leading-relaxed ${isPreview ? 'cursor-default' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={isPreview ? "" : placeholder}
        />
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [data, setData] = useState<TeachingPlan>(() => {
    const saved = localStorage.getItem('teaching-plan-v10');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  
  const [isPreview, setIsPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('teaching-plan-v10', JSON.stringify(data));
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
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "你是一个专业的少儿英语教案解析助手。请根据上传的教案图片或文档内容，提取信息并按照指定的JSON格式返回。如果某项内容缺失，请保持空字符串。必须严格遵守JSON Schema。" },
              { inlineData: { mimeType: file.type, data: base64 } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              basic: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  lessonNo: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  className: { type: Type.STRING },
                  studentCount: { type: Type.STRING },
                  date: { type: Type.STRING }
                }
              },
              objectives: {
                type: Type.OBJECT,
                properties: {
                  vocab: {
                    type: Type.OBJECT,
                    properties: { core: { type: Type.STRING }, basic: { type: Type.STRING }, satellite: { type: Type.STRING } }
                  },
                  patterns: {
                    type: Type.OBJECT,
                    properties: { core: { type: Type.STRING }, basic: { type: Type.STRING }, satellite: { type: Type.STRING } }
                  },
                  expansion: {
                    type: Type.OBJECT,
                    properties: { culture: { type: Type.STRING }, daily: { type: Type.STRING }, habits: { type: Type.STRING } }
                  }
                }
              },
              materials: {
                type: Type.OBJECT,
                properties: { cards: { type: Type.STRING }, realia: { type: Type.STRING }, multimedia: { type: Type.STRING }, rewards: { type: Type.STRING } }
              },
              games: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, goal: { type: Type.STRING }, prep: { type: Type.STRING }, rules: { type: Type.STRING } }
                }
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    design: { type: Type.STRING },
                    instructions: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    blackboard: { type: Type.STRING }
                  }
                }
              },
              connection: {
                type: Type.OBJECT,
                properties: { review: { type: Type.STRING }, preview: { type: Type.STRING }, homework: { type: Type.STRING }, prep: { type: Type.STRING } }
              },
              feedback: {
                type: Type.OBJECT,
                properties: {
                  student: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } },
                  parent: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } },
                  partner: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, time: { type: Type.STRING }, plan: { type: Type.STRING } } }
                }
              }
            }
          }
        }
      });

      const extractedData = JSON.parse(response.text);
      // 合并提取的数据，确保steps数组长度合适
      if (extractedData.steps && extractedData.steps.length < 5) {
        while (extractedData.steps.length < 5) {
          extractedData.steps.push({ step: '', duration: '', design: '', instructions: '', notes: '', blackboard: '' });
        }
      }
      setData({ ...INITIAL_STATE, ...extractedData });
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("信息提取失败，请重试。");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addGame = () => {
    setData(prev => ({ ...prev, games: [...prev.games, { name: '', goal: '', prep: '', rules: '' }] }));
  };

  const removeGame = (index: number) => {
    if (data.games.length <= 1) return;
    setData(prev => ({ ...prev, games: prev.games.filter((_, i) => i !== index) }));
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 py-12 px-4 print:p-0 print:bg-white ${isPreview ? 'bg-slate-800' : 'bg-slate-50'}`}>
      
      {/* Controls */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-4 z-50 transition-all duration-300 ${isPreview ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100'}`}>
        <button 
          onClick={() => window.print()} 
          className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-base flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          导出正式教案
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,application/pdf"
        />
        
        <button 
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-base flex items-center gap-3 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              正在解析文档...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              智能导入文档
            </>
          )}
        </button>

        <button 
          onClick={() => setIsPreview(true)} 
          className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all font-bold text-base flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          预览打印模式
        </button>
        <button onClick={() => { if(confirm('清空全部内容？')) setData(INITIAL_STATE); }} className="bg-white/80 backdrop-blur border border-slate-200 text-slate-400 px-8 py-3 rounded-2xl hover:text-red-500 transition-all text-sm font-medium">
          清空全部
        </button>
      </div>

      {isPreview && (
        <div className="no-print fixed top-0 left-0 w-full flex justify-center py-4 bg-slate-900/50 backdrop-blur-md z-[60]">
          <button onClick={() => setIsPreview(false)} className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2">
            退出预览
          </button>
        </div>
      )}

      <div className={`paper mx-auto bg-white transition-all duration-500 relative ${isPreview ? 'p-[20mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[25mm] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)]'}`} style={{ maxWidth: '210mm' }}>
        
        {/* Header */}
        <div className="text-center mb-16 relative z-10">
          <h1 className="text-4xl font-bold font-zh text-slate-900 tracking-[0.15em]">少儿英语线下课课堂教案</h1>
          <div className="mt-4 flex flex-col items-center justify-center gap-2">
            <p className="text-indigo-400 font-content text-xs tracking-[0.1em] uppercase font-bold">CAMPUPRO ENGLISH Training & Development Department</p>
          </div>
        </div>

        {/* 01 Basic Info */}
        <section className="mb-12 relative z-10">
          <SectionTitle num="01" title="基础课程信息" onClear={() => updateByPath('basic', INITIAL_STATE.basic)} isPreview={isPreview} />
          <div className={`grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden ${isPreview ? 'rounded-none border-slate-400' : ''}`}>
            {[
              { label: '课程级别', path: 'basic.level' },
              { label: '单元', path: 'basic.unit' },
              { label: '课号', path: 'basic.lessonNo' },
              { label: '时长', path: 'basic.duration' },
              { label: '授课班级', path: 'basic.className' },
              { label: '人数', path: 'basic.studentCount' },
              { label: '日期', path: 'basic.date' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 6 ? 'border-b' : ''} ${idx === 6 ? 'col-span-2' : ''} ${isPreview ? 'border-slate-400' : ''}`}>
                <div className="w-[100px] bg-slate-50/50 p-4 font-zh font-bold text-xs text-slate-400 flex items-center justify-center text-center uppercase">
                  {item.label}
                </div>
                <div className="flex-1 p-3">
                  <input readOnly={isPreview} className="w-full outline-none border-none font-content text-center text-lg text-slate-800 bg-transparent" value={(data.basic as any)[item.path.split('.')[1]]} onChange={e => updateByPath(item.path, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 Objectives */}
        <section className="mb-12 relative z-10">
          <SectionTitle num="02" title="核心教学目标" onClear={() => updateByPath('objectives', INITIAL_STATE.objectives)} isPreview={isPreview} />
          <div className="flex flex-col space-y-10">
            <div>
              <h3 className="text-[11px] font-bold font-zh text-indigo-400 mb-4 uppercase tracking-[0.2em] opacity-80">（一）词汇目标 / Vocabulary</h3>
              <EditableLine label="核心单词 (4 skills)" value={data.objectives.vocab.core} onChange={v => updateByPath('objectives.vocab.core', v)} isPreview={isPreview} />
              <EditableLine label="基础单词 (3 skills)" value={data.objectives.vocab.basic} onChange={v => updateByPath('objectives.vocab.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星单词 (2 skills)" value={data.objectives.vocab.satellite} onChange={v => updateByPath('objectives.vocab.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-[11px] font-bold font-zh text-indigo-400 mb-4 uppercase tracking-[0.2em] opacity-80">（二）句型目标 / Sentences</h3>
              <Clarify text="核心/基础/卫星句型" />
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => updateByPath('objectives.patterns.core', v)} isPreview={isPreview} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => updateByPath('objectives.patterns.basic', v)} isPreview={isPreview} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => updateByPath('objectives.patterns.satellite', v)} isPreview={isPreview} />
            </div>
            <div>
              <h3 className="text-[11px] font-bold font-zh text-indigo-400 mb-4 uppercase tracking-[0.2em] opacity-80">（三）拓展目标 / Expansion</h3>
              <EditableLine label="文化拓展" value={data.objectives.expansion.culture} onChange={v => updateByPath('objectives.expansion.culture', v)} isPreview={isPreview} />
              <EditableLine label="日常表达" value={data.objectives.expansion.daily} onChange={v => updateByPath('objectives.expansion.daily', v)} isPreview={isPreview} />
              <EditableLine label="行为习惯" value={data.objectives.expansion.habits} onChange={v => updateByPath('objectives.expansion.habits', v)} isPreview={isPreview} />
            </div>
          </div>
        </section>

        {/* 03 Games & Materials */}
        <section className="mb-12 relative z-10">
          <SectionTitle num="03" title="教具与互动准备" onClear={() => { updateByPath('materials', INITIAL_STATE.materials); updateByPath('games', INITIAL_STATE.games); }} isPreview={isPreview} />
          <div className="flex flex-col space-y-12">
            <div>
              <h3 className="text-[11px] font-bold font-zh text-slate-400 mb-4 uppercase tracking-[0.2em]">（一）教具清单</h3>
              <div className="space-y-1">
                <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => updateByPath('materials.cards', v)} isPreview={isPreview} />
                <EditableLine label="实物教具" value={data.materials.realia} onChange={v => updateByPath('materials.realia', v)} isPreview={isPreview} />
                <EditableLine label="多媒体设备" value={data.materials.multimedia} onChange={v => updateByPath('materials.multimedia', v)} isPreview={isPreview} />
                <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => updateByPath('materials.rewards', v)} isPreview={isPreview} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold font-zh text-slate-400 uppercase tracking-[0.2em]">（二）互动游戏</h3>
                {!isPreview && (
                  <button onClick={addGame} className="no-print bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors">+ 新增游戏</button>
                )}
              </div>
              <div className="space-y-6">
                {data.games.map((game, i) => (
                  <div key={i} className={`group/game relative p-6 bg-slate-50/50 border border-slate-100 transition-all ${isPreview ? 'rounded-none border-slate-400 bg-transparent p-0' : 'rounded-2xl shadow-sm'}`}>
                    {!isPreview && data.games.length > 1 && (
                      <button onClick={() => removeGame(i)} className="absolute top-4 right-4 no-print text-red-400 hover:text-red-600 font-bold text-[10px] uppercase">删除</button>
                    )}
                    <div className="text-[10px] font-bold text-indigo-300 mb-4 tracking-widest uppercase flex items-center gap-2">Game {i+1}</div>
                    <div className="space-y-1">
                      <EditableLine label="游戏名称" value={game.name} onChange={v => { const g = [...data.games]; g[i].name = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏目的" value={game.goal} onChange={v => { const g = [...data.games]; g[i].goal = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏准备" value={game.prep} onChange={v => { const g = [...data.games]; g[i].prep = v; updateByPath('games', g); }} isPreview={isPreview} />
                      <EditableLine label="游戏规则" value={game.rules} onChange={v => { const g = [...data.games]; g[i].rules = v; updateByPath('games', g); }} isPreview={isPreview} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 04 Implementation */}
        <section className="mb-12 page-break-before relative z-10">
          <SectionTitle num="04" title="教学环节实施" onClear={() => updateByPath('steps', INITIAL_STATE.steps)} isPreview={isPreview} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'}`}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="font-zh text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  <th className="p-3 w-[12%] text-center border-r border-slate-200">环节</th>
                  <th className="p-3 w-[8%] text-center border-r border-slate-200">时长</th>
                  <th className="p-3 w-[22%] text-left border-r border-slate-200">教学设计</th>
                  <th className="p-3 w-[22%] text-left border-r border-slate-200">课堂用语</th>
                  <th className="p-3 w-[18%] text-left border-r border-slate-200">注意</th>
                  <th className="p-3 w-[18%] text-left">板书</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.steps.map((step, i) => (
                  <tr key={i} className="group/step relative">
                    <td className="p-2 align-top text-center border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-zh text-xs font-bold text-slate-700 text-center bg-transparent h-20" value={step.step} onChange={e => { const s = [...data.steps]; s[i].step = e.target.value; updateByPath('steps', s); }} />
                    </td>
                    <td className="p-2 align-top border-r border-slate-200">
                      <input readOnly={isPreview} className="w-full outline-none border-none font-content text-sm text-center text-indigo-500 font-bold bg-transparent" value={step.duration} onChange={e => { const s = [...data.steps]; s[i].duration = e.target.value; updateByPath('steps', s); }} />
                    </td>
                    <td className="p-2 align-top border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-content text-xs text-slate-600 bg-transparent h-40 leading-relaxed" value={step.design} onChange={e => { const s = [...data.steps]; s[i].design = e.target.value; updateByPath('steps', s); }} />
                    </td>
                    <td className="p-2 align-top border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-content text-xs text-slate-600 bg-transparent h-40 italic leading-relaxed" value={step.instructions} onChange={e => { const s = [...data.steps]; s[i].instructions = e.target.value; updateByPath('steps', s); }} />
                    </td>
                    <td className="p-2 align-top border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-content text-xs text-red-400 bg-transparent h-40 leading-relaxed" value={step.notes} onChange={e => { const s = [...data.steps]; s[i].notes = e.target.value; updateByPath('steps', s); }} />
                    </td>
                    <td className="p-2 align-top">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-content text-xs text-slate-600 bg-transparent h-40 leading-relaxed" value={step.blackboard} onChange={e => { const s = [...data.steps]; s[i].blackboard = e.target.value; updateByPath('steps', s); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 05 Connection */}
        <section className="mb-12 relative z-10">
          <SectionTitle num="05" title="教学内容衔接" onClear={() => updateByPath('connection', INITIAL_STATE.connection)} isPreview={isPreview} />
          <div className="space-y-1">
            <EditableLine label="课堂复习 / Review" value={data.connection.review} onChange={v => updateByPath('connection.review', v)} isPreview={isPreview} />
            <EditableLine label="内容预告 / Preview" value={data.connection.preview} onChange={v => updateByPath('connection.preview', v)} isPreview={isPreview} />
            <EditableLine label="家庭作业 / Homework" value={data.connection.homework} onChange={v => updateByPath('connection.homework', v)} isPreview={isPreview} />
            <EditableLine label="课前准备 / Prep" value={data.connection.prep} onChange={v => updateByPath('connection.prep', v)} isPreview={isPreview} />
          </div>
        </section>

        {/* 06 Post-class Communication */}
        <section className="mb-12 relative z-10">
          <SectionTitle num="06" title="课后沟通备忘录" onClear={() => updateByPath('feedback', INITIAL_STATE.feedback)} isPreview={isPreview} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'}`}>
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="font-zh text-[10px] font-bold text-slate-400 uppercase">
                  <th className="p-3 w-[15%] text-center border-r border-slate-200">反馈维度</th>
                  <th className="p-3 w-[55%] text-left border-r border-slate-200">反馈内容 / Feedback Content</th>
                  <th className="p-3 w-[15%] text-center border-r border-slate-200">反馈时间</th>
                  <th className="p-3 w-[15%] text-center">后续跟进计划</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-content">
                {[
                  { id: 'student', label: '学员反馈' },
                  { id: 'parent', label: '家长沟通' },
                  { id: 'partner', label: '搭档协作' },
                ].map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 text-center bg-slate-50/30 border-r border-slate-200 font-zh font-bold text-xs text-slate-500">{row.label}</td>
                    <td className="p-2 border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none text-sm text-slate-800 bg-transparent min-h-[60px]" value={(data.feedback as any)[row.id].content} onChange={e => updateByPath(`feedback.${row.id}.content`, e.target.value)} />
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <input readOnly={isPreview} className="w-full outline-none border-none text-center text-xs text-slate-500 bg-transparent" value={(data.feedback as any)[row.id].time} onChange={e => updateByPath(`feedback.${row.id}.time`, e.target.value)} />
                    </td>
                    <td className="p-2">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none text-xs text-indigo-400 bg-transparent min-h-[60px]" value={(data.feedback as any)[row.id].plan} onChange={e => updateByPath(`feedback.${row.id}.plan`, e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-slate-100 text-center relative z-10 opacity-50">
          <p className="text-slate-400 font-content text-[9px] tracking-[0.2em] uppercase font-bold">CAMPUPRO ENGLISH Training & Development Department</p>
          <p className="text-slate-300 text-[8px] mt-1 font-zh">内部教研材料 · 严禁外传</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .paper { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 10mm !important; border-radius: 0 !important; transform: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-break-before { page-break-before: always; }
          input, textarea { background: transparent !important; color: inherit !important; border: none !important; }
          @page { margin: 10mm; size: A4; }
          textarea::placeholder { color: transparent !important; }
        }
        textarea::-webkit-scrollbar { width: 0; height: 0; }
        .paper { min-height: 297mm; }
        textarea { white-space: pre-wrap; word-break: break-word; }
      `}</style>
    </div>
  );
};

const Clarify = ({ text }: { text: string }) => (
  <div className="text-[10px] text-slate-300 font-zh mb-1 italic">Note: {text}</div>
);

export default App;
