// 목록에서 여러 건을 골라 실행을 거는 흐름 (SPEC §8.10). 그리는 일은 CaseList 가 한다
//
// 고른 것을 tcId 가 아니라 **줄 통째로** 든다. tcId 만 들면 실체를 찾으러 쪽을 처음부터 되돌아야 하고,
// 그 길에서 결과 칩과 검색 조건이 고른 것을 다시 걸러 말없이 버렸다

import { useState } from 'react';

import { api, type CaseQuery, type CaseRow, type ItemStatus, type ServiceRow, type User } from './api.js';
import type { LastMap } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import { 담을것 } from './pickRun.js';
import type { 실행요청 } from './RunPickModal.js';
import { message } from './ui.js';
import { useRunStart } from './useRunStart.js';

/**
 * 「전체」를 담을 때 되돌 쪽 수의 한계.
 *
 * `runPlan` 의 상한(1000)을 여기 쓰지 않는다 — 그것은 **실행 항목 수**이지 케이스 수가 아니다.
 * 케이스 1000건이 전부 디바이스 하나면 항목 수도 1000 이라 `넘었나` 가 false 이고,
 * 그래서 뒤에 더 있어도 조용히 1000건만 걸렸다. 세는 단위가 달랐다.
 * 무한 반복도 여기서 막는다 — `다음이있나` 는 `items.length >= pageSize` 라 pageSize 가 0 이면 영영 돈다.
 */
const 쪽상한 = 40;

/** 훅이 꺼낸 번역기를 모듈 안의 순수 함수들에 넘긴다 */
type 말하기 = ReturnType<typeof use말>;

/** 조용히 줄어든 것을 모달에서 사람에게 말한다. 「전체」라 적힌 버튼이 앞부분만 거는 일이 없게 */
function 빠진안내(
  것: {
    고른수: number;
    담을수: number;
    잘렸나: boolean;
    모은수: number;
  },
  t: 말하기,
): string | undefined {
  if (것.잘렸나) return t('목록이 너무 길어 앞 {모은수}건까지만 담았습니다. 검색으로 좁혀서 다시 실행하세요', { 모은수: 것.모은수 });
  if (것.고른수 > 것.담을수)
    return t('고른 {고른수}건 중 {담을수}건이 대상입니다. 나머지는 비활성이라 뺐습니다', {
      고른수: 것.고른수,
      담을수: 것.담을수,
    });
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
  const t = use말();
  const 언어 = use언어();
  const [고른, set고른] = useState<ReadonlyMap<string, CaseRow>>(new Map());
  const [모으는중, set모으는중] = useState(false);
  // 모은 결과. null 이면 모달이 닫힌 것이다 — 닫으면 모은 것을 버린다 (SPEC §8.10)
  const [담은것, set담은것] = useState<CaseRow[] | null>(null);
  // 대상 서버 목록은 배정 응답에만 실려 온다. 이 화면은 접두사만 받으므로 걸기 직전에 한 번 읽는다
  const [서비스, set서비스] = useState<ServiceRow | null>(null);
  // 한 건 창이 실행자 이름과 묶음 · 저장값 권한을 이 사람으로 본다 — 같은 응답에서 같이 받는다
  const [사람, set사람] = useState<User | null>(null);
  // 담는 사이에 빠진 것. 버튼이 「전체」라 말해 놓고 조용히 자르지 않는다
  const [안내, set안내] = useState<string | undefined>(undefined);
  const 걸기 = useRunStart();

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
        알림(t('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다'));
        return;
      }
      await 사람읽기();
      set안내(빠진안내({ 고른수: 고른.size, 담을수: 담을.length, 잘렸나, 모은수: 모은.length }, t));
      set담은것(담을);
    } catch (err) {
      알림(message(err, 언어));
    } finally {
      set모으는중(false);
    }
  }

  async function 사람읽기() {
    const { user } = await api.me();
    set사람(user);
    set서비스(user.services.find((it) => it.prefix === service) ?? null);
  }

  /** 목록 줄의 ▶ — 그 한 건으로 같은 창을 연다. 실행 문은 하나다 (도메인/실행 §8.10, 2026-10-09 UI 개편 묶음 4) */
  async function 하나열기(row: CaseRow) {
    알림(null);
    if (!row.isActive) {
      // 빈 창을 열지 않는다. 비활성은 스캔이 코드에서 지웠다고 본 케이스라 서버가 400 을 낸다
      알림(t('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다'));
      return;
    }
    try {
      await 사람읽기();
      set안내(undefined);
      set담은것([row]);
    } catch (err) {
      알림(message(err, 언어));
    }
  }

  /** 한 건 창에서 저장값을 바꿨다. 「저장값 · 누가 · 언제」가 지금 것을 말하게 그 줄만 새로 읽는다 */
  async function 다시읽기(tcId: string) {
    try {
      const 새 = await api.caseOf(tcId);
      set담은것((전) => 전?.map((c) => (c.tcId === tcId ? 새 : c)) ?? 전);
    } catch (err) {
      알림(message(err, 언어));
    }
  }

  /** 창이 「실행」을 누른 뒤 (SPEC §8.10 → §8.2). 걸리면 창을 닫는다 — 실패 사유는 창 안에 남는다 */
  async function 실행걸기(요청: 실행요청) {
    알림(null);
    if (await 걸기.걸기(요청)) set담은것(null);
  }

  function 뒤집기(row: CaseRow) {
    set고른((전) => {
      const 다음 = new Map(전);
      if (!다음.delete(row.tcId)) 다음.set(row.tcId, row);
      return 다음;
    });
  }

  /** 이 쪽에 보이는 줄을 전부 골랐으면 풀고, 아니면 전부 고른다. 다른 쪽에서 고른 것은 건드리지 않는다 */
  function 모두뒤집기(줄들: CaseRow[]) {
    set고른((전) => {
      const 다음 = new Map(전);
      const 전부 = 줄들.length > 0 && 줄들.every((row) => 전.has(row.tcId));
      for (const row of 줄들) {
        if (전부) 다음.delete(row.tcId);
        else 다음.set(row.tcId, row);
      }
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
    걸기.사유지우기();
    set안내(undefined);
  }

  return {
    고른,
    모으는중,
    담은것,
    서비스,
    사람,
    사유: 걸기.사유,
    안내,
    거는중: 걸기.거는중,
    모으기,
    하나열기,
    다시읽기,
    실행걸기,
    뒤집기,
    모두뒤집기,
    비우기,
    닫기,
    // 값을 고치면 아까 거절당한 사유는 더 이상 지금 화면의 사실이 아니다
    사유지우기: 걸기.사유지우기,
  };
}
