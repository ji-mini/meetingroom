import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import type { Reservation, MeResponse } from '@/types';

type ReservationDetailDialogProps = {
  open: boolean;
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
  isLoggedIn?: boolean;
  currentUser?: MeResponse | null;
  onRequestCancel?: (reservation: Reservation) => void;
};

/**
 * 예약 상세 정보 모달 컴포넌트
 */
function ReservationDetailDialog({
  open,
  reservation,
  onOpenChange,
  isLoggedIn = false,
  currentUser,
  onRequestCancel,
}: ReservationDetailDialogProps) {
  if (!reservation) {
    return null;
  }

  const startDate = new Date(reservation.startAt);
  const endDate = new Date(reservation.endAt);
  const timeRange = `${format(startDate, 'HH:mm')} ~ ${format(endDate, 'HH:mm')}`;
  const dateStr = format(startDate, 'yyyy년 MM월 dd일');

  // 본인 예약 여부 확인 (user.employeeId와 현재 사용자 employeeId 비교)
  const isMyReservation = currentUser && reservation.user?.employeeId === currentUser.employeeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>예약 상세 정보</DialogTitle>
          <DialogDescription>예약 정보를 확인하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">예약 제목</p>
            <p className="text-base font-semibold text-slate-900">{reservation.title}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">회의실</p>
            <p className="text-base text-slate-900">
              {reservation.room?.name || '알 수 없는 회의실'}
            </p>
            {reservation.room && (
              <p className="text-sm text-muted-foreground">
                위치: {reservation.room.building} {reservation.room.floor} · 최대 {reservation.room.capacity}명
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">예약 일시</p>
            <p className="text-base text-slate-900">{dateStr}</p>
            <p className="text-base text-slate-900">{timeRange}</p>
          </div>

          {reservation.user && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">신청자</p>
              <p className="text-base text-slate-900">{reservation.user.name}</p>
              {reservation.user.email && (
                <p className="text-sm text-muted-foreground">이메일: {reservation.user.email}</p>
              )}
            </div>
          )}

          {isLoggedIn && isMyReservation && onRequestCancel && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="destructive"
                onClick={() => {
                  if (reservation) {
                    onRequestCancel(reservation);
                    onOpenChange(false);
                  }
                }}
              >
                예약 취소
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationDetailDialog;

