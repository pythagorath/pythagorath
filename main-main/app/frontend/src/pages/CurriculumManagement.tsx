// Curriculum Management System - Structure, grades, domains, skills hierarchy, prerequisites, file uploads
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowRight, BookOpen, Layers, GitBranch, CheckCircle, AlertTriangle, Upload, FileText, Trash2, Download, Loader2, Sparkles } from 'lucide-react';
import { client } from '@/lib/api';

interface Domain {
  id: string;
  name: string;
  grade: number;
  skills: number;
  coverage: number;
  status: 'complete' | 'partial' | 'missing';
}

interface SkillNode {
  id: string;
  name: string;
  domain: string;
  grade: number;
  prerequisites: string[];
  status: 'active' | 'draft' | 'review';
  questionsCount: number;
}

const DOMAINS: Domain[] = [
  { id: 'd1', name: 'الأعداد والعد', grade: 1, skills: 15, coverage: 92, status: 'complete' },
  { id: 'd2', name: 'الجمع والطرح', grade: 1, skills: 18, coverage: 85, status: 'complete' },
  { id: 'd3', name: 'الأشكال الهندسية', grade: 1, skills: 8, coverage: 70, status: 'partial' },
  { id: 'd4', name: 'القياس والمقارنة', grade: 1, skills: 6, coverage: 55, status: 'partial' },
  { id: 'd5', name: 'الأنماط والتسلسلات', grade: 1, skills: 5, coverage: 60, status: 'partial' },
  { id: 'd6', name: 'الأعداد حتى 1000', grade: 2, skills: 12, coverage: 75, status: 'partial' },
  { id: 'd7', name: 'الضرب والقسمة', grade: 2, skills: 14, coverage: 50, status: 'partial' },
  { id: 'd8', name: 'الكسور', grade: 2, skills: 8, coverage: 40, status: 'missing' },
  { id: 'd9', name: 'الوقت والنقود', grade: 2, skills: 6, coverage: 65, status: 'partial' },
  { id: 'd10', name: 'البيانات والرسوم', grade: 2, skills: 4, coverage: 45, status: 'missing' },
];

const SKILL_HIERARCHY: SkillNode[] = [
  { id: 's1', name: 'العد حتى 10', domain: 'الأعداد والعد', grade: 1, prerequisites: [], status: 'active', questionsCount: 8 },
  { id: 's2', name: 'العد حتى 20', domain: 'الأعداد والعد', grade: 1, prerequisites: ['s1'], status: 'active', questionsCount: 7 },
  { id: 's3', name: 'مقارنة الأعداد', domain: 'الأعداد والعد', grade: 1, prerequisites: ['s2'], status: 'active', questionsCount: 6 },
  { id: 's4', name: 'الجمع حتى 10', domain: 'الجمع والطرح', grade: 1, prerequisites: ['s1'], status: 'active', questionsCount: 10 },
  { id: 's5', name: 'الجمع حتى 20', domain: 'الجمع والطرح', grade: 1, prerequisites: ['s2', 's4'], status: 'active', questionsCount: 9 },
  { id: 's6', name: 'الطرح حتى 10', domain: 'الجمع والطرح', grade: 1, prerequisites: ['s4'], status: 'active', questionsCount: 8 },
  { id: 's7', name: 'الطرح حتى 20', domain: 'الجمع والطرح', grade: 1, prerequisites: ['s5', 's6'], status: 'active', questionsCount: 7 },
  { id: 's8', name: 'العد حتى 100', domain: 'الأعداد حتى 1000', grade: 2, prerequisites: ['s2'], status: 'active', questionsCount: 6 },
  { id: 's9', name: 'الضرب الأساسي', domain: 'الضرب والقسمة', grade: 2, prerequisites: ['s5'], status: 'draft', questionsCount: 4 },
  { id: 's10', name: 'قراءة الساعة', domain: 'الوقت والنقود', grade: 2, prerequisites: ['s3'], status: 'review', questionsCount: 5 },
];

const CURRICULUM_STRUCTURE = [
  { grade: 1, semester: 1, units: ['الأعداد حتى 20', 'الجمع والطرح الأساسي', 'الأشكال'], lessons: 24, coverage: 88 },
  { grade: 1, semester: 2, units: ['الأعداد حتى 100', 'الجمع والطرح المتقدم', 'القياس'], lessons: 22, coverage: 72 },
  { grade: 2, semester: 1, units: ['الأعداد حتى 1000', 'الضرب', 'الهندسة'], lessons: 26, coverage: 55 },
  { grade: 2, semester: 2, units: ['القسمة', 'الكسور', 'البيانات'], lessons: 24, coverage: 40 },
];

// --- Subjects for the 13 MVP subjects ---
const MVP_SUBJECTS = [
  'الرياضيات', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم', 'التربية الإسلامية',
  'الدراسات الاجتماعية', 'الفيزياء', 'الكيمياء', 'الأحياء', 'الجغرافيا',
  'التاريخ', 'العلوم البيئية', 'هذا وطني'
];

// Numeric grade -> Arabic label (matches curriculum_domains.grade values)
const GRADE_LABELS: Record<number, string> = {
  1: 'الصف الأول', 2: 'الصف الثاني', 3: 'الصف الثالث', 4: 'الصف الرابع',
  5: 'الصف الخامس', 6: 'الصف السادس', 7: 'الصف السابع', 8: 'الصف الثامن',
  9: 'الصف التاسع', 10: 'الصف العاشر', 11: 'الصف الحادي عشر', 12: 'الصف الثاني عشر',
};

interface CurriculumFile {
  id: number;
  user_id: string;
  subject_name: string;
  grade_number: number;
  semester_number: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  description: string | null;
  created_at: string;
}

interface AIDomain {
  id: number;
  name: string;
  grade?: string | number;
  semester?: string | number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function CurriculumManagement() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'structure';
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  // File upload state
  const [uploadSubject, setUploadSubject] = useState(MVP_SUBJECTS[0]);
  const [uploadGrade, setUploadGrade] = useState(1);
  const [uploadSemester, setUploadSemester] = useState(1);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File list state
  const [files, setFiles] = useState<CurriculumFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  // AI curriculum analysis state
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiDomains, setAiDomains] = useState<AIDomain[]>([]);
  const [analyzeFile, setAnalyzeFile] = useState<CurriculumFile | null>(null);
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeDomainId, setAnalyzeDomainId] = useState<number | null>(null);
  const [analyzeQPS, setAnalyzeQPS] = useState(4);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState<{ units_created: number; lessons_created: number; skills_created: number; questions_created: number } | null>(null);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const queryObj: Record<string, unknown> = {};
      if (filterSubject) queryObj.subject_name = filterSubject;
      if (filterGrade) queryObj.grade_number = filterGrade;

      const res = await client.entities['curriculum_files'].queryAll({
        query: Object.keys(queryObj).length > 0 ? queryObj : undefined,
        sort: '-created_at',
        limit: 100,
      });
      const data = res?.data;
      if (data && data.items) {
        setFiles(data.items);
      } else if (Array.isArray(data)) {
        setFiles(data);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [filterSubject, filterGrade]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'content_manager')) {
      loadFiles();
    }
  }, [user, loadFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const objectKey = `${uploadSubject}/grade-${uploadGrade}/semester-${uploadSemester}/${Date.now()}-${file.name}`;

        // Upload to storage bucket
        const uploadResult = await client.storage.upload({
          bucket_name: 'curriculum-files',
          object_key: objectKey,
          file,
        });

        if (!uploadResult) {
          throw new Error(`فشل رفع الملف: ${file.name}`);
        }

        // Get download URL
        let fileUrl = '';
        try {
          const urlRes = await client.storage.getDownloadUrl({
            bucket_name: 'curriculum-files',
            object_key: objectKey,
          });
          fileUrl = urlRes?.data?.url || urlRes?.data?.download_url || objectKey;
        } catch {
          fileUrl = objectKey;
        }

        // Save metadata to database
        const createData: Record<string, unknown> = {
          subject_name: uploadSubject,
          grade_number: uploadGrade,
          semester_number: uploadSemester,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size || 0,
          file_type: file.type || 'application/octet-stream',
        };
        if (uploadDescription.trim()) {
          createData.description = uploadDescription.trim();
        }

        await client.entities['curriculum_files'].create({
          data: createData,
        });
      }

      setUploadSuccess(`تم رفع ${selectedFiles.length} ملف بنجاح ✓`);
      setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFiles();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء الرفع';
      setUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileRecord: CurriculumFile) => {
    if (!confirm(`هل تريد حذف "${fileRecord.file_name}"؟`)) return;
    try {
      await client.entities['curriculum_files'].delete({ id: fileRecord.id });
      setFiles(prev => prev.filter(f => f.id !== fileRecord.id));
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('فشل حذف الملف');
    }
  };

  const handleDownloadFile = async (fileRecord: CurriculumFile) => {
    try {
      // Use the stored file_url captured at upload — it holds the exact object key
      // (with the timestamp prefix). Reconstructing it from file_name would 404.
      window.open(fileRecord.file_url, '_blank');
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('فشل تحميل الملف');
    }
  };

  // Load AI service status + curriculum domains (admins/content managers only)
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'content_manager')) return;
    (async () => {
      try {
        const s = await client.apiCall.invoke({ url: '/api/v1/curriculum-ai/status', method: 'GET', data: {} });
        setAiConfigured(!!(s?.data?.configured ?? s?.configured));
      } catch {
        setAiConfigured(false);
      }
    })();
  }, [user]);

  const openAnalyzeDialog = async (file: CurriculumFile) => {
    setAnalyzeFile(file);
    setAnalyzeText('');
    setAnalyzeError('');
    setAnalyzeResult(null);
    setAnalyzeQPS(4);
    setAnalyzeDomainId(null);

    // Load domains filtered to this file's grade + subject (short, relevant list)
    try {
      const url = `/api/v1/curriculum-ai/domains?grade=${file.grade_number}&subject=${encodeURIComponent(file.subject_name)}`;
      const res = await client.apiCall.invoke({ url, method: 'GET', data: {} });
      const items: AIDomain[] = (res?.data?.domains ?? res?.domains ?? []);
      setAiDomains(items);
      setAnalyzeDomainId(items[0]?.id ?? null);
    } catch {
      setAiDomains([]);
    }

    // Auto-extract text from the uploaded file so no manual pasting is needed.
    // Use the stored file_url captured at upload — it holds the exact object key
    // (with the timestamp prefix). Reconstructing the key from file_name would
    // miss that prefix and 404.
    setExtracting(true);
    try {
      const res = await client.apiCall.invoke({
        url: '/api/v1/curriculum-ai/extract-text',
        method: 'POST',
        data: { file_url: file.file_url },
      });
      const data = res?.data ?? res;
      if (data?.text) setAnalyzeText(data.text);
      else setAnalyzeError('تعذّر استخراج نص من الملف، يمكنك لصقه يدوياً.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setAnalyzeError(`تعذّر استخراج النص تلقائياً، يمكنك لصقه يدوياً. ${ax?.response?.data?.detail || ''}`.trim());
    } finally {
      setExtracting(false);
    }
  };

  const runAnalysis = async () => {
    if (!analyzeFile) return;
    if (!analyzeText.trim()) { setAnalyzeError('الرجاء لصق نص المنهج أولاً'); return; }
    if (!analyzeDomainId) { setAnalyzeError('الرجاء اختيار النطاق (Domain)'); return; }

    setAnalyzing(true);
    setAnalyzeError('');
    setAnalyzeResult(null);
    try {
      // Build the full hierarchy (units -> lessons -> skills -> questions) in one pass.
      const res = await client.apiCall.invoke({
        url: '/api/v1/curriculum-ai/analyze-structure',
        method: 'POST',
        data: {
          curriculum_text: analyzeText.trim(),
          domain_id: analyzeDomainId,
          grade: GRADE_LABELS[analyzeFile.grade_number] || String(analyzeFile.grade_number),
          semester: analyzeFile.semester_number === 2 ? 'الفصل الثاني' : 'الفصل الأول',
          grade_number: analyzeFile.grade_number,
          subject_name: analyzeFile.subject_name,
          semester_number: analyzeFile.semester_number,
          questions_per_skill: analyzeQPS,
          persist: true,
        },
      });
      const data = res?.data ?? res;
      setAnalyzeResult({
        units_created: data?.units_created ?? 0,
        lessons_created: data?.lessons_created ?? 0,
        skills_created: data?.skills_created ?? 0,
        questions_created: data?.questions_created ?? 0,
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string } }; message?: string };
      setAnalyzeError(ax?.response?.data?.detail || ax?.message || 'فشل التحليل');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'content_manager')) {
    navigate('/login');
    return null;
  }

  const filteredDomains = selectedGrade ? DOMAINS.filter(d => d.grade === selectedGrade) : DOMAINS;

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ops')} className="text-gray-500">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">إدارة المنهج</h1>
          <p className="text-sm text-gray-500 font-tajawal">هيكل المنهج، المجالات، التسلسل الهرمي للمهارات</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><BookOpen className="w-4 h-4" /><span className="text-xs font-tajawal">المجالات</span></div>
          <p className="text-2xl font-bold">{DOMAINS.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-purple-600 mb-1"><Layers className="w-4 h-4" /><span className="text-xs font-tajawal">المهارات</span></div>
          <p className="text-2xl font-bold">{DOMAINS.reduce((a, d) => a + d.skills, 0)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-green-600 mb-1"><CheckCircle className="w-4 h-4" /><span className="text-xs font-tajawal">مكتملة</span></div>
          <p className="text-2xl font-bold">{DOMAINS.filter(d => d.status === 'complete').length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-orange-600 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-tajawal">تحتاج عمل</span></div>
          <p className="text-2xl font-bold">{DOMAINS.filter(d => d.status === 'missing').length}</p>
        </Card>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList className="font-tajawal">
          <TabsTrigger value="structure">هيكل المنهج</TabsTrigger>
          <TabsTrigger value="domains">المجالات</TabsTrigger>
          <TabsTrigger value="hierarchy">التسلسل الهرمي</TabsTrigger>
          <TabsTrigger value="prerequisites">المتطلبات</TabsTrigger>
          <TabsTrigger value="files">ملفات المنهج</TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CURRICULUM_STRUCTURE.map((item, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold font-tajawal">الصف {item.grade} - الفصل {item.semester}</h3>
                  <Badge className={`${item.coverage >= 80 ? 'bg-green-100 text-green-700' : item.coverage >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} font-tajawal`}>
                    {item.coverage}% تغطية
                  </Badge>
                </div>
                <div className="space-y-2">
                  {item.units.map((unit, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-gray-600 font-tajawal">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      {unit}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500 font-tajawal">
                  <span>{item.lessons} درس</span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.coverage}%` }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="domains">
          <div className="flex gap-2 mb-4">
            <Button variant={selectedGrade === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedGrade(null)} className="font-tajawal">الكل</Button>
            <Button variant={selectedGrade === 1 ? 'default' : 'outline'} size="sm" onClick={() => setSelectedGrade(1)} className="font-tajawal">صف 1</Button>
            <Button variant={selectedGrade === 2 ? 'default' : 'outline'} size="sm" onClick={() => setSelectedGrade(2)} className="font-tajawal">صف 2</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDomains.map((domain) => (
              <Card key={domain.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold font-tajawal text-sm">{domain.name}</h4>
                  <Badge className={`text-xs font-tajawal ${domain.status === 'complete' ? 'bg-green-100 text-green-700' : domain.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {domain.status === 'complete' ? 'مكتمل' : domain.status === 'partial' ? 'جزئي' : 'ناقص'}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-tajawal mb-2">
                  <span>صف {domain.grade}</span>
                  <span>{domain.skills} مهارة</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${domain.coverage >= 80 ? 'bg-green-500' : domain.coverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${domain.coverage}%` }} />
                </div>
                <p className="text-xs text-gray-400 font-tajawal mt-1 text-left">{domain.coverage}%</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-500" />
              التسلسل الهرمي للمهارات
            </h3>
            <div className="space-y-3">
              {SKILL_HIERARCHY.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${skill.status === 'active' ? 'bg-green-400' : skill.status === 'draft' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                    <div>
                      <p className="font-medium font-tajawal text-sm">{skill.name}</p>
                      <p className="text-xs text-gray-400 font-tajawal">{skill.domain} • صف {skill.grade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-tajawal">{skill.questionsCount} أسئلة</span>
                    {skill.prerequisites.length > 0 && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs font-tajawal">
                        {skill.prerequisites.length} متطلب
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prerequisites">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4">خريطة المتطلبات السابقة</h3>
            <div className="space-y-4">
              {SKILL_HIERARCHY.filter(s => s.prerequisites.length > 0).map((skill) => (
                <div key={skill.id} className="p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold font-tajawal text-sm">{skill.name}</span>
                    <span className="text-xs text-gray-400">←</span>
                    <span className="text-xs text-gray-500 font-tajawal">يتطلب:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skill.prerequisites.map((preId) => {
                      const pre = SKILL_HIERARCHY.find(s => s.id === preId);
                      return pre ? (
                        <Badge key={preId} className="bg-indigo-100 text-indigo-700 font-tajawal text-xs">
                          {pre.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ملفات المنهج Tab */}
        <TabsContent value="files">
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                رفع ملفات المنهج
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-tajawal text-gray-600 mb-1">المادة</label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm font-tajawal bg-white"
                  >
                    {MVP_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-tajawal text-gray-600 mb-1">الصف</label>
                  <select
                    value={uploadGrade}
                    onChange={(e) => setUploadGrade(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg text-sm font-tajawal bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>الصف {g}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-tajawal text-gray-600 mb-1">الفصل الدراسي</label>
                  <select
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg text-sm font-tajawal bg-white"
                  >
                    <option value={1}>الفصل الأول</option>
                    <option value={2}>الفصل الثاني</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-tajawal text-gray-600 mb-1">وصف (اختياري)</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="مثال: كتاب الطالب، دليل المعلم، أوراق عمل..."
                  className="w-full p-2 border rounded-lg text-sm font-tajawal"
                />
              </div>

              {/* File Input */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.mp4,.mp3"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="curriculum-file-input"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="font-tajawal bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الرفع...</>
                  ) : (
                    <><Upload className="w-4 h-4 ml-2" /> اختر الملفات للرفع</>
                  )}
                </Button>
                <span className="text-xs text-gray-400 font-tajawal">PDF, Word, Excel, PowerPoint, صور، فيديو، صوت</span>
              </div>

              {/* Status Messages */}
              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-tajawal">
                  ❌ {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-tajawal">
                  ✅ {uploadSuccess}
                </div>
              )}
            </Card>

            {/* Filter & File List */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                الملفات المرفوعة
              </h3>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={filterSubject}
                  onChange={(e) => { setFilterSubject(e.target.value); }}
                  className="p-2 border rounded-lg text-sm font-tajawal bg-white"
                >
                  <option value="">كل المواد</option>
                  {MVP_SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filterGrade ?? ''}
                  onChange={(e) => { setFilterGrade(e.target.value ? Number(e.target.value) : null); }}
                  className="p-2 border rounded-lg text-sm font-tajawal bg-white"
                >
                  <option value="">كل الصفوف</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                    <option key={g} value={g}>الصف {g}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={loadFiles} className="font-tajawal">
                  🔄 تحديث
                </Button>
              </div>

              {/* File Table */}
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="mr-2 text-gray-500 font-tajawal">جاري التحميل...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-tajawal">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>لا توجد ملفات مرفوعة بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500 font-tajawal">
                        <th className="py-2 px-3 text-right">اسم الملف</th>
                        <th className="py-2 px-3 text-right">المادة</th>
                        <th className="py-2 px-3 text-right">الصف</th>
                        <th className="py-2 px-3 text-right">الفصل</th>
                        <th className="py-2 px-3 text-right">الحجم</th>
                        <th className="py-2 px-3 text-right">التاريخ</th>
                        <th className="py-2 px-3 text-right">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-tajawal">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-[200px]" title={file.file_name}>{file.file_name}</span>
                            </div>
                            {file.description && <p className="text-xs text-gray-400 mt-0.5">{file.description}</p>}
                          </td>
                          <td className="py-2 px-3 font-tajawal text-xs">
                            <Badge className="bg-blue-50 text-blue-700">{file.subject_name}</Badge>
                          </td>
                          <td className="py-2 px-3 font-tajawal text-xs">الصف {file.grade_number}</td>
                          <td className="py-2 px-3 font-tajawal text-xs">الفصل {file.semester_number}</td>
                          <td className="py-2 px-3 text-xs text-gray-500">{formatFileSize(file.file_size)}</td>
                          <td className="py-2 px-3 text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString('ar-OM')}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(file)} title="تحميل">
                                <Download className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAnalyzeDialog(file)}
                                title="تحليل بالذكاء الاصطناعي"
                                disabled={aiConfigured === false}
                              >
                                <Sparkles className="w-4 h-4 text-purple-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file)} title="حذف">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {files.length > 0 && (
                <div className="mt-4 pt-3 border-t flex justify-between text-xs text-gray-500 font-tajawal">
                  <span>إجمالي الملفات: {files.length}</span>
                  <span>إجمالي الحجم: {formatFileSize(files.reduce((a, f) => a + (f.file_size || 0), 0))}</span>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI curriculum analysis dialog */}
      <Dialog open={!!analyzeFile} onOpenChange={(o) => { if (!o) setAnalyzeFile(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-tajawal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              بناء الهيكل الكامل بالذكاء الاصطناعي
            </DialogTitle>
          </DialogHeader>
          {analyzeFile && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-tajawal">
                الملف: <span className="font-bold">{analyzeFile.file_name}</span> — الصف {analyzeFile.grade_number} / الفصل {analyzeFile.semester_number}
              </p>
              {aiConfigured === false && (
                <div className="bg-amber-50 text-amber-700 text-sm p-2 rounded font-tajawal">
                  ⚠️ مفتاح Claude غير مُعد. أضف ANTHROPIC_API_KEY في ملف backend/.env.
                </div>
              )}
              <div>
                <Label className="font-tajawal text-sm flex items-center gap-2">
                  نص المنهج
                  {extracting && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> جارٍ استخراج النص من الملف...
                    </span>
                  )}
                </Label>
                <Textarea
                  value={analyzeText}
                  onChange={(e) => setAnalyzeText(e.target.value)}
                  rows={8}
                  disabled={extracting}
                  placeholder={extracting
                    ? 'جارٍ استخراج النص من الملف تلقائياً...'
                    : 'يُستخرج النص تلقائياً من الملف. يمكنك تعديله أو لصقه يدوياً عند الحاجة...'}
                  className="font-tajawal mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-tajawal text-sm">النطاق (Domain)</Label>
                  <select
                    value={analyzeDomainId ?? ''}
                    onChange={(e) => setAnalyzeDomainId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 border rounded-lg text-sm font-tajawal bg-white mt-1"
                  >
                    <option value="">اختر النطاق</option>
                    {aiDomains.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {aiDomains.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 font-tajawal">لا توجد نطاقات لهذا الصف/المادة.</p>
                  )}
                </div>
                <div>
                  <Label className="font-tajawal text-sm">أسئلة لكل مهارة</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={analyzeQPS}
                    onChange={(e) => setAnalyzeQPS(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="mt-1"
                  />
                </div>
              </div>
              {analyzeError && (
                <div className="bg-red-50 text-red-600 text-sm p-2 rounded font-tajawal">❌ {analyzeError}</div>
              )}
              {analyzeResult && (
                <div className="bg-green-50 text-green-700 text-sm p-2 rounded font-tajawal">
                  ✅ تم إنشاء الهيكل الكامل: {analyzeResult.units_created} وحدة، {analyzeResult.lessons_created} درس، {analyzeResult.skills_created} مهارة، و {analyzeResult.questions_created} سؤال وحفظها في قاعدة البيانات.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAnalyzeFile(null)} className="font-tajawal">إغلاق</Button>
            <Button onClick={runAnalysis} disabled={analyzing || extracting || aiConfigured === false} className="font-tajawal">
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جارٍ التحليل...</>
              ) : (
                <><Sparkles className="w-4 h-4 ml-1" /> تحليل وحفظ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}