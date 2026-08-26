export function civilDate(instant: Date, timeZone: string): string {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
  
    const g = (t: string) => p.find((x) => x.type === t)!.value;
  
    return `${g("year")}-${g("month")}-${g("day")}`;
  }
  
  export const todayInZone = (timeZone: string) =>
    civilDate(new Date(), timeZone);
  
  export const asUTC = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  
  export function shiftDate(iso: string, days: number): string {
    const dt = new Date(asUTC(iso) + days * 86_400_000);
  
    return `${dt.getUTCFullYear()}-${String(
      dt.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }
  
  export const dayDiff = (a: string, b: string) =>
    Math.round((asUTC(a) - asUTC(b)) / 86_400_000);
  
  export const pretty = (iso: string) =>
    new Date(asUTC(iso)).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });