// 화면에 보이는 시각의 시간대 — 어디서 열어도 한국 시간으로 고정한다 (저장 · API 값은 UTC 그대로)

export const 서울 = 'Asia/Seoul';

/** 한국 날짜 `2026-11-24` — UTC 자정 근처 시각이 하루 어긋나지 않게 Intl 로 읽는다 */
export const 서울날 = (때: string | number | Date): string => new Intl.DateTimeFormat('sv-SE', { timeZone: 서울 }).format(new Date(때));

/** 한국 시각 `2026-11-24 14:00` */
export const 서울시각 = (때: string | number | Date): string => new Date(때).toLocaleString('sv-SE', { timeZone: 서울 }).slice(0, 16);
