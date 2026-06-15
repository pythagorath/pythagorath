// Skill Management Interface - mastery rules, retention rules, remediation logic, dependencies
import { useState } from 'react';
import { usePilotAuth } from '@/contexts/PilotAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Brain, Search, Settings, RefreshCw, Link2, Shield } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  domain: string;
  grade: number;
  masteryThreshold: number;
  minAttempts: number;
  retentionDays: number;
  decayRate: number;
  remediationType: 'visual' | 'step_by_step' | 'practice' | 'peer';
  dependencies: string[];
  status: 'active' | 'draft' | 'disabled';
  questionsCount: number;
  avgMastery: number;
}

const SKILLS: Skill[] = [
  { id: 's1', name: 'العد حتى 10', domain: 'الأعداد', grade: 1, masteryThreshold: 80, minAttempts: 5, retentionDays: 14, decayRate: 5, remediationType: 'visual', dependencies: [], status: 'active', questionsCount: 8, avgMastery: 92 },
  { id: 's2', name: 'العد حتى 20', domain: 'الأعداد', grade: 1, masteryThreshold: 80, minAttempts: 5, retentionDays: 14, decayRate: 5, remediationType: 'visual', dependencies: ['العد حتى 10'], status: 'active', questionsCount: 7, avgMastery: 85 },
  { id: 's3', name: 'الجمع حتى 10', domain: 'العمليات', grade: 1, masteryThreshold: 85, minAttempts: 7, retentionDays: 10, decayRate: 8, remediationType: 'step_by_step', dependencies: ['العد حتى 10'], status: 'active', questionsCount: 10, avgMastery: 78 },
  { id: 's4', name: 'الجمع حتى 20', domain: 'العمليات', grade: 1, masteryThreshold: 85, minAttempts: 7, retentionDays: 10, decayRate: 8, remediationType: 'step_by_step', dependencies: ['العد حتى 20', 'الجمع حتى 10'], status: 'active', questionsCount: 9, avgMastery: 72 },
  { id: 's5', name: 'الطرح حتى 10', domain: 'العمليات', grade: 1, masteryThreshold: 85, minAttempts: 7, retentionDays: 10, decayRate: 10, remediationType: 'practice', dependencies: ['الجمع حتى 10'], status: 'active', questionsCount: 8, avgMastery: 68 },
  { id: 's6', name: 'مقارنة الأعداد', domain: 'الأعداد', grade: 1, masteryThreshold: 80, minAttempts: 5, retentionDays: 21, decayRate: 3, remediationType: 'visual', dependencies: ['العد حتى 20'], status: 'active', questionsCount: 6, avgMastery: 80 },
  { id: 's7', name: 'الأشكال الأساسية', domain: 'الهندسة', grade: 1, masteryThreshold: 75, minAttempts: 4, retentionDays: 21, decayRate: 3, remediationType: 'visual', dependencies: [], status: 'active', questionsCount: 5, avgMastery: 88 },
  { id: 's8', name: 'الضرب الأساسي', domain: 'العمليات', grade: 2, masteryThreshold: 85, minAttempts: 8, retentionDays: 7, decayRate: 12, remediationType: 'practice', dependencies: ['الجمع حتى 20'], status: 'draft', questionsCount: 4, avgMastery: 45 },
  { id: 's9', name: 'قراءة الساعة', domain: 'القياس', grade: 2, masteryThreshold: 80, minAttempts: 5, retentionDays: 14, decayRate: 7, remediationType: 'visual', dependencies: ['العد حتى 20', 'مقارنة الأعداد'], status: 'active', questionsCount: 5, avgMastery: 60 },
  { id: 's10', name: 'الكسور البسيطة', domain: 'الأعداد', grade: 2, masteryThreshold: 80, minAttempts: 6, retentionDays: 7, decayRate: 15, remediationType: 'step_by_step', dependencies: ['الضرب الأساسي'], status: 'disabled', questionsCount: 2, avgMastery: 30 },
];

function getRemediationLabel(type: string) {
  const labels: Record<string, string> = { visual: 'بصري', step_by_step: 'خطوة بخطوة', practice: 'تدريب مكثف', peer: 'تعلم أقران' };
  return labels[type] || type;
}

export default function SkillManagement() {
  const { user } = usePilotAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  if (!user || (user.role !== 'admin' && user.role !== 'content_manager')) {
    navigate('/login');
    return null;
  }

  const filteredSkills = SKILLS.filter(s => s.name.includes(searchQuery) || s.domain.includes(searchQuery));

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ops')} className="text-gray-500">
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-tajawal">إدارة المهارات</h1>
          <p className="text-sm text-gray-500 font-tajawal">قواعد الإتقان، الاحتفاظ، المعالجة، التبعيات</p>
        </div>
      </div>

      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="font-tajawal">
          <TabsTrigger value="skills">المهارات</TabsTrigger>
          <TabsTrigger value="mastery">قواعد الإتقان</TabsTrigger>
          <TabsTrigger value="retention">الاحتفاظ</TabsTrigger>
          <TabsTrigger value="remediation">المعالجة</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="بحث في المهارات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 font-tajawal" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-right p-3 font-tajawal font-medium text-gray-600">المهارة</th>
                        <th className="text-right p-3 font-tajawal font-medium text-gray-600">المجال</th>
                        <th className="text-right p-3 font-tajawal font-medium text-gray-600">الحالة</th>
                        <th className="text-right p-3 font-tajawal font-medium text-gray-600">الإتقان</th>
                        <th className="text-right p-3 font-tajawal font-medium text-gray-600">أسئلة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.map((skill) => (
                        <tr key={skill.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedSkill?.id === skill.id ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedSkill(skill)}>
                          <td className="p-3 font-tajawal font-medium">{skill.name}</td>
                          <td className="p-3 font-tajawal text-gray-500">{skill.domain}</td>
                          <td className="p-3">
                            <Badge className={`text-xs font-tajawal ${skill.status === 'active' ? 'bg-green-100 text-green-700' : skill.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                              {skill.status === 'active' ? 'نشط' : skill.status === 'draft' ? 'مسودة' : 'معطل'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{skill.avgMastery}%</td>
                          <td className="p-3 text-sm">{skill.questionsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Detail Panel */}
            <div>
              {selectedSkill ? (
                <Card className="p-5 sticky top-20">
                  <h3 className="font-bold font-tajawal mb-3">{selectedSkill.name}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">المجال:</span>
                      <span>{selectedSkill.domain}</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">الصف:</span>
                      <span>{selectedSkill.grade}</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">حد الإتقان:</span>
                      <span>{selectedSkill.masteryThreshold}%</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">أقل محاولات:</span>
                      <span>{selectedSkill.minAttempts}</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">أيام الاحتفاظ:</span>
                      <span>{selectedSkill.retentionDays}</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">معدل الاضمحلال:</span>
                      <span>{selectedSkill.decayRate}%/أسبوع</span>
                    </div>
                    <div className="flex justify-between font-tajawal">
                      <span className="text-gray-500">نوع المعالجة:</span>
                      <Badge className="bg-purple-100 text-purple-700 text-xs">{getRemediationLabel(selectedSkill.remediationType)}</Badge>
                    </div>
                    {selectedSkill.dependencies.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-gray-500 font-tajawal mb-2">التبعيات:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedSkill.dependencies.map((dep, i) => (
                            <Badge key={i} className="bg-indigo-100 text-indigo-700 text-xs font-tajawal">{dep}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <Brain className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-tajawal">اختر مهارة لعرض التفاصيل</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mastery">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              قواعد الإتقان
            </h3>
            <div className="space-y-4">
              {SKILLS.filter(s => s.status === 'active').map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium font-tajawal text-sm">{skill.name}</p>
                    <p className="text-xs text-gray-400 font-tajawal">{skill.domain} • صف {skill.grade}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 font-tajawal">
                    <span>حد: {skill.masteryThreshold}%</span>
                    <span>محاولات: ≥{skill.minAttempts}</span>
                    <Badge className={`${skill.avgMastery >= skill.masteryThreshold ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} text-xs`}>
                      فعلي: {skill.avgMastery}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-500" />
              قواعد الاحتفاظ والاضمحلال
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">المهارة</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">أيام الاحتفاظ</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">معدل الاضمحلال</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">مراجعة بعد</th>
                    <th className="text-right p-3 font-tajawal font-medium text-gray-600">المستوى</th>
                  </tr>
                </thead>
                <tbody>
                  {SKILLS.map((skill) => (
                    <tr key={skill.id} className="border-b">
                      <td className="p-3 font-tajawal">{skill.name}</td>
                      <td className="p-3">{skill.retentionDays} يوم</td>
                      <td className="p-3">{skill.decayRate}%/أسبوع</td>
                      <td className="p-3">{Math.round(skill.retentionDays * 0.7)} يوم</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${skill.decayRate <= 5 ? 'bg-green-100 text-green-700' : skill.decayRate <= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {skill.decayRate <= 5 ? 'بطيء' : skill.decayRate <= 10 ? 'متوسط' : 'سريع'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="remediation">
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 font-tajawal mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              استراتيجيات المعالجة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['visual', 'step_by_step', 'practice', 'peer'].map((type) => {
                const skills = SKILLS.filter(s => s.remediationType === type);
                return (
                  <Card key={type} className="p-4 border">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-bold font-tajawal">{getRemediationLabel(type)}</h4>
                      <Badge className="bg-gray-100 text-gray-600 text-xs">{skills.length} مهارات</Badge>
                    </div>
                    <div className="space-y-1">
                      {skills.map((s) => (
                        <p key={s.id} className="text-sm text-gray-600 font-tajawal">• {s.name}</p>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}