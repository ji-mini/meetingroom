import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Label } from './ui/label';
import { reservationApi } from '@/api/reservation.api';
import type { Reservation } from '@/types';

type ReservationCancelDialogProps = {
  open: boolean;
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function ReservationCancelDialog({
  open,
  reservation,
  onOpenChange,
  onSuccess,
}: ReservationCancelDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'this' | 'all'>('this');

  useEffect(() => {
    if (open) {
      setScope('this');
      setError(null);
    }
  }, [open]);

  const cancelMutation = useMutation({
    mutationFn: (data: { id: string; scope: 'this' | 'all' }) => 
      reservationApi.deleteReservation(data.id, data.scope),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      console.error('예약 취소 실패', err);
      setError(err.response?.data?.message || '예약 취소 중 오류가 발생했습니다.');
    },
  });

  const handleCancel = () => {
    if (!reservation) {
      return;
    }
    setError(null);
    cancelMutation.mutate({ id: reservation.id, scope });
  };

  const title = reservation?.title ?? '';
  const roomName = reservation?.room?.name ?? '알 수 없는 회의실';
  const timeRange =
    reservation &&
    `${format(new Date(reservation.startAt), 'yyyy-MM-dd HH:mm')} ~ ${format(
      new Date(reservation.endAt),
      'HH:mm'
    )}`;
  
  const isRecurring = Boolean(reservation?.recurringId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예약을 취소하시겠습니까?</DialogTitle>
          <DialogDescription>
            선택한 예약을 삭제하면 복구할 수 없습니다. 아래 정보를 확인해주세요.
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm rounded-md border border-slate-100 bg-slate-50 p-4">
              <p>
                <span className="font-medium text-slate-700">제목: </span>
                {title}
              </p>
              <p>
                <span className="font-medium text-slate-700">회의실: </span>
                {roomName}
              </p>
              <p>
                <span className="font-medium text-slate-700">시간: </span>
                {timeRange}
              </p>
            </div>
            
            {isRecurring && (
              <div className="space-y-3 pt-2">
                <Label className="text-base font-semibold">삭제 범위 선택</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scope-this"
                      value="this"
                      checked={scope === 'this'}
                      onChange={(e) => setScope(e.target.value as 'this' | 'all')}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="scope-this" className="font-normal cursor-pointer">이 일정만 취소</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scope-all"
                      value="all"
                      checked={scope === 'all'}
                      onChange={(e) => setScope(e.target.value as 'this' | 'all')}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="scope-all" className="font-normal cursor-pointer">전체 정기예약 취소</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  * '전체 정기예약 취소' 선택 시, 이 예약과 연결된 모든 미래/과거 예약이 함께 삭제됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <Alert>{error}</Alert>}

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={cancelMutation.isPending}>
              닫기
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? '취소 중...' : '취소하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationCancelDialog;



















