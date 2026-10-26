// 「PRD 관리」 아래쪽의 전체 요구 — 기능 묶음으로 접고, 줄을 펴면 근거 · 설계 미리보기 · 고치기 (도메인/작성 §3.6 「★ 표준 기획서」)
// 펼친 줄의 테스트 · 설계 미리보기 구획과 줄 끝 추적표 칸은 PrdTrace.tsx 가 그린다

import { useEffect, useMemo, useState } from 'react';

import { 줄보류of } from '../prd/heldText.js';
import { 요구판정, 추적하기, type 결과읽기 } from '../prd/trace.js';
import { use말 } from './i18n.js';
import { use주소조건, 버리기전, 주소조건 } from './leaveGuard.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdItemDraft, type PrdNow } from './prdApi.js';
import type { 지도API } from '../prd/apiMap.js';
import { 요구가거치는 } from './PrdApis.js';
import { prd줄아이디, 요구줄 } from './PrdRow.js';
import { PRD항목주소 } from './route.js';
import { 고친판, 뒤집은, 묶음들 } from './prdView.js';

export function PrdList({
  service,
  now,
  쓰나,
  짓기,
  여기,
  결과,
  케이스보나,
  apis,
}: {
  service: string;
  now: PrdNow;
  쓰나: boolean;
  짓기: 판짓기;
  /** 실행 read 가 없거나 아직 못 받았으면 null — 마지막 결과를 안 그린다 */
  결과: 결과읽기 | null;
  케이스보나: boolean;
  /** 서비스 지도. 못 받았으면 null — 편 줄의 「거치는 API」를 안 그린다 */
  apis: 지도API[] | null;
  /** 케이스 목록에서 누른 요구 번호 — 그 묶음과 줄을 편 채로 열고 그 줄로 간다 */
  여기?: string;
}) {
  const t = use말();
  // 찾기 글자는 주소에 남는다 — 케이스 목록에 갔다 뒤로 와도 그대로다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const [q, setQ] = useState(() => 주소조건().get('q') ?? '');
  use주소조건(여기 === undefined ? '#/prd' : PRD항목주소(여기), q === '' ? {} : { q });
  // 판을 받은 뒤에 그려지므로 처음 값에서 바로 찾는다. 지금 판에 없는 번호면 아무것도 안 편다
  const 여기것 = 여기 === undefined ? undefined : now.items.find((x) => x.reqId === 여기);
  const [연묶음, set연묶음] = useState<Set<string>>(() => new Set(여기것 === undefined ? [] : [여기것.feature]));
  const [편줄, set편줄] = useState<Set<string>>(() => new Set(여기것 === undefined ? [] : [여기것.reqId]));
  useEffect(() => {
    if (여기것 === undefined) return;
    const 줄 = document.getElementById(prd줄아이디(여기것.reqId));
    // jsdom 에는 scrollIntoView 가 없다
    줄?.scrollIntoView?.({ block: 'center' });
    줄?.querySelector('button')?.focus({ preventScroll: true });
    // 처음 열 때 한 번만 — 판이 바뀔 때마다 그 줄로 끌려가면 다른 줄을 고칠 수 없다
  }, []);
  const [고치는, set고치는] = useState<string | null>(null);
  // 문장을 고쳐 저장한 줄 — 저장 응답으로만 아는 안내라 새로 고치면 없다. 테스트는 「결정 필요」에서 다시 만든다
  const [고친줄, set고친줄] = useState<Set<string>>(new Set());

  const 찾는말 = q.trim().toLowerCase();
  // 고치는 줄은 찾기가 걸러 내지 않는다 — 걸러지면 고치기 칸이 내려가 쓴 글이 묻지 않고 사라진다
  const 찾은것 = 찾는말 === '' ? now.items : now.items.filter((x) => x.reqId === 고치는 || `${x.reqId} ${x.feature} ${x.text}`.toLowerCase().includes(찾는말));
  const 고치는묶음 = now.items.find((x) => x.reqId === 고치는)?.feature;
  // 묶음을 접어 고치는 줄이 가려지면 쓴 것이 사라진다 — 그 줄의 칸에 먼저 묻는다
  const 접기 = (남길: Set<string>) => (고치는 !== null && 고치는묶음 !== undefined && !남길.has(고치는묶음) ? 버리기전(() => set연묶음(남길), 고치는) : set연묶음(남길));
  const 묶음 = 묶음들(찾은것);
  const 기능들 = [...new Set(now.items.map((x) => x.feature))];
  const 추적표 = useMemo(() => new Map(now.items.map((x) => [x.reqId, 추적하기(now.cases[x.reqId] ?? [], 결과)])), [now, 결과]);
  const 추적of = (reqId: string) => 추적표.get(reqId) ?? 추적하기([], 결과);
  // 찾는 동안은 맞은 묶음을 다 편다 — 접힌 묶음 속에 맞은 줄이 숨으면 「없다」로 읽힌다
  const 열렸나 = (feature: string) => 찾는말 !== '' || 연묶음.has(feature);
  const 모두폈나 = 묶음.length > 0 && 묶음.every((g) => 열렸나(g.feature));

  const 저장 = (reqId: string, 새것: PrdItemDraft | null, 실패: (글: string) => void) =>
    짓기((base) => prdApi.save(service, base, 고친판(now.items, reqId, 새것)), 실패);

  return (
    <section className="screen prd-all" aria-labelledby="prd-all-title">
      <div className="toolbar">
        <h2 id="prd-all-title" className="prd-all-title">
          {t('전체 요구')}
        </h2>
        <input
          type="text"
          className="prd-find"
          aria-label={t('요구 문장 · 번호 검색')}
          placeholder={t('요구 문장 · 번호 검색')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn ghost small"
          disabled={찾는말 !== '' || 묶음.length === 0}
          onClick={() => 접기(모두폈나 ? new Set() : new Set(묶음.map((g) => g.feature)))}
        >
          {모두폈나 ? t('모두 접기') : t('모두 펴기')}
        </button>
      </div>
      {묶음.length === 0 ? (
        <div className="empty">{찾는말 === '' ? t('아직 요구가 없습니다') : t('찾는 요구가 없습니다')}</div>
      ) : (
        묶음.map((g) => {
          const 확인수 = g.items.filter((x) => x.status === 'NEEDS_CHECK').length;
          const 추적들 = g.items.map((x) => 추적of(x.reqId));
          const 없는줄 = g.items.filter((_, i) => 추적들[i]!.기능.length + 추적들[i]!.UI.length === 0);
          const 보류수 = 없는줄.filter((x) => 줄보류of(now.held, x.reqId) !== null).length;
          const 미작성수 = 없는줄.length - 보류수;
          const 실패수 = 추적들.filter((a) => a.결과 !== null && 요구판정(a.결과) === 'FAIL').length;
          return (
            <div className="prd-group" key={g.feature}>
              <button className="prd-ghead" aria-expanded={열렸나(g.feature)} onClick={() => 접기(뒤집은(연묶음, g.feature))}>
                <span className="prd-caret" aria-hidden="true">
                  ▸
                </span>
                <b>{g.feature}</b>
                <span className="prd-gcount">
                  {t('{건수}건', { 건수: g.items.length })}
                  {/* 묶음 전체가 같은 꼬리면 같은 숫자가 세 번 나온다 — 「모두 ~」 한 마디로 줄인다 (점검 N9) */}
                  {확인수 === 0 ? null : <> · {확인수 === g.items.length ? t('모두 확인 필요') : t('확인 필요 {건수}건', { 건수: 확인수 })}</>}
                  {보류수 === 0 ? null : <> · {보류수 === g.items.length ? t('모두 보류') : t('보류 {건수}건', { 건수: 보류수 })}</>}
                  {미작성수 === 0 ? null : <> · {미작성수 === g.items.length ? t('모두 미작성') : t('미작성 {건수}건', { 건수: 미작성수 })}</>}
                  {실패수 === 0 ? null : <> · <span className="prd-gfail">{실패수 === g.items.length ? t('모두 실패') : t('실패 {건수}건', { 건수: 실패수 })}</span></>}
                </span>
              </button>
              {!열렸나(g.feature)
                ? null
                : g.items.map((x) => (
                    <요구줄
                      key={x.reqId}
                      x={x}
                      여기={x.reqId === 여기}
                      안내={고친줄.has(x.reqId)}
                      추적={추적of(x.reqId)}
                      거치는={apis === null || !편줄.has(x.reqId) ? [] : 요구가거치는(now.cases[x.reqId] ?? [], apis)}
                      보류={줄보류of(now.held, x.reqId)}
                      성능={now.perf[x.reqId]}
                      케이스보나={케이스보나}
                      폈나={편줄.has(x.reqId)}
                      on펴기={() => {
                        // 고치던 줄을 접으면 취소와 같다 — 다시 펼 때 옛 칸이 버려진 글로 열리지 않게. 쓴 것이 있으면 먼저 묻는다
                        if (!(편줄.has(x.reqId) && 고치는 === x.reqId)) return set편줄(뒤집은(편줄, x.reqId));
                        버리기전(() => {
                          set고치는(null);
                          set편줄((전) => 뒤집은(전, x.reqId));
                        }, x.reqId);
                      }}
                      쓰나={쓰나}
                      고치나={고치는 === x.reqId}
                      on고치기={() => {
                        // 찾기로 펴진 묶음은 연묶음에 없다 — 넣어 두지 않으면 찾기 글자를 지울 때 묶음이 접혀 쓴 글이 묻지 않고 사라진다
                        const 고치기 = () => {
                          set고치는(x.reqId);
                          set연묶음((전) => new Set(전).add(x.feature));
                        };
                        if (고치는 === null) 고치기();
                        else 버리기전(고치기, 고치는);
                      }}
                      on고치기닫기={() => set고치는(null)}
                      기능들={기능들}
                      on저장={async (새것, 실패) => {
                        const 됐나 = await 저장(x.reqId, 새것, 실패);
                        if (됐나) {
                          set고치는(null);
                          // 지우기 · 상태만 바꾼 저장은 테스트와 상관없다
                          if (새것 !== null && 새것.text !== x.text) set고친줄((전) => new Set(전).add(x.reqId));
                        }
                        return 됐나;
                      }}
                    />
                  ))}
            </div>
          );
        })
      )}
    </section>
  );
}
