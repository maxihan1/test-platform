// 화면 머리 — 제목 · 부제 · 주 행동 (SPEC 공통/5-화면공통 §8)
//
// **껍데기가 그리지 않고 화면이 그린다.** 껍데기에 통로를 뚫으면 화면마다 제목·부제·행동을
// 위로 올려 보내야 하는데, 부제는 동적이고(`모두 42건`) 행동도 상태를 탄다(`스캔하는 중`).
// 화면이 자기 첫 자식으로 이것을 그리면 같은 결과가 나오고 배선이 0이다.
// PR① 이 `Shell` 에 뚫어 둔 `header` 통로는 **부르는 곳이 하나도 없어** 2026-09-22 에 걷어냈다.

import { createContext, useContext, type ReactNode } from 'react';

import type { ServiceRow } from './api.js';

/**
 * 지금 보는 애플리케이션 — 껍데기(Shell)가 본문을 감싸 넣는다. 화면마다 이름을 내려보내지 않고 머리가 여기서 읽는다.
 * 대시보드 · 껍데기 밖(검사에서 화면만 그릴 때)은 비어 있다
 */
export const 지금앱칸 = createContext<ServiceRow | null>(null);

/** 종류에 따라 이름이 바뀌는 화면(가이드 · 기기 성능)이 지금 애플리케이션 종류를 읽는다 */
export const use지금앱 = (): ServiceRow | null => useContext(지금앱칸);

export function Head({
  제목,
  위치,
  부제,
  행동,
  클래스,
}: {
  제목: string;
  /** 하위 메뉴 화면이면 묶음 이름. 제목 앞에 「묶음 › 」로 서서 어느 메뉴 아래인지 보인다 (2026-10-20 사용자) */
  위치?: string;
  /** 이 화면이 지금 무엇을 보여주고 있는지. 없으면 줄 자체를 안 만든다 */
  부제?: ReactNode;
  /** 이 화면에서 가장 흔한 다음 행동. 없으면 자리를 안 만든다 */
  행동?: ReactNode;
  /** 화면이 머리 배치를 따로 다듬어야 할 때 붙이는 클래스 */
  클래스?: string;
}) {
  // 어느 화면을 캡처해도 어느 애플리케이션인지 남게 위치 줄 맨 앞에 이름을 둔다 (화면공통 §8 「화면 머리」 · 2026-10-29 사용자)
  const 앱 = use지금앱();
  const 앞 = [앱?.name, 위치].filter((글): 글 is string => 글 !== undefined).join(' › ');
  return (
    <header className={클래스 === undefined ? 'head' : `head ${클래스}`}>
      <div className="head-title">
        <h1>
          {앞 === '' ? null : <span className="head-crumb">{앞} ›</span>}
          {앞 === '' ? 제목 : ` ${제목}`}
        </h1>
        {부제 === undefined ? null : <div className="head-meta">{부제}</div>}
      </div>
      {행동 === undefined ? null : <div className="head-acts">{행동}</div>}
    </header>
  );
}
