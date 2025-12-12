import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert } from './ui/alert';
import { Card } from './ui/card';
import { userApi, User } from '@/api/user.api';

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserManagementDialog = ({ open, onOpenChange }: UserManagementDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: open,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'USER' }) =>
      userApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || '권한 변경에 실패했습니다.');
    },
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.employeeId.toLowerCase().includes(query) ||
          (user.departmentName && user.departmentName.toLowerCase().includes(query)) ||
          (user.dept && user.dept.toLowerCase().includes(query))
      );
  }, [users, searchQuery]);

  const handleRoleChange = (userId: string, currentRole: 'ADMIN' | 'USER') => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (confirm(`사용자 권한을 ${newRole}로 변경하시겠습니까?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사용자 관리</DialogTitle>
          <DialogDescription>
            전체 사용자 목록을 조회하고 관리자 권한을 부여할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="flex gap-2">
            <Input
              placeholder="이름, 사번, 부서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 p-3 bg-slate-100 rounded-md font-medium text-sm text-slate-700">
                <div className="col-span-2">이름</div>
                <div className="col-span-2">사번</div>
                <div className="col-span-2">부서</div>
                <div className="col-span-3">이메일</div>
                <div className="col-span-1 text-center">권한</div>
                <div className="col-span-2 text-right">관리</div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  검색 결과가 없습니다.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="p-3">
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-2 font-medium">{user.name}</div>
                      <div className="col-span-2 text-gray-600">{user.employeeId}</div>
                      <div className="col-span-2 text-gray-600 truncate" title={user.departmentName || user.dept || ''}>
                        {user.departmentName || user.dept || '-'}
                      </div>
                      <div className="col-span-3 text-gray-600 truncate" title={user.email || ''}>
                        {user.email || '-'}
                      </div>
                      <div className="col-span-1 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, user.role)}
                          disabled={updateRoleMutation.isPending}
                        >
                          {user.role === 'ADMIN' ? '권한 해제' : '관리자 지정'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManagementDialog;
