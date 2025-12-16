/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ISO 문자열에서 시간만 추출 (HH:MM 형식)
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 두 시간을 포맷팅 (예: "10:00~11:00")
 */
export function formatTimeRange(startAt: string, endAt: string): string {
  return `${formatTime(startAt)}~${formatTime(endAt)}`;
}



















