import { useState } from 'react';
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

  const cancelMutation = useMutation({
    mutationFn: reservationApi.deleteReservation,
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
    cancelMutation.mutate(reservation.id);
  };

  const title = reservation?.title ?? '';
  const roomName = reservation?.room?.name ?? '알 수 없는 회의실';
  const timeRange =
    reservation &&
    `${format(new Date(reservation.startAt), 'yyyy-MM-dd HH:mm')} ~ ${format(
      new Date(reservation.endAt),
      'HH:mm'
    )}`;

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















