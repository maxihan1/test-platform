// 비밀 머리 이름 · 값 꼴 검사 — apiService 와 prep 이 같이 쓴다. store 를 안 읽는 잎 파일이라야 envs → prep 순환이 안 생긴다 (2026-11-11 배포 사고)

/** 어드민 키 값 꼴 — 화면 SettingsAdminKey.tsx 의 `어드민키값인가` 와 같은 규칙이다. 준비 주소의 비밀 헤더 값도 이 규칙이다(prep.ts) */
export const 어드민키값인가 = (값: string): boolean => 값.length >= 12 && 값.length <= 500 && /^[\x21-\x7e]+(?: [\x21-\x7e]{12,})?$/.test(값);

/** 머리 이름 꼴 — HTTP 토큰 글자만. 앞뒤 공백은 뗀 뒤에 본다 */
export const 머리이름인가 = (이름: string): boolean => /^[A-Za-z0-9-]{1,100}$/.test(이름);
