/**
 * Publish Workflow - Draft → Preview → Publish
 * Admin can validate content before publishing to students.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  validateContent,
  getValidationSummary,
  getBlockingErrors,
  getWarnings,
  getCategoryLabel,
  getSeverityColor,
  type ValidationResult,
  type ValidationContext,
  type ContentItem,
} from '@/lib/contentValidationEngine';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Eye, Send,
  FileText, Layers, BookOpen, Brain, HelpCircle, RefreshCw,
  ArrowLeft, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

type ContentStatus = 'draft' | 'preview' | 'published';

interface StatusCounts {
  draft: number;
  preview: number;
  published: number;
}

export default function PublishWorkflow() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [context, setContext] = useState<ValidationContext | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ draft: 0, preview: 0, published: 0 });
  const [selectedTab, setSelectedTab] = useState<ContentStatus>('draft');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load all content
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const [gradesRes, semestersRes, subjectsRes, unitsRes, lessonsRes, skillsRes, questionsRes] = await Promise.all([
        client.entities['grades'].queryAll({ limit: 500 }),
        client.entities['semesters'].queryAll({ limit: 500 }),
        client.entities['admin_subjects'].queryAll({ limit: 500 }),
        client.entities['units'].queryAll({ limit: 500 }),
        client.entities['admin_lessons'].queryAll({ limit: 500 }),
        client.entities['admin_skills'].queryAll({ limit: 500 }),
        client.entities['admin_questions'].queryAll({ limit: 2000 }),
      ]);

      const extractItems = (res: unknown): ContentItem[] => {
        if (!res) return [];
        const data = (res as { data?: unknown }).data;
        if (Array.isArray(data)) return data as ContentItem[];
        if (data && typeof data === 'object' && 'items' in data) return (data as { items: ContentItem[] }).items;
        return [];
      };

      const ctx: ValidationContext = {
        grades: extractItems(gradesRes),
        semesters: extractItems(semestersRes),
        subjects: extractItems(subjectsRes),
        units: extractItems(unitsRes),
        lessons: extractItems(lessonsRes),
        skills: extractItems(skillsRes),
        questions: extractItems(questionsRes),
      };

      setContext(ctx);

      // Calculate status counts
      const allItems = [...ctx.subjects, ...ctx.units, ...ctx.lessons, ...ctx.skills, ...ctx.questions];
      const counts: StatusCounts = { draft: 0, preview: 0, published: 0 };
      for (const item of allItems) {
        const s = (item.status as ContentStatus) || 'draft';
        if (s in counts) counts[s]++;
        else counts.draft++;
      }
      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to load content:', err);
      toast.error('فشل تحميل المحتوى');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Run validation
  const runValidation = useCallback(() => {
    if (!context) return;
    setValidating(true);
    // Small delay to show loading state
    setTimeout(() => {
      const results = validateContent(context);
      setValidationResults(results);
      setValidating(false);

      const summary = getValidationSummary(results);
      if (summary.canPublish) {
        toast.success(`✅ التحقق ناجح! ${summary.warnings} تحذيرات فقط`);
      } else {
        toast.error(`❌ يوجد ${summary.blocking} أخطاء تمنع النشر`);
      }
    }, 300);
  }, [context]);

  // Publish selected draft items
  const publishItems = async (targetStatus: ContentStatus) => {
    if (selectedItems.size === 0) {
      toast.error('اختر عناصر للنشر');
      return;
    }

    setPublishing(true);
    let successCount = 0;

    try {
      for (const key of selectedItems) {
        const [entityType, idStr] = key.split(':');
        const id = idStr;
        try {
          await client.entities[entityType].update({ id, data: { status: targetStatus } });
          successCount++;
        } catch (err) {
          console.error(`Failed to update ${key}:`, err);
        }
      }

      toast.success(`تم تحديث ${successCount} عنصر إلى "${getStatusLabel(targetStatus)}"`);
      setSelectedItems(new Set());
      await loadContent();
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('حدث خطأ أثناء النشر');
    } finally {
      setPublishing(false);
    }
  };

  // Bulk actions
  const selectAllInTab = () => {
    if (!context) return;
    const items = getItemsByStatus(selectedTab);
    const newSelected = new Set(selectedItems);
    for (const item of items) {
      newSelected.add(`${item._entityType}:${item.id}`);
    }
    setSelectedItems(newSelected);
  };

  const clearSelection = () => setSelectedItems(new Set());

  // Get items filtered by status
  const getItemsByStatus = (status: ContentStatus): (ContentItem & { _entityType: string })[] => {
    if (!context) return [];
    const items: (ContentItem & { _entityType: string })[] = [];

    const addItems = (list: ContentItem[], entityType: string) => {
      for (const item of list) {
        const s = item.status || 'draft';
        if (s === status) {
          items.push({ ...item, _entityType: entityType });
        }
      }
    };

    addItems(context.subjects, 'admin_subjects');
    addItems(context.units, 'units');
    addItems(context.lessons, 'admin_lessons');
    addItems(context.skills, 'admin_skills');
    addItems(context.questions, 'admin_questions');

    return items;
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const summary = getValidationSummary(validationResults);
  const blockingErrors = getBlockingErrors(validationResults);
  const warnings = getWarnings(validationResults);

  // Group validation results by category
  const groupedResults = validationResults.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30" dir="rtl">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-gray-500 font-tajawal">جاري تحميل المحتوى...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-tajawal flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                سير عمل النشر
              </h1>
              <p className="text-sm text-gray-500 font-tajawal">مسودة ← معاينة ← نشر</p>
            </div>
          </div>
          <Button
            onClick={runValidation}
            disabled={validating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-tajawal"
          >
            {validating ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Shield className="w-4 h-4 ml-2" />}
            تشغيل التحقق
          </Button>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200 hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setSelectedTab('draft')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.draft}</p>
                <p className="text-xs text-gray-500 font-tajawal">مسودة</p>
              </div>
              <Badge variant="secondary" className="mr-auto">Draft</Badge>
            </CardContent>
          </Card>

          <Card className="border-amber-200 hover:border-amber-300 transition-colors cursor-pointer" onClick={() => setSelectedTab('preview')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{statusCounts.preview}</p>
                <p className="text-xs text-gray-500 font-tajawal">معاينة</p>
              </div>
              <Badge className="mr-auto bg-amber-100 text-amber-700 border-amber-200">Preview</Badge>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:border-green-300 transition-colors cursor-pointer" onClick={() => setSelectedTab('published')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{statusCounts.published}</p>
                <p className="text-xs text-gray-500 font-tajawal">منشور</p>
              </div>
              <Badge className="mr-auto bg-green-100 text-green-700 border-green-200">Published</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Validation Results */}
        {validationResults.length > 0 && (
          <Card className={summary.canPublish ? 'border-green-200' : 'border-red-200'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-tajawal flex items-center gap-2">
                {summary.canPublish ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                نتائج التحقق
                <div className="flex gap-2 mr-auto">
                  {summary.errors > 0 && (
                    <Badge variant="destructive">{summary.errors} خطأ</Badge>
                  )}
                  {summary.warnings > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">{summary.warnings} تحذير</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Blocking errors first */}
              {blockingErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-red-700 font-tajawal flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    أخطاء تمنع النشر ({blockingErrors.length})
                  </p>
                  {blockingErrors.slice(0, 5).map(r => (
                    <div key={r.id} className="text-sm text-red-600 font-tajawal pr-5">
                      • {r.message}
                    </div>
                  ))}
                  {blockingErrors.length > 5 && (
                    <p className="text-xs text-red-500 pr-5">و {blockingErrors.length - 5} أخطاء أخرى...</p>
                  )}
                </div>
              )}

              {/* Grouped warnings */}
              {Object.entries(groupedResults).map(([category, items]) => {
                const nonBlocking = items.filter(i => !i.blocking);
                if (nonBlocking.length === 0) return null;
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 font-tajawal flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        {getCategoryLabel(category as never)}
                        <Badge variant="secondary" className="text-xs">{nonBlocking.length}</Badge>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50/50">
                        {nonBlocking.map(r => (
                          <div key={r.id} className={`text-sm p-2 rounded-lg border ${getSeverityColor(r.severity)} font-tajawal`}>
                            <p>{r.message}</p>
                            <p className="text-xs opacity-75 mt-1">💡 {r.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Card>
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as ContentStatus)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <TabsList className="font-tajawal">
                  <TabsTrigger value="draft" className="font-tajawal">مسودة ({statusCounts.draft})</TabsTrigger>
                  <TabsTrigger value="preview" className="font-tajawal">معاينة ({statusCounts.preview})</TabsTrigger>
                  <TabsTrigger value="published" className="font-tajawal">منشور ({statusCounts.published})</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {selectedItems.size > 0 && (
                    <>
                      <Badge variant="secondary">{selectedItems.size} محدد</Badge>
                      <Button variant="ghost" size="sm" onClick={clearSelection} className="font-tajawal text-xs">
                        إلغاء التحديد
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={selectAllInTab} className="font-tajawal text-xs">
                    <Filter className="w-3 h-3 ml-1" />
                    تحديد الكل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Action buttons based on tab */}
              <div className="flex gap-2 mb-4">
                {selectedTab === 'draft' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishItems('preview')}
                      disabled={publishing || selectedItems.size === 0}
                      className="font-tajawal border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      نقل للمعاينة
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!summary.canPublish && validationResults.length > 0) {
                          toast.error('يوجد أخطاء تمنع النشر المباشر. شغّل التحقق أولاً.');
                          return;
                        }
                        publishItems('published');
                      }}
                      disabled={publishing || selectedItems.size === 0}
                      className="font-tajawal bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="w-4 h-4 ml-1" />
                      نشر مباشر
                    </Button>
                  </>
                )}
                {selectedTab === 'preview' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishItems('draft')}
                      disabled={publishing || selectedItems.size === 0}
                      className="font-tajawal"
                    >
                      <FileText className="w-4 h-4 ml-1" />
                      إرجاع للمسودة
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!summary.canPublish && validationResults.length > 0) {
                          toast.error('يوجد أخطاء تمنع النشر. أصلحها أولاً.');
                          return;
                        }
                        publishItems('published');
                      }}
                      disabled={publishing || selectedItems.size === 0}
                      className="font-tajawal bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="w-4 h-4 ml-1" />
                      نشر للطلاب
                    </Button>
                  </>
                )}
                {selectedTab === 'published' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => publishItems('draft')}
                    disabled={publishing || selectedItems.size === 0}
                    className="font-tajawal text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <FileText className="w-4 h-4 ml-1" />
                    إلغاء النشر (إرجاع للمسودة)
                  </Button>
                )}
              </div>

              {/* Items list */}
              <ContentItemsList
                items={getItemsByStatus(selectedTab)}
                selectedItems={selectedItems}
                onToggle={(key) => {
                  const next = new Set(selectedItems);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  setSelectedItems(next);
                }}
              />
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

