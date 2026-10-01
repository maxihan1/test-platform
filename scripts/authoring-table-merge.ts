// 요구사항 표 합치기 — main 을 요청 브랜치에 합칠 때 표의 충돌 덩이를 코드로 푼다 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// git 의 줄 단위 합치기(union)는 쓰지 않는다 — 「요구」 차례 번호가 겹치고 양쪽이 고친 머리 문단 · 같은 줄이 둘 다 남아 표가 말없이 깨진다 (계획 검토 2026-10-01).
// 양쪽이 같은 자리에 줄을 더하기만 한 곳과 「덮는 범위」 줄만 푼다. 그 밖은 사람이 다시 작성하게 실패로 돌린다

import { 원장대조, 표읽기 } from './authoring-ledger-check.js';

const 덮는범위 = /^\*\*덮는 범위\*\*/;

/**
 * `merge.conflictStyle=diff3` 로 남은 충돌 표시를 푼다.
 * 바탕이 빈 덩이(양쪽이 같은 자리에 더하기만) → main(그쪽) 줄 → 이 요청(우리) 줄 순.
 * 세 쪽이 모두 「덮는 범위」 줄뿐이면 → 이 요청 것(마지막 반영의 셈이 남는다).
 * 그 밖 → 사유
 */
export function 표덩이풀기(글: string): { 글: string } | { 사유: string } {
  const 줄들 = 글.split('\n');
  const 결과: string[] = [];
  let i = 0;
  while (i < 줄들.length) {
    const 줄 = 줄들[i] ?? '';
    if (!줄.startsWith('<<<<<<< ')) {
      결과.push(줄);
      i += 1;
      continue;
    }
    const 우리: string[] = [];
    const 바탕: string[] = [];
    const 그쪽: string[] = [];
    let 자리: string[] = 우리;
    i += 1;
    for (; i < 줄들.length; i += 1) {
      const l = 줄들[i] ?? '';
      if (l.startsWith('||||||| ')) 자리 = 바탕;
      else if (l === '=======') 자리 = 그쪽;
      else if (l.startsWith('>>>>>>> ')) break;
      else 자리.push(l);
    }
    if (i >= 줄들.length) return { 사유: '요구사항 표의 충돌 표시가 끝나지 않았다' };
    i += 1;
    if (바탕.length === 0) {
      결과.push(...그쪽, ...우리);
      continue;
    }
    const 덮는범위뿐 = (덩이: string[]) => 덩이.every((l) => 덮는범위.test(l));
    if (덮는범위뿐(우리) && 덮는범위뿐(바탕) && 덮는범위뿐(그쪽)) {
      결과.push(...우리);
      continue;
    }
    return { 사유: '요구사항 표에서 main 과 같은 곳을 고쳤다' };
  }
  return { 글: 결과.join('\n') };
}

/**
 * 「요구사항」 표의 「요구」 차례 번호가 겹치면 뒤쪽 줄을 그 표의 가장 큰 번호 뒤로 옮긴다.
 * 두 요청이 같은 main 에서 출발해 둘 다 46번부터 매긴다 — 번호는 줄을 가리키는 이름이라 겹치면 안 된다
 */
export function 요구번호다시매기기(글: string): string {
  const 줄들 = 글.split('\n');
  const 시작 = 줄들.findIndex((l) => /^##\s+요구사항\s*$/.test(l.trim()));
  if (시작 < 0) return 글;
  let 끝 = 줄들.length;
  for (let j = 시작 + 1; j < 줄들.length; j += 1) {
    if (/^#{1,2}\s/.test(줄들[j] ?? '')) {
      끝 = j;
      break;
    }
  }
  const 번호칸 = (l: string): number | null => {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    return m === null ? null : Number(m[1]);
  };
  const 번호들 = 줄들.slice(시작, 끝).map(번호칸).filter((n): n is number => n !== null);
  let 다음 = Math.max(0, ...번호들) + 1;
  const 본것 = new Set<number>();
  for (let j = 시작; j < 끝; j += 1) {
    const l = 줄들[j] ?? '';
    const n = 번호칸(l);
    if (n === null) continue;
    if (!본것.has(n)) {
      본것.add(n);
      continue;
    }
    줄들[j] = l.replace(/^\|\s*\d+\s*\|/, `| ${String(다음)} |`);
    본것.add(다음);
    다음 += 1;
  }
  return 줄들.join('\n');
}

/**
 * 합친 표에 새로 생긴 형식 오류 — 합치기 전 두 표 어느 쪽에도 없던 것만. main 에 원래 있던 문제로 반영을 막지 않는다.
 * `있는케이스` 는 합친 트리의 tc_id — 요구 줄이 가리키는 케이스 파일이 있어야 한다
 */
export function 새형식오류(합친: string, 전들: string[], 있는케이스: Set<string>): string[] {
  const 오류 = (글: string) => (표읽기(글, '요구사항').length === 0 ? [] : 원장대조([], 글, { 있는케이스, 에이전트: false }).형식오류);
  const 원래 = new Set(전들.flatMap(오류));
  return 오류(합친).filter((e) => !원래.has(e));
}
