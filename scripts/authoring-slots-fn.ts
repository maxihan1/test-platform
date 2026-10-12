// 기능 케이스 고정 번호 자리 — 원장 차례대로 요구마다 정상 · 경계 · 예외 자리를 정하는 순수 함수 (도메인/작성 §3.6 「칸과 번호」 번호 줄 ②)

/** 원장 항목 가운데 번호 매기기가 보는 것 — 설계(경계 · 예외 근거)는 요구 문장에서 코드가 뽑아 실행마다 같다 */
export interface 원장자리 {
  번호: string;
  설계?: { 경계: readonly unknown[]; 예외: readonly unknown[] };
}

export type 기능축 = '정상' | '경계' | '예외';

/**
 * 세 칸씩 잡아 세 자리 안이면 (i−1)×3 + 축이다(i 는 같은 번호가 두 번 나와도 첫 자리).
 * 넘으면 정상 하나 + 설계 목록에 있는 경계 · 예외만 잡는다. 칸 차례로 매기면 칸 하나만 달라도 뒤 번호가 다 밀린다(R1 ↔ R2 같은 번호 같은 요구 169 중 2 · PRD-F9-11).
 * 원장 뒤에 항목이 붙어도 앞 요구의 자리는 그대로다. 앞 요구의 설계가 바뀌면 뒤 자리가 밀리지만 이미 쓴 케이스는 물려받기로 번호를 지킨다
 */
export function 기능자리들(원장: readonly 원장자리[]): { 자리: Map<string, Partial<Record<기능축, number>>>; 끝: number } {
  const 자리 = new Map<string, Partial<Record<기능축, number>>>();
  const 셋씩 = 원장.length * 3 <= 999;
  let 끝 = 0;
  원장.forEach((h, i) => {
    if (자리.has(h.번호)) return;
    if (셋씩) {
      자리.set(h.번호, { 정상: i * 3 + 1, 경계: i * 3 + 2, 예외: i * 3 + 3 });
      return;
    }
    const 칸: Partial<Record<기능축, number>> = { 정상: ++끝 };
    if ((h.설계?.경계.length ?? 0) > 0) 칸.경계 = ++끝;
    if ((h.설계?.예외.length ?? 0) > 0) 칸.예외 = ++끝;
    자리.set(h.번호, 칸);
  });
  return { 자리, 끝: 셋씩 ? 원장.length * 3 : 끝 };
}