// Helper components
function getStatusLabel(status: ContentStatus): string {
  switch (status) {
    case 'draft': return 'مسودة';
    case 'preview': return 'معاينة';
    case 'published': return 'منشور';
  }
}

function getEntityIcon(type: string) {
  switch (type) {
    case 'admin_subjects': return <BookOpen className="w-4 h-4 text-indigo-500" />;
    case 'units': return <Layers className="w-4 h-4 text-purple-500" />;
    case 'admin_lessons': return <FileText className="w-4 h-4 text-blue-500" />;
    case 'admin_skills': return <Brain className="w-4 h-4 text-green-500" />;
    case 'admin_questions': return <HelpCircle className="w-4 h-4 text-amber-500" />;
    default: return <FileText className="w-4 h-4 text-gray-500" />;
  }
}

function getEntityLabel(type: string): string {
  switch (type) {
    case 'admin_subjects': return 'مادة';
    case 'units': return 'وحدة';
    case 'admin_lessons': return 'درس';
    case 'admin_skills': return 'مهارة';
    case 'admin_questions': return 'سؤال';
    default: return type;
  }
}

interface ContentItemsListProps {
  items: (ContentItem & { _entityType: string })[];
  selectedItems: Set<string>;
  onToggle: (key: string) => void;
}

function ContentItemsList({ items, selectedItems, onToggle }: ContentItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 font-tajawal">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>لا توجد عناصر في هذه الحالة</p>
      </div>
    );
  }

  // Group by entity type
  const grouped = items.reduce((acc, item) => {
    if (!acc[item._entityType]) acc[item._entityType] = [];
    acc[item._entityType].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([entityType, entityItems]) => (
        <div key={entityType}>
          <p className="text-sm font-bold text-gray-600 font-tajawal mb-2 flex items-center gap-2">
            {getEntityIcon(entityType)}
            {getEntityLabel(entityType)} ({entityItems.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {entityItems.slice(0, 30).map((item) => {
              const key = `${entityType}:${item.id}`;
              const isSelected = selectedItems.has(key);
              const displayName = item.name || item.title || (item as ContentItem & { question_text?: string }).question_text?.slice(0, 50) || `#${item.id}`;
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-right transition-all text-sm ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-tajawal text-gray-700 truncate">{displayName}</span>
                </button>
              );
            })}
          </div>
          {entityItems.length > 30 && (
            <p className="text-xs text-gray-400 font-tajawal mt-1">و {entityItems.length - 30} عنصر آخر...</p>
          )}
        </div>
      ))}
    </div>
  );
}