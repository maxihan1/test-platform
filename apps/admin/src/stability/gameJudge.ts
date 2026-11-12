// 게임 항목의 게임 오류 파일에서 Exception 만 골라 지문 · 단계를 매긴다 (도메인/안정화 §3.15 「무엇을 세나」 · 「지문」)

import { 게임단계, 게임예외지문, type 지문 } from './fingerprint.js';

export interface 게임오류 {
  지문: 지문;
  /** 처음 난 것의 원문(머리 줄 + 스택) — 넣기 전에 항목 비밀값을 가린다 */
  견본: string;
  /** 처음 난 것의 단계 */
  seq: number | null;
  hits: number;
}

// kit 이 쓰는 머리 줄 `#<번호> <occurredAt 또는 옛 시각> <Unity LogType>: <한 줄 메시지>` (packages/kit/src/runtime/game.ts 게임증적을남긴다).
// 옛 시각에 빈칸이 있어도 종류 이름에서 끊는다
const 머리꼴 = /^#\d+ (.+?) (Exception|Error|Assert|Warning|Log): (.*)$/;

/** 같은 지문은 한 줄로 모아 횟수를 더한다. Error · Assert · Warning · Log 는 세지 않는다(결정 4) */
export function 게임항목오류(글: string, 단계들: readonly { seq: number; startedAt: string | null }[]): 게임오류[] {
  const 덩어리: { 시각: string; 종류: string; 메시지: string; 줄: string[] }[] = [];
  for (const 원문 of 글.split('\n')) {
    const m = 머리꼴.exec(원문.trimEnd());
    if (m !== null) 덩어리.push({ 시각: m[1]!, 종류: m[2]!, 메시지: m[3]!, 줄: [원문.trimEnd()] });
    else 덩어리.at(-1)?.줄.push(원문.trimEnd());
  }
  const 모음 = new Map<string, 게임오류>();
  for (const d of 덩어리) {
    if (d.종류 !== 'Exception') continue;
    while (d.줄.at(-1) === '') d.줄.pop();
    const 지문 = 게임예외지문(d.메시지, d.줄.slice(1).join('\n'));
    const 앞 = 모음.get(지문.fingerprint);
    if (앞 !== undefined) {
      앞.hits += 1;
      continue;
    }
    모음.set(지문.fingerprint, { 지문, 견본: d.줄.join('\n'), seq: 게임단계(d.시각, 단계들), hits: 1 });
  }
  return [...모음.values()];
}
