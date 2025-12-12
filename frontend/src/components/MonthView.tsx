import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  isWeekend
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '@/api/reservation.api';
import type { MeetingRoom, Reservation } from '@/types';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import DayDetailPanel from './DayDetailPanel';

interface MonthViewProps {
  rooms: MeetingRoom[];
  onAddReservation: (date: Date, roomId: string) => void;
}

export default function MonthView({ rooms, onAddReservation }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // 초기값은 첫 번째 회의실 또는 빈 문자열
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // 선택된 회의실이 없으면 첫 번째 회의실로 설정 (rooms가 로드된 후)
  useMemo(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // 달력 그리드 날짜 생성
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // 예약 데이터 조회 (월간 범위)
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', selectedRoomId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDateStr = format(startOfWeek(monthStart), 'yyyy-MM-dd');
      const endDateStr = format(endOfWeek(monthEnd), 'yyyy-MM-dd');

      return reservationApi.getReservations({
        roomId: selectedRoomId,
        startDate: startDateStr,
        endDate: endDateStr
      });
    },
    enabled: !!selectedRoomId,
  });

  // 날짜별 예약 필터링
  const getReservationsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(r => r.startAt.startsWith(dateStr));
  };

  // 시간 파싱 (HH:mm)
  const formatTime = (iso: string) => {
    const timeMatch = iso.match(/[T\s](\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    return '';
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayClick = (day: Date) => {
    // 주말 클릭 방지 (요구사항: 토,일 제외)
    if (isWeekend(day)) return;
    setSelectedDay(day);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap">회의실 선택</span>
          <div className="relative w-full sm:w-[200px]">
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-slate-800 min-w-[140px] text-center">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div 
                key={day} 
                className={`py-3 text-center text-sm font-semibold ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isWeekEnd = isWeekend(day);
              const dayReservations = getReservationsForDay(day);
              
              // 최대 3개까지만 표시
              const displayReservations = dayReservations.slice(0, 3);
              const remainingCount = Math.max(0, dayReservations.length - 3);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[120px] bg-white p-2 flex flex-col gap-1 transition-colors
                    ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''}
                    ${!isWeekEnd ? 'hover:bg-indigo-50/30 cursor-pointer' : 'cursor-default'}
                    ${isTodayDate ? 'bg-indigo-50/20' : ''}
                  `}
                >
                  {/* 날짜 표시 */}
                  <div className="flex justify-between items-start">
                    <span 
                      className={`
                        text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${isTodayDate ? 'bg-indigo-600 text-white' : ''}
                        ${!isTodayDate && isWeekEnd && (day.getDay() === 0 ? 'text-red-500' : 'text-blue-500')}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* 예약 목록 (간략 보기) */}
                  <div className="flex-1 flex flex-col gap-1 mt-1">
                    {!isWeekEnd && displayReservations.map(res => (
                      <div 
                        key={res.id} 
                        className="text-[10px] sm:text-xs truncate bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border-l-2 border-indigo-400"
                        title={`${formatTime(res.startAt)} ${res.title}`}
                      >
                        <span className="font-bold mr-1">{formatTime(res.startAt)}</span>
                        {res.title}
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <div className="text-[10px] text-slate-400 pl-1">
                        + {remainingCount}개 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <DayDetailPanel
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        date={selectedDay}
        room={selectedRoom}
        reservations={selectedDay ? getReservationsForDay(selectedDay) : []}
        onAddReservation={(date) => {
          if (selectedRoomId) {
            onAddReservation(date, selectedRoomId);
            setSelectedDay(null); // 패널 닫고 예약 모달 열기 위해
          }
        }}
      />
    </div>
  );
}

