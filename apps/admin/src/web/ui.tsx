// 모든 화면이 함께 쓰는 조각. 판정 배지·디바이스 이름·시간 표기와 데이터 읽기 훅
// 화면 표기는 PC / 모바일이다. desktop / mobile은 코드 안에서만 쓴다 (SPEC §2)

import { useCallback, useEffect, useState } from 'react';

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
  return (
    <span
      className={`verdict ${STATUS_CLASS[status]}`}
      style={big === true ? { fontSize: '13px', padding: '7px 16px' } : undefined}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** 목록의 소요시간. 초 단위로 훑을 수 있게 맞춘다 */
export function seconds(ms: number | null): string {
  if (ms === null) return '—';
  return `${(ms / 1000).toFixed(2)}초`;
}

export function when(iso: string | null): string {
  if (iso === null) return '—';
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}년 ${at.getMonth() + 1}월 ${at.getDate()}일 ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export function message(err: unknown): string {
  // 서버가 낸 코드를 사람 말로 옮긴다. 모르는 코드면 서버가 준 설명이 그대로 남는다.
  // 안 옮기면 SERVICE_FORBIDDEN 이 화면에 접두사 글자 하나(`XFS3B`)로 뜬다
  if (err instanceof ApiError) return 요청오류문장(err.code, err.message);
  return err instanceof Error ? err.message : String(err);
}

export function Loading() {
  return <div className="empty">불러오는 중입니다.</div>;
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
        if (live) setError(message(err));
      });
    return () => {
      live = false;
    };
  }, [...deps, tick]);

  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) };
}
