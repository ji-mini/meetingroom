/**
 * 한국 공휴일 유틸리티
 */

// 고정 공휴일 (매년 동일)
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '크리스마스' },
];

// 음력 기반 공휴일 (설날, 추석) - 2024-2026년
const LUNAR_HOLIDAYS: Record<number, Array<{ month: number; day: number; name: string }>> = {
  2024: [
    { month: 2, day: 9, name: '설날' },
    { month: 2, day: 10, name: '설날' },
    { month: 2, day: 11, name: '설날' },
    { month: 2, day: 12, name: '대체공휴일' }, // 설날 대체공휴일
    { month: 9, day: 16, name: '추석' },
    { month: 9, day: 17, name: '추석' },
    { month: 9, day: 18, name: '추석' },
  ],
  2025: [
    { month: 1, day: 28, name: '설날' },
    { month: 1, day: 29, name: '설날' },
    { month: 1, day: 30, name: '설날' },
    { month: 10, day: 5, name: '추석' },
    { month: 10, day: 6, name: '추석' },
    { month: 10, day: 7, name: '추석' },
    { month: 10, day: 8, name: '대체공휴일' }, // 추석 대체공휴일
  ],
  2026: [
    { month: 2, day: 16, name: '설날' },
    { month: 2, day: 17, name: '설날' },
    { month: 2, day: 18, name: '설날' },
    { month: 9, day: 24, name: '추석' },
    { month: 9, day: 25, name: '추석' },
    { month: 9, day: 26, name: '추석' },
  ],
};

/**
 * 특정 날짜가 공휴일인지 확인하고 공휴일 이름 반환
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth()는 0부터 시작
  const day = date.getDate();

  // 고정 공휴일 체크
  const fixedHoliday = FIXED_HOLIDAYS.find((h) => h.month === month && h.day === day);
  if (fixedHoliday) {
    return fixedHoliday.name;
  }

  // 음력 기반 공휴일 체크
  const lunarHolidays = LUNAR_HOLIDAYS[year];
  if (lunarHolidays) {
    const lunarHoliday = lunarHolidays.find((h) => h.month === month && h.day === day);
    if (lunarHoliday) {
      return lunarHoliday.name;
    }
  }

  return null;
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(date: Date): boolean {
  return getHolidayName(date) !== null;
}

/**
 * 공휴일 목록 반환 (특정 년도)
 */
export function getHolidaysForYear(year: number): Array<{ date: Date; name: string }> {
  const holidays: Array<{ date: Date; name: string }> = [];

  // 고정 공휴일
  FIXED_HOLIDAYS.forEach((holiday) => {
    holidays.push({
      date: new Date(year, holiday.month - 1, holiday.day),
      name: holiday.name,
    });
  });

  // 음력 기반 공휴일
  const lunarHolidays = LUNAR_HOLIDAYS[year];
  if (lunarHolidays) {
    lunarHolidays.forEach((holiday) => {
      holidays.push({
        date: new Date(year, holiday.month - 1, holiday.day),
        name: holiday.name,
      });
    });
  }

  return holidays;
}



















