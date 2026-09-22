// 모든 화면이 함께 쓰는 조각. 판정 배지·디바이스 이름·시간 표기와 데이터 읽기 훅
// 화면 표기는 PC / 모바일이다. desktop / mobile은 코드 안에서만 쓴다 (SPEC §2)

import { useCallback, useEffect, useState } from 'react';

import { t, use말, use언어, type 언어 } from './i18n.js';
import { ApiError, type ItemStatus, type Platform } from './api.js';
import { 요청오류문장 } from './errorText.js';

export const PLATFORM_LABEL: Record<Platform, string> = { desktop: 'PC', mobile: '모바일' };
export const PLATFORMS: Platform[] = ['desktop', 'mobile'];

export const STATUS_LABEL: Record<ItemStatus, string> = { PASS: '통과', FAIL: '실패', NA: '미실행' };
const STATUS_CLASS: Record<ItemStatus, string> = { PASS: 'v-pass', FAIL: 'v-fail', NA: 'v-na' };
export const STATUS_COLOR: Record<ItemStatus, string> = {
  PASS: 'var(--pass)',
  FAIL: 'var(--fail)',
  NA: 'var(--na)',
};

export function Verdict({ status, big }: { status: ItemStatus; big?: boolean }) {
  const t = use말();
  return (
    <span
      className={`verdict ${STATUS_CLASS[status]}`}
      style={big === true ? { fontSize: '13px', padding: '7px 16px' } : undefined}
    >
      {t(STATUS_LABEL[status])}
    </span>
  );
}

/** 목록의 소요시간. 초 단위로 훑을 수 있게 맞춘다 */
export function seconds(ms: number | null, 언어: 언어): string {
  if (ms === null) return '—';
  return t('{초}초', 언어, { 초: (ms / 1000).toFixed(2) });
}

/**
 * 시각을 그 언어의 관례대로 적는다.
 *
 * **형식을 손으로 짜지 않는다.** `2026년 9월 22일 14:05` 를 문자열로 조립하면
 * 영어에서도 그 순서가 그대로 나온다. 표준이 이미 언어마다 다르게 적어 준다 (SPEC §8 「다국어」).
 */
export function when(iso: string | null, 언어: 언어): string {
  if (iso === null) return '—';
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(iso));
}

export function message(err: unknown, 언어: 언어): string {
  // 서버가 낸 코드를 사람 말로 옮긴다. 모르는 코드면 서버가 준 설명이 그대로 남는다.
  // 안 옮기면 SERVICE_FORBIDDEN 이 화면에 접두사 글자 하나(`XFS3B`)로 뜬다
  if (err instanceof ApiError) return 요청오류문장(err.code, 언어, err.message);
  return err instanceof Error ? err.message : String(err);
}

export function Loading() {
  const t = use말();
  return <div className="empty">{t('불러오는 중입니다.')}</div>;
}

export function Failed({ error }: { error: string }) {
  return <div className="empty" style={{ color: 'var(--fail)' }}>{error}</div>;
}

interface Async<T> {
  data: T | null;
  error: string | null;
  reload: () => void;
}

/** 화면마다 같은 모양의 useEffect를 다섯 번 쓰지 않으려고 한 곳에 모았다 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): Async<T> {
  const 언어 = use언어();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // 앞선 요청이 늦게 도착해 새 결과를 덮어쓰지 않게 막는다
    let live = true;
    load()
      .then((result) => {
        if (live) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (live) setError(message(err, 언어));
      });
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) };
}
