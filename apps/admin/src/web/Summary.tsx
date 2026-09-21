// 판정을 숫자와 막대로 그리는 조각 둘 — 집계 띠와 최근 판정 흐름 (SPEC §8)
// 색은 거들기만 한다 — 판정은 늘 글자로도 적고, 막대는 판정마다 높이가 다르다 (DESIGN.md 접근성)

import type { ItemStatus } from './api.js';
import { STATUS_LABEL } from './ui.js';

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

/** 판정 하나가 네모 하나. 색과 **높이**가 같이 바뀐다 — 색을 못 봐도 모양으로 읽힌다 */
const 판정글자: Record<ItemStatus, string> = { PASS: 'p', FAIL: 'f', NA: 'n' };

/** 흐름 막대가 지키는 칸 수. 서버의 `최근몇건` 과 같은 값이다 (execution/history.ts) */
const 흐름칸수 = 5;

/**
 * 최근 판정 흐름 (SPEC §8.1).
 *
 * **디바이스마다 하나다.** 데이터가 `(케이스, 디바이스)` 단위로 오고 줄도 디바이스마다 배지를 그린다 —
 * 줄에 하나만 그리면 PC 와 모바일의 흐름이 한 줄로 뭉개진다.
 *
 * 다섯에 못 미치면 **남는 자리를 빈 칸으로 채운다.** 안 채우면 두 번 돌린 케이스와
 * 다섯 번 돌린 케이스의 막대 길이가 달라져 세로로 훑을 수가 없다 (DESIGN.md 원칙 3).
 */
export function 판정흐름({ recent }: { recent: ItemStatus[] }) {
  // 한 번도 안 돌렸으면 그릴 것이 없다. 빈 칸 다섯만 그리면 「돌렸는데 결과가 없다」로 읽힌다
  if (recent.length === 0) return null;

  const 칸들 = recent.slice(0, 흐름칸수);
  const 빈칸 = 흐름칸수 - 칸들.length;
  const 셈 = new Map<ItemStatus, number>();
  for (const 것 of 칸들) 셈.set(것, (셈.get(것) ?? 0) + 1);

  return (
    <>
      <span className="spark" aria-hidden="true">
        {칸들.map((것, i) => (
          <i key={`${것}-${String(i)}`} className={판정글자[것]} />
        ))}
        {Array.from({ length: 빈칸 }, (_, i) => (
          <i key={`e-${String(i)}`} className="e" />
        ))}
      </span>
      {/* 막대만 두면 색을 못 보는 사람에게는 회색 네모다. 개수를 글자로 같이 적는다 */}
      <span className="sparktext">
        {[...셈.entries()].map(([것, 수], i) => (
          <span key={것}>
            {i === 0 ? null : ' · '}
            <b className={판정글자[것]}>
              {STATUS_LABEL[것]} {수}
            </b>
          </span>
        ))}
      </span>
    </>
  );
}
