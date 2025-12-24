import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { Reservation, MeetingRoom } from '@/types';

interface DayDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  room?: MeetingRoom;
  reservations: Reservation[];
  onAddReservation?: (date: Date) => void;
}

export default function DayDetailPanel({
  isOpen,
  onClose,
  date,
  room,
  reservations,
  onAddReservation,
}: DayDetailPanelProps) {
  // ISO 시간 문자열 파싱 (타임존 문제 해결을 위해 단순 파싱)
  const parseTimeFromISO = (iso: string) => {
    if (!iso) return '';
    // "2025-12-03T10:00:00" -> "10:00"
    const timeMatch = iso.match(/[T\s](\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
    }
    const d = new Date(iso);
    return format(d, 'HH:mm');
  };

  const sortedReservations = [...reservations].sort((a, b) => {
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-100 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-sm font-bold tracking-wide uppercase">Daily Schedule</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {date ? format(date, 'M월 d일 (EEE)', { locale: ko }) : ''}
              </h2>
              {room && (
                <p className="text-slate-500 mt-1">
                  {room.name} ({room.building} {room.floor})
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-200 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {sortedReservations.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p>예약된 일정이 없습니다.</p>
              </div>
            ) : (
              sortedReservations.map((reservation) => (
                <Card key={reservation.id} className="p-4 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 truncate pr-2">{reservation.title}</h3>
                  </div>
                  <div className="flex items-center text-sm text-slate-600 mb-2">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                    <span className="font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      {parseTimeFromISO(reservation.startAt)} ~ {parseTimeFromISO(reservation.endAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-slate-100">
                    <span className="text-slate-500">예약자: <span className="font-medium text-slate-700">{reservation.user?.name || '알 수 없음'}</span></span>
                    <span className="text-slate-400">{reservation.user?.departmentName || ''}</span>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-white">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" 
              size="lg"
              onClick={() => date && onAddReservation?.(date)}
            >
              이 날짜에 예약하기
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

