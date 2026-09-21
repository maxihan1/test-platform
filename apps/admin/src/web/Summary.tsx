// 판정 개수와 최근 흐름을 그리는 조각 (SPEC §8)
// 색은 거들기만 한다 — 판정은 늘 글자로도 적는다 (DESIGN.md 접근성)

import { Fragment } from 'react';

type 판정 = 'PASS' | 'FAIL' | 'NA';

const 이름: Record<판정, string> = { PASS: '통과', FAIL: '실패', NA: '미실행' };
const 표식: Record<판정, string> = { PASS: 'p', FAIL: 'f', NA: 'n' };

type 칸이름 = '전체' | '통과' | '실패' | '미실행';

interface 집계Props {
  전체: number;
  통과: number;
  실패: number;
  미실행: number;
  부제?: Partial<Record<칸이름, string>>;
}

export function 집계띠({ 전체, 통과, 실패, 미실행, 부제 }: 집계Props) {
  const 칸들: ReadonlyArray<{ 라벨: 칸이름; 값: number; 색: string }> = [
    { 라벨: '전체', 값: 전체, 색: '' },
    { 라벨: '통과', 값: 통과, 색: 'p' },
    { 라벨: '실패', 값: 실패, 색: 'f' },
    { 라벨: '미실행', 값: 미실행, 색: 'n' },
  ];

  return (
    <div className="stats">
      <div className="stats-row">
        {칸들.map((칸) => (
          <div key={칸.라벨} className={칸.색 ? `stat ${칸.색}` : 'stat'}>
            <span className="k">
              {칸.색 ? <i /> : null}
              {칸.라벨}
            </span>
            <div className="v">{칸.값}</div>
            {부제?.[칸.라벨] ? <div className="sub">{부제[칸.라벨]}</div> : null}
          </div>
        ))}
      </div>
      {/* 아무것도 없는데 막대만 그리면 0 을 비율로 읽게 된다 */}
      {전체 > 0 ? (
        <div className="ratio">
          <i className="p" style={{ flexGrow: 통과 }} />
          <i className="f" style={{ flexGrow: 실패 }} />
          <i className="n" style={{ flexGrow: 미실행 }} />
        </div>
      ) : null}
    </div>
  );
}

export function 판정흐름({ 최근 }: { 최근: ReadonlyArray<판정> }) {
  if (최근.length === 0) return <span className="sparktext">돌린 적 없음</span>;

  const 셈 = (['PASS', 'FAIL', 'NA'] as const)
    .map((판) => ({ 판, 개수: 최근.filter((하나) => 하나 === 판).length }))
    .filter((칸) => 칸.개수 > 0);

  return (
    <>
      <div className="spark" aria-hidden="true">
        {최근.map((판, 자리) => (
          <i key={자리} className={표식[판]} />
        ))}
      </div>
      <span className="sparktext">
        {셈.map((칸, 자리) => (
          <Fragment key={칸.판}>
            {자리 > 0 ? ' · ' : null}
            <b className={표식[칸.판]}>
              {이름[칸.판]} {칸.개수}
            </b>
          </Fragment>
        ))}
      </span>
    </>
  );
}
