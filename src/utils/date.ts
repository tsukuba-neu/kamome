const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 日付を "M/D(曜日)" 形式にフォーマット
 */
export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

/**
 * 時刻を "HH:MM" 形式にフォーマット
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * 指定日の開始時刻（00:00:00.000）を取得
 */
export function getDayStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 指定日の終了時刻（23:59:59.999）を取得
 */
export function getDayEnd(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
