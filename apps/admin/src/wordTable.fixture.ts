// docs/WORDS.md §1 표를 읽어 「쓰지 않는 말」 무늬를 돌려준다 — 화면 낱말 검사와 서버 글 검사가 같이 쓴다
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const 정본 = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/WORDS.md');

export interface 낱말줄 {
  쓰는말: string;
  무늬: RegExp;
}

/** §1 표에서 백틱 무늬가 있는 줄만 읽는다. 칸 안의 `\|` 는 정규식의 `|` 다 */
export function 낱말표(글: string): 낱말줄[] {
  const 절 = 글.split(/^## /mu).find((s) => s.startsWith('1. 화면 낱말')) ?? '';
  return 절.split('\n').flatMap((줄) => {
    if (!줄.startsWith('|')) return [];
    const 칸 = 줄.split(/(?<!\\)\|/u).slice(1, -1).map((c) => c.trim().replaceAll('\\|', '|'));
    const 무늬 = /^`(.+)`$/u.exec(칸[3] ?? '');
    return 무늬 ? [{ 쓰는말: 칸[1], 무늬: new RegExp(무늬[1], 'u') }] : [];
  });
}
