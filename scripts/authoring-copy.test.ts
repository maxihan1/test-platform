// 작업마다 따로 만드는 사본(자식 격리)의 자리·명령·git 환경 검사. 마지막 묶음은 진짜 git 으로 돈다
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { 남은사본, 사본자리, 사본제외, 사본준비, 사본환경, 저장소이름, 파일거부사유 } from './authoring-copy.js';

describe('사본자리', () => {
  it('바탕 아래 author-<번호> 에 git·트리·집·자료·gh 를 둔다', () => {
    expect(사본자리(12, '/w')).toEqual({
      뿌리: '/w/author-12',
      git: '/w/author-12/git',
      트리: '/w/author-12/tree',
      집: '/w/author-12/home',
      자료: '/w/author-12/assets',
      gh: '/w/author-12/gh',
    });
  });
});

describe('남은사본 — 켤 때 지울 것', () => {
  it('author-<숫자> 만 고른다. 바탕에 딴 것이 있어도 안 건드린다', () => {
    expect(남은사본(['author-3', 'author-x', 'keep', 'author-12', 'author-3.bak'])).toEqual(['author-3', 'author-12']);
  });
});

describe('사본준비', () => {
  it('bare 로 받고 → 원격을 GitHub 로 → 그 SHA 를 받고 → 트리에 푼다. 순서 그대로', () => {
    const 자리 = 사본자리(7, '/w');
    const sha = 'a'.repeat(40);
    expect(사본준비(자리, '/repo', 'https://github.com/o/r.git', sha)).toEqual([
      { 명령: 'git', 인자: ['clone', '-q', '--bare', '--no-hardlinks', '/repo', '/w/author-7/git'] },
      { 명령: 'git', 인자: ['--git-dir=/w/author-7/git', 'remote', 'set-url', 'origin', 'https://github.com/o/r.git'] },
      { 명령: 'git', 인자: ['--git-dir=/w/author-7/git', 'fetch', '-q', 'origin', sha] },
      {
        명령: 'git',
        인자: [
          '--git-dir=/w/author-7/git',
          '--work-tree=/w/author-7/tree',
          '-c',
          'core.hooksPath=/dev/null',
          'checkout',
          '-q',
          '--detach',
          '-f',
          sha,
        ],
      },
    ]);
  });

  it('제외 목록은 node_modules 링크를 잡는다 — .gitignore 의 node_modules/ 는 링크에 안 맞는다', () => {
    expect(사본제외).toBe('/node_modules\n');
  });
});

describe('사본환경 — 자식이 끝난 뒤 에이전트가 트리 안에서 치는 모든 git·gh·판정', () => {
  it('트리 안의 .git 을 안 보고 자식 밖의 git 폴더만 본다. 훅과 fsmonitor 를 끈다', () => {
    expect(사본환경(사본자리(7, '/w'))).toEqual({
      GIT_DIR: '/w/author-7/git',
      GIT_WORK_TREE: '/w/author-7/tree',
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'core.hooksPath',
      GIT_CONFIG_VALUE_0: '/dev/null',
      GIT_CONFIG_KEY_1: 'core.fsmonitor',
      GIT_CONFIG_VALUE_1: 'false',
    });
  });
});

describe('저장소이름 — gh --repo 에 넘긴다', () => {
  it('https·ssh 원격에서 주인/이름을 뽑는다', () => {
    expect(저장소이름('https://github.com/maxihan1/test-platform.git')).toBe('maxihan1/test-platform');
    expect(저장소이름('git@github.com:maxihan1/test-platform.git')).toBe('maxihan1/test-platform');
    expect(저장소이름('https://gitlab.com/a/b')).toBeNull();
  });
});

describe('파일거부사유 — root 가 자식의 파일을 읽기 전에', () => {
  const 트리 = '/w/author-7/tree';

  it('트리 안의 일반 파일과 지워진 파일은 통과다', () => {
    expect(
      파일거부사유(
        [
          { 경로: 'tests/a/X-001.spec.ts', 종류: '파일', 실제: `${트리}/tests/a/X-001.spec.ts` },
          { 경로: 'tests/a/X-002.spec.ts', 종류: '없음', 실제: null },
        ],
        트리,
      ),
    ).toBeNull();
  });

  it('링크는 거부한다 — /proc/1/environ 을 가리키면 토큰이 PR 본문에 실린다', () => {
    expect(파일거부사유([{ 경로: 'docs/cases/X.md', 종류: '링크', 실제: '/proc/1/environ' }], 트리)).toContain(
      'docs/cases/X.md',
    );
  });

  it('일반 파일이 아니면 거부한다 — FIFO 를 읽으면 에이전트 전체가 멈춘다', () => {
    expect(파일거부사유([{ 경로: 'docs/cases/X.md', 종류: '그밖', 실제: `${트리}/docs/cases/X.md` }], 트리)).not.toBeNull();
  });

  it('중간 폴더가 링크라 실제 자리가 트리 밖이면 거부한다', () => {
    expect(파일거부사유([{ 경로: 'docs/cases/X.md', 종류: '파일', 실제: '/root/.gitconfig' }], 트리)).not.toBeNull();
    expect(파일거부사유([{ 경로: 'x', 종류: '파일', 실제: `${트리}-evil/x` }], 트리)).not.toBeNull();
  });
});

describe('진짜 git — 준비 직후 사본이 깨끗하다', () => {
  const 바탕 = mkdtempSync(join(tmpdir(), 'authoring-copy-test-'));
  afterAll(() => rmSync(바탕, { recursive: true, force: true }));

  const 친다 = (인자: string[], cwd: string, env?: Record<string, string>) =>
    spawnSync('git', 인자, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

  it('node_modules 링크가 있어도 바뀐 파일이 0 이고, 새 파일은 사본환경으로 보인다', () => {
    const 원천 = join(바탕, 'src');
    mkdirSync(join(원천, 'node_modules'), { recursive: true });
    writeFileSync(join(원천, '.gitignore'), 'node_modules/\n');
    writeFileSync(join(원천, 'a.txt'), 'a\n');
    친다(['init', '-q', '-b', 'main'], 원천);
    친다(['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], 원천);
    친다(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'x'], 원천);
    const sha = 친다(['rev-parse', 'HEAD'], 원천).stdout.trim();

    const 자리 = 사본자리(1, 바탕);
    mkdirSync(자리.트리, { recursive: true });
    for (const c of 사본준비(자리, 원천, 원천, sha)) {
      const r = spawnSync(c.명령, c.인자, { encoding: 'utf8' });
      expect(r.status, `${c.인자.join(' ')}: ${r.stderr}`).toBe(0);
    }
    writeFileSync(join(자리.git, 'info', 'exclude'), 사본제외);
    symlinkSync(join(원천, 'node_modules'), join(자리.트리, 'node_modules'));

    const env = 사본환경(자리);
    expect(친다(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('');
    writeFileSync(join(자리.트리, 'b.txt'), 'b\n');
    expect(친다(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('?? b.txt\n');
  });
});
