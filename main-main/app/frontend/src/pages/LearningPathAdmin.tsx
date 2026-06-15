// LearningPathAdmin.tsx - Admin page for curriculum-driven learning path management
// Features: Create paths from curriculum structure, assign nodes, manage prerequisites, publish
import { useState, useEffect, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  OMAN_GRADES, OMAN_SEMESTERS, getSubjectsForGrade,
  type SubjectDefinition
} from '@/data/omanCurriculumData';
import {
  Plus, BookOpen, Layers, ArrowLeft, Clock,
  Trash2, Send, XCircle, Route, ListTree
} from 'lucide-react';

interface LearningPath {
  id: number;
  curriculum_upload_id: number;
  title: string;
  grade_number: number;
  subject_name: string;
  semester: number;
  status: string;
  total_nodes: number | null;
  created_at: string;
}

interface PathNode {
  id: number;
  learning_path_id: number;
  node_type: string;
  title: string;
  order_index: number;
  parent_node_id: number | null;
  content_config: string | null;
  duration_minutes: number | null;
}

export default function LearningPathAdmin() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('paths');
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

  // Create path form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPath, setNewPath] = useState({
    grade_number: 1,
    subject_name: '',
    semester: 1,
    title: '',
  });

  // Add node form
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNode, setNewNode] = useState({
    node_type: 'unit',
    title: '',
    order_index: 0,
    parent_node_id: null as number | null,
    content_config: '',
    duration_minutes: 15,
  });

  // Available subjects for selected grade
  const [availableSubjects, setAvailableSubjects] = useState<SubjectDefinition[]>([]);

  useEffect(() => {
    if (newPath.grade_number) {
      const subjects = getSubjectsForGrade(newPath.grade_number);
      setAvailableSubjects(subjects);
      if (subjects.length > 0 && !subjects.find(s => s.name === newPath.subject_name)) {
        setNewPath(prev => ({ ...prev, subject_name: subjects[0].name }));
      }
    }
  }, [newPath.grade_number]);

  // Load learning paths (admin sees own paths via query)
  const loadPaths = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities['learning_paths'].query({ limit: 200 });
      // Backend returns { items: [...], total, skip, limit }
      const responseData = res?.data as { items?: LearningPath[]; total?: number } | LearningPath[] | undefined;
      if (Array.isArray(responseData)) {
        setPaths(responseData);
      } else if (responseData && Array.isArray(responseData.items)) {
        setPaths(responseData.items);
      } else {
        setPaths([]);
      }
    } catch (err: any) {
      console.error('Failed to load learning paths:', err);
      // Fallback: try queryAll (public endpoint)
      try {
        const res2 = await client.entities['learning_paths'].queryAll({ limit: 200 });
        const data2 = res2?.data as { items?: LearningPath[] } | LearningPath[] | undefined;
        if (Array.isArray(data2)) {
          setPaths(data2);
        } else if (data2 && Array.isArray((data2 as { items?: LearningPath[] }).items)) {
          setPaths((data2 as { items: LearningPath[] }).items);
        } else {
          setPaths([]);
        }
      } catch {
        setPaths([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load nodes for a specific path
  const loadNodes = useCallback(async (pathId: number) => {
    try {
      const res = await client.entities['path_nodes'].queryAll({
        query: { learning_path_id: pathId },
        limit: 200,
      });
      const responseData = res?.data as { items?: PathNode[] } | PathNode[] | undefined;
      let items: PathNode[] = [];
      if (Array.isArray(responseData)) {
        items = responseData;
      } else if (responseData && Array.isArray((responseData as { items?: PathNode[] }).items)) {
        items = (responseData as { items: PathNode[] }).items;
      }
      setNodes(items.sort((a, b) => a.order_index - b.order_index));
    } catch (err) {
      console.error('Failed to load path nodes:', err);
      setNodes([]);
    }
  }, []);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  useEffect(() => {
    if (selectedPath) {
      loadNodes(selectedPath.id);
    }
  }, [selectedPath, loadNodes]);

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Create a new learning path
  const handleCreatePath = async () => {
    if (!newPath.title || !newPath.subject_name) {
      setError('يرجى إدخال عنوان المسار واختيار المادة');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setCreating(true);

    try {
      const createData: Record<string, unknown> = {
        curriculum_upload_id: 0,
        title: newPath.title,
        grade_number: newPath.grade_number,
        subject_name: newPath.subject_name,
        semester: newPath.semester,
        status: 'draft',
        total_nodes: 0,
      };

      console.log('[LearningPathAdmin] Creating path with data:', createData);
      const res = await client.entities['learning_paths'].create({ data: createData });
      console.log('[LearningPathAdmin] Create response:', res?.data);

      setSuccessMsg(`✅ تم إنشاء المسار "${newPath.title}" بنجاح!`);
      setShowCreateForm(false);
      setNewPath({ grade_number: 1, subject_name: '', semester: 1, title: '' });
      await loadPaths();
    } catch (err: any) {
      console.error('[LearningPathAdmin] Failed to create path:', err);
      const detail = err?.response?.data?.detail;
      let errMsg: string;
      if (Array.isArray(detail)) {
        errMsg = detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ');
      } else if (typeof detail === 'object' && detail !== null) {
        errMsg = detail?.msg || JSON.stringify(detail);
      } else {
        errMsg = detail || err?.message || 'خطأ غير معروف';
      }
      setError(`فشل في إنشاء المسار: ${errMsg}`);
    } finally {
      setCreating(false);
    }
  };

  // Add a node to selected path
  const handleAddNode = async () => {
    if (!selectedPath || !newNode.title) return;
    try {
      const nextOrder = nodes.length > 0 ? Math.max(...nodes.map(n => n.order_index)) + 1 : 1;
      await client.entities['path_nodes'].create({
        data: {
          learning_path_id: selectedPath.id,
          node_type: newNode.node_type,
          title: newNode.title,
          order_index: newNode.order_index || nextOrder,
          parent_node_id: newNode.parent_node_id || null,
          content_config: newNode.content_config || null,
          duration_minutes: newNode.duration_minutes || 15,
        },
      });

      // Update total_nodes count
      await client.entities['learning_paths'].update({
        id: String(selectedPath.id),
        data: { total_nodes: nodes.length + 1 },
      });

      setShowAddNode(false);
      setNewNode({ node_type: 'unit', title: '', order_index: 0, parent_node_id: null, content_config: '', duration_minutes: 15 });
      loadNodes(selectedPath.id);
      loadPaths();
    } catch (err: any) {
      console.error('Failed to add node:', err);
      const detail = err?.response?.data?.detail;
      const errMsg = Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ') : (typeof detail === 'string' ? detail : err?.message || 'خطأ');
      setError(`فشل في إضافة العقدة: ${errMsg}`);
    }
  };

  // Publish/unpublish a path
  const togglePathStatus = async (path: LearningPath) => {
    const newStatus = path.status === 'published' ? 'draft' : 'published';
    try {
      await client.entities['learning_paths'].update({
        id: String(path.id),
        data: { status: newStatus },
      });
      setSuccessMsg(newStatus === 'published' ? '✅ تم نشر المسار بنجاح' : 'تم إلغاء نشر المسار');
      loadPaths();
      if (selectedPath?.id === path.id) {
        setSelectedPath({ ...path, status: newStatus });
      }
    } catch (err: any) {
      console.error('Failed to update path status:', err);
      const detail = err?.response?.data?.detail;
      const errMsg = Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ') : (typeof detail === 'string' ? detail : err?.message || 'خطأ');
      setError(`فشل في تحديث حالة المسار: ${errMsg}`);
    }
  };

  // Delete a path
  const deletePath = async (path: LearningPath) => {
    if (!confirm('هل أنت متأكد من حذف هذا المسار؟')) return;
    try {
      await client.entities['learning_paths'].delete({ id: String(path.id) });
      setSuccessMsg('تم حذف المسار بنجاح');
      loadPaths();
      if (selectedPath?.id === path.id) {
        setSelectedPath(null);
        setNodes([]);
      }
    } catch (err: any) {
      console.error('Failed to delete path:', err);
      const detail = err?.response?.data?.detail;
      const errMsg = Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ') : (typeof detail === 'string' ? detail : err?.message || 'خطأ');
      setError(`فشل في حذف المسار: ${errMsg}`);
    }
  };

  // Delete a node
  const deleteNode = async (node: PathNode) => {
    try {
      await client.entities['path_nodes'].delete({ id: String(node.id) });
      if (selectedPath) {
        loadNodes(selectedPath.id);
        await client.entities['learning_paths'].update({
          id: String(selectedPath.id),
          data: { total_nodes: Math.max(0, nodes.length - 1) },
        });
        loadPaths();
      }
    } catch (err: any) {
      console.error('Failed to delete node:', err);
      const detail = err?.response?.data?.detail;
      const errMsg = Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ') : (typeof detail === 'string' ? detail : err?.message || 'خطأ');
      setError(`فشل في حذف العقدة: ${errMsg}`);
    }
  };

  // Generate default nodes from curriculum structure
  const generateDefaultNodes = async () => {
    if (!selectedPath) return;
    const defaultStructure = [
      { node_type: 'unit', title: `الوحدة 1 - ${selectedPath.subject_name}`, order_index: 1, parent_node_id: null, duration_minutes: null, content_config: null },
      { node_type: 'lesson', title: 'الدرس 1 - مقدمة', order_index: 2, parent_node_id: null, duration_minutes: 20, content_config: JSON.stringify({ type: 'introduction' }) },
      { node_type: 'activity', title: 'نشاط تفاعلي 1', order_index: 3, parent_node_id: null, duration_minutes: 10, content_config: JSON.stringify({ type: 'interactive' }) },
      { node_type: 'lesson', title: 'الدرس 2 - شرح المفهوم', order_index: 4, parent_node_id: null, duration_minutes: 25, content_config: JSON.stringify({ type: 'explanation' }) },
      { node_type: 'activity', title: 'نشاط تطبيقي 2', order_index: 5, parent_node_id: null, duration_minutes: 15, content_config: JSON.stringify({ type: 'practice' }) },
      { node_type: 'assessment', title: 'تقييم الوحدة 1', order_index: 6, parent_node_id: null, duration_minutes: 15, content_config: JSON.stringify({ type: 'quiz', questions: 5 }) },
      { node_type: 'mission', title: 'مهمة تطبيقية', order_index: 7, parent_node_id: null, duration_minutes: 20, content_config: JSON.stringify({ type: 'mission', points: 50 }) },
    ];

    try {
      for (const node of defaultStructure) {
        await client.entities['path_nodes'].create({
          data: {
            learning_path_id: selectedPath.id,
            ...node,
          } as Record<string, unknown>,
        });
      }
      await client.entities['learning_paths'].update({
        id: String(selectedPath.id),
        data: { total_nodes: defaultStructure.length },
      });
      setSuccessMsg('✅ تم إنشاء الهيكل الافتراضي بنجاح');
      loadNodes(selectedPath.id);
      loadPaths();
    } catch (err: any) {
      console.error('Failed to generate nodes:', err);
      const detail = err?.response?.data?.detail;
      const errMsg = Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' | ') : (typeof detail === 'string' ? detail : err?.message || 'خطأ');
      setError(`فشل في إنشاء الهيكل: ${errMsg}`);
    }
  };

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unit: 'وحدة',
      lesson: 'درس',
      activity: 'نشاط',
      assessment: 'تقييم',
      mission: 'مهمة',
    };
    return labels[type] || type;
  };

  const getNodeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      unit: 'bg-blue-100 text-blue-700',
      lesson: 'bg-green-100 text-green-700',
      activity: 'bg-purple-100 text-purple-700',
      assessment: 'bg-orange-100 text-orange-700',
      mission: 'bg-pink-100 text-pink-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'published') return <Badge className="bg-green-100 text-green-700">منشور</Badge>;
    return <Badge className="bg-gray-100 text-gray-600">مسودة</Badge>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
            <Route className="w-6 h-6 text-blue-600" />
            إدارة مسارات التعلم
          </h1>
          <p className="text-gray-500 text-sm font-tajawal mt-1">
            إنشاء وإدارة مسارات تعلم منهجية مرتبطة بالمنهج العماني
          </p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
        >
          العودة للوحة التحكم
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-tajawal">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-tajawal">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="paths" className="font-tajawal">المسارات</TabsTrigger>
          <TabsTrigger value="structure" className="font-tajawal">هيكل المسار</TabsTrigger>
        </TabsList>

        {/* Paths List Tab */}
        <TabsContent value="paths" className="space-y-4 mt-4">
          {/* Create Path Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 font-tajawal">
              {paths.length} مسار تعلم | {paths.filter(p => p.status === 'published').length} منشور
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-tajawal hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إنشاء مسار جديد
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <Card className="border-2 border-blue-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-tajawal">إنشاء مسار تعلم جديد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-tajawal mb-1">الصف</label>
                    <select
                      value={newPath.grade_number}
                      onChange={(e) => setNewPath(prev => ({ ...prev, grade_number: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg p-2 text-sm font-tajawal"
                    >
                      {OMAN_GRADES.map((g, i) => (
                        <option key={i} value={i + 1}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-tajawal mb-1">المادة</label>
                    <select
                      value={newPath.subject_name}
                      onChange={(e) => setNewPath(prev => ({ ...prev, subject_name: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm font-tajawal"
                    >
                      {availableSubjects.map((s, i) => (
                        <option key={i} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-tajawal mb-1">الفصل الدراسي</label>
                    <select
                      value={newPath.semester}
                      onChange={(e) => setNewPath(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                      className="w-full border rounded-lg p-2 text-sm font-tajawal"
                    >
                      {OMAN_SEMESTERS.map((s, i) => (
                        <option key={i} value={i + 1}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-tajawal mb-1">عنوان المسار</label>
                    <input
                      type="text"
                      value={newPath.title}
                      onChange={(e) => setNewPath(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="مثال: مسار الرياضيات - الصف الأول - الفصل الأول"
                      className="w-full border rounded-lg p-2 text-sm font-tajawal"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowCreateForm(false); setError(null); }}
                    className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 font-tajawal"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreatePath}
                    disabled={!newPath.title || !newPath.subject_name || creating}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-tajawal flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        جاري الإنشاء...
                      </>
                    ) : (
                      'إنشاء المسار'
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paths Grid */}
          {loading ? (
            <div className="text-center py-12 text-gray-400 font-tajawal">جاري التحميل...</div>
          ) : paths.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Route className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-tajawal">لا توجد مسارات تعلم بعد</p>
                <p className="text-sm text-gray-400 font-tajawal mt-1">أنشئ مسار تعلم جديد لبدء تنظيم المنهج</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paths.map((path) => (
                <Card
                  key={path.id}
                  className={`border cursor-pointer hover:shadow-lg transition-all ${
                    selectedPath?.id === path.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setSelectedPath(path);
                    setActiveTab('structure');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 font-tajawal text-sm">{path.title}</h3>
                        <p className="text-xs text-gray-500 font-tajawal mt-1">
                          {OMAN_GRADES[path.grade_number - 1]?.name} • {path.subject_name}
                        </p>
                      </div>
                      {getStatusBadge(path.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-tajawal">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {path.total_nodes || 0} عقدة
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {OMAN_SEMESTERS[(path.semester || 1) - 1]?.name}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePathStatus(path); }}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-tajawal ${
                          path.status === 'published'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {path.status === 'published' ? <XCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {path.status === 'published' ? 'إلغاء النشر' : 'نشر'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePath(path); }}
                        className="px-2 py-1.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="space-y-4 mt-4">
          {!selectedPath ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <ListTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-tajawal">اختر مسار تعلم من قائمة المسارات لعرض هيكله</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Path Header */}
              <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg text-gray-800 font-tajawal">{selectedPath.title}</h2>
                      <p className="text-sm text-gray-500 font-tajawal">
                        {OMAN_GRADES[selectedPath.grade_number - 1]?.name} • {selectedPath.subject_name} • {OMAN_SEMESTERS[(selectedPath.semester || 1) - 1]?.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(selectedPath.status)}
                      <button
                        onClick={() => togglePathStatus(selectedPath)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-tajawal ${
                          selectedPath.status === 'published'
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {selectedPath.status === 'published' ? 'إلغاء النشر' : 'نشر المسار'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddNode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-tajawal hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  إضافة عقدة
                </button>
                {nodes.length === 0 && (
                  <button
                    onClick={generateDefaultNodes}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-tajawal hover:bg-amber-700"
                  >
                    <Layers className="w-4 h-4" />
                    إنشاء هيكل افتراضي
                  </button>
                )}
              </div>

              {/* Add Node Form */}
              {showAddNode && (
                <Card className="border-2 border-indigo-200">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-bold text-sm font-tajawal">إضافة عقدة جديدة</h3>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 font-tajawal mb-1">النوع</label>
                        <select
                          value={newNode.node_type}
                          onChange={(e) => setNewNode(prev => ({ ...prev, node_type: e.target.value }))}
                          className="w-full border rounded-lg p-2 text-sm font-tajawal"
                        >
                          <option value="unit">وحدة</option>
                          <option value="lesson">درس</option>
                          <option value="activity">نشاط تفاعلي</option>
                          <option value="assessment">تقييم</option>
                          <option value="mission">مهمة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 font-tajawal mb-1">العنوان</label>
                        <input
                          type="text"
                          value={newNode.title}
                          onChange={(e) => setNewNode(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="عنوان العقدة"
                          className="w-full border rounded-lg p-2 text-sm font-tajawal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 font-tajawal mb-1">المدة (دقائق)</label>
                        <input
                          type="number"
                          value={newNode.duration_minutes}
                          onChange={(e) => setNewNode(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 15 }))}
                          className="w-full border rounded-lg p-2 text-sm font-tajawal"
                        />
                      </div>
                    </div>
                    {nodes.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 font-tajawal mb-1">العقدة الأم (اختياري)</label>
                        <select
                          value={newNode.parent_node_id || ''}
                          onChange={(e) => setNewNode(prev => ({ ...prev, parent_node_id: e.target.value ? parseInt(e.target.value) : null }))}
                          className="w-full border rounded-lg p-2 text-sm font-tajawal"
                        >
                          <option value="">بدون عقدة أم (مستوى أعلى)</option>
                          {nodes.filter(n => n.node_type === 'unit').map(n => (
                            <option key={n.id} value={n.id}>{n.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowAddNode(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 font-tajawal"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleAddNode}
                        disabled={!newNode.title}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-tajawal"
                      >
                        إضافة
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nodes List */}
              {nodes.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="py-8 text-center">
                    <ListTree className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-tajawal text-sm">لا توجد عقد في هذا المسار</p>
                    <p className="text-xs text-gray-400 font-tajawal mt-1">أضف عقد يدوياً أو أنشئ هيكل افتراضي</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {nodes.map((node, index) => (
                    <Card key={node.id} className={`border ${node.node_type === 'unit' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {index + 1}
                        </div>
                        <Badge className={`text-xs ${getNodeTypeColor(node.node_type)}`}>
                          {getNodeTypeLabel(node.node_type)}
                        </Badge>
                        <span className="flex-1 text-sm font-tajawal text-gray-800">{node.title}</span>
                        {node.duration_minutes && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {node.duration_minutes} د
                          </span>
                        )}
                        <button
                          onClick={() => deleteNode(node)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Path Summary */}
              {nodes.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm font-tajawal mb-3">ملخص المسار</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {['unit', 'lesson', 'activity', 'assessment', 'mission'].map(type => {
                        const count = nodes.filter(n => n.node_type === type).length;
                        return (
                          <div key={type} className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-lg font-bold text-gray-800">{count}</p>
                            <p className="text-xs text-gray-500 font-tajawal">{getNodeTypeLabel(type)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 font-tajawal">
                        إجمالي المدة المقدرة: {nodes.reduce((sum, n) => sum + (n.duration_minutes || 0), 0)} دقيقة
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}