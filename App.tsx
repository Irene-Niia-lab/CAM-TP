
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
  steps: Array(6).fill(null).map((_, i) => ({
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
    const fileName = `02.PU_ ${level || ''}_U${unit || ''}_L${lessonNo || ''}_ Teaching Plan`.replace(/\s+/g, ' ');
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
    <div className="flex items-center mb-8 mt-4 group/title">
      <div className="w-1.5 h-8 bg-indigo-500 rounded-full mr-4"></div>
      <div className="flex items-baseline">
        <span className="text-indigo-500 font-bold text-2xl mr-2 opacity-50">{num}.</span>
        <h2 className="text-xl font-bold font-zh text-slate-800 tracking-wide">{title}</h2>
      </div>
      {!isPreview && onClear && (
        <button 
          onClick={onClear}
          className="ml-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs font-bold font-zh"
          title="清空此模块"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          清空模块
        </button>
      )}
      <div className="flex-1 ml-6 h-[1px] bg-slate-100"></div>
    </div>
  );

  const EditableLine = ({ label, value, onChange, prefix }: { label: string, value: string, onChange: (v: string) => void, prefix?: string }) => (
    <div className={`group flex items-start py-3 border-b border-slate-50 transition-all ${isPreview ? 'border-transparent' : 'hover:border-indigo-100'}`}>
      <div className="flex-shrink-0 font-bold text-[15px] font-zh min-w-[140px] text-slate-600 pt-1">
        {prefix && <span className="mr-2 text-indigo-400 font-normal">{prefix}</span>}
        {label}
      </div>
      <div className="flex-1 ml-4">
        <textarea
          rows={1}
          readOnly={isPreview}
          className={`w-full outline-none border-none resize-none font-en text-lg text-slate-900 bg-transparent placeholder-slate-200 focus:text-indigo-900 overflow-hidden leading-relaxed ${isPreview ? 'cursor-default' : ''}`}
          value={value}
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
      
      {/* 顶部退出预览条 */}
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

      {/* 现代悬浮控制栏 */}
      <div className={`no-print fixed top-8 right-8 flex flex-col gap-4 z-50 transition-all duration-300 ${isPreview ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100'}`}>
        <button 
          onClick={handlePrint} 
          className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all font-bold text-base flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
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

      <div className={`paper mx-auto bg-white transition-all duration-500 print:shadow-none print:p-[15mm] print:rounded-none ${isPreview ? 'p-[20mm] rounded-none shadow-2xl scale-[0.98]' : 'p-[25mm] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)]'}`} style={{ maxWidth: '210mm' }}>
        {/* 精致页眉 */}
        <div className="text-center mb-20">
          <h1 className="text-4xl font-bold font-zh text-slate-900 tracking-[0.15em]">线下课课堂教案</h1>
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="h-[1px] w-12 bg-indigo-100"></span>
            <p className="text-indigo-400 font-en text-xs tracking-[0.4em] uppercase font-bold">Teaching Plan Template</p>
            <span className="h-[1px] w-12 bg-indigo-100"></span>
          </div>
        </div>

        {/* 一、基础课程信息 */}
        <section className="mb-16">
          <SectionTitle num="01" title="基础课程信息" onClear={() => clearSection('basic')} />
          <div className={`grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden transition-all ${isPreview ? 'rounded-none' : ''}`}>
            {[
              { label: '课程级别', path: 'basic.level' },
              { label: '课号/单元', path: 'basic.lessonNo' },
              { label: '课程时长', path: 'basic.duration' },
              { label: '授课班级', path: 'basic.className' },
              { label: '学员人数', path: 'basic.studentCount' },
              { label: '授课日期', path: 'basic.date' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex border-slate-100 ${idx % 2 === 0 ? 'border-r' : ''} ${idx < 4 ? 'border-b' : ''}`}>
                <div className="w-[100px] bg-slate-50/50 p-4 font-zh font-bold text-sm text-slate-500 flex items-center justify-center">
                  {item.label}
                </div>
                <div className="flex-1 p-3">
                  <input 
                    readOnly={isPreview}
                    className={`w-full outline-none border-none font-en text-center text-lg text-slate-800 placeholder-slate-200 bg-transparent ${isPreview ? 'cursor-default' : ''}`} 
                    value={getValueByPath(data, item.path)} 
                    onChange={e => update(item.path, e.target.value)} 
                    placeholder={isPreview ? "" : "待填写"} 
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 二、教学目标 */}
        <section className="mb-16">
          <SectionTitle num="02" title="核心教学目标" onClear={() => clearSection('objectives')} />
          <div className="flex flex-col space-y-12">
            <div>
              <h3 className="text-sm font-bold font-zh text-indigo-500 mb-4 uppercase tracking-widest">（一）词汇目标 / Vocabulary</h3>
              <EditableLine label="核心单词 (四会)" value={data.objectives.vocab.core} onChange={v => update('objectives.vocab.core', v)} />
              <EditableLine label="基础单词 (三会)" value={data.objectives.vocab.basic} onChange={v => update('objectives.vocab.basic', v)} />
              <EditableLine label="卫星单词 (二会)" value={data.objectives.vocab.satellite} onChange={v => update('objectives.vocab.satellite', v)} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-zh text-indigo-500 mb-4 uppercase tracking-widest">（二）句型目标 / Sentences</h3>
              <EditableLine label="核心句型" value={data.objectives.patterns.core} onChange={v => update('objectives.patterns.core', v)} />
              <EditableLine label="基础句型" value={data.objectives.patterns.basic} onChange={v => update('objectives.patterns.basic', v)} />
              <EditableLine label="卫星句型" value={data.objectives.patterns.satellite} onChange={v => update('objectives.patterns.satellite', v)} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-zh text-indigo-500 mb-4 uppercase tracking-widest">（三）拓展语言目标 / Expansion</h3>
              <EditableLine label="文化拓展" value={data.objectives.expansion.culture} onChange={v => update('objectives.expansion.culture', v)} />
              <EditableLine label="日常表达拓展" value={data.objectives.expansion.daily} onChange={v => update('objectives.expansion.daily', v)} />
              <EditableLine label="行为习惯培养" value={data.objectives.expansion.habits} onChange={v => update('objectives.expansion.habits', v)} />
            </div>
          </div>
        </section>

        {/* 三、教具与游戏 */}
        <section className="mb-16">
          <SectionTitle num="03" title="教具与互动准备" onClear={() => { clearSection('materials'); clearSection('games'); }} />
          <div className="flex flex-col space-y-12">
            <div>
              <h3 className="text-sm font-bold font-zh text-slate-400 mb-4 uppercase tracking-widest">（一）教具清单</h3>
              <div className="space-y-1">
                <EditableLine label="词汇卡片" value={data.materials.cards} onChange={v => update('materials.cards', v)} />
                <EditableLine label="实物教具" value={data.materials.realia} onChange={v => update('materials.realia', v)} />
                <EditableLine label="多媒体设备" value={data.materials.multimedia} onChange={v => update('materials.multimedia', v)} />
                <EditableLine label="奖励道具" value={data.materials.rewards} onChange={v => update('materials.rewards', v)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold font-zh text-slate-400 uppercase tracking-widest">（二）互动游戏</h3>
                {!isPreview && (
                  <ActionButton onClick={addGame} label="新增游戏位置" variant="add" />
                )}
              </div>
              <div className="space-y-8">
                {data.games.map((game, i) => (
                  <div key={i} className={`group/game relative p-8 bg-slate-50/50 border border-slate-100 transition-all ${isPreview ? 'rounded-none' : 'rounded-3xl shadow-sm'}`}>
                    {!isPreview && data.games.length > 1 && (
                      <div className="absolute top-6 right-6 opacity-0 group-hover/game:opacity-100 transition-opacity">
                        <ActionButton onClick={() => removeGame(i)} label="删除" variant="remove" />
                      </div>
                    )}
                    <div className="text-xs font-bold text-indigo-400 mb-6 tracking-widest uppercase flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-indigo-200"></span>
                      Game Session {i+1}
                      <span className="w-4 h-[1px] bg-indigo-200"></span>
                    </div>
                    <div className="space-y-2">
                      <EditableLine label="游戏名称" value={game.name} onChange={v => { const g = [...data.games]; g[i].name = v; setData({ ...data, games: g }); }} />
                      <EditableLine label="游戏目的" value={game.goal} onChange={v => { const g = [...data.games]; g[i].goal = v; setData({ ...data, games: g }); }} />
                      <EditableLine label="游戏准备" value={game.prep} onChange={v => { const g = [...data.games]; g[i].prep = v; setData({ ...data, games: g }); }} />
                      <EditableLine label="游戏规则" value={game.rules} onChange={v => { const g = [...data.games]; g[i].rules = v; setData({ ...data, games: g }); }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 四、课程实施 */}
        <section className="mb-16 page-break-before">
          <SectionTitle num="04" title="具体实施过程" onClear={() => clearSection('steps')} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm transition-all ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'}`}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="font-zh text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  <th className="p-4 w-[12%] text-center border-r border-slate-200">环节</th>
                  <th className="p-4 w-[8%] text-center border-r border-slate-200">时长</th>
                  <th className="p-4 w-[22%] text-left border-r border-slate-200">教学设计</th>
                  <th className="p-4 w-[22%] text-left border-r border-slate-200">课堂用语</th>
                  <th className="p-4 w-[18%] text-left border-r border-slate-200">难点/注意</th>
                  <th className="p-4 w-[18%] text-left">板书</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.steps.map((step, i) => (
                  <tr key={i} className={`group/step relative transition-colors ${isPreview ? '' : 'hover:bg-slate-50/30'}`}>
                    <td className="p-3 align-top text-center border-r border-slate-200 relative">
                      {!isPreview && data.steps.length > 1 && (
                        <button 
                          onClick={() => removeStep(i)}
                          className="absolute -left-2 top-2 opacity-0 group-hover/step:opacity-100 bg-red-500 text-white p-1 rounded-full shadow-lg z-10 hover:scale-110 transition-all"
                          title="删除此环节"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                        </button>
                      )}
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-zh text-[13px] font-bold text-slate-700 text-center bg-transparent" value={step.step} rows={2} onChange={e => { const s = [...data.steps]; s[i].step = e.target.value; setData({ ...data, steps: s }); }} placeholder={isPreview ? "" : `步骤 ${i+1}`} />
                    </td>
                    <td className="p-3 align-top border-r border-slate-200">
                      <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-en text-sm text-center text-indigo-500 font-bold bg-transparent" value={step.duration} onChange={e => { const s = [...data.steps]; s[i].duration = e.target.value; setData({ ...data, steps: s }); }} placeholder={isPreview ? "" : "Min"} />
                    </td>
                    {['design', 'instructions', 'notes', 'blackboard'].map((field, idx) => (
                      <td key={field} className={`p-3 align-top ${idx < 3 ? 'border-r border-slate-200' : ''}`}>
                        <textarea readOnly={isPreview} className="w-full outline-none border-none resize-none font-en text-sm text-slate-600 bg-transparent min-h-[140px] leading-relaxed" value={(step as any)[field]} onChange={e => { const s = [...data.steps]; (s[i] as any)[field] = e.target.value; setData({ ...data, steps: s }); }} placeholder="..." />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isPreview && (
            <div className="mt-4 flex justify-center">
              <button 
                onClick={addStep}
                className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all text-sm font-bold shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                添加新的实施环节
              </button>
            </div>
          )}
        </section>

        {/* 五、教学内容衔接 */}
        <section className="mb-16">
          <SectionTitle num="05" title="教学内容衔接" onClear={() => clearSection('connection')} />
          <div className={`border border-slate-100 overflow-hidden bg-slate-50/30 transition-all ${isPreview ? 'rounded-none' : 'rounded-3xl'}`}>
            { [
              { label: '本次课核心回顾', path: 'connection.review' },
              { label: '下次课主题预告', path: 'connection.preview' },
              { label: '预习任务布置', path: 'connection.homework' },
              { label: '教具衔接准备', path: 'connection.prep' },
            ].map((item, idx) => (
              <div key={item.path} className={`flex ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                <div className="w-[180px] p-8 font-zh font-bold text-sm text-slate-400 border-r border-slate-100 flex items-center justify-center text-center">
                  {item.label}
                </div>
                <div className="flex-1">
                  <textarea
                    readOnly={isPreview}
                    className={`w-full p-8 outline-none border-none resize-none font-en text-lg text-slate-800 bg-transparent placeholder-slate-200 min-h-[120px] leading-relaxed transition-colors ${isPreview ? 'cursor-default' : 'focus:bg-white/50'}`}
                    value={getValueByPath(data, item.path)}
                    onChange={e => update(item.path, e.target.value)}
                    placeholder={isPreview ? "" : PLACEHOLDER}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 六、沟通备忘录 */}
        <section className="mb-16 page-break-before">
          <SectionTitle num="06" title="课后沟通备忘录" onClear={() => clearSection('feedback')} />
          <div className={`border border-slate-200 overflow-hidden shadow-sm transition-all ${isPreview ? 'rounded-none border-slate-400' : 'rounded-2xl'}`}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-zh text-xs font-bold uppercase">
                <tr>
                  <th className="p-4 w-[18%] border-r border-slate-200">沟通对象</th>
                  <th className="p-4 w-[32%] border-r border-slate-200">具体内容</th>
                  <th className="p-4 w-[25%] border-r border-slate-200">时间</th>
                  <th className="p-4 w-[25%]">后续跟进</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { label: '学员', p: 'student' },
                  { label: '家长反馈', p: 'parent' },
                  { label: '教学搭档', p: 'partner' },
                ].map(row => (
                  <tr key={row.p} className={`${isPreview ? '' : 'hover:bg-slate-50/30'}`}>
                    <td className="p-6 font-zh text-center border-r border-slate-200 bg-slate-50/10">
                      <div className="font-bold text-slate-700">{row.label}</div>
                    </td>
                    {['content', 'time', 'plan'].map((field, idx) => (
                      <td key={field} className={`p-2 align-top ${idx < 2 ? 'border-r border-slate-200' : ''}`}>
                        <textarea
                          readOnly={isPreview}
                          className="w-full p-3 outline-none border-none resize-none font-en text-base text-slate-600 bg-transparent min-h-[150px] leading-relaxed"
                          value={getValueByPath(data, `feedback.${row.p}.${field}`)}
                          onChange={e => update(`feedback.${row.p}.${field}`, e.target.value)}
                          placeholder={isPreview ? "" : "..."}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 页脚 */}
        <div className="mt-24 pt-10 border-t border-slate-100 text-center">
          <p className="text-slate-300 font-en text-[10px] tracking-[0.6em] uppercase">Private & Confidential • Professional English Teaching Plan</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          .paper { 
            border: none; 
            box-shadow: none !important; 
            width: 100% !important; 
            max-width: none !important; 
            margin: 0 !important; 
            padding: 10mm !important; 
            border-radius: 0 !important;
            transform: none !important;
          }
          .page-break-before { page-break-before: always; }
          input, textarea { background: transparent !important; color: #1e293b !important; }
          @page { margin: 10mm; size: A4; }
          textarea::placeholder { color: transparent !important; }
          
          .border-slate-200 { border-color: #cbd5e1 !important; }
          .border-slate-100 { border-color: #e2e8f0 !important; }
        }
        
        .font-zh { font-family: "Microsoft YaHei", sans-serif; }
        .font-en { font-family: "ShuYaoHengshui", cursive, serif; }
        
        textarea::placeholder { 
          font-family: "Microsoft YaHei"; 
          font-size: 0.75rem; 
          opacity: 0.3;
          color: #94a3b8;
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
