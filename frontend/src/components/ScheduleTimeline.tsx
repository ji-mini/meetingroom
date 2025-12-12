import { format, differenceInMinutes } from 'date-fns';
import { Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { isHoliday } from '@/utils/koreanHolidays';
import type { MeetingRoom, Reservation } from '@/types';

type ScheduleTimelineProps = {
  rooms: MeetingRoom[];
  reservations: Reservation[];
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  timelineStartHour?: number;
  timelineEndHour?: number;
  selectedDate?: Date; // 선택된 날짜 추가
  onRequestCancelReservation?: (reservation: Reservation) => void;
  onRequestDeleteRoom?: (room: MeetingRoom) => void;
  onRequestAddReservation?: (roomId: string) => void;
  onRequestViewReservation?: (reservation: Reservation) => void;
};

const DEFAULT_START = 8;
const DEFAULT_END = 18;

function ScheduleTimeline({
  rooms,
  reservations,
  isAdmin = false,
  isLoggedIn = false,
  timelineStartHour = DEFAULT_START,
  timelineEndHour = DEFAULT_END,
  selectedDate,
  onRequestCancelReservation,
  onRequestDeleteRoom,
  onRequestAddReservation,
  onRequestViewReservation,
}: ScheduleTimelineProps) {
  const totalMinutes = (timelineEndHour - timelineStartHour) * 60;
  
  // 공휴일 체크
  const isHolidayDate = selectedDate ? isHoliday(selectedDate) : false;

  // 시작 시간만 표시 (08:00부터 19:00까지, 20:00은 제외)
  const hours = Array.from(
    { length: timelineEndHour - timelineStartHour },
    (_, idx) => timelineStartHour + idx
  );

  const reservationsByRoom = reservations.reduce<Record<string, Reservation[]>>((acc, reservation) => {
    if (!acc[reservation.roomId]) {
      acc[reservation.roomId] = [];
    }
    acc[reservation.roomId].push(reservation);
    return acc;
  }, {});

  /**
   * ISO 문자열에서 시간을 직접 추출 (타임존 변환 없이)
   * DB에 저장된 시간 그대로 사용: "2025-12-05T08:00:00" 또는 "2025-12-05 08:00:00"
   */
  const parseTimeFromISO = (iso: string): { hours: number; minutes: number } => {
    if (!iso) return { hours: 0, minutes: 0 };

    // T 또는 공백 뒤에 오는 HH:mm 패턴 찾기 (예: "2025-12-12 17:00:00")
    const timeMatch = iso.match(/[T\s](\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      return {
        hours: parseInt(timeMatch[1], 10),
        minutes: parseInt(timeMatch[2], 10)
      };
    }
    
    // 문자열 시작이 HH:mm 인 경우
    const startMatch = iso.match(/^(\d{1,2}):(\d{1,2})/);
    if (startMatch) {
        return {
            hours: parseInt(startMatch[1], 10),
            minutes: parseInt(startMatch[2], 10)
        };
    }

    // 파싱 실패 시 Date 객체 사용 (브라우저 로컬 타임존 따름)
    const date = new Date(iso);
    if (!isNaN(date.getTime())) {
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }
    
    return { hours: 0, minutes: 0 };
  };

  const getOffsetPercent = (iso: string) => {
    const { hours, minutes } = parseTimeFromISO(iso);
    const totalMins = (hours - timelineStartHour) * 60 + minutes;
    const clamped = Math.max(0, Math.min(totalMinutes, totalMins));
    return (clamped / totalMinutes) * 100;
  };

  const getWidthPercent = (startIso: string, endIso: string) => {
    const start = parseTimeFromISO(startIso);
    const end = parseTimeFromISO(endIso);
    
    // 시작 시간과 종료 시간의 차이 계산 (분 단위)
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    const diff = Math.max(30, endMinutes - startMinutes); // 최소 30분 표시
    
    const widthPercent = (diff / totalMinutes) * 100;
    const offsetPercent = getOffsetPercent(startIso);
    return Math.min(100 - offsetPercent, widthPercent);
  };

  const formatTimeRange = (start: string, end: string) => {
    const startTime = parseTimeFromISO(start);
    const endTime = parseTimeFromISO(end);
    return `${String(startTime.hours).padStart(2, '0')}:${String(startTime.minutes).padStart(2, '0')} ~ ${String(endTime.hours).padStart(2, '0')}:${String(endTime.minutes).padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white/80 backdrop-blur shadow-xl border border-purple-100">
      <CardHeader>
        <CardTitle className="text-2xl">회의실 예약 타임라인</CardTitle>
        <CardDescription>회의실별 예약 현황을 한눈에 확인하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Header */}
        <div className="pl-44 pr-6">
          <div className="relative border-b border-dashed border-slate-200">
            <div className="relative" style={{ width: '100%' }}>
              {hours.map((hour, idx) => {
                // 구분선과 정확히 같은 계산 방식 사용
                const percent = ((hour - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100;
                // 8:00은 그대로 두고, 나머지는 각각 0.1%씩 간격 증가
                // 전체를 왼쪽으로 0.1% 이동 (0.05 + 0.05)
                const adjustedPercent = idx === 0 
                  ? percent + 0.2  // 8:00은 기본 이동만 (0.3 - 0.1)
                  : percent + 0.2 + (idx * 0.1); // 나머지는 0.1%씩 추가 이동 (0.3 - 0.1)
                return (
                  <div
                    key={hour}
                    className="absolute text-sm font-medium text-muted-foreground whitespace-nowrap"
                    style={{
                      left: `${adjustedPercent}%`,
                    }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-4">
          {rooms.map((room) => {
            const roomReservations = reservationsByRoom[room.id] ?? [];
            return (
              <div key={room.id} className="flex items-center gap-4">
                <div className="w-44 shrink-0">
                  <div className="flex items-start gap-2">
                    <div className="flex gap-1 items-start">
                      {isLoggedIn && isAdmin && onRequestDeleteRoom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-destructive shrink-0"
                          onClick={() => onRequestDeleteRoom(room)}
                          title="회의실 비활성화"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">회의실 비활성화</span>
                        </Button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900">{room.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {room.building} {room.floor} · 최대 {room.capacity}명
                        </p>
                      </div>
                    </div>
                    {isLoggedIn && onRequestAddReservation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-primary shrink-0"
                        onClick={() => onRequestAddReservation(room.id)}
                        title="예약 추가"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">예약 추가</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative h-16 rounded-lg border border-slate-100 overflow-hidden">
                    {isHolidayDate ? (
                      // 공휴일인 경우 타임라인 대신 메시지 표시
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm font-medium text-slate-600">공휴일 예약 불가</p>
                      </div>
                    ) : (
                      <>
                        {/* 시간대별 배경 색상 (교대로 표시) */}
                        <div className="absolute inset-0">
                          {hours.map((hour, idx) => {
                            const percent = ((hour - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100;
                            const nextPercent = idx < hours.length - 1 
                              ? ((hour + 1 - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100
                              : 100;
                            const width = nextPercent - percent;
                            // 시간대별로 교대로 색상 변경 (더 명확한 구분)
                            const bgColor = idx % 2 === 0 
                              ? 'bg-blue-50/30' 
                              : 'bg-slate-50/50';
                            return (
                              <div
                                key={hour}
                                className={`absolute top-0 bottom-0 ${bgColor}`}
                                style={{
                                  left: `${percent}%`,
                                  width: `${width}%`,
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* 점심시간 구간 표시 (11:30 ~ 12:30) */}
                        <div className="absolute inset-0">
                          <div
                            className="absolute top-0 bottom-0 bg-slate-200/40"
                            style={{
                              left: `${((11.5 - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100}%`,
                              width: `${((12.5 - 11.5) / (timelineEndHour - timelineStartHour)) * 100}%`,
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-700 bg-slate-300/80 px-2 py-0.5 rounded">
                                점심시간
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* 시간별 구분선 - 시간 표시와 정확히 일치 */}
                        <div className="absolute inset-0">
                          {hours.map((hour) => {
                            const percent = ((hour - timelineStartHour) / (timelineEndHour - timelineStartHour)) * 100;
                            // 첫 번째 시간(08:00)은 구분선 없음
                            if (hour === timelineStartHour) return null;
                            return (
                              <div
                                key={hour}
                                className="absolute top-0 bottom-0 border-l border-dashed border-slate-200"
                                style={{
                                  left: `${percent}%`,
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* reservations */}
                        {roomReservations.length > 0 && (
                          roomReservations.map((reservation) => (
                            <div
                              key={reservation.id}
                              className="absolute top-2 bottom-2 rounded-md bg-indigo-500/90 text-white text-sm px-3 py-2 shadow-md flex items-center group cursor-pointer hover:bg-indigo-600/90 transition-colors"
                              style={{
                                left: `${getOffsetPercent(reservation.startAt)}%`,
                                width: `${getWidthPercent(reservation.startAt, reservation.endAt)}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRequestViewReservation) {
                                  onRequestViewReservation(reservation);
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {reservation.user?.name || '예약자 없음'}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ScheduleTimeline;

