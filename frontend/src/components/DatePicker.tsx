import { useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { getHolidaysForYear } from '@/utils/koreanHolidays';

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
};

function DatePicker({ value, onChange }: DatePickerProps) {
  // 공휴일 목록 생성 (현재 표시되는 달 기준)
  const holidayModifiers = useMemo(() => {
    const holidays: Date[] = [];
    const currentYear = new Date().getFullYear();
    
    // 최근 3년간의 공휴일 포함
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      const yearHolidays = getHolidaysForYear(year);
      holidays.push(...yearHolidays.map((h) => h.date));
    }
    
    return holidays;
  }, []);

  return (
    <div className="w-[280px] rounded-lg border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 pt-4">
        <CalendarIcon className="h-4 w-4 text-slate-500" />
        <div className="text-sm font-semibold text-slate-800">
          {format(value, 'yyyy년 MM월 dd일')}
        </div>
      </div>
      <Calendar
        mode="single"
        selected={value}
        onSelect={(date) => date && onChange(date)}
        initialFocus
        disabled={(date) => {
          // 토요일(6)과 일요일(0) 비활성화
          const day = date.getDay();
          return day === 0 || day === 6;
        }}
        modifiers={{
          holiday: holidayModifiers,
        }}
        modifiersClassNames={{
          holiday: 'text-red-600 font-semibold',
        }}
      />
    </div>
  );
}

export default DatePicker;

