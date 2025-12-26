import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Alert } from './ui/alert';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reservationApi } from '@/api/reservation.api';
import { combineDateTime } from '@/utils/datetime';
import { getHolidaysForYear, isHoliday } from '@/utils/koreanHolidays';
import type { MeetingRoom } from '@/types';

type ReservationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName?: string;
  rooms: MeetingRoom[];
  selectedDate: string;
  onSuccess?: () => void;
};

/**
 * 예약 생성 모달 컴포넌트
 */
function ReservationModal({
  open,
  onOpenChange,
  roomId: initialRoomId,
  roomName,
  rooms,
  selectedDate,
  onSuccess,
}: ReservationModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    roomId: initialRoomId,
    title: '',
    startDate: selectedDate,
    startTime: '08:00',
    endDate: selectedDate,
    endTime: '08:30',
    isRecurring: false,
    recurringEndDate: selectedDate,
    skipConflicts: false,
    repeatType: 'DAILY' as 'DAILY' | 'WEEKLY',
  });
  const [error, setError] = useState<string>('');
  const [conflicts, setConflicts] = useState<Array<{ date: string; reason: string }>>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [recurringEndDatePickerOpen, setRecurringEndDatePickerOpen] = useState(false);

  // 모달이 열릴 때 초기값 설정
  useEffect(() => {
    if (open) {
      setFormData({
        roomId: initialRoomId,
        title: '',
        startDate: selectedDate,
        startTime: '08:00',
        endDate: selectedDate,
        endTime: '08:30',
        isRecurring: false,
        recurringEndDate: selectedDate,
        skipConflicts: false,
        repeatType: 'DAILY',
      });
      setError('');
      setConflicts([]);
      setDatePickerOpen(false);
      setRecurringEndDatePickerOpen(false);
    }
  }, [open, initialRoomId, selectedDate]);

  // 예약 생성 mutation
  const createMutation = useMutation({
    mutationFn: reservationApi.createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations', selectedDate] });
      onOpenChange(false);
      // 부모 컴포넌트의 onSuccess 콜백 호출 (예약 목록 새로고침)
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: AxiosError<{ message?: string; conflicts?: any[]; code?: string }>) => {
      const responseData = err.response?.data;
      if (err.response?.status === 409) {
        if (responseData?.code === 'CONFLICT_RECURRING' && responseData.conflicts) {
          setConflicts(responseData.conflicts);
          setError('일부 날짜에 예약 충돌이 있습니다. 아래에서 확인해주세요.');
        } else {
          setError('해당 시간대에 이미 예약이 있습니다.');
        }
      } else {
        setError(responseData?.message || '예약 생성 중 오류가 발생했습니다.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (conflicts.length > 0 && !formData.skipConflicts) {
      // 충돌이 있는데 skipConflicts가 false이면 사용자가 아직 결정을 안 한 상태 (또는 UI가 꼬임)
      // 여기서는 그냥 리턴하거나 경고
      return;
    }
    submitReservation(formData.skipConflicts);
  };

  const submitReservation = (skipConflicts: boolean = false) => {
    setError('');
    setConflicts([]); // 재시도 시 초기화

    const startAt = combineDateTime(formData.startDate, formData.startTime);
    const endAt = combineDateTime(formData.endDate, formData.endTime);

    if (new Date(startAt) >= new Date(endAt)) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    // 점심시간(11:30 ~ 12:30) 체크
    const start = new Date(startAt);
    const end = new Date(endAt);
    const lunchStart = new Date(start);
    lunchStart.setHours(11, 30, 0, 0);
    const lunchEnd = new Date(start);
    lunchEnd.setHours(12, 30, 0, 0);
    
    if (start < lunchEnd && end > lunchStart) {
      setError('점심시간(11:30 ~ 12:30)에는 예약할 수 없습니다.');
      return;
    }

    const payload: any = {
      roomId: formData.roomId,
      userId: '', // 서버에서 req.user에서 자동 설정
      title: formData.title,
      startAt,
      endAt,
    };

    if (formData.isRecurring) {
      payload.recurring = {
        endDate: formData.recurringEndDate,
        repeatType: formData.repeatType,
        skipConflicts,
      };
    }

    createMutation.mutate(payload);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // 날짜 선택 시 토요일, 일요일, 공휴일 체크
    if (name === 'startDate') {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay(); // 0: 일요일, 6: 토요일
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setError('토요일과 일요일에는 예약할 수 없습니다.');
        return;
      }
      
      if (isHoliday(selectedDate)) {
        setError('공휴일에는 예약할 수 없습니다.');
        return;
      }
    }
    
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      // 시작 날짜가 변경되면 종료 날짜도 동일하게 설정 (정기예약 종료일 포함)
      if (name === 'startDate') {
        newData.endDate = value;
        if (!newData.isRecurring) {
            newData.recurringEndDate = value;
        }
      }
      return newData;
    });
    setError('');
  };

  // 30분 단위 시간 옵션 생성 (08:00 ~ 18:00, 점심시간 제외)
  // 점심시간: 11:30 ~ 12:30
  // 11:00-11:30 예약 가능, 11:30-12:30 예약 불가, 13:00 이후 예약 가능
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 18; hour++) {
      if (hour === 11) {
        // 11:00만 포함 (11:30은 점심시간 시작이므로 제외)
        options.push('11:00');
      } else if (hour === 12) {
        // 12:00, 12:30은 점심시간이므로 제외
        // 13:00부터 다시 시작
      } else {
        options.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 18) {
          // 18:00은 마지막이므로 18:30은 없음
          options.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    return options;
  };

  const allTimeOptions = generateTimeOptions();

  // 종료 시간 옵션: 시작 시간 이후의 시간만 표시 (점심시간 제외)
  const getEndTimeOptions = () => {
    if (!formData.startTime) {
      return allTimeOptions;
    }
    
    // 시작 시간을 분 단위로 변환
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    
    // 점심시간: 11:30 ~ 12:30 (690분 ~ 750분)
    const lunchStartMinutes = 11 * 60 + 30; // 11:30
    const lunchEndMinutes = 12 * 60 + 30;   // 12:30
    
    // 종료 시간 옵션 생성 (11:30 포함)
    const endOptions = [...allTimeOptions];
    
    // 시작 시간이 11:00인 경우 11:30을 종료 시간 옵션에 추가
    if (startMinutes === 11 * 60) {
      if (!endOptions.includes('11:30')) {
        endOptions.push('11:30');
        endOptions.sort((a, b) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });
      }
    }
    
    // 시작 시간 이후의 옵션만 필터링
    return endOptions.filter((time) => {
      const [hour, minute] = time.split(':').map(Number);
      const timeMinutes = hour * 60 + minute;
      
      // 시작 시간 이후여야 함
      if (timeMinutes <= startMinutes) {
        return false;
      }
      
      // 점심시간 체크
      // 시작 시간이 점심시간 이전(11:30 이전)인 경우
      if (startMinutes < lunchStartMinutes) {
        // 종료 시간이 점심시간 시작(11:30) 이후면 불가
        // 단, 종료가 정확히 11:30이면 가능 (11:00-11:30 예약)
        if (timeMinutes > lunchStartMinutes) {
          return false;
        }
      } 
      // 시작 시간이 점심시간 구간 내(11:30 ~ 12:30)면 불가
      else if (startMinutes >= lunchStartMinutes && startMinutes < lunchEndMinutes) {
        return false;
      }
      // 시작 시간이 점심시간 이후(12:30 이후)면 정상적으로 선택 가능
      
      return true;
    });
  };

  const endTimeOptions = getEndTimeOptions();

  // 시작 시간이 변경되면 종료 시간도 조정
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const [startHour, startMinute] = formData.startTime.split(':').map(Number);
      const [endHour, endMinute] = formData.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // 종료 시간이 시작 시간 이하이면, 시작 시간 + 30분으로 설정
      if (endMinutes <= startMinutes) {
        const nextTimeMinutes = startMinutes + 30;
        const nextHour = Math.floor(nextTimeMinutes / 60);
        const nextMinute = nextTimeMinutes % 60;
        const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
        
        // 다음 시간이 18:00 이하인 경우에만 설정
        if (nextTimeMinutes <= 18 * 60) {
          setFormData((prev) => ({ ...prev, endTime: nextTime }));
        } else {
          // 18:00을 초과하면 18:00으로 설정
          setFormData((prev) => ({ ...prev, endTime: '18:00' }));
        }
      }
    }
  }, [formData.startTime]);

  const activeRooms = rooms.filter((room) => room.status === 'ACTIVE');

  // 공휴일 정보 계산 (Memoization)
  const holidayModifiers = useMemo(() => {
    const holidays: Date[] = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      const yearHolidays = getHolidaysForYear(year);
      holidays.push(...yearHolidays.map((h) => h.date));
    }
    return { holiday: holidays };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>예약 추가</DialogTitle>
          <DialogDescription>
            {roomName ? `${roomName} 예약을 생성합니다.` : '회의실과 시간을 선택해주세요.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">회의실 *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) =>
                  handleChange({
                    target: { name: 'roomId', value },
                  } as any)
                }
                required
              >
                <SelectTrigger id="roomId">
                  <SelectValue placeholder="회의실을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {activeRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} · {room.building} {room.floor} · 최대 {room.capacity}명
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">예약 제목 *</Label>
              <Input
                id="title"
                name="title"
                placeholder="예: 주간 스탠드업"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">예약 날짜 *</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? (
                      format(new Date(formData.startDate), 'yyyy년 MM월 dd일')
                    ) : (
                      <span>날짜 선택</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate ? new Date(formData.startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateString = format(date, 'yyyy-MM-dd');
                        setFormData((prev) => ({
                          ...prev,
                          startDate: dateString,
                          endDate: dateString,
                        }));
                        setError('');
                        setDatePickerOpen(false); // 날짜 선택 시 달력 닫기
                      }
                    }}
                    initialFocus
                    disabled={(date) => {
                      // 토요일(6)과 일요일(0) 비활성화
                      const day = date.getDay();
                      if (day === 0 || day === 6) {
                        return true;
                      }
                        // 공휴일 비활성화
                      return isHoliday(date);
                    }}
                    modifiers={holidayModifiers}
                    modifiersClassNames={{
                      holiday: 'text-red-600 font-semibold',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">시작 시간 *</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: 'startTime', value },
                    } as any)
                  }
                  required
                >
                  <SelectTrigger id="startTime">
                    <SelectValue placeholder="시작 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTimeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">종료 시간 *</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: 'endTime', value },
                    } as any)
                  }
                  required
                  disabled={!formData.startTime}
                >
                  <SelectTrigger id="endTime">
                    <SelectValue placeholder="종료 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {endTimeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => {
                    setFormData(prev => ({
                        ...prev, 
                        isRecurring: checked,
                        // 켜질 때 반복 종료일을 시작일로 초기화 (또는 +1주 등으로 설정 가능)
                        recurringEndDate: checked ? prev.startDate : prev.startDate 
                    }));
                    setConflicts([]);
                    setError('');
                }}
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">정기예약 (반복)</Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-md border border-slate-100">
                <div className="space-y-2">
                  <Label>반복 유형</Label>
                  <Select
                    value={formData.repeatType}
                    onValueChange={(value: 'DAILY' | 'WEEKLY') =>
                      setFormData((prev) => ({ ...prev, repeatType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">매일 (주말 제외)</SelectItem>
                      <SelectItem value="WEEKLY">매주 (같은 요일)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurringEndDate">반복 종료 날짜 *</Label>
                  <Popover open={recurringEndDatePickerOpen} onOpenChange={setRecurringEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.recurringEndDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurringEndDate ? (
                          format(new Date(formData.recurringEndDate), 'yyyy년 MM월 dd일')
                        ) : (
                          <span>날짜 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.recurringEndDate ? new Date(formData.recurringEndDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dateString = format(date, 'yyyy-MM-dd');
                            setFormData((prev) => ({
                              ...prev,
                              recurringEndDate: dateString,
                            }));
                            setRecurringEndDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                        disabled={(date) => {
                          // 시작일 이전 날짜 선택 불가
                          const startDate = new Date(formData.startDate);
                          startDate.setHours(0, 0, 0, 0);
                          if (date < startDate) return true;

                          // 주말 및 공휴일 (선택은 가능하게 하되 안내 문구로 처리? 아니면 막기?)
                          // 요구사항: "정기예약 후보 날짜를 만들 때부터 토/일 및 공휴일은 제외한다."
                          // 여기서 선택 자체를 막을 필요는 없지만, 막아두면 더 명확함.
                          const day = date.getDay();
                          if (day === 0 || day === 6) return true;
                          return isHoliday(date);
                        }}
                        modifiers={holidayModifiers}
                        modifiersClassNames={{
                          holiday: 'text-red-600 font-semibold',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    * 주말(토/일)과 공휴일은 자동으로 제외됩니다.<br/>
                    * {formData.repeatType === 'DAILY' ? '최대 8주' : '최대 4주'} 또는 20회까지만 생성됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          {/* 충돌 해결 UI */}
          {conflicts.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3">
              <div className="font-semibold">다음 날짜에 이미 예약이 있어 생성할 수 없습니다:</div>
              <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                {conflicts.map((c, idx) => (
                  <li key={idx}>
                    {c.date} ({c.reason})
                  </li>
                ))}
              </ul>
              <div className="pt-2 font-medium">어떻게 하시겠습니까?</div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    setConflicts([]);
                    setError('');
                  }}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-900"
                >
                  전체 취소
                </Button>
                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => submitReservation(true)}
                  className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                >
                  겹치는 날짜 건너뛰고 예약
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={createMutation.isPending}>
                취소
              </Button>
            </DialogClose>
            {conflicts.length === 0 && (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReservationModal;

