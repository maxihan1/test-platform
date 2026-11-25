// 배운 조작 도우미 이어 쓰기 — 다시 작성하면 새 트리라 앞 작성이 배운 판 함수가 사라졌다. 학습 세션이 끝날 때마다 작업 바탕에 남기고 다음 작성의 배우기 앞에 가져온다 (도메인/게임 §3.10 「게임 배우기」 조작 도우미 이어 쓰기 · 2026-11-25 사용자)
// 트리는 자식이 쓰는 자리다 — 링크를 따라가지 않고 자식을 거둔 뒤에만 읽는다
import { chownSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기, 폴더인가 } from './authoring-screens-keep-io.js';

// 보조가 쓰는 임시 도우미(draft-)는 메인이 합치고 지운다
const 이름꼴 = /^(?!draft-)[a-z][a-z0-9-]{0,40}\.helper\.ts$/;
const 파일상한 = 200_000;
const 개수상한 = 40;

export interface 도우미자리 {
  /** 작업 바탕 — `author-<번호>` 폴더들이 있는 자리(에이전트만 쓴다) */
  바탕: string;
  접두사: string;
  트리: string;
  /** `tests/` 아래 폴더 이름 */
  폴더: string;
}

const 둘곳 = (o: 도우미자리): string => join(o.바탕, 'game-helpers', o.접두사);

/** 트리의 도우미 폴더 — tests 부터 어느 것도 링크가 아닐 때만 */
function 트리도우미(o: 도우미자리): string | null {
  const 자리 = join(o.트리, 'tests', o.폴더, 'helpers');
  return 폴더인가(자리) && realpathSync(자리) === join(realpathSync(o.트리), 'tests', o.폴더, 'helpers') ? 자리 : null;
}

/** 남긴 파일 이름 — 트리와 같게 남긴다(AI 가 지운 것은 지운다). 비밀번호가 든 것은 남기지 않는다 */
export function 도우미남기기(o: 도우미자리, 비밀: readonly string[]): string[] {
  const 자리 = 트리도우미(o);
  if (자리 === null) return [];
  const 남긴: string[] = [];
  for (const 이름 of readdirSync(자리).filter((n) => 이름꼴.test(n)).slice(0, 개수상한)) {
    const 글 = 안전히읽기(자리, 이름, 파일상한);
    if (글 === null || 계정섞였나([글], 비밀)) continue;
    mkdirSync(둘곳(o), { recursive: true });
    새로쓰기(join(둘곳(o), 이름), 글);
    남긴.push(이름);
  }
  if (폴더인가(둘곳(o))) for (const 이름 of readdirSync(둘곳(o)).filter((n) => !남긴.includes(n))) rmSync(join(둘곳(o), 이름), { force: true });
  return 남긴;
}

/** 도우미가 가져다 쓰는 파일이 다 있나 — 화면 파일(`../pages/…`)은 남기지 않아 새 main 트리에 없을 수 있다. 빠진 채 두면 조작 도우미도 타입 검사도 안 돈다 */
const 쓸수있나 = (글: string, 자리: string, 있는: ReadonlySet<string>): boolean =>
  [...글.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].every(([, 길]) => {
    const 파일 = join(자리, 길!.replace(/\.js$/, '.ts'));
    return 있는.has(파일) || existsSync(파일);
  });

/** 트리에 없는 것만 가져온다 — 있는 것은 main 이나 이어받은 폴더의 것이 더 새롭다. 자식이 고칠 수 있게 자식 것으로 넘긴다 */
export function 도우미가져오기(o: 도우미자리, 자식: { uid: number; gid: number } | null): string[] {
  if (!폴더인가(둘곳(o))) return [];
  const 테스트 = join(o.트리, 'tests');
  if (!폴더인가(테스트) || realpathSync(테스트) !== join(realpathSync(o.트리), 'tests')) return [];
  for (const 자리 of [join(테스트, o.폴더), join(테스트, o.폴더, 'helpers')]) {
    if (폴더인가(자리)) continue;
    try {
      mkdirSync(자리);
    } catch {
      return []; // 링크나 파일이 그 자리에 있다
    }
    if (자식 !== null) chownSync(자리, 자식.uid, 자식.gid);
  }
  const 자리 = 트리도우미(o);
  if (자리 === null) return [];
  const 가져온: string[] = [];
  const 남은 = new Map(readdirSync(둘곳(o)).filter((n) => 이름꼴.test(n) && !existsSync(join(자리, n))).flatMap((n) => {
    const 글 = 안전히읽기(둘곳(o), n, 파일상한);
    return 글 === null ? [] : [[n, 글] as const];
  }));
  // 못 쓰는 것을 빼면 그것을 쓰던 것도 못 쓰게 된다 — 더 안 빠질 때까지
  for (let 앞 = -1; 앞 !== 남은.size; ) {
    앞 = 남은.size;
    const 있는 = new Set([...남은.keys()].map((n) => join(자리, n)));
    for (const [n, 글] of 남은) if (!쓸수있나(글, 자리, 있는)) 남은.delete(n);
  }
  for (const [이름, 글] of 남은) {
    try {
      writeFileSync(join(자리, 이름), 글, { mode: 0o644, flag: 'wx' });
    } catch {
      continue; // 링크가 그 자리에 있다
    }
    if (자식 !== null) chownSync(join(자리, 이름), 자식.uid, 자식.gid);
    가져온.push(이름);
  }
  return 가져온;
}
