// 목록에서 여러 건을 골라 실행을 거는 흐름 (SPEC §8.10). 그리는 일은 CaseList 가 한다
//
// 고른 것을 tcId 가 아니라 **줄 통째로** 든다. tcId 만 들면 실체를 찾으러 쪽을 처음부터 되돌아야 하고,
// 그 길에서 결과 칩과 검색 조건이 고른 것을 다시 걸러 말없이 버렸다

import { useRef, useState } from 'react';

import {
  api,
  type CaseQuery,
  type CaseRow,
  type ItemStatus,
  type RunRequestItem,
  type ServiceRow,
} from './api.js';
import type { LastMap } from './catalogView.js';
import { 다음이있나 } from './paging.js';
import { 담을것 } from './pickRun.js';
import type { 실행요청 } from './RunPickModal.js';
import { message } from './ui.js';

/**
 * 「전체」를 담을 때 되돌 쪽 수의 한계.
 *
 * `runPlan` 의 상한(1000)을 여기 쓰지 않는다 — 그것은 **실행 항목 수**이지 케이스 수가 아니다.
 * 케이스 1000건이 전부 디바이스 하나면 항목 수도 1000 이라 `넘었나` 가 false 이고,
 * 그래서 뒤에 더 있어도 조용히 1000건만 걸렸다. 세는 단위가 달랐다.
 * 무한 반복도 여기서 막는다 — `다음이있나` 는 `items.length >= pageSize` 라 pageSize 가 0 이면 영영 돈다.
 */
const 쪽상한 = 40;

/**
 * 실행 기록 목록이 이 제목으로 실행을 가리고(§8.7) 증적 문서 머리에도 박제된다(§8.3).
 *
 * 한 건이면 실행 설정 화면과 **같은 말**로 적는다 — 같은 일에 두 가지 제목이 생기지 않게.
 * 여러 건이면 맨 앞 케이스와 나머지 수로 적는다. 「3건 실행」처럼 수만 적으면
 * 목록에 같은 제목이 줄줄이 쌓여 무엇을 돌린 실행인지 가려낼 수 없다.
 */
function 실행제목(items: RunRequestItem[]): string {
  const 맨앞 = items[0]?.tcId ?? '';
  return items.length <= 1 ? `${맨앞} 실행` : `${맨앞} 외 ${String(items.length - 1)}건 실행`;
}

/** 조용히 줄어든 것을 모달에서 사람에게 말한다. 「전체」라 적힌 버튼이 앞부분만 거는 일이 없게 */
function 빠진안내(것: {
  고른수: number;
  담을수: number;
  잘렸나: boolean;
  모은수: number;
}): string | undefined {
  if (것.잘렸나) return `목록이 너무 길어 앞 ${String(것.모은수)}건까지만 담았습니다. 검색으로 좁혀서 다시 거세요`;
  if (것.고른수 > 것.담을수)
    return `고른 ${String(것.고른수)}건 중 ${String(것.담을수)}건이 대상입니다. 나머지는 비활성이라 뺐습니다`;
  return undefined;
}

export function useRunPick(옵션: {
  service: string;
  조건: CaseQuery;
  결과: ItemStatus | 'ALL';
  마지막: LastMap;
  /** 목록 화면의 안내 줄. 모달을 열기 전 단계의 말은 여기로 나간다 */
  알림: (글: string | null) => void;
}) {
  const { service, 조건, 결과, 마지막, 알림 } = 옵션;
  const [고른, set고른] = useState<ReadonlyMap<string, CaseRow>>(new Map());
  const [모으는중, set모으는중] = useState(false);
  // 모은 결과. null 이면 모달이 닫힌 것이다 — 닫으면 모은 것을 버린다 (SPEC §8.10)
  const [담은것, set담은것] = useState<CaseRow[] | null>(null);
  // 대상 서버 목록은 배정 응답에만 실려 온다. 이 화면은 접두사만 받으므로 걸기 직전에 한 번 읽는다
  const [서비스, set서비스] = useState<ServiceRow | null>(null);
  // 걸었다 거절당한 사유. **목록 줄에 적으면 모달 뒤에 깔린다** — 모달 안에 적는다 (SPEC §8.10)
  const [사유, set사유] = useState<string | undefined>(undefined);
  // 담는 사이에 빠진 것. 버튼이 「전체」라 말해 놓고 조용히 자르지 않는다
  const [안내, set안내] = useState<string | undefined>(undefined);
  // 두 번 눌러도 실행이 둘 생기지 않게 막는다. 모달은 onRun 을 기다리지 않는다
  const 거는중 = useRef(false);

  /**
   * 「전체」는 보이는 쪽이 아니라 모든 쪽이다 (SPEC §8.1).
   *
   * 몇 쪽인지는 총건수로 계산하지 않고 응답이 준 값으로 판단한다 (paging.ts).
   * 도는 중에 스캔이 돌면 같은 tcId 가 두 쪽에 실려 서버가 요청 전체를 거절한다 — 그래서 Map 으로 받는다.
   */
  async function 쪽모으기(): Promise<{ 모은: CaseRow[]; 잘렸나: boolean }> {
    const 본것 = new Map<string, CaseRow>();
    let 잘렸나 = false;
    for (let 쪽 = 1; ; 쪽 += 1) {
      const 한쪽 = await api.cases({ ...조건, page: 쪽 });
      for (const row of 한쪽.items) 본것.set(row.tcId, row);
      if (!다음이있나(한쪽)) break;
      if (쪽 >= 쪽상한) {
        잘렸나 = true;
        break;
      }
    }
    return { 모은: [...본것.values()], 잘렸나 };
  }

  async function 모으기() {
    set모으는중(true);
    알림(null);
    try {
      // 고른 것이 있으면 손에 이미 다 있다. 실체를 찾으러 쪽을 되돌 이유가 없다
      const { 모은, 잘렸나 } = 고른.size > 0 ? { 모은: [], 잘렸나: false } : await 쪽모으기();
      const 담을 = 담을것(모은, 고른, 결과, 마지막);
      if (담을.length === 0) {
        // 빈 모달을 열지 않는다. 열어 봐야 실행이 서버에서 400 으로 되돌아온다
        알림('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다');
        return;
      }
      const { user } = await api.me();
      set서비스(user.services.find((it) => it.prefix === service) ?? null);
      set안내(빠진안내({ 고른수: 고른.size, 담을수: 담을.length, 잘렸나, 모은수: 모은.length }));
      set담은것(담을);
    } catch (err) {
      알림(message(err));
    } finally {
      set모으는중(false);
    }
  }

  /**
   * 모달이 「실행하기」를 누른 뒤 (SPEC §8.10 → §8.2).
   *
   * **칸별 사유를 되돌리지 못한다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아
   * `violations` 를 아예 내지 않는다 — 어느 케이스의 어느 칸인지를 서버가 말해 주지 않는다.
   * 그래서 지어내지 않고 서버가 준 한 줄을 **모달 안으로** 돌려보내고 모달은 열어 둔다.
   * 거절당해도 `거는중` 을 반드시 풀어 다시 누를 수 있게 한다.
   */
  async function 실행걸기(요청: 실행요청) {
    if (거는중.current) return;
    거는중.current = true;
    알림(null);
    set사유(undefined);
    try {
      const { runId } = await api.createRun({ ...요청, title: 실행제목(요청.items) });
      set담은것(null);
      window.location.hash = `#/runs/${runId}`;
    } catch (err) {
      set사유(message(err));
    } finally {
      거는중.current = false;
    }
  }

  function 뒤집기(row: CaseRow) {
    set고른((전) => {
      const 다음 = new Map(전);
      if (!다음.delete(row.tcId)) 다음.set(row.tcId, row);
      return 다음;
    });
  }

  /** 서비스를 바꾸면 고른 것도 버린다. 남겨 두면 버튼이 「고른 2건」이라 말하고 사실이 아닌 이유를 보여준다 */
  function 비우기() {
    set고른(new Map());
  }

  function 닫기() {
    set담은것(null);
    // 다음에 열었을 때 지난번 사유와 안내가 남아 있으면 안 된다
    set사유(undefined);
    set안내(undefined);
  }

  return { 고른, 모으는중, 담은것, 서비스, 사유, 안내, 모으기, 실행걸기, 뒤집기, 비우기, 닫기 };
}
