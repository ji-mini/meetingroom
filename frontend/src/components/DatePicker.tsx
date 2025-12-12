import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { getHolidaysForYear } from '@/utils/koreanHolidays';

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
};

function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(true);

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
    <Popover open={open} onOpenChange={(isOpen) => setOpen(true)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'yyyy년 MM월 dd일') : <span>날짜 선택</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto scale-90 origin-top-left">
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
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;

