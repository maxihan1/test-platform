// 내 컴퓨터 러너가 케이스의 테스트 저장소를 받아 두고 켤 때와 1분마다 새로 받는다 — 맥 사용자의 gh 로그인으로 (공통/6-인프라 「테스트 코드 저장소」 「받아 오기」)
// 서버 러너는 켜지 않는다(PLATFORM_REPOS_PULL 이 없다) — 거기서는 호스트의 받아 오기(infra/server/tests-pull.sh)가 채우고 러너는 읽기만 한다

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const 돌린다 = promisify(execFile);

// admin 의 settings/testsRepo.ts 와 같은 꼴이다. 러너 이미지에는 admin 이 없어 여기 다시 적는다
const 자리꼴 = /^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})\/tests\//;

/** 케이스 경로(받아 온 저장소들의 뿌리 기준)의 앞 두 마디 `<소유자>/<이름>`. 그 꼴이 아니면 null */
export function 케이스자리(filePath: string): string | null {
  const m = 자리꼴.exec(filePath);
  if (m === null || m[2] === '.' || m[2] === '..') return null;
  return `${m[1]}/${m[2]}`;
}

// gh 로그인을 그 명령에만 빌린다 — 받은 저장소 설정에 자격을 남기지 않는다. 받은 저장소의 훅은 돌지 않게 끈다
const 인증 = ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', '-c', 'core.hooksPath=/dev/null'];

/**
 * 한 저장소를 받는 git 명령들. 처음이면 임시 자리에 받아 옮긴다 — 반쯤 받은 폴더를 「자리가 있다」로 읽지 않게.
 * 테스트 · 요구사항 표만 풀고(sparse) main 의 머리만 받는다
 */
export function 받기명령(뿌리: string, 자리: string, 있나: boolean): { 인자: string[]; 옮기기?: [string, string] }[] {
  const 곳 = join(뿌리, 자리);
  if (있나) {
    return [
      { 인자: [...인증, '-C', 곳, 'fetch', '-q', '--depth', '1', 'origin', 'main'] },
      { 인자: ['-c', 'core.hooksPath=/dev/null', '-C', 곳, 'reset', '-q', '--hard', 'FETCH_HEAD'] },
    ];
  }
  const 임시 = `${곳}.받는중`;
  return [
    { 인자: [...인증, 'clone', '-q', '--depth', '1', '--sparse', '--branch', 'main', `https://github.com/${자리}`, 임시] },
    { 인자: ['-C', 임시, 'sparse-checkout', 'set', '--no-cone', '/tests/', '/docs/cases/'], 옮기기: [임시, 곳] },
  ];
}

// 같은 저장소를 두 요청이 동시에 받으면 git 잠금이 겹친다 — 저장소마다 차례로 받는다
const 차례 = new Map<string, Promise<void>>();

async function 받기(뿌리: string, 자리: string): Promise<void> {
  const 곳 = join(뿌리, 자리);
  const 있나 = existsSync(join(곳, '.git'));
  if (!있나) await rm(`${곳}.받는중`, { recursive: true, force: true });
  for (const 명령 of 받기명령(뿌리, 자리, 있나)) {
    await 돌린다('git', 명령.인자, { timeout: 300_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    if (명령.옮기기 !== undefined) await rename(...명령.옮기기);
  }
}

function 차례로(뿌리: string, 자리: string): Promise<void> {
  const 앞 = 차례.get(자리) ?? Promise.resolve();
  const 이번 = 앞.then(() => 받기(뿌리, 자리));
  차례.set(자리, 이번.catch(() => undefined));
  return 이번;
}

/** 실행할 케이스의 저장소가 아직 없으면 받아 둔다. 못 받으면 까닭만 남긴다 — 뒤의 「케이스가 없다」(404)가 그 실행의 답이 된다 */
export async function 케이스저장소받기(뿌리: string, filePath: string): Promise<void> {
  const 자리 = 케이스자리(filePath);
  if (자리 === null || existsSync(join(뿌리, 자리, '.git'))) return;
  await 차례로(뿌리, 자리).catch((e: unknown) => console.warn(`[저장소] ${자리} 를 받지 못했다: ${e instanceof Error ? e.message : String(e)}`));
}

/** 받아 둔 저장소를 모두 새로 받는다. 한 저장소가 실패해도 나머지는 받는다 */
export async function 받아둔것새로받기(뿌리: string): Promise<void> {
  const 소유자들 = await readdir(뿌리, { withFileTypes: true }).catch(() => []);
  for (const 소유자 of 소유자들.filter((d) => d.isDirectory() && !d.name.startsWith('.'))) {
    const 이름들 = await readdir(join(뿌리, 소유자.name), { withFileTypes: true }).catch(() => []);
    for (const 이름 of 이름들.filter((d) => d.isDirectory() && existsSync(join(뿌리, 소유자.name, d.name, '.git')))) {
      const 자리 = `${소유자.name}/${이름.name}`;
      await 차례로(뿌리, 자리).catch((e: unknown) => console.warn(`[저장소] ${자리} 를 새로 받지 못했다: ${e instanceof Error ? e.message : String(e)}`));
    }
  }
}

/** 켤 때 한 번, 그 뒤 1분마다. 앞 차례가 안 끝났으면 건너뛴다 */
export function 받아오기켜기(뿌리: string): void {
  let 도는중 = false;
  const 한번 = (): void => {
    if (도는중) return;
    도는중 = true;
    void 받아둔것새로받기(뿌리).finally(() => {
      도는중 = false;
    });
  };
  한번();
  setInterval(한번, 60_000).unref();
}
