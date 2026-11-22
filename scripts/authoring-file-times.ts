// 케이스 · 부품 파일을 고친 때를 수정 시각이 아니라 내용이 바뀐 때로 본다 — 돌려 보기 · 끝 검사가 케이스파일읽기로 같이 쓴다 (SPEC 도메인/작성 §7 「이어하기」)
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 결과 폴더 안 표 이름 — 이어하기가 돌린 기록과 같이 남긴다(기록남기며비우기) */
export const 내용때표 = 'file-times.json';

type 줄 = [해시: string, 때: number];
const 줄인가 = (x: unknown): x is 줄 => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'number';

function 표읽기(길: string): Record<string, 줄> {
  try {
    if (!lstatSync(길).isFile()) return {};
    const 몸: unknown = JSON.parse(readFileSync(길, 'utf8'));
    if (typeof 몸 !== 'object' || 몸 === null) return {};
    return Object.fromEntries(Object.entries(몸).filter(([, v]) => 줄인가(v))) as Record<string, 줄>;
  } catch {
    return {}; // 없거나 깨진 표는 빈 표다 — 수정 시각으로 돌아가 한 번 더 돌 뿐이다
  }
}

/**
 * 파일마다 내용 해시와 그 내용을 처음 본 수정 시각을 결과 폴더에 적어 두고, 내용이 같으면 그 시각을 돌려준다.
 * GNU `sed -i` · `touch` 는 내용이 그대로여도 수정 시각을 올려 초록이던 케이스가 다시 돌았다(BRP #15938 · 19건 7분).
 * 처음 보는 파일 · 내용이 바뀐 파일은 지금 수정 시각을 쓴다. 둘이 동시에 쓰면 나중 것이 이기고, 빠진 줄은 다음에 수정 시각으로 다시 적힌다
 */
export function 내용때(기록폴더: string, 파일들: readonly { 경로: string; 글: string; 때: number }[]): Map<string, number> {
  const 길 = join(기록폴더, 내용때표);
  const 앞 = 표읽기(길);
  const 새 = { ...앞 };
  for (const f of 파일들) {
    const 해시 = createHash('sha256').update(f.글).digest('hex');
    const 전 = 앞[f.경로];
    새[f.경로] = 전 !== undefined && 전[0] === 해시 ? 전 : [해시, f.때];
  }
  const 글 = JSON.stringify(새);
  if (글 !== JSON.stringify(앞)) {
    try {
      // 새 이름에 쓰고 이름을 바꿔 읽는 쪽이 반쯤 쓴 표를 안 보게 한다
      writeFileSync(`${길}.${process.pid}`, 글, { mode: 0o600 });
      renameSync(`${길}.${process.pid}`, 길);
    } catch {
      // 결과 폴더가 없으면(끝 검사만 도는 자리) 못 적는다 — 이번 판정은 위에서 정한 때로 하고, 다음에도 수정 시각으로 돌아갈 뿐이다
    }
  }
  return new Map(파일들.map((f) => [f.경로, 새[f.경로]![1]]));
}
