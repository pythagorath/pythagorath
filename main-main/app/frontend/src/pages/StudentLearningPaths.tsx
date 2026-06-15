// StudentLearningPaths.tsx - Student view of published learning paths
// Shows: grade-filtered subjects, published paths, lesson progress (locked/in-progress/completed)
import { useState, useEffect, useCallback } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  OMAN_GRADES, OMAN_SEMESTERS, getSubjectsForGrade,
  type SubjectDefinition
} from '@/data/omanCurriculumData';
import {
  BookOpen, CheckCircle, Lock, PlayCircle, Clock, Star,
  ArrowLeft, Route, GraduationCap, Trophy, Sparkles
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

interface NodeProgress {
  id: number;
  user_id: string;
  learning_path_id: number;
  node_id: number;
  status: string;
  score: number | null;
  completed_at: string | null;
}

// Helper to extract items array from API response
function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export default function StudentLearningPaths() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [progress, setProgress] = useState<NodeProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'subjects' | 'paths' | 'detail'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const studentGrade = user?.grade || 1;
  const availableSubjects = getSubjectsForGrade(studentGrade);

  // Load published paths for student's grade
  const loadPaths = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities['learning_paths'].queryAll({
        query: { status: 'published', grade_number: studentGrade },
        limit: 200,
      });
      setPaths(extractItems<LearningPath>(res?.data));
    } catch (err) {
      console.error('Failed to load paths:', err);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [studentGrade]);

  // Load nodes for selected path
  const loadNodes = useCallback(async (pathId: number) => {
    try {
      const res = await client.entities['path_nodes'].queryAll({
        query: { learning_path_id: pathId },
        limit: 200,
      });
      const items = extractItems<PathNode>(res?.data);
      setNodes(items.sort((a, b) => a.order_index - b.order_index));
    } catch (err) {
      console.error('Failed to load nodes:', err);
      setNodes([]);
    }
  }, []);

  // Load student progress
  const loadProgress = useCallback(async (pathId: number) => {
    if (!user) return;
    try {
      const res = await client.entities['student_path_progress'].query({
        query: { learning_path_id: pathId },
        limit: 500,
      });
      const allProgress = extractItems<NodeProgress>(res?.data);
      setProgress(allProgress);
    } catch (err) {
      console.error('Failed to load progress:', err);
      // Fallback to queryAll
      try {
        const res2 = await client.entities['student_path_progress'].queryAll({
          query: { learning_path_id: pathId },
          limit: 500,
        });
        const allProgress2 = extractItems<NodeProgress>(res2?.data);
        setProgress(allProgress2.filter(p => p.user_id === user.id));
      } catch {
        setProgress([]);
      }
    }
  }, [user]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  useEffect(() => {
    if (selectedPath) {
      loadNodes(selectedPath.id);
      loadProgress(selectedPath.id);
    }
  }, [selectedPath, loadNodes, loadProgress]);

  // Get node status based on progress and prerequisite logic
  const getNodeStatus = (node: PathNode, index: number): 'completed' | 'in_progress' | 'locked' => {
    const nodeProgress = progress.find(p => p.node_id === node.id);
    if (nodeProgress?.status === 'completed') return 'completed';
    if (nodeProgress?.status === 'in_progress') return 'in_progress';

    // Prerequisite logic: first node is always unlocked, others require previous completion
    if (index === 0) return 'in_progress';
    const prevNode = nodes[index - 1];
    if (prevNode) {
      const prevProgress = progress.find(p => p.node_id === prevNode.id);
      if (prevProgress?.status === 'completed') return 'in_progress';
    }
    return 'locked';
  };

  // Start or continue a node
  const handleNodeAction = async (node: PathNode, status: 'completed' | 'in_progress' | 'locked') => {
    if (status === 'locked' || !user || !selectedPath) return;

    const existing = progress.find(p => p.node_id === node.id);
    if (!existing) {
      try {
        await client.entities['student_path_progress'].create({
          data: {
            learning_path_id: selectedPath.id,
            node_id: node.id,
            status: 'in_progress',
            score: null,
            completed_at: null,
          },
        });
        loadProgress(selectedPath.id);
      } catch (err) {
        console.error('Failed to start node:', err);
      }
    }

    // Mark as completed (simplified)
    if (status === 'in_progress') {
      try {
        if (existing) {
          await client.entities['student_path_progress'].update({
            id: String(existing.id),
            data: {
              status: 'completed',
              score: 100,
              completed_at: new Date().toISOString(),
            },
          });
        } else {
          await client.entities['student_path_progress'].create({
            data: {
              learning_path_id: selectedPath.id,
              node_id: node.id,
              status: 'completed',
              score: 100,
              completed_at: new Date().toISOString(),
            },
          });
        }
        loadProgress(selectedPath.id);
      } catch (err) {
        console.error('Failed to complete node:', err);
      }
    }
  };

  // Calculate path completion percentage
  const getPathProgress = (pathId: number): number => {
    const pathNodes = nodes.filter(n => n.learning_path_id === pathId);
    if (pathNodes.length === 0) return 0;
    const completed = progress.filter(p => p.learning_path_id === pathId && p.status === 'completed').length;
    return Math.round((completed / pathNodes.length) * 100);
  };

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

  if (!user) {
    navigate('/login');
    return null;
  }

  // Subjects View
  if (view === 'subjects') {
    const subjectsWithPaths = availableSubjects.filter(s =>
      paths.some(p => p.subject_name === s.name)
    );

    return (
      <div className="space-y-6 p-4 max-w-4xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600" />
              مسارات التعلم
            </h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">
              {OMAN_GRADES[studentGrade - 1]?.name} • اختر مادة لبدء التعلم
            </p>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
          >
            الرئيسية
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {subjectsWithPaths.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-tajawal">لا توجد مسارات تعلم متاحة لصفك حالياً</p>
              <p className="text-sm text-gray-400 font-tajawal mt-1">سيتم إضافة مسارات جديدة قريباً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subjectsWithPaths.map((subject) => {
              const subjectPaths = paths.filter(p => p.subject_name === subject.name);
              return (
                <Card
                  key={subject.name}
                  className="border cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
                  onClick={() => {
                    setSelectedSubject(subject.name);
                    setView('paths');
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{subject.icon}</div>
                    <h3 className="font-bold text-sm text-gray-800 font-tajawal">{subject.name}</h3>
                    <p className="text-xs text-gray-400 font-tajawal mt-1">
                      {subjectPaths.length} مسار متاح
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Also show subjects without paths (greyed out) */}
        {availableSubjects.filter(s => !subjectsWithPaths.includes(s)).length > 0 && (
          <div>
            <p className="text-xs text-gray-400 font-tajawal mb-2">مواد أخرى (قريباً)</p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {availableSubjects.filter(s => !subjectsWithPaths.includes(s)).map((subject) => (
                <div key={subject.name} className="p-3 bg-gray-50 rounded-lg text-center opacity-50">
                  <div className="text-xl mb-1">{subject.icon}</div>
                  <p className="text-xs text-gray-500 font-tajawal">{subject.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Paths View (for selected subject)
  if (view === 'paths') {
    const subjectPaths = paths.filter(p => p.subject_name === selectedSubject);

    return (
      <div className="space-y-6 p-4 max-w-4xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 font-tajawal">{selectedSubject}</h1>
            <p className="text-sm text-gray-500 font-tajawal mt-1">
              {OMAN_GRADES[studentGrade - 1]?.name} • {subjectPaths.length} مسار متاح
            </p>
          </div>
          <button
            onClick={() => setView('subjects')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
          >
            المواد
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {subjectPaths.map((path) => {
            const pathProgress = getPathProgress(path.id);
            return (
              <Card
                key={path.id}
                className="border cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                onClick={() => {
                  setSelectedPath(path);
                  setView('detail');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 font-tajawal">{path.title}</h3>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      {OMAN_SEMESTERS[(path.semester || 1) - 1]?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={pathProgress} className="flex-1 h-2" />
                    <span className="text-xs text-gray-500 font-tajawal">{pathProgress}%</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-tajawal">
                    <span>{path.total_nodes || 0} خطوة</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Detail View (path nodes with progress)
  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-tajawal">{selectedPath?.title}</h1>
          <p className="text-sm text-gray-500 font-tajawal mt-1">
            {selectedPath && OMAN_GRADES[selectedPath.grade_number - 1]?.name} • {selectedPath?.subject_name}
          </p>
        </div>
        <button
          onClick={() => { setView('paths'); setSelectedPath(null); setNodes([]); setProgress([]); }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-tajawal"
        >
          المسارات
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Summary */}
      {selectedPath && (
        <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-tajawal text-gray-600">تقدمك في المسار</span>
              <span className="text-sm font-bold text-blue-700">{getPathProgress(selectedPath.id)}%</span>
            </div>
            <Progress value={getPathProgress(selectedPath.id)} className="h-3" />
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-tajawal">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {progress.filter(p => p.status === 'completed').length} مكتمل
              </span>
              <span className="flex items-center gap-1">
                <PlayCircle className="w-3 h-3 text-blue-500" />
                {progress.filter(p => p.status === 'in_progress').length} جاري
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-gray-400" />
                {nodes.length - progress.length} مقفل
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nodes Timeline */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 font-tajawal">جاري التحميل...</div>
      ) : nodes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-tajawal">لا توجد خطوات في هذا المسار بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nodes.map((node, index) => {
            const status = getNodeStatus(node, index);
            const isCompleted = status === 'completed';
            const isActive = status === 'in_progress';
            const isLocked = status === 'locked';

            return (
              <Card
                key={node.id}
                className={`border transition-all ${
                  isCompleted ? 'border-green-200 bg-green-50/50' :
                  isActive ? 'border-blue-200 bg-blue-50/30 shadow-sm' :
                  'border-gray-200 opacity-60'
                } ${!isLocked ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => handleNodeAction(node, status)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' :
                    isActive ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : isActive ? (
                      <PlayCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold font-tajawal ${
                        isCompleted ? 'text-green-700' :
                        isActive ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {node.title}
                      </span>
                      <Badge className={`text-[10px] ${
                        isCompleted ? 'bg-green-100 text-green-600' :
                        isActive ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {getNodeTypeLabel(node.node_type)}
                      </Badge>
                    </div>
                    {node.duration_minutes && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-tajawal">
                        <Clock className="w-3 h-3" />
                        {node.duration_minutes} دقيقة
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    {isCompleted && (
                      <span className="text-xs text-green-600 font-tajawal">✓ مكتمل</span>
                    )}
                    {isActive && (
                      <span className="text-xs text-blue-600 font-tajawal px-2 py-1 bg-blue-100 rounded-full">
                        ابدأ
                      </span>
                    )}
                    {isLocked && (
                      <span className="text-xs text-gray-400 font-tajawal">مقفل</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}