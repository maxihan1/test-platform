// 「PRD 관리」 요구 줄의 테스트 쪽 — 줄 끝 추적표 칸(덮는 케이스 수 고리 · 마지막 결과 · 안 덮임)과 편 줄의 「테스트」 · 「설계 미리보기」 구획
// (도메인/작성 §3.6 「메뉴가 곧 요구사항 추적표다」 · 2026-10-11 시안 A). 셈은 prd/trace.ts 가 한다 — 추적표 엑셀과 같은 함수라 화면과 엑셀 숫자가 갈리지 않는다

import { useMemo } from 'react';

import { 설계하기 } from '../../../../scripts/authoring-design.js';
import { 요구판정, type 추적 } from '../prd/trace.js';
import { use기법말 } from './CaseDetail.js';
import { use말 } from './i18n.js';

/** 케이스 목록이 그 요구로 걸러 열린다 (도메인/카탈로그 §8.1 검색 조건 8) */
const 케이스주소 = (kind: 'fn' | 'ui', reqId: string) => `#/cases/${kind}/req/${reqId}`;

const 판정꼴 = { PASS: 'v-pass', FAIL: 'v-fail', NA: 'v-na' } as const;

// 줄 버튼 밖에 둔다 — 버튼 안에는 고리를 넣을 수 없다
export function 추적칸({ reqId, 추적, 케이스보나 }: { reqId: string; 추적: 추적; 케이스보나: boolean }) {
  const t = use말();
  const 전체 = 추적.기능.length + 추적.UI.length;
  if (전체 === 0) {
    return (
      <span className="prd-trace">
        <span className="case-tag prd-uncovered">{t('안 덮임')}</span>
      </span>
    );
  }
  const 셈 = 추적.결과;
  const 판정 = 셈 === null ? null : 요구판정(셈);
  const 갈래 = [
    { kind: 'fn' as const, 글: t('기능 {건수}건', { 건수: 추적.기능.length }), 수: 추적.기능.length },
    { kind: 'ui' as const, 글: t('UI {건수}건', { 건수: 추적.UI.length }), 수: 추적.UI.length },
  ].filter((g) => g.수 > 0);
  return (
    <span className="prd-trace">
      {/* 케이스 read 가 없으면 목록이 안 열린다 — 글자만 둔다 */}
      {갈래.map((g) =>
        케이스보나 ? (
          <a key={g.kind} href={케이스주소(g.kind, reqId)}>
            {g.글}
          </a>
        ) : (
          <span key={g.kind}>{g.글}</span>
        ),
      )}
      {셈 === null || 판정 === null ? null : (
        <span className={`verdict ${판정꼴[판정]}`}>
          {판정 === 'FAIL'
            ? t('실패 {건수} / {전체}', { 건수: 셈.실패, 전체 })
            : 판정 === 'PASS'
              ? t('통과')
              : 셈.미실행 === 전체
                ? t('미실행')
                : t('미실행 {건수} / {전체}', { 건수: 셈.미실행, 전체 })}
        </span>
      )}
    </span>
  );
}

/** 편 줄 — 종류 · 기법 숫자. 같은 칸의 설계 미리보기와 견준다. 안 덮인 요구는 줄의 「안 덮임」으로 끝나 구획을 안 그린다 */
export function 테스트구획({ 추적 }: { 추적: 추적 }) {
  const t = use말();
  const 기법말 = use기법말();
  if (추적.기능.length + 추적.UI.length === 0) return null;
  const 종류: [string, number][] = [
    [t('정상'), 추적.종류.정상],
    [t('경계'), 추적.종류.경계],
    [t('예외'), 추적.종류.예외],
    ['UI', 추적.종류.UI],
  ];
  return (
    <section>
      <h3>{t('테스트')}</h3>
      <div className="prd-kv">
        {종류.map(([이름, 수]) => (
          <span key={이름}>
            {이름} <b>{수}</b>
          </span>
        ))}
      </div>
      {추적.기법.length === 0 ? null : (
        <div className="prd-kv">
          {추적.기법.map(([기법, 수]) => (
            <span key={기법}>
              {기법말(기법)} <b>{수}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// 저장하지 않고 작성 에이전트와 같은 판정 함수로 그때 계산한다 — 두 벌이면 미리보기와 실제 작성이 갈린다
export function 설계미리보기({ text }: { text: string }) {
  const t = use말();
  const 기법말 = use기법말();
  const 설계 = useMemo(() => 설계하기(text), [text]);
  if (설계.경계.length === 0 && 설계.예외.length === 0) return <p className="prd-none">{t('요구 문장에서 잡힌 경계 · 예외가 없습니다')}</p>;
  return (
    <ul className="prd-design">
      {설계.경계.map((b, i) => (
        <li key={`b${i}`}>
          <span className="prd-tech">{기법말('경계값 분석')}</span>
          <span>「{b.근거}」</span>
          {b.값.map((값) => (
            <span className="prd-val" key={값}>
              {값}
            </span>
          ))}
        </li>
      ))}
      {설계.예외.map((e, i) => (
        <li key={`e${i}`}>
          <span className="prd-tech">{기법말(e.기법)}</span>
          <span>「{e.근거}」</span>
        </li>
      ))}
    </ul>
  );
}
