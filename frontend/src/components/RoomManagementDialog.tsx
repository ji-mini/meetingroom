import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
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
import { roomApi } from '@/api/room.api';
import RoomEditDialog from './RoomEditDialog';
import RoomCreateDialog from './RoomCreateDialog';
import type { MeetingRoom } from '@/types';

type RoomManagementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onSuccess?: () => void; // 회의실 정보 업데이트 콜백
};

type FilterType = 'all' | 'ACTIVE' | 'CLOSED';

function RoomManagementDialog({ open, onOpenChange, isAdmin, onSuccess }: RoomManagementDialogProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomToEdit, setRoomToEdit] = useState<MeetingRoom | null>(null);
  const [roomCreateOpen, setRoomCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 관리자 권한 체크
  if (!isAdmin) {
    return null;
  }

  // 모든 회의실 조회
  const { data: rooms = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['rooms', 'all'],
    queryFn: roomApi.getAllRooms,
    enabled: open && isAdmin,
  });

  // 필터링 및 검색
  const filteredRooms = useMemo(() => {
    let result = rooms;

    // 상태 필터
    if (filter !== 'all') {
      result = result.filter((room) => room.status === filter);
    }

    // 검색 (이름, 건물, 층)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (room) =>
          room.name.toLowerCase().includes(query) ||
          room.building.toLowerCase().includes(query) ||
          room.floor.toLowerCase().includes(query)
      );
    }

    return result;
  }, [rooms, filter, searchQuery]);

  // 활성/비활성 토글
  const toggleStatusMutation = useMutation({
    mutationFn: roomApi.toggleRoomStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'all'] });
      setError(null);
      // 부모 컴포넌트에 회의실 정보 업데이트 알림
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setError(err.response?.data?.message || '상태 변경 중 오류가 발생했습니다.');
    },
  });

  const handleToggleStatus = (room: MeetingRoom) => {
    setError(null);
    toggleStatusMutation.mutate(room.id);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['rooms', 'all'] });
    setRoomToEdit(null);
    // 부모 컴포넌트에 회의실 정보 업데이트 알림
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['rooms', 'all'] });
    setRoomCreateOpen(false);
    // 부모 컴포넌트에 회의실 정보 업데이트 알림
    if (onSuccess) {
      onSuccess();
    }
  };

  if (fetchError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회의실 관리</DialogTitle>
          </DialogHeader>
          <Alert>
            회의실 목록을 불러오는 중 오류가 발생했습니다.
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>회의실 관리</DialogTitle>
                <DialogDescription>
                  회의실 목록을 조회하고 관리할 수 있습니다.
                </DialogDescription>
              </div>
              <Button
                onClick={() => setRoomCreateOpen(true)}
                size="sm"
              >
                회의실 추가
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">

            {/* 필터 및 검색 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* 필터 버튼 */}
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  전체
                </Button>
                <Button
                  variant={filter === 'ACTIVE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('ACTIVE')}
                >
                  활성
                </Button>
                <Button
                  variant={filter === 'CLOSED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('CLOSED')}
                >
                  비활성
                </Button>
              </div>

              {/* 검색 */}
              <Input
                placeholder="회의실 이름, 건물, 층으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {error && <Alert>{error}</Alert>}

            {/* 회의실 목록 */}
            {isLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 회의실이 없습니다.'}
              </div>
            ) : (
              <div className="space-y-2">
                {/* 테이블 헤더 */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 rounded-md font-medium text-sm text-slate-700">
                  <div className="col-span-2">이름</div>
                  <div className="col-span-1">건물</div>
                  <div className="col-span-1">층</div>
                  <div className="col-span-1 text-center">수용 인원</div>
                  <div className="col-span-1 text-center">상태</div>
                  <div className="col-span-2">생성일</div>
                  <div className="col-span-4 text-right">작업</div>
                </div>

                {/* 테이블 행 */}
                {filteredRooms.map((room) => (
                  <Card key={room.id} className="p-3">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2 font-medium">{room.name}</div>
                      <div className="col-span-1 text-sm text-muted-foreground">
                        {room.building}
                      </div>
                      <div className="col-span-1 text-sm text-muted-foreground">
                        {room.floor}
                      </div>
                      <div className="col-span-1 text-center text-sm">
                        {room.capacity}명
                      </div>
                      <div className="col-span-1 text-center">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            room.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {room.status === 'ACTIVE' ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {format(new Date(room.createdAt), 'yyyy-MM-dd')}
                      </div>
                      <div className="col-span-4 flex items-center justify-end gap-2">
                        <Button
                          variant={room.status === 'ACTIVE' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleStatus(room)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {room.status === 'ACTIVE' ? '비활성화' : '활성화'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRoomToEdit(room)}
                        >
                          수정
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      {roomToEdit && (
        <RoomEditDialog
          open={!!roomToEdit}
          room={roomToEdit}
          onOpenChange={(open) => !open && setRoomToEdit(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 회의실 추가 모달 */}
      <RoomCreateDialog
        open={roomCreateOpen}
        onOpenChange={setRoomCreateOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}

export default RoomManagementDialog;

