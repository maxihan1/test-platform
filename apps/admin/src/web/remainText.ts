// 실행 · 작성이 언제 끝날지를 사람 말로 옮기는 순수 함수와 시간 글자 (SPEC §8.9 · 도메인/작성 §7)

import { t, type 언어 } from './i18n.js';

/**
 * 밀리초를 사람이 읽는 글자로.
 *
 * `ui.tsx` 의 `seconds()` 를 쓰지 않는다 — 소수 둘째 자리까지 적고 분으로 올리지 않아
 * 제한 5분이 「300.00초」로 나온다. 2초마다 바뀌는 자리라 소수점도 읽기를 방해한다.
 */
export function 시간글자(ms: number, 언어: 언어): string {
  const 초 = Math.round(ms / 1000);
  if (초 < 60) return t('{초}초', 언어, { 초 });
  const 남은초 = 초 % 60;
  return 남은초 === 0
    ? t('{분}분', 언어, { 분: 초 / 60 })
    : t('{분}분 {초}초', 언어, { 분: Math.floor(초 / 60), 초: 남은초 });
}

/** 시각(HH:MM). 형식을 손으로 짜지 않고 언어 관례를 따른다 */
export function 시각글자(d: Date, 언어: 언어): string {
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

const 분 = 60_000;

/** 남은 시간은 초까지 적으면 2초마다 흔들려서 분으로 올려 적는다 */
function 분올림글자(ms: number, 언어: 언어): string {
  return 시간글자(Math.max(1, Math.ceil(ms / 분)) * 분, 언어);
}

/** 실행의 남은 시간 글. `null` 은 서버가 아직 잴 만큼 끝난 항목이 없다는 뜻이다 */
export function 실행남은글(남은ms: number | null, 지금: number, 언어: 언어): string {
  if (남은ms === null) return t('남은 시간 계산 중', 언어);
  if (남은ms < 분) return t('1분 미만 남음', 언어);
  return t('약 {시간} 남음 · {시각} 종료 예상', 언어, {
    시간: 분올림글자(남은ms, 언어),
    시각: 시각글자(new Date(지금 + 남은ms), 언어),
  });
}

/**
 * 작성의 남은 시간 글(`{지난} 지남` 뒤에 붙인다). 평소 걸린 시간을 모르면(`null`) 만들지 않는다 —
 * 지어내지 않고 부른 쪽이 지난 시간과 시작 시각만 적는다
 */
export function 작성남은글(
  지난ms: number,
  지금: number,
  평소: { ms: number; samples: number } | null | undefined,
  언어: 언어,
): string | null {
  if (평소 === null || 평소 === undefined) return null;
  const 남은ms = 평소.ms - 지난ms;
  if (남은ms <= 0) return t('평소보다 {넘은} 더 걸리고 있습니다', 언어, { 넘은: 분올림글자(-남은ms, 언어) });
  return t('약 {시간} 남음 · {시각} 종료 예상 · 최근 {수}건 기준', 언어, {
    시간: 분올림글자(남은ms, 언어),
    시각: 시각글자(new Date(지금 + 남은ms), 언어),
    수: 평소.samples,
  });
}
