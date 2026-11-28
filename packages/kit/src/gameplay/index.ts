// 게임플레이 시뮬레이션 · 순서 찾기 · 순서대로 하기의 입구 — 작성 스크립트(계산기 · 게이트 · 조작 도우미)가 여기서 가져온다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④ · 「게임플레이」)
// 케이스 도우미는 여기가 아니라 `@platform/kit/parts` 의 `순서대로` 만 쓴다(공통/2-명세선언 「Page Object 파일」 가져오기 제한)
export * from './simInput.js';
export * from './sim.js';
export * from './simSearch.js';
export * from './hand.js';
export * from './followPlan.js';
export * from './follow.js';
export * from './play.js';
export * from './world.js';
