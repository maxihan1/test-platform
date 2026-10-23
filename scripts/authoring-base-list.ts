// 돌려 보기 · 빠른 검사 명령이 이번 작성이 바꾼 파일을 고른다 — 자식은 사본의 bare git 을 못 읽어 에이전트가 둔 기준 tests 목록과 견준다 (SPEC 도메인/작성 §3.6 「돌려 보기 명령」)
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';

import { 친다 } from './authoring-io.js';
import { 바뀐파일들 } from './authoring-status.js';

/** 에이전트가 자료 폴더에 두는 기준 목록 — `git ls-tree -r -z <기준> -- tests` 가 낸 글 그대로 */
export const 기준목록이름 = 'tests-base.z';

/** git 의 blob 지문 — 고쳤다 되돌린 파일은 `git diff` 처럼 안 바뀐 것으로 본다 */
const 지문 = (몸: Buffer) => createHash('sha1').update(`blob ${몸.length}\0`).update(몸).digest('hex');

/**
 * 기준 목록과 지금 트리의 tests 를 견줘 고친 · 지운 · 새 파일(저장소 기준 경로). 모드도 견준다 — `git diff` 는 실행 권한만 바꾼 파일도 낸다.
 * 링크는 따라가지 않고 링크 글을 견준다 — git 이 그렇게 담는다. 무시 목록(.DS_Store 같은)은 안 거른다 — 케이스가 가져오지 않아 고르는 데 안 걸린다
 */
function 기준과다른것(트리: string, 목록글: string): string[] {
  const 기준 = new Map<string, string>();
  for (const 항목 of 목록글.split('\0')) {
    const 탭 = 항목.indexOf('\t');
    if (탭 < 0) continue;
    const [모드, 종류, sha] = 항목.slice(0, 탭).split(' ');
    if (종류 === 'blob' && sha !== undefined) 기준.set(항목.slice(탭 + 1), `${모드} ${sha}`);
  }
  const 지금 = new Map<string, string>();
  const 훑기 = (상대: string): void => {
    for (const d of readdirSync(join(트리, 상대), { withFileTypes: true })) {
      const 길 = `${상대}/${d.name}`;
      const 자리 = join(트리, 길);
      if (d.isDirectory()) 훑기(길);
      // 파이프 같은 것은 읽으면 멈추고 git 도 안 담는다. 실행 권한은 git 처럼 주인 비트만 본다
      else if (d.isSymbolicLink()) 지금.set(길, `120000 ${지문(Buffer.from(readlinkSync(자리)))}`);
      else if (d.isFile()) 지금.set(길, `${lstatSync(자리).mode & 0o100 ? '100755' : '100644'} ${지문(readFileSync(자리))}`);
    }
  };
  if (existsSync(join(트리, 'tests'))) 훑기('tests');
  return [...new Set([...기준.keys(), ...지금.keys()])].filter((f) => 기준.get(f) !== 지금.get(f)).sort();
}

/**
 * 바뀐 파일(저장소 기준 경로) — 에이전트가 기준 목록(`AUTHORING_BASE_LIST`)을 주면 그것과 견준 tests 안의 차이, 없으면 작업 트리 상태.
 * 사본 트리에는 `.git` 이 없고 서버에서는 자식이 bare git 을 못 읽어 git 으로는 기준과의 차이를 못 센다(리뷰 M19)
 */
export function 바뀐것(트리: string, 기준목록: string | undefined): string[] | { 까닭: string } {
  if (기준목록 === undefined || 기준목록 === '') {
    const 상태 = 친다('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], 트리);
    return 상태.ok ? 바뀐파일들(상태.낸것) : { 까닭: 상태.까닭 };
  }
  try {
    return 기준과다른것(트리, readFileSync(기준목록, 'utf8'));
  } catch (e) {
    return { 까닭: e instanceof Error ? e.message : String(e) };
  }
}
