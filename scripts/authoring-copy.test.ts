// 작업마다 따로 만드는 사본(자식 격리)의 자리·명령·git 환경 검사. 마지막 묶음은 진짜 git 으로 돈다
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  계정들,
  남은사본,
  바탕거부사유,
  부품링크,
  동시상한,
  사본자리,
  사본제외,
  사본준비,
  사본환경,
  저장소이름,
  파일거부사유,
  호스트환경,
} from './authoring-copy.js';

describe('동시상한 — 동시에 도는 작업 수', () => {
  it('비면 2 다 (2026-09-24 게이트 1) · 1~8 만 받는다', () => {
    expect(동시상한({})).toBe(2);
    expect(동시상한({ AUTHORING_MAX_PARALLEL: '3' })).toBe(3);
    expect(동시상한({ AUTHORING_MAX_PARALLEL: '0' })).toEqual({ 까닭: expect.stringContaining('AUTHORING_MAX_PARALLEL') });
    expect(동시상한({ AUTHORING_MAX_PARALLEL: 'lots' })).toEqual({
      까닭: expect.stringContaining('AUTHORING_MAX_PARALLEL'),
    });
  });
});

describe('계정들 — 자리마다 자식 uid 를 따로, 서버 저장소 일은 호스트 uid 로', () => {
  const env = { AUTHORING_CHILD_UID: '20000', HOST_UID: '501', HOST_GID: '20' };

  it('root 가 아니면(맥) 가르지 않는다 — uid 를 바꿀 권한이 없다', () => {
    expect(계정들(env, 2, 501)).toBeNull();
  });

  it('root 면 자리 k 의 자식은 기본값 + k 다. 자식끼리도 서로의 environ·트리를 못 본다', () => {
    expect(계정들(env, 2, 0)).toEqual({
      자식: [
        { uid: 20000, gid: 20000 },
        { uid: 20001, gid: 20001 },
      ],
      호스트: { uid: 501, gid: 20 },
    });
  });

  it('root 인데 자식 uid 칸이 비면 거부한다 — 자식이 root 로 돌면 격리가 조용히 꺼진다', () => {
    expect(계정들({ HOST_UID: '501' }, 2, 0)).toEqual({ 까닭: expect.stringContaining('AUTHORING_CHILD_UID') });
  });

  it('root 인데 호스트 uid 가 비면 거부한다 — 병합 뒤 당기기가 root 소유 파일을 남긴다', () => {
    expect(계정들({ AUTHORING_CHILD_UID: '20000' }, 2, 0)).toEqual({ 까닭: expect.stringContaining('HOST_UID') });
  });

  it('자식 gid 가 호스트 gid 와 겹치면 거부한다 — 서버 저장소의 그룹 쓰기 파일에 쓴다', () => {
    expect(계정들({ AUTHORING_CHILD_UID: '20000', HOST_UID: '1000', HOST_GID: '20001' }, 2, 0)).toEqual({
      까닭: expect.stringContaining('HOST_GID'),
    });
  });

  it('자식 uid 가 0 이나 호스트 uid 와 겹치면 거부한다', () => {
    expect(계정들({ ...env, AUTHORING_CHILD_UID: '0' }, 1, 0)).toEqual({ 까닭: expect.any(String) });
    expect(계정들({ ...env, AUTHORING_CHILD_UID: '500' }, 2, 0)).toEqual({ 까닭: expect.stringContaining('501') });
  });

  it('HOST_GID 가 비면 HOST_UID 와 같게 둔다', () => {
    expect(계정들({ AUTHORING_CHILD_UID: '20000', HOST_UID: '1000' }, 1, 0)).toEqual({
      자식: [{ uid: 20000, gid: 20000 }],
      호스트: { uid: 1000, gid: 1000 },
    });
  });
});

describe('사본자리', () => {
  it('바탕 아래 author-<번호> 에 git·트리·집·자료·gh·임시를 둔다', () => {
    expect(사본자리(12, '/w')).toEqual({
      뿌리: '/w/author-12',
      git: '/w/author-12/git',
      트리: '/w/author-12/tree',
      집: '/w/author-12/home',
      자료: '/w/author-12/assets',
      gh: '/w/author-12/gh',
      임시: '/w/author-12/tmp',
    });
  });
});

describe('호스트환경 — 서버 저장소에 쓰는 git(호스트 uid)의 환경', () => {
  it('PATH · 호스트 집 · GitHub 자격증명만 — 에이전트·Claude 토큰은 안 넘긴다', () => {
    const 부모 = {
      PATH: '/bin',
      HOST_HOME: '/tmp/h',
      GH_TOKEN: 'ghp_x',
      AUTHORING_AGENT_TOKEN: 'tpa_x',
      CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-x',
    };
    expect(호스트환경(부모)).toEqual({ PATH: '/bin', HOME: '/tmp/h', GH_TOKEN: 'ghp_x' });
  });

  it('호스트 집이 비면 시작 스크립트가 만드는 자리다', () => {
    expect(호스트환경({ PATH: '/bin' }).HOME).toBe('/tmp/author-host-home');
  });
});

describe('부품링크 — 사본의 node_modules', () => {
  it('바깥 부품은 원천 것을 가리키고, @platform 셋은 사본 안의 packages·apps 를 가리킨다', () => {
    expect(부품링크(['.bin', '@types', '@platform', 'vitest'], '/repo/node_modules', '/w/author-1/tree')).toEqual([
      ['/repo/node_modules/.bin', '/w/author-1/tree/node_modules/.bin'],
      ['/repo/node_modules/@types', '/w/author-1/tree/node_modules/@types'],
      ['/repo/node_modules/vitest', '/w/author-1/tree/node_modules/vitest'],
      ['../../packages/kit', '/w/author-1/tree/node_modules/@platform/kit'],
      ['../../apps/admin', '/w/author-1/tree/node_modules/@platform/admin'],
      ['../../apps/runner', '/w/author-1/tree/node_modules/@platform/runner'],
    ]);
  });
});

describe('바탕거부사유 — 사본 바탕이 공용 임시 아래면 켜지 않는다', () => {
  it('root 면 /tmp · /var/tmp · /dev/shm 아래를 거부한다 — 거두기의 흔적 지우기가 사본(만든 케이스)까지 지운다', () => {
    expect(바탕거부사유('/tmp/x/authoring-work', true)).toContain('AUTHORING_WORK_DIR');
    expect(바탕거부사유('/var/tmp/w', true)).not.toBeNull();
    expect(바탕거부사유('/dev/shm/w', true)).not.toBeNull();
    expect(바탕거부사유('/work', true)).toBeNull();
  });

  it('맥(root 아님)은 지우기를 안 하니 OS 임시 폴더여도 된다', () => {
    expect(바탕거부사유('/tmp/authoring-work', false)).toBeNull();
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
    mkdirSync(join(자리.트리, 'node_modules', '@platform'), { recursive: true });
    symlinkSync(join(원천, 'node_modules'), join(자리.트리, 'node_modules', 'x'));
    symlinkSync('../../a.txt', join(자리.트리, 'node_modules', '@platform', 'kit'));

    const env = 사본환경(자리);
    expect(친다(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('');
    writeFileSync(join(자리.트리, 'b.txt'), 'b\n');
    expect(친다(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('?? b.txt\n');
  });
});
