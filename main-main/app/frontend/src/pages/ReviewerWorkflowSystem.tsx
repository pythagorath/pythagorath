// Reviewer Workflow System - Content Lifecycle Management
// Real workflows: Draft → Review → Revision → Approved → Published
import { useState } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, Clock, Send, Eye,
  MessageSquare, ArrowLeft, Filter, Search, Zap, RotateCcw
} from 'lucide-react';

type WorkflowStage = 'draft' | 'review' | 'revision' | 'approved' | 'published';

interface ContentItem {
  id: string;
  title: string;
  type: 'question' | 'skill' | 'lesson';
  stage: WorkflowStage;
  author: string;
  reviewer?: string;
  createdAt: string;
  updatedAt: string;
  priority: 'high' | 'medium' | 'low';
  comments: number;
  version: number;
}

const STAGE_CONFIG: Record<WorkflowStage, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'مسودة', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileText },
  review: { label: 'قيد المراجعة', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Eye },
  revision: { label: 'تعديلات مطلوبة', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: RotateCcw },
  approved: { label: 'معتمد', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  published: { label: 'منشور', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Send },
};

const MOCK_ITEMS: ContentItem[] = [
  { id: '1', title: 'سؤال: جمع الأعداد حتى 20', type: 'question', stage: 'review', author: 'منى', reviewer: 'د. سعاد', createdAt: '2026-05-20', updatedAt: '2026-05-21', priority: 'high', comments: 2, version: 1 },
  { id: '2', title: 'مهارة: الطرح بالاستلاف', type: 'skill', stage: 'draft', author: 'عبدالله', createdAt: '2026-05-21', updatedAt: '2026-05-21', priority: 'medium', comments: 0, version: 1 },
  { id: '3', title: 'سؤال: مقارنة الكسور', type: 'question', stage: 'revision', author: 'منى', reviewer: 'أ. فهد', createdAt: '2026-05-19', updatedAt: '2026-05-21', priority: 'high', comments: 3, version: 2 },
  { id: '4', title: 'درس: مقدمة في الضرب', type: 'lesson', stage: 'approved', author: 'عبدالله', reviewer: 'د. سعاد', createdAt: '2026-05-18', updatedAt: '2026-05-20', priority: 'medium', comments: 1, version: 3 },
  { id: '5', title: 'سؤال: قراءة الساعة', type: 'question', stage: 'published', author: 'منى', reviewer: 'د. سعاد', createdAt: '2026-05-15', updatedAt: '2026-05-19', priority: 'low', comments: 0, version: 2 },
  { id: '6', title: 'مهارة: التعرف على الأشكال', type: 'skill', stage: 'review', author: 'عبدالله', reviewer: 'أ. فهد', createdAt: '2026-05-20', updatedAt: '2026-05-21', priority: 'medium', comments: 1, version: 1 },
  { id: '7', title: 'سؤال: حل مسائل كلامية', type: 'question', stage: 'draft', author: 'منى', createdAt: '2026-05-21', updatedAt: '2026-05-21', priority: 'low', comments: 0, version: 1 },
  { id: '8', title: 'درس: الأنماط العددية', type: 'lesson', stage: 'approved', author: 'عبدالله', reviewer: 'د. سعاد', createdAt: '2026-05-17', updatedAt: '2026-05-20', priority: 'medium', comments: 2, version: 2 },
  { id: '9', title: 'سؤال: ترتيب الأعداد', type: 'question', stage: 'published', author: 'منى', reviewer: 'أ. فهد', createdAt: '2026-05-14', updatedAt: '2026-05-18', priority: 'low', comments: 1, version: 3 },
  { id: '10', title: 'مهارة: القياس بالسنتيمتر', type: 'skill', stage: 'review', author: 'عبدالله', reviewer: 'د. سعاد', createdAt: '2026-05-20', updatedAt: '2026-05-21', priority: 'high', comments: 0, version: 1 },
  { id: '11', title: 'سؤال: العد بالخمسات', type: 'question', stage: 'draft', author: 'منى', createdAt: '2026-05-21', updatedAt: '2026-05-21', priority: 'medium', comments: 0, version: 1 },
  { id: '12', title: 'درس: مفهوم النقود', type: 'lesson', stage: 'revision', author: 'عبدالله', reviewer: 'أ. فهد', createdAt: '2026-05-19', updatedAt: '2026-05-21', priority: 'high', comments: 4, version: 2 },
];

type ViewMode = 'pipeline' | 'list';

