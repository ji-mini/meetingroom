/**
 * 날짜와 시간을 ISO 문자열로 변환 (선택한 시간 그대로 저장되도록)
 * @param date YYYY-MM-DD 형식
 * @param time HH:MM 형식
 * @returns ISO 문자열 (로컬 타임존 정보 포함, 예: "2025-12-05T08:00:00+09:00")
 * 
 * 선택한 날짜/시간을 그대로 데이터베이스에 저장하기 위해 로컬 타임존 정보를 포함합니다.
 */
export function combineDateTime(date: string, time: string): string {
  // 날짜와 시간을 파싱
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  // 로컬 타임존으로 Date 객체 생성
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  // 로컬 타임존 오프셋 계산 (분 단위)
  // getTimezoneOffset()은 UTC와의 차이를 분 단위로 반환
  // 한국(UTC+9)의 경우: -540분 (UTC보다 540분 앞서있음)
  const offsetMinutes = -localDate.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  
  // ISO 형식 문자열 생성 (로컬 시간 그대로, 타임존 정보 포함)
  const yearStr = String(year).padStart(4, '0');
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00${offsetStr}`;
}

/**
 * ISO 문자열에서 날짜 부분만 추출 (YYYY-MM-DD)
 */
export function extractDate(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * ISO 문자열에서 시간 부분만 추출 (HH:MM)
 * 타임존 변환 없이 DB에 저장된 시간 그대로 사용
 */
export function extractTime(isoString: string): string {
  // ISO 문자열에서 시간 부분 직접 추출
  // "2025-12-05T08:00:00" 또는 "2025-12-05 08:00:00" 형식
  const timePart = isoString.includes('T') 
    ? isoString.split('T')[1]?.split('+')[0]?.split('Z')[0]?.split('.')[0]
    : isoString.split(' ')[1]?.split('+')[0]?.split('Z')[0]?.split('.')[0];
  
  if (!timePart) {
    // 파싱 실패 시 기본 Date 객체 사용 (fallback)
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  const [hours, minutes] = timePart.split(':').map(Number);
  return `${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
}






