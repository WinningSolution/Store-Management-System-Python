import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Page } from '../../App';
import { toast } from 'sonner@2.0.3';

interface EmployeeFormProps {
  employeeId?: string;
  onNavigate: (page: Page) => void;
}

export function EmployeeForm({ employeeId, onNavigate }: EmployeeFormProps) {
  const isEdit = !!employeeId;
  const [formData, setFormData] = useState({
    name: isEdit ? '김민준' : '',
    employeeId: isEdit ? 'EMP001' : '',
    phone: isEdit ? '010-1234-5678' : '',
    email: isEdit ? 'minjun.kim@winningsolution.com' : '',
    joinDate: isEdit ? '2023-03-15' : '',
    position: isEdit ? '정규직' : '정규직',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(isEdit ? '직원 정보가 수정되었습니다.' : '새로운 직원이 등록되었습니다.');
    setTimeout(() => {
      onNavigate(isEdit ? 'employee-detail' : 'employee-list');
    }, 1000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => onNavigate(isEdit ? 'employee-detail' : 'employee-list')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-gray-900 mb-2">{isEdit ? '직원 정보 수정' : '직원 등록'}</h1>
        <p className="text-gray-500">{isEdit ? '직원 정보를 수정합니다' : '새로운 직원을 등록합니다'}</p>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="employeeId">직원ID *</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="EMP001"
                  required
                  disabled={isEdit}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone">연락처 *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@winningsolution.com"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="joinDate">입사일 *</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="position">고용 형태 *</Label>
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="mt-2 w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="아르바이트">아르바이트</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? '수정 완료' : '등록하기'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onNavigate(isEdit ? 'employee-detail' : 'employee-list')}
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
