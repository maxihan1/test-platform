// 서비스 가이드의 순수 규칙 — 상한 · 본문 검사 · 변경 기록 계산 (도메인/작성 §7 「서비스 가이드 통로」)

import type { GuideSection, GuideVersionRow } from '@platform/kit';

import { createHash } from 'node:crypto';

// 상한의 정본은 도메인/작성 §7 「서비스 가이드 통로」 ★ 상한이다
export const 글상한 = 20_000;
export const 지금판파일상한 = 20;
export const 통틀어파일상한 = 200;

export const 구획들: readonly GuideSection[] = ['intro', 'policy', 'rules'];
export const 구획인가 = (값: unknown): 값 is GuideSection => 구획들.includes(값 as GuideSection);

export type 글셋 = Record<GuideSection, string>;
export type 판파일 = { id: number; section: GuideSection };

/** 판 번호 칸. 질의 글자로도 숫자로도 온다 — 0 은 「아직 가이드가 없다」 */
export function 판번호(값: unknown, 최소 = 0): number | null {
  const n = typeof 값 === 'number' ? 값 : typeof 값 === 'string' && /^\d{1,10}$/.test(값) ? Number(값) : NaN;
  return Number.isSafeInteger(n) && n >= 최소 ? n : null;
}

/** 글 저장 본문의 글 셋. 틀리면 그 칸 이름 */
export function 글검사(본문: Record<string, unknown> | null): 글셋 | { error: 'BAD_GUIDE'; detail: GuideSection } {
  const 글: Partial<글셋> = {};
  for (const 칸 of 구획들) {
    const 값 = 본문?.[칸];
    if (typeof 값 !== 'string' || 값.length > 글상한) return { error: 'BAD_GUIDE', detail: 칸 };
    글[칸] = 값;
  }
  return 글 as 글셋;
}

/** 판 하나를 변경 기록에 견주는 데 쓰는 것만. 글은 본문 대신 md5 다 (§7 「서비스 가이드 통로」 `…/versions`) */
export interface 판요약 {
  version: number;
  md5: 글셋;
  files: 판파일[];
  savedAt: string;
  savedByName: string;
}

// DB 의 md5(text) 와 같은 값이다 — 둘 다 UTF-8 바이트를 잰다
const 빈글md5 = createHash('md5').update('').digest('hex');

/** 최신 먼저. 판 1 은 앞 판을 빈 가이드로 본다 */
export function 변경기록(판들: 판요약[], 이름: ReadonlyMap<number, string>): GuideVersionRow[] {
  const 차례 = [...판들].sort((a, b) => a.version - b.version);
  const 줄: GuideVersionRow[] = [];
  let 앞: { md5: 글셋; files: 판파일[] } = { md5: { intro: 빈글md5, policy: 빈글md5, rules: 빈글md5 }, files: [] };
  const 파일줄 = (f: 판파일) => ({ name: 이름.get(f.id) ?? '', section: f.section });
  for (const 판 of 차례) {
    const 앞번호 = new Set(앞.files.map((f) => f.id));
    const 새번호 = new Set(판.files.map((f) => f.id));
    줄.push({
      version: 판.version,
      savedAt: 판.savedAt,
      savedByName: 판.savedByName,
      changed: {
        sections: 구획들.filter((칸) => 판.md5[칸] !== 앞.md5[칸]),
        added: 판.files.filter((f) => !앞번호.has(f.id)).map(파일줄),
        removed: 앞.files.filter((f) => !새번호.has(f.id)).map(파일줄),
      },
    });
    앞 = 판;
  }
  return 줄.reverse();
}
