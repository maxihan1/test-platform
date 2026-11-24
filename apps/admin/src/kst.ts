// 사람 눈에 보이는 시각을 한국 시간(Asia/Seoul)으로 적는 공용 함수 — 저장값(UTC)은 그대로 두고 보일 때만 바꾼다

/** 서버가 어느 시간대에 떠 있든 한국 시각으로 적는다. sv-SE 가 `YYYY-MM-DD HH:mm:ss` 모양을 준다. 영상 안 자리처럼 초가 필요한 곳에 쓴다 */
export function 한국시각초(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
}

/** 분까지만 적는다 — `2026-11-24 14:00` */
export function 한국시각(iso: string): string {
  return 한국시각초(iso).slice(0, 16);
}
