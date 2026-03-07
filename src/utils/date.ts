export function formatDate(
  date: Date | GoogleAppsScript.Base.Date,
  format: string,
): string {
  const map: { [key: string]: string } = {
    YYYY: date.getFullYear().toString(),
    YY: date.getFullYear().toString().slice(-2),
    MM: (date.getMonth() + 1).toString().padStart(2, "0"),
    DD: date.getDate().toString().padStart(2, "0"),
    HH: date.getHours().toString().padStart(2, "0"),
    mm: date.getMinutes().toString().padStart(2, "0"),
    ss: date.getSeconds().toString().padStart(2, "0"),
    W: "日月火水木金土".charAt(date.getDay()),
  };

  return format.replace(/YYYY|YY|MM|DD|HH|mm|ss|W/g, (matched) => map[matched]);
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
