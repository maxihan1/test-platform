// 실행 때의 테스트 버전 — 테스트 저장소 커밋과 케이스 파일 지문. QA 리포트 「변경 사항 — 테스트」가 앞 빌드와 견준다 (도메인/리포팅 §3.17)

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { testsRoot } from '../catalog/scanner.js';

const 읽기 = (경로: string): Promise<string | null> => readFile(경로, 'utf8').then((t) => t.trim(), () => null);

/** 테스트 폴더를 품은 저장소의 .git. 컨테이너는 /tests 만 받아 위로 올라가도 없다 — compose 가 .git 을 따로 붙이고 PLATFORM_TESTS_GIT_DIR 로 알린다 */
async function git자리(뿌리: string): Promise<string | null> {
  if (process.env.PLATFORM_TESTS_GIT_DIR) return process.env.PLATFORM_TESTS_GIT_DIR;
  for (let 여기 = resolve(뿌리); ; 여기 = dirname(여기)) {
    const 후보 = join(여기, '.git');
    const s = await stat(후보).catch(() => null);
    if (s?.isDirectory()) return 후보;
    // 작업 폴더(git worktree)의 .git 은 진짜 자리를 가리키는 한 줄 파일이다
    if (s?.isFile()) {
      const 줄 = /^gitdir:\s*(.+)$/m.exec((await 읽기(후보)) ?? '');
      return 줄 === null ? null : resolve(여기, 줄[1]!);
    }
    if (dirname(여기) === 여기) return null;
  }
}

const 커밋꼴 = /^[0-9a-f]{40}$/;

/**
 * 지금 테스트 폴더의 커밋. git 명령 없이 HEAD · 브랜치 파일 · packed-refs 만 읽는다 — 컨테이너에 붙인 .git 은 다른 uid 것이라 git 이 거절할 수 있고(safe.directory) 파일 몇 개면 된다.
 * 못 읽으면 null 이고 리포트는 커밋 번호만 비운다 — 케이스 지문으로 견주는 일은 그대로 된다
 */
export async function 테스트커밋(뿌리: string = testsRoot()): Promise<string | null> {
  const 자리 = await git자리(뿌리);
  if (자리 === null) return null;
  const 머리 = await 읽기(join(자리, 'HEAD'));
  if (머리 === null) return null;
  if (커밋꼴.test(머리)) return 머리;
  const 가리킴 = /^ref:\s*(refs\/\S+)$/.exec(머리)?.[1];
  if (가리킴 === undefined) return null;
  // 작업 폴더는 브랜치를 공통 자리(commondir)에 둔다
  const 공통이름 = await 읽기(join(자리, 'commondir'));
  const 공통 = 공통이름 === null ? 자리 : resolve(자리, 공통이름);
  for (const 곳 of [자리, 공통]) {
    const 낱 = await 읽기(join(곳, 가리킴));
    if (낱 !== null && 커밋꼴.test(낱)) return 낱;
  }
  const 묶음 = (await 읽기(join(공통, 'packed-refs'))) ?? '';
  for (const 줄 of 묶음.split('\n')) {
    const [sha, 이름] = 줄.split(' ');
    if (이름 === 가리킴 && sha !== undefined && 커밋꼴.test(sha)) return sha;
  }
  return null;
}

/** 케이스 파일 지문(sha256). file_path 는 테스트 폴더 기준이다. 폴더 밖이거나 못 읽으면 null */
export async function 케이스지문(filePath: string, 뿌리: string = testsRoot()): Promise<string | null> {
  const 절대 = resolve(뿌리, filePath);
  if (!절대.startsWith(resolve(뿌리) + sep)) return null;
  const 글 = await readFile(절대).catch(() => null);
  return 글 === null ? null : createHash('sha256').update(글).digest('hex');
}
