// 실행 결과의 실행 차례 표 — 프로시저 헤더 아래 케이스가 실행 차례대로 한 줄씩 선다. 웹 · API 결과도 같은 표이고 헤더만 없다 (SPEC 도메인/실행 §8.3)
// 앞 판은 실패 카드와 통과 줄이 따로 서서 한 프로시저의 흐름이 두 구획으로 갈렸다 (2026-11-24 사용자 · 시안 5판)

import { useEffect, useRef } from 'react';

import type { Platform, RunInsights } from './api.js';
import { use말 } from './i18n.js';
import { 판정점줄 } from './proc.js';
import { 케이스줄, type 줄바깥 } from './RunFlowRow.js';
import { type 보이는묶음, 거른흐름, 줄판정of, 쪽으로나눈다, 케이스쪽, 흐름으로묶는다 } from './runFlow.js';
import { type 결과보기, type 보기바꿈, 펼침바꾼보기 } from './runResultView.js';
import { PLATFORM_LABEL } from './ui.js';

function 프로시저머리({ b, columns }: { b: 보이는묶음; columns: readonly Platform[] }) {
  const t = use말();
  const 판정들 = b.줄들.map((g) => 줄판정of(g, columns));
  const 몇 = (맞나: (v: (typeof 판정들)[number]) => boolean) => 판정들.filter((v) => !v.도는중 && 맞나(v)).length;
  const 실패 = 몇((v) => v.status === 'FAIL');
  const 막힘 = 몇((v) => v.blocked);
  const 미실행 = 몇((v) => v.status === 'NA' && !v.blocked);
  return (
    <div className="rf-proc">
      <span className="mono rf-proc-id">{b.procId}</span>
      <b>{b.procName}</b>
      {/* 어디서 흐름이 끊겼는지 헤더에서 읽힌다. 도는 중인 케이스는 아직 판정이 없어 점선 원이다 */}
      <판정점줄 결과들={판정들.map((v) => (v.도는중 ? undefined : v))} />
      <span className="rf-count">
        {t('{건수}건', { 건수: b.줄들.length })}
        {실패 === 0 ? null : <span className="f"> · Fail {실패}</span>}
        {막힘 === 0 ? null : <span> · Blocked {막힘}</span>}
        {미실행 === 0 ? null : <span> · Not tested {미실행}</span>}
      </span>
    </div>
  );
}

export function 흐름표({
  보기,
  바꾸기,
  insights,
  열카드,
  on맞춤,
  ...바깥
}: 줄바깥 & {
  보기: 결과보기;
  바꾸기: (바꿀: 보기바꿈) => void;
  /** 요약 한 줄의 「회귀 실패」 · 「기존 실패」 거르기가 읽는다. 못 받았으면 그 거르기는 없다 */
  insights: RunInsights | null;
  /** 다른 화면의 고리로 온 케이스 — 그 줄이 선 쪽을 열고 화면을 그 줄로 옮긴다 (`&tc=`) */
  열카드?: string;
  on맞춤?: () => void;
}) {
  const t = use말();
  const { columns } = 바깥;
  const 변화 = 보기.변화 === null || insights === null ? null : { 칸: 보기.변화, insights };
  const 쪽들 = 쪽으로나눈다(거른흐름(흐름으로묶는다(바깥.items), { 판정: 보기.판정, columns, 변화 }));
  // 주소로 온 줄이 다른 쪽에 있으면 그 쪽을 연다 — 처음 한 번만. 사람이 넘긴 쪽을 되돌리지 않는다
  const 갈쪽 = 열카드 === undefined ? null : 케이스쪽(쪽들, 열카드);
  const 옮겼나 = useRef(false);
  useEffect(() => {
    if (옮겼나.current || 갈쪽 === null) return;
    옮겼나.current = true;
    if (갈쪽 !== 보기.쪽) 바꾸기({ 쪽: 갈쪽 });
  }, [갈쪽]);
  if (쪽들.length === 0) return <div className="empty">{t('조건에 맞는 결과가 없습니다')}</div>;
  const 쪽 = Math.min(보기.쪽, 쪽들.length);
  // 디바이스가 둘이면 머리 칸이 디바이스 이름이다 — 칸마다 판정과 소요 시간이 같이 선다
  const 머리칸 = columns.length > 1 ? columns.map((p) => [PLATFORM_LABEL[p]]) : [[t('결과'), t('소요 시간')]];

  return (
    <>
      <div className={columns.length > 1 ? 'rf-table rf-multi' : 'rf-table'} style={{ ['--rf-devs' as string]: columns.length }}>
        <div className="rf-head" aria-hidden="true">
          <span />
          <span>TC ID</span>
          <span>{t('케이스명')}</span>
          {머리칸.map((칸) =>
            칸.length === 1 ? (
              <span key={칸[0]} className="rf-span2">
                {칸[0]}
              </span>
            ) : (
              [<span key="v">{칸[0]}</span>, <span key="d" className="r">{칸[1]}</span>]
            ),
          )}
          <span />
        </div>
        {쪽들[쪽 - 1]!.map((b) => (
          <section key={b.열쇠} className="rf-group">
            {b.procId === null ? null : <프로시저머리 b={b} columns={columns} />}
            {b.보이는.map((g) => (
              <케이스줄
                key={g.tcId}
                g={g}
                // 차례는 프로시저 안 자리다 — 거른 줄만 서도 번호는 그대로다
                seq={b.procId === null ? null : b.줄들.indexOf(g) + 1}
                열림={보기.열린.includes(g.tcId)}
                on펼침={(열림) => 바꾸기((앞) => 펼침바꾼보기(앞, g.tcId, 열림))}
                맞추기={g.tcId === 열카드}
                on맞춤={on맞춤}
                {...바깥}
              />
            ))}
          </section>
        ))}
      </div>
      {쪽들.length <= 1 ? null : (
        <div className="pager">
          {/* 쪽을 넘기면 다른 줄이 선다 — 펼친 줄도 비운다 */}
          <button type="button" onClick={() => 바꾸기({ 쪽: 쪽 - 1, 열린: [] })} disabled={쪽 <= 1}>
            {t('이전')}
          </button>
          <span>
            {쪽} / {쪽들.length}
          </span>
          <button type="button" onClick={() => 바꾸기({ 쪽: 쪽 + 1, 열린: [] })} disabled={쪽 >= 쪽들.length}>
            {t('다음')}
          </button>
        </div>
      )}
    </>
  );
}
