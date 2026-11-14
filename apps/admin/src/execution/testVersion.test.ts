import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 케이스지문, 테스트커밋 } from './testVersion.js';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

describe('테스트 버전', () => {
  let 뿌리: string;
  const 옛값 = process.env.PLATFORM_TESTS_GIT_DIR;

  beforeEach(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'tv-'));
    delete process.env.PLATFORM_TESTS_GIT_DIR;
  });
  afterEach(async () => {
    await rm(뿌리, { recursive: true, force: true });
    if (옛값 === undefined) delete process.env.PLATFORM_TESTS_GIT_DIR;
    else process.env.PLATFORM_TESTS_GIT_DIR = 옛값;
  });

  it('테스트 폴더 위 .git 의 브랜치 파일에서 커밋을 읽는다', async () => {
    await mkdir(join(뿌리, '.git/refs/heads'), { recursive: true });
    await mkdir(join(뿌리, 'tests'));
    await writeFile(join(뿌리, '.git/HEAD'), 'ref: refs/heads/main\n');
    await writeFile(join(뿌리, '.git/refs/heads/main'), `${A}\n`);
    expect(await 테스트커밋(join(뿌리, 'tests'))).toBe(A);
  });

  it('브랜치 파일이 없으면 packed-refs 에서 읽는다', async () => {
    await mkdir(join(뿌리, '.git'), { recursive: true });
    await writeFile(join(뿌리, '.git/HEAD'), 'ref: refs/heads/main\n');
    await writeFile(join(뿌리, '.git/packed-refs'), `# pack-refs with: peeled\n${B} refs/heads/other\n${A} refs/heads/main\n`);
    expect(await 테스트커밋(뿌리)).toBe(A);
  });

  it('작업 폴더의 .git 파일을 따라가 공통 자리의 브랜치를 읽는다', async () => {
    await mkdir(join(뿌리, 'main/.git/worktrees/w'), { recursive: true });
    await mkdir(join(뿌리, 'main/.git/refs/heads'), { recursive: true });
    await mkdir(join(뿌리, 'w/tests'), { recursive: true });
    await writeFile(join(뿌리, 'w/.git'), `gitdir: ${join(뿌리, 'main/.git/worktrees/w')}\n`);
    await writeFile(join(뿌리, 'main/.git/worktrees/w/HEAD'), 'ref: refs/heads/feat\n');
    await writeFile(join(뿌리, 'main/.git/worktrees/w/commondir'), '../..\n');
    await writeFile(join(뿌리, 'main/.git/refs/heads/feat'), B);
    expect(await 테스트커밋(join(뿌리, 'w/tests'))).toBe(B);
  });

  it('떼어 낸 HEAD 는 그 커밋이고, 붙인 자리를 환경 값으로 받는다', async () => {
    await mkdir(join(뿌리, 'repo.git'));
    await writeFile(join(뿌리, 'repo.git/HEAD'), A);
    process.env.PLATFORM_TESTS_GIT_DIR = join(뿌리, 'repo.git');
    expect(await 테스트커밋('/어디든')).toBe(A);
  });

  it('저장소가 아니면 null', async () => {
    process.env.PLATFORM_TESTS_GIT_DIR = join(뿌리, '없음');
    expect(await 테스트커밋(뿌리)).toBeNull();
  });

  it('케이스 파일 지문은 sha256 이고, 폴더 밖 · 없는 파일은 null', async () => {
    await mkdir(join(뿌리, 'mkt'));
    await writeFile(join(뿌리, 'mkt/MKT-001.spec.ts'), 'export const spec = 1;\n');
    expect(await 케이스지문('mkt/MKT-001.spec.ts', 뿌리)).toBe(createHash('sha256').update('export const spec = 1;\n').digest('hex'));
    expect(await 케이스지문('../밖.ts', 뿌리)).toBeNull();
    expect(await 케이스지문('mkt/없음.spec.ts', 뿌리)).toBeNull();
  });
});
