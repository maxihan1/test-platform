// 스스로 끝낸 학습 세션이 남긴 것 — 배우기 단계는 남은 배울 것, 게임플레이 단계는 못 깬 곳 · 값 줄 없는 종류 · 열린 물음 (도메인/게임 §3.10 「끝내는 때」)
// authoring-learn 이 300줄에 닿아 끝 조건 계산을 떼어 냈다
import { type 지도줄 } from './authoring-game-find.js';
import { 안적은새것 } from './authoring-game-play-gate.js';
import { 곳정보남음 } from './authoring-game-values.js';
import { 열린물음, 오늘글 } from './authoring-game-tree.js';
import { 판기록들 } from './authoring-learn-check.js';
import { 남은깰곳 } from './authoring-learn-play.js';
import { 남은배울것 } from './authoring-learn-retro.js';

/** 빈 목록이면 끝이다. 단계가 없으면 배우기, 있으면 게임플레이 */
export function 끝조건남은것(자료: string, 게임플레이: boolean, 지도: { 줄들: 지도줄[]; 이름: Map<string, string> }, 지금: number, 빌드?: string): string[] {
  const 오늘 = 오늘글(지금);
  if (게임플레이) {
    const 열린 = 열린물음(지도, 오늘, 빌드).length;
    return [...남은깰곳(지도.줄들, 판기록들(자료)), ...곳정보남음(지도.줄들, 자료), ...(열린 === 0 ? [] : [`열린 물음 ${열린}`])];
  }
  const 안적은 = 안적은새것(자료, false);
  return 남은배울것(지도, 오늘, 빌드, 안적은 === null ? [] : [...안적은.이름들, ...안적은.처음]);
}
