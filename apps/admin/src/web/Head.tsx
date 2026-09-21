// 화면 머리 — 제목 · 부제 · 주 행동 (SPEC 공통/5-화면공통 §8)
//
// **껍데기가 그리지 않고 화면이 그린다.** 껍데기에 통로를 뚫으면 화면마다 제목·부제·행동을
// 위로 올려 보내야 하는데, 부제는 동적이고(`모두 42건`) 행동도 상태를 탄다(`스캔하는 중`).
// 화면이 자기 첫 자식으로 이것을 그리면 같은 결과가 나오고 배선이 0이다.
// PR① 이 `Shell` 에 뚫어 둔 `header` 통로는 **부르는 곳이 하나도 없어** 2026-09-22 에 걷어냈다.

import type { ReactNode } from 'react';

export function Head({
  제목,
  부제,
  행동,
}: {
  제목: string;
  /** 이 화면이 지금 무엇을 보여주고 있는지. 없으면 줄 자체를 안 만든다 */
  부제?: ReactNode;
  /** 이 화면에서 가장 흔한 다음 행동. 없으면 자리를 안 만든다 */
  행동?: ReactNode;
}) {
  return (
    <header className="head">
      <div className="head-title">
        <h1>{제목}</h1>
        {부제 === undefined ? null : <div className="head-meta">{부제}</div>}
      </div>
      {행동 === undefined ? null : <div className="head-acts">{행동}</div>}
    </header>
  );
}
