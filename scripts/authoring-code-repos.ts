// 게임 애플리케이션 코드 저장소를 자료 폴더에 얕게 받아 둔다 — 작성 AI 가 가이드에 빠진 게임 사실을 코드에서 찾는다 (SPEC 도메인/작성 §3.6 「가이드와 게임 코드 맞춰 보기」)

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { 저장소이름 } from './authoring-bugfix-prompt.js';
import { 돌린다 } from './authoring-spawn.js';

/** 받았으면 폴더, 못 받았으면 까닭 — 못 받아도 작성은 간다(결과 요약 「못 읽은 자료」) */
export type 받은저장소 = { 주소: string; 폴더: string } | { 주소: string; 까닭: string };

/** 자료 폴더 안 자리 — 이어받은 폴더에 앞 사본이 있으면 지우고 다시 받는다 */
export const 코드자리 = 'code';

/**
 * 앞 사본을 통째로 지운다 — 앞 자식이 `code` 자리를 링크로 바꿔 두었어도 rm 은 링크만 지워 그 너머로 안 쓴다.
 * 비밀번호 가리기 앞에 부른다 — 가리기가 자료 폴더를 다 훑어 큰 저장소에 시간을 쓰지 않게
 */
export function 코드자리비우기(자료폴더: string): void {
  rmSync(join(자료폴더, 코드자리), { recursive: true, force: true });
}

/**
 * 저장소마다 기본 브랜치 머리 한 판만 받고 `.git` 은 지운다 — 자식은 읽기만 하고 git 을 안 쓴다.
 * 훅 자리를 비워 받는다 — 전역 core.hooksPath 가 있어도 남의 저장소를 받는 동안 에이전트 권한으로 아무것도 돌지 않게
 */
export async function 코드저장소받기(저장소들: readonly { name: string; url: string }[], 자료폴더: string, env: NodeJS.ProcessEnv, 멈추라했다: () => boolean = () => false): Promise<받은저장소[]> {
  const 받은것: 받은저장소[] = [];
  코드자리비우기(자료폴더);
  for (const [i, r] of 저장소들.entries()) {
    if (멈추라했다()) break;
    const 이름 = 저장소이름(r.url);
    if (이름 === null) {
      받은것.push({ 주소: r.url, 까닭: 'github.com 주소가 아니라 받지 않았다' });
      continue;
    }
    // 이름이 겹치거나 경로 글자가 섞여도 자리가 갈리게 번호를 붙인다
    const 폴더 = join(자료폴더, 코드자리, `${String(i + 1)}-${이름.replace('/', '__')}`);
    // LFS 그림 · 소리는 받지 않는다 — 게임 저장소는 몇 GB 라 10분 안에 못 받고, 읽을 것은 코드다
    const 받기 = await 돌린다('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'filter.lfs.smudge=', '-c', 'filter.lfs.process=', '-c', 'filter.lfs.required=false', 'clone', '-q', '--depth', '1', '--single-branch', `https://github.com/${이름}`, 폴더], {
      cwd: 자료폴더,
      env: { ...env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' },
      제한: 10 * 60_000,
    });
    if (받기.코드 !== 0) {
      rmSync(폴더, { recursive: true, force: true });
      받은것.push({ 주소: r.url, 까닭: `못 받았다 — ${받기.시간초과 ? '시간 초과' : (받기.오류.trim().split('\n').pop() ?? '')}` });
      continue;
    }
    rmSync(join(폴더, '.git'), { recursive: true, force: true });
    받은것.push({ 주소: r.url, 폴더 });
  }
  return 받은것;
}