export default function ReviewerWorkflowSystem() {
  const [items, setItems] = useState<ContentItem[]>(MOCK_ITEMS);
  const [view, setView] = useState<ViewMode>('pipeline');
  const [filterStage, setFilterStage] = useState<WorkflowStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    if (filterStage !== 'all' && item.stage !== filterStage) return false;
    if (searchQuery && !item.title.includes(searchQuery)) return false;
    return true;
  });

  const moveToStage = (id: string, newStage: WorkflowStage) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, stage: newStage, updatedAt: '2026-05-21', version: newStage === 'revision' ? item.version : item.version + 1 } : item
    ));
  };

  const getNextActions = (stage: WorkflowStage): { label: string; target: WorkflowStage; color: string }[] => {
    switch (stage) {
      case 'draft': return [{ label: 'إرسال للمراجعة', target: 'review', color: 'bg-amber-500 hover:bg-amber-600' }];
      case 'review': return [
        { label: 'اعتماد', target: 'approved', color: 'bg-green-500 hover:bg-green-600' },
        { label: 'طلب تعديل', target: 'revision', color: 'bg-orange-500 hover:bg-orange-600' },
      ];
      case 'revision': return [{ label: 'إعادة إرسال', target: 'review', color: 'bg-amber-500 hover:bg-amber-600' }];
      case 'approved': return [{ label: 'نشر', target: 'published', color: 'bg-blue-500 hover:bg-blue-600' }];
      default: return [];
    }
  };

  const stages: WorkflowStage[] = ['draft', 'review', 'revision', 'approved', 'published'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">سير العمل</h1>
          <p className="text-sm text-gray-500 font-tajawal mt-1">Content Lifecycle Workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('pipeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-tajawal transition-colors ${view === 'pipeline' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            خط الإنتاج
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-tajawal transition-colors ${view === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            قائمة
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-5 gap-2">
        {stages.map(stage => {
          const cfg = STAGE_CONFIG[stage];
          const Icon = cfg.icon;
          const count = items.filter(i => i.stage === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setFilterStage(filterStage === stage ? 'all' : stage)}
              className={`p-3 rounded-xl border transition-all ${filterStage === stage ? 'border-indigo-300 shadow-sm' : 'border-gray-100 hover:border-gray-200'} bg-white`}
            >
              <div className={`w-8 h-8 rounded-lg ${cfg.bgColor} flex items-center justify-center mx-auto mb-1.5`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <p className="text-lg font-bold text-gray-800 text-center">{count}</p>
              <p className={`text-[10px] font-tajawal text-center ${cfg.color}`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في المحتوى..."
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-tajawal focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
        />
      </div>

      {/* Pipeline View */}
      {view === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-h-[400px]">
          {stages.map(stage => {
            const cfg = STAGE_CONFIG[stage];
            const stageItems = filteredItems.filter(i => i.stage === stage);
            return (
              <div key={stage} className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${cfg.bgColor}`} />
                  <span className={`text-xs font-bold font-tajawal ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-[10px] text-gray-400 mr-auto">{stageItems.length}</span>
                </div>
                <div className="space-y-2">
                  {stageItems.map(item => (
                    <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-tajawal ${
                          item.type === 'question' ? 'bg-blue-50 text-blue-600' :
                          item.type === 'skill' ? 'bg-purple-50 text-purple-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {item.type === 'question' ? 'سؤال' : item.type === 'skill' ? 'مهارة' : 'درس'}
                        </span>
                        {item.priority === 'high' && (
                          <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-tajawal">عاجل</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 font-tajawal mb-2 line-clamp-2">{item.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-tajawal">{item.author}</span>
                        {item.comments > 0 && (
                          <div className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">{item.comments}</span>
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {getNextActions(item.stage).map(action => (
                          <button
                            key={action.target}
                            onClick={() => moveToStage(item.id, action.target)}
                            className={`text-[10px] text-white px-2 py-1 rounded-lg font-tajawal ${action.color} transition-colors`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">العنوان</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">النوع</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">المرحلة</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">المؤلف</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">المراجع</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 font-tajawal">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const cfg = STAGE_CONFIG[item.stage];
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-700 font-tajawal">{item.title}</p>
                        <p className="text-[10px] text-gray-400 font-tajawal">v{item.version} • {item.updatedAt}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-tajawal ${
                          item.type === 'question' ? 'bg-blue-50 text-blue-600' :
                          item.type === 'skill' ? 'bg-purple-50 text-purple-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {item.type === 'question' ? 'سؤال' : item.type === 'skill' ? 'مهارة' : 'درس'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bgColor}`}>
                          <Icon className={`w-3 h-3 ${cfg.color}`} />
                          <span className={`text-[11px] font-medium font-tajawal ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-tajawal">{item.author}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-tajawal">{item.reviewer || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {getNextActions(item.stage).map(action => (
                            <button
                              key={action.target}
                              onClick={() => moveToStage(item.id, action.target)}
                              className={`text-[10px] text-white px-2.5 py-1 rounded-lg font-tajawal ${action.color} transition-colors`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}