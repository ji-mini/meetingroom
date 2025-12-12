import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { roomApi } from '@/api/room.api';
import type { MeetingRoom } from '@/types';

type RoomDeleteDialogProps = {
  open: boolean;
  room: MeetingRoom | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function RoomDeleteDialog({ open, room, onOpenChange, onSuccess }: RoomDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const closeMutation = useMutation({
    mutationFn: roomApi.closeRoom,
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      console.error('회의실 비활성화 실패', err);
      setError(err.response?.data?.message || '회의실 비활성화 중 오류가 발생했습니다.');
    },
  });

  const handleClose = () => {
    if (!room) return;
    setError(null);
    closeMutation.mutate(room.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회의실을 비활성화하시겠습니까?</DialogTitle>
          <DialogDescription>
            이 회의실을 비활성화하면 더 이상 예약할 수 없게 됩니다. 기존 예약은 유지됩니다.
          </DialogDescription>
        </DialogHeader>

        {room && (
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm space-y-1.5">
            <p>
              <span className="font-medium text-slate-700">회의실: </span>
              {room.name}
            </p>
            <p>
              <span className="font-medium text-slate-700">위치/최대 참석: </span>
              {room.building} {room.floor} · 최대 {room.capacity}명
            </p>
          </div>
        )}

        {error && <Alert>{error}</Alert>}

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={closeMutation.isPending}>
              취소
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={closeMutation.isPending}
          >
            {closeMutation.isPending ? '비활성화 중...' : '비활성화하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoomDeleteDialog;



