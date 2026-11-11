// 「PRD 관리」 아래쪽의 전체 요구 — 왼쪽 기능 묶음 목차 + 한 줄 목록 + 오른쪽 서랍 (도메인/작성 §3.6 「★ 표준 기획서」 · 2026-11-11 목록 시안 B)
// 펼치고 접던 묶음 머리와 줄 펴기는 없다. 한 줄을 누르면 서랍(PrdDrawer.tsx)이 근거 · 테스트 · 고치기를 보인다

import { useEffect, useMemo, useRef, useState } from 'react';

import type { PrdItem } from '@platform/kit';

import { 줄보류of } from '../prd/heldText.js';
import type { 지도API } from '../prd/apiMap.js';
import { 요구판정, 추적하기, type 결과읽기 } from '../prd/trace.js';
import { use말 } from './i18n.js';
import { use주소조건, 버리기전, 주소조건 } from './leaveGuard.js';
import { 묶음목차, use목차위치, 목차자리, type 목차칸 } from './ListToc.js';
import type { 판짓기 } from './Prd.js';
import { 요구서랍 } from './PrdDrawer.js';
import { prdApi, type PrdItemDraft, type PrdNow } from './prdApi.js';
import { 요구가거치는 } from './PrdApis.js';
import { 묶음정리서랍, 정리까닭 } from './PrdGroupFix.js';
import { prd줄아이디, 요구줄 } from './PrdRow.js';
import { PRD항목주소 } from './route.js';
import { 고친판, 묶음들, 묶음이름문제 } from './prdView.js';

