// 판정을 숫자와 막대로 그리는 조각 둘 — 집계 띠와 최근 판정 흐름 (SPEC §8)
// 색은 거들기만 한다 — 판정은 늘 글자로도 적고, 막대는 판정마다 높이가 다르다 (DESIGN.md 접근성)

import type { ItemStatus } from './api.js';
import { use말 } from './i18n.js';
import { STATUS_LABEL } from './ui.js';

type 칸이름 = '전체' | '통과' | '실패' | '미실행';

interface 집계Props {
  전체: number;
  통과: number;
  실패: number;
  미실행: number;
  부제?: Partial<Record<칸이름, string>>;
}

/**
 * 띠의 칸 하나.
 *
 * **색은 `판정` 에서만 나온다.** 라벨에 색을 매어 두면 `실행 횟수`·`평균 소요` 같은
 * 판정이 아닌 칸에도 판정 색을 칠할 수 있게 된다 (DESIGN.md 원칙 1 — 색은 판정만 갖는다).
 */
export interface 띠칸 {
  라벨: string;
  값: string;
  판정?: ItemStatus;
  부제?: string;
}

const 판정색: Record<ItemStatus, string> = { PASS: 'p', FAIL: 'f', NA: 'n' };

/**
 * 숫자 몇 개를 큰 글자로 늘어놓는 띠 (SPEC §8).
 *
 * 판정 집계도 이것으로 그리고(`집계띠`), 판정이 아닌 집계도 이것으로 그린다.
 * 두 벌을 만들면 한쪽이 색 규칙을 잃는다.
 */
export function 칸띠({ 칸들, 비율 }: { 칸들: readonly 띠칸[]; 비율?: readonly { 판정: ItemStatus; 몫: number }[] }) {
  return (
    <div className="stats">
      <div className="stats-row">
        {칸들.map((칸) => {
          const 색 = 칸.판정 === undefined ? '' : 판정색[칸.판정];
          return (
            <div key={칸.라벨} className={색 === '' ? 'stat' : `stat ${색}`}>
              <span className="k">
                {색 === '' ? null : <i />}
                {칸.라벨}
              </span>
              <div className="v">{칸.값}</div>
              {칸.부제 === undefined ? null : <div className="sub">{칸.부제}</div>}
            </div>
          );
        })}
      </div>
      {/* 아무것도 없는데 막대만 그리면 0 을 비율로 읽게 된다 */}
      {비율 === undefined || 비율.every((것) => 것.몫 === 0) ? null : (
        <div className="ratio">
          {비율.map((것) => (
            <i key={것.판정} className={판정색[것.판정]} style={{ flexGrow: 것.몫 }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function 집계띠({ 전체, 통과, 실패, 미실행, 부제 }: 집계Props) {
  const t = use말();
  // 「전체」는 거르개 칩에도 있다. 거기는 All 이고 여기는 Total 이라 꼬리로 가른다
  const 칸들: 띠칸[] = [
    { 라벨: t('전체§집계'), 값: String(전체), ...(부제?.전체 === undefined ? {} : { 부제: 부제.전체 }) },
    { 라벨: t('통과'), 값: String(통과), 판정: 'PASS', ...(부제?.통과 === undefined ? {} : { 부제: 부제.통과 }) },
    { 라벨: t('실패'), 값: String(실패), 판정: 'FAIL', ...(부제?.실패 === undefined ? {} : { 부제: 부제.실패 }) },
    { 라벨: t('미실행'), 값: String(미실행), 판정: 'NA', ...(부제?.미실행 === undefined ? {} : { 부제: 부제.미실행 }) },
  ];

  return (
    <칸띠
      칸들={칸들}
      비율={
        전체 === 0
          ? undefined
          : [
              { 판정: 'PASS', 몫: 통과 },
              { 판정: 'FAIL', 몫: 실패 },
              { 판정: 'NA', 몫: 미실행 },
            ]
      }
    />
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
