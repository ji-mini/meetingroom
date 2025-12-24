// 양력 공휴일 (월-일)
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '3.1절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
};

// 음력 공휴일 데이터 (2024~2026년 예시)
// 실제 서비스에서는 라이브러리나 API를 사용하는 것이 정확함
const LUNAR_HOLIDAYS: Record<string, { name: string; date: string }[]> = {
  '2024': [
    { name: '설날', date: '2024-02-09' },
    { name: '설날', date: '2024-02-10' },
    { name: '설날', date: '2024-02-11' },
    { name: '대체공휴일(설날)', date: '2024-02-12' },
    { name: '부처님오신날', date: '2024-05-15' },
    { name: '추석', date: '2024-09-16' },
    { name: '추석', date: '2024-09-17' },
    { name: '추석', date: '2024-09-18' },
  ],
  '2025': [
    { name: '설날', date: '2025-01-28' },
    { name: '설날', date: '2025-01-29' },
    { name: '설날', date: '2025-01-30' },
    { name: '부처님오신날', date: '2025-05-05' },
    { name: '대체공휴일(부처님오신날)', date: '2025-05-06' },
    { name: '추석', date: '2025-10-05' },
    { name: '추석', date: '2025-10-06' },
    { name: '추석', date: '2025-10-07' },
    { name: '대체공휴일(추석)', date: '2025-10-08' },
  ],
  '2026': [
    { name: '설날', date: '2026-02-16' },
    { name: '설날', date: '2026-02-17' },
    { name: '설날', date: '2026-02-18' },
    { name: '부처님오신날', date: '2026-05-24' },
    { name: '대체공휴일(부처님오신날)', date: '2026-05-25' },
    { name: '추석', date: '2026-09-24' },
    { name: '추석', date: '2026-09-25' },
    { name: '추석', date: '2026-09-26' },
  ]
};

export type Holiday = {
  date: Date;
  name: string;
  type: 'SOLAR' | 'LUNAR';
};

export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const yearStr = year.toString();

  // 양력 공휴일 추가
  Object.entries(SOLAR_HOLIDAYS).forEach(([dateStr, name]) => {
    holidays.push({
      date: new Date(`${year}-${dateStr}`),
      name,
      type: 'SOLAR',
    });
  });

  // 음력/대체 공휴일 추가
  if (LUNAR_HOLIDAYS[yearStr]) {
    LUNAR_HOLIDAYS[yearStr].forEach((h) => {
      holidays.push({
        date: new Date(h.date),
        name: h.name,
        type: 'LUNAR',
      });
    });
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const shortDateStr = `${month}-${day}`;

  // 양력 체크
  if (SOLAR_HOLIDAYS[shortDateStr]) return true;

  // 음력/대체 공휴일 체크
  const yearStr = year.toString();
  if (LUNAR_HOLIDAYS[yearStr]) {
    return LUNAR_HOLIDAYS[yearStr].some((h) => h.date === dateStr);
  }

  return false;
}