type 칩키 = '전체' | '실패' | '미작성' | '확인' | '보류';

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
  /** 서비스 지도. 못 받았으면 null — 서랍의 「거치는 API」를 안 그린다 */
  apis: 지도API[] | null;
  /** 케이스 목록에서 누른 요구 번호 — 그 줄의 서랍을 연 채로 열고 그 줄로 간다 */
  여기?: string;
}) {
  const t = use말();
  // 찾기 글자는 주소에 남는다 — 케이스 목록에 갔다 뒤로 와도 그대로다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const [q, setQ] = useState(() => 주소조건().get('q') ?? '');
  // 맨 PRD 는 애플리케이션을 `service=` 로 단다 — 요구 번호 주소는 번호의 접두사가 그 몫을 한다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)
  use주소조건(여기 === undefined ? '#/prd' : PRD항목주소(여기), { ...(q === '' ? {} : { q }), ...(여기 === undefined && service !== '' ? { service } : {}) });
  // 판을 받은 뒤에 그려지므로 처음 값에서 바로 찾는다. 지금 판에 없는 번호면 아무것도 안 연다
  const 여기것 = 여기 === undefined ? undefined : now.items.find((x) => x.reqId === 여기);
  const [연줄, set연줄] = useState<string | null>(여기것?.reqId ?? null);
  const [정리, set정리] = useState<string | null>(null);
  const [칩, set칩] = useState<칩키>('전체');
  const [고치는, set고치는] = useState<string | null>(null);
  // 문장을 고쳐 저장한 줄 — 저장 응답으로만 아는 안내라 새로 고치면 없다. 테스트는 「결정 필요」에서 다시 만든다
  const [고친줄, set고친줄] = useState<Set<string>>(new Set());
  const [옮김알림, set옮김알림] = useState<string | null>(null);
  const 상자 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (여기것 === undefined) return;
    const 줄 = document.getElementById(prd줄아이디(여기것.reqId));
    // jsdom 에는 scrollIntoView 가 없다
    줄?.scrollIntoView?.({ block: 'center' });
    줄?.focus({ preventScroll: true });
    // 처음 열 때 한 번만 — 판이 바뀔 때마다 그 줄로 끌려가면 다른 줄을 고칠 수 없다
  }, []);

  const 추적표 = useMemo(() => new Map(now.items.map((x) => [x.reqId, 추적하기(now.cases[x.reqId] ?? [], 결과)])), [now, 결과]);
  const 추적of = (reqId: string) => 추적표.get(reqId) ?? 추적하기([], 결과);
  const 상태표 = useMemo(
    () =>
      new Map(
        now.items.map((x) => {
          const a = 추적표.get(x.reqId) ?? 추적하기([], 결과);
          const 없음 = a.기능.length + a.UI.length === 0;
          const 보류 = 없음 && 줄보류of(now.held, x.reqId) !== null;
          return [x.reqId, { 확인: x.status === 'NEEDS_CHECK', 보류, 미작성: 없음 && !보류, 실패: a.결과 !== null && 요구판정(a.결과) === 'FAIL' }] as const;
        }),
      ),
    [now, 추적표, 결과],
  );
  const 상태of = (x: PrdItem) => 상태표.get(x.reqId) ?? { 확인: false, 보류: false, 미작성: false, 실패: false };
  const 칩수: Record<칩키, number> = {
    전체: now.items.length,
    실패: now.items.filter((x) => 상태of(x).실패).length,
    미작성: now.items.filter((x) => 상태of(x).미작성).length,
    확인: now.items.filter((x) => 상태of(x).확인).length,
    보류: now.items.filter((x) => 상태of(x).보류).length,
  };
  // 고른 칩이 0건이 되면(고치고 나서) 풀린 것으로 본다 — 0건 칩은 눌 수 없어서 다시 풀 길이 없다
  const 쓰는칩: 칩키 = 칩 !== '전체' && 칩수[칩] > 0 ? 칩 : '전체';
  const 칩에맞나 = (x: PrdItem) => 쓰는칩 === '전체' || 상태of(x)[쓰는칩];

  const 찾는말 = q.trim().toLowerCase();
  // 고치는 줄은 칩 · 찾기가 걸러 내지 않는다 — 걸러지면 고치기 칸이 사라져 쓴 글이 묻지 않고 없어진다
  const 보일것 = now.items.filter((x) => x.reqId === 고치는 || (칩에맞나(x) && (찾는말 === '' || `${x.reqId} ${x.feature} ${x.text}`.toLowerCase().includes(찾는말))));
  const 묶음 = 묶음들(보일것);
  const 기능들 = [...new Set(now.items.map((x) => x.feature))];
  const 전체묶음 = useMemo(() => 묶음들(now.items), [now.items]);
  const 문제 = useMemo(() => new Map(전체묶음.map((g) => [g.feature, 묶음이름문제(g.feature, g.items, now.items)] as const)), [전체묶음, now.items]);
  const 옮길곳들 = 전체묶음.filter((g) => 문제.get(g.feature) === null).map((g) => g.feature);
  const { 지금, 가기 } = use목차위치(상자, 묶음.map((g) => `${g.feature}:${g.items.length}`).join('|'));
  const 칸들: 목차칸[] = 묶음.map((g) => ({
    열쇠: g.feature,
    이름: g.feature,
    건수: g.items.length,
    실패: g.items.filter((x) => 상태of(x).실패).length,
    정리: 정리까닭(t, 문제.get(g.feature) ?? null),
  }));

  // 고치던 글이 있으면 서랍을 닫거나 바꾸기 전에 먼저 묻는다
  const 비우고 = (이어서: () => void) => (고치는 === null ? 이어서() : 버리기전(이어서, 고치는));
  const 열기 = (reqId: string) =>
    비우고(() => {
      set옮김알림(null);
      set고치는(null);
      set정리(null);
      set연줄((전) => (전 === reqId ? null : reqId));
    });
  const 닫기 = () =>
    비우고(() => {
      set고치는(null);
      set연줄(null);
      set정리(null);
    });
  const 정리열기 = (feature: string) =>
    비우고(() => {
      set옮김알림(null);
      set고치는(null);
      set연줄(null);
      set정리(feature);
    });

  const 저장 = (reqId: string, 새것: PrdItemDraft | null, 실패: (글: string) => void) => 짓기((base) => prdApi.save(service, base, 고친판(now.items, reqId, 새것)), 실패);
  const 옮기기 = async (from: string, to: string) => {
    const 건수 = now.items.filter((x) => x.feature === from).length;
    const 됐나 = await 짓기((base) =>
      prdApi.save(
        service,
        base,
        now.items.map((x) => (x.feature === from ? { ...x, feature: to } : x)),
      ),
    );
    if (됐나) {
      set정리(null);
      set옮김알림(t('요구사항 {건수}건을 「{묶음}」으로 옮겼습니다', { 건수, 묶음: to }));
    }
    return 됐나;
  };

  const 연것 = 연줄 === null ? undefined : now.items.find((x) => x.reqId === 연줄);
  const 정리묶음 = 정리 === null ? undefined : 전체묶음.find((g) => g.feature === 정리);
  const 칩들: [칩키, string][] = [
    ['전체', t('전체 {건수}', { 건수: 칩수.전체 })],
    ['실패', t('실패 {건수}', { 건수: 칩수.실패 })],
    ['미작성', t('미작성 {건수}', { 건수: 칩수.미작성 })],
    ['확인', t('확인 필요 {건수}', { 건수: 칩수.확인 })],
    ...(칩수.보류 === 0 ? [] : [['보류', t('보류 {건수}', { 건수: 칩수.보류 })] as [칩키, string]]),
  ];

  return (
    <>
      <section className="screen list-screen prd-all" aria-label={t('전체 요구사항')}>
        {옮김알림 === null ? null : (
          <p role="status" className="prd-note prd-moved">
            {옮김알림}
          </p>
        )}
        <div className="toolbar">
          <div className="prd-chips">
            {칩들.map(([키, 글]) => (
              <button
                key={키}
                type="button"
                className={키 === '실패' ? 'prd-chip prd-chip-fail' : 'prd-chip'}
                aria-pressed={쓰는칩 === 키}
                disabled={키 !== '전체' && 칩수[키] === 0}
                onClick={() => set칩(쓰는칩 === 키 ? '전체' : 키)}
              >
                {글}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="prd-find"
            aria-label={t('요구사항 문장 · 번호 검색')}
            placeholder={t('요구사항 문장 · 번호 검색')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="toc-body">
          <묶음목차 칸들={칸들} 지금={지금} on가기={가기} on정리={정리열기} />
          <div className="rows-scroll" ref={상자}>
            {묶음.length === 0 ? (
              <div className="empty">{now.items.length === 0 ? t('아직 요구사항이 없습니다') : t('찾는 요구사항이 없습니다')}</div>
            ) : (
              묶음.map((g) => {
                const 상태들 = g.items.map(상태of);
                const 실패수 = 상태들.filter((s) => s.실패).length;
                const 미작성수 = 상태들.filter((s) => s.미작성).length;
                const 보류수 = 상태들.filter((s) => s.보류).length;
                return (
                  <section key={g.feature} {...목차자리(g.feature)}>
                    <div className="toc-label">
                      <b title={g.feature}>{g.feature}</b>
                      <span>{t('{건수}건', { 건수: g.items.length })}</span>
                      {실패수 === 0 ? null : <span className="toc-fail">{t('실패 {건수}', { 건수: 실패수 })}</span>}
                      {미작성수 === 0 ? null : <span>{t('미작성 {건수}', { 건수: 미작성수 })}</span>}
                      {보류수 === 0 ? null : <span>{t('보류 {건수}', { 건수: 보류수 })}</span>}
                      {문제.get(g.feature) === null ? null : <span className="toc-fix">{t('정리 필요')}</span>}
                    </div>
                    {g.items.map((x) => (
                      <요구줄 key={x.reqId} x={x} 추적={추적of(x.reqId)} 보류={줄보류of(now.held, x.reqId)} 열림={x.reqId === 연줄} on열기={() => 열기(x.reqId)} />
                    ))}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </section>
      {연것 === undefined ? null : (
        <요구서랍
          x={연것}
          추적={추적of(연것.reqId)}
          보류={줄보류of(now.held, 연것.reqId)}
          성능={now.perf[연것.reqId]}
          케이스보나={케이스보나}
          거치는={apis === null ? [] : 요구가거치는(now.cases[연것.reqId] ?? [], apis)}
          안내={고친줄.has(연것.reqId)}
          쓰나={쓰나}
          고치나={고치는 === 연것.reqId}
          기능들={기능들}
          on고치기={() => set고치는(연것.reqId)}
          on고치기닫기={() => set고치는(null)}
          on저장={async (새것, 실패) => {
            const 됐나 = await 저장(연것.reqId, 새것, 실패);
            if (됐나) {
              set고치는(null);
              // 지우기 · 상태만 바꾼 저장은 테스트와 상관없다
              if (새것 !== null && 새것.text !== 연것.text) set고친줄((전) => new Set(전).add(연것.reqId));
            }
            return 됐나;
          }}
          on닫기={닫기}
        />
      )}
      {정리묶음 === undefined ? null : (
        <묶음정리서랍
          key={정리묶음.feature}
          feature={정리묶음.feature}
          항목들={정리묶음.items}
          까닭={정리까닭(t, 문제.get(정리묶음.feature) ?? null) ?? ''}
          옮길곳들={옮길곳들}
          쓰나={쓰나}
          on옮기기={(to) => 옮기기(정리묶음.feature, to)}
          on닫기={닫기}
        />
      )}
    </>
  );
}
