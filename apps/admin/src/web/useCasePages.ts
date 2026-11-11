// 케이스 목록을 한 쪽(50건)씩 이어 받는다 — 스크롤이 바닥에 닿으면 다음 쪽을 붙인다 (도메인/카탈로그 §8.1 「이어 불러오기」 · 2026-11-11 시안 B)
// 「이전 · 다음」 쪽 넘기기를 걷어 낸 자리다. 서버 통로는 그대로 쪽을 받는다(§7 `page`)

import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type CasePage, type CaseQuery } from './api.js';
import { use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import { message } from './ui.js';

/** 받은 쪽들을 한 쪽처럼 합친다. 묶음 번호표 · 건수는 조건 전체의 것이라 첫 쪽 것을 쓴다. 받는 사이 목록이 바뀌어 겹친 줄은 한 번만 */
export function 쪽합치기(쪽들: CasePage[]): CasePage {
  const 본 = new Set<string>();
  const items = 쪽들.flatMap((p) => p.items).filter((row) => !본.has(row.tcId) && (본.add(row.tcId), true));
  return { ...쪽들[0]!, items };
}

/**
 * 열쇠가 바뀌면(조건 · 서비스) 첫 쪽부터 다시 받는다. 새 것이 올 때까지 앞 목록을 그대로 둔다 — 비우면 칩 하나 누를 때마다 깜박인다.
 * 늦게 온 앞 조건의 답이 새 목록을 덮지 않게 차수로 막는다
 */
export function use이어받기(조건: CaseQuery, 열쇠: string) {
  const 언어 = use언어();
  const [쪽들, set쪽들] = useState<CasePage[] | null>(null);
  // 첫 쪽 · 다시 읽기 실패는 목록을 대신하고(error), 더 받기 실패는 목록 끝 한 줄이다(더오류) — 갈라야 다시 받는 길이 맞는다
  const [error, setError] = useState<string | null>(null);
  const [더오류, set더오류] = useState<string | null>(null);
  const [받는중, set받는중] = useState(false);
  const 받는중ref = useRef(false);
  const 차수 = useRef(0);
  // 들고 있는 쪽들이 어느 차수의 것인가 — 조건을 바꾼 뒤 새 첫 쪽이 오기 전에는 더 받지 않는다. 옛 조건 쪽 뒤에 새 조건 쪽이 붙었다(2026-11-11 코드 리뷰)
  const 쪽차수 = useRef(0);
  const 지금조건 = useRef(조건);
  지금조건.current = 조건;
  const 지금쪽들 = useRef(쪽들);
  지금쪽들.current = 쪽들;

  /** 1쪽부터 n쪽까지 다시 받아 통째로 바꾼다. 성공 여부를 돌려준다 */
  const 다시받기 = useCallback(
    async (쪽수: number): Promise<boolean> => {
      const 이차수 = ++차수.current;
      try {
        const 받은 = await Promise.all(Array.from({ length: 쪽수 }, (_, i) => api.cases({ ...지금조건.current, page: i + 1 })));
        if (이차수 !== 차수.current) return false;
        쪽차수.current = 이차수;
        지금쪽들.current = 받은;
        set쪽들(받은);
        setError(null);
        set더오류(null);
        return true;
      } catch (err) {
        if (이차수 === 차수.current) setError(message(err, 언어));
        return false;
      }
    },
    [언어],
  );

  useEffect(() => {
    void 다시받기(1);
  }, [열쇠, 다시받기]);

  const 더있나 = 쪽들 !== null && 다음이있나(쪽들.at(-1)!);

  /** 다음 쪽 하나를 붙인다. 받는 중이거나 더 없거나 조건을 바꿔 새 첫 쪽을 기다리는 중이면 하지 않는다 */
  const 더받기 = useCallback(async (): Promise<boolean> => {
    const 지금 = 지금쪽들.current;
    // 스크롤 사건은 한 번에 여럿 온다 — 상태가 그려지기 전이라 받는 중인지는 ref 로 본다
    if (지금 === null || 받는중ref.current || 쪽차수.current !== 차수.current || !다음이있나(지금.at(-1)!)) return false;
    const 이차수 = 차수.current;
    받는중ref.current = true;
    set받는중(true);
    try {
      const 다음 = await api.cases({ ...지금조건.current, page: 지금.length + 1 });
      if (이차수 !== 차수.current) return false;
      const 붙인 = [...지금, 다음];
      지금쪽들.current = 붙인;
      set쪽들(붙인);
      set더오류(null);
      return true;
    } catch (err) {
      if (이차수 === 차수.current) set더오류(message(err, 언어));
      return false;
    } finally {
      받는중ref.current = false;
      set받는중(false);
    }
  }, [언어]);

  return {
    data: 쪽들 === null ? null : 쪽합치기(쪽들),
    error,
    더오류,
    받는중,
    더있나,
    더받기,
    /** 받은 쪽 수만큼 다시 받는다 — 실행이 끝났거나 값을 저장해 줄이 바뀌었을 때. 스크롤 자리를 잃지 않는다 */
    reload: () => 다시받기(Math.max(1, 지금쪽들.current?.length ?? 1)),
  };
}
