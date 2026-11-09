// 케이스를 쓰는 저장소 가르기 · 거울 자리 · 바탕 파일 · 대상 저장소 사본(진짜 git) 검사 (도메인/작성 「케이스를 쓰고 PR 을 올리는 곳」)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { 사본자리, 사본환경 } from './authoring-copy.js';
import {
  PR저장소거부사유,
  거울자리,
  대상사본제외,
  대상사본준비,
  대상펼칠것,
  도구에서뺄것,
  도구풀기,
  자기저장소인가,
  저장소고르기,
  저장소뿌리경로,
  풀기,
} from './authoring-repo.js';
import { 바탕파일, 바탕파일거부사유 } from './authoring-repo-base.js';

describe('저장소고르기 — 설정의 testsRepo', () => {
  it('https://github.com/<소유자>/<이름> 꼴이면 자리를 낸다 — 끝의 .git · / 는 뗀다', () => {
    expect(저장소고르기('DMW', 'https://github.com/maxihan1/demo-market.git')).toEqual({ 자리: 'maxihan1/demo-market' });
  });

  it.each([[''], ['git@github.com:maxihan1/demo-market.git'], ['https://gitlab.com/a/b'], [undefined]])('%s 는 사유 — 그 서비스 작성을 집지 않는다', (값) => {
    expect(저장소고르기('DMW', 값)).toEqual({ 사유: expect.stringContaining('DMW 의 테스트 저장소') });
  });
});

describe('자기저장소인가 — 켠 체크아웃의 origin 과 같은 저장소면 지금 길 그대로', () => {
  it('https · ssh 원격 모두, 대소문자를 안 가린다', () => {
    expect(자기저장소인가('maxihan1/test-platform', 'git@github.com:maxihan1/test-platform.git')).toBe(true);
    expect(자기저장소인가('MaxiHan1/Test-Platform', 'https://github.com/maxihan1/test-platform')).toBe(true);
    expect(자기저장소인가('maxihan1/demo-market', 'https://github.com/maxihan1/test-platform.git')).toBe(false);
  });
});

describe('거울자리', () => {
  it('사본 바탕 아래 repos/<소유자>/<이름>.git — author-<번호> 가 아니라 보관 훑기가 안 지운다', () => {
    expect(거울자리('/work', 'maxihan1/demo-market')).toBe('/work/repos/maxihan1/demo-market.git');
  });
});

describe('PR저장소거부사유 — 저장소 칸을 옮긴 뒤 옛 저장소 PR 을 새 거울로 판정하지 않는다', () => {
  it('설정 저장소의 PR 이면 통과, 다르면 막는다', () => {
    expect(PR저장소거부사유('https://github.com/maxihan1/demo-market/pull/3', 'maxihan1/demo-market')).toBeNull();
    expect(PR저장소거부사유('https://github.com/maxihan1/test-platform/pull/3', 'maxihan1/demo-market')).toMatch(/설정의 테스트 저장소/);
    expect(PR저장소거부사유('https://github.com/maxihan1/demo-market/pull/3/files', 'maxihan1/demo-market')).not.toBeNull();
  });
});

describe('저장소뿌리경로 — 스캐너 filePath 두 꼴을 저장소 뿌리 기준으로', () => {
  it('받아 온 자리 기준이면 앞 두 칸을 뗀다', () => {
    expect(저장소뿌리경로('maxihan1/demo-market/tests/dmw/DMW-FN-001.spec.ts')).toBe('tests/dmw/DMW-FN-001.spec.ts');
    expect(저장소뿌리경로('maxihan1/test-platform/tests/todo/TODO-001.spec.ts')).toBe('tests/todo/TODO-001.spec.ts');
  });

  it('테스트 뿌리 기준(사본 · 옛 서버)이면 tests/ 를 붙인다', () => {
    expect(저장소뿌리경로('dmw/DMW-FN-001.spec.ts')).toBe('tests/dmw/DMW-FN-001.spec.ts');
  });
});

describe('바탕 파일 — 저장소마다 같은 글이라 두 건이 겹쳐도 충돌하지 않는다', () => {
  it('package.json 은 kit · Playwright 판을 묶고 @types/node 는 Commander 와 같은 판이다', () => {
    const 패키지 = JSON.parse(바탕파일['tests/package.json']!) as { name?: string; type: string; devDependencies: Record<string, string> };
    const 루트 = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
    expect(패키지.name).toBeUndefined();
    expect(패키지.type).toBe('module');
    expect(패키지.devDependencies['@playwright/test']).toBe(루트.devDependencies['@playwright/test']);
    expect(패키지.devDependencies['@types/node']).toBe(루트.devDependencies['@types/node']);
    expect(패키지.devDependencies['@platform/kit']).toMatch(/^github:maxihan1\/platform-kit#v\d+\.\d+\.\d+$/);
  });

  it('설정은 project 이름 셋 · baseURL 환경 변수를 쓰고 tsconfig 는 skipLibCheck 를 켠다 (SETUP §21)', () => {
    const 설정 = 바탕파일['tests/playwright.config.ts']!;
    for (const 이름 of ["'desktop'", "'mobile'", "'android'", 'process.env.PLATFORM_BASE_URL']) expect(설정).toContain(이름);
    expect(JSON.parse(바탕파일['tests/tsconfig.json']!)).toMatchObject({ compilerOptions: { skipLibCheck: true, types: ['node'] } });
  });

  const 고정 = (f: string) => 바탕파일[f] ?? null;
  it('대상 저장소에 없던 것을 고정 글로 새로 만들 때만 받는다', () => {
    expect(바탕파일거부사유(['tests/package.json', 'tests/dmw/DMW-001.spec.ts'], () => false, 고정, true)).toBeNull();
    expect(바탕파일거부사유(['tests/package.json'], () => true, 고정, true)).toMatch(/이미 있는/);
    expect(바탕파일거부사유(['tests/tsconfig.json'], () => false, () => '{}', true)).toMatch(/꼴과 다르다/);
  });

  it('Commander 에는 절대 안 넣는다 · 바탕 파일이 없으면 아무것도 안 본다', () => {
    expect(바탕파일거부사유(['tests/playwright.config.ts'], () => false, 고정, false)).toMatch(/Commander/);
    expect(바탕파일거부사유(['tests/dmw/DMW-001.spec.ts'], () => { throw new Error('묻지 않는다'); }, 고정, false)).toBeNull();
  });
});

describe('진짜 git — 대상 저장소 사본은 Commander 도구 위에 대상의 tests · docs/cases 만 얹는다', () => {
  const 바탕 = mkdtempSync(join(tmpdir(), 'authoring-repo-test-'));
  afterAll(() => rmSync(바탕, { recursive: true, force: true }));
  // GIT_* 를 뺀다 — pre-push 훅 안에서는 git 이 GIT_DIR 을 넣어 두어 이 저장소를 친다 (authoring-copy.test 와 같은 까닭)
  const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([키]) => !키.startsWith('GIT_')));
  const 깃 = (인자: string[], cwd: string, env?: Record<string, string>) => spawnSync('git', 인자, { cwd, encoding: 'utf8', env: { ...깨끗한환경, ...env } });
  const 저장소 = (이름: string, 파일들: Record<string, string>) => {
    const 자리 = join(바탕, 이름);
    for (const [f, 글] of Object.entries(파일들)) {
      mkdirSync(dirname(join(자리, f)), { recursive: true });
      writeFileSync(join(자리, f), 글);
    }
    깃(['init', '-q', '-b', 'main'], 자리);
    깃(['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.'], 자리);
    깃(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'x'], 자리);
    return { 자리, sha: 깃(['rev-parse', 'HEAD'], 자리).stdout.trim() };
  };

  it('Commander 의 TODO 는 빠지고 대상 제품 코드는 안 풀리며, status · diff 는 대상의 테스트만 본다', () => {
    const 도구 = 저장소('commander', {
      'package.json': '{"name":"commander"}\n',
      'playwright.config.ts': 'export default {};\n',
      'apps/x.ts': 'export {};\n',
      'tests/todo/TODO-001.spec.ts': 'todo\n',
      'docs/cases/TODO.md': '# TODO\n',
      'docs/other.md': '문서\n',
    });
    const 대상 = 저장소('demo-market', {
      'package.json': '{"name":"demo-market"}\n',
      'src/app.ts': 'app\n',
      'tests/dmw/DMW-001.spec.ts': 'dmw\n',
      'docs/cases/DMW.md': '# DMW\n',
      'docs/README.md': '대상 문서\n',
    });

    const 자리 = 사본자리(1, 바탕);
    mkdirSync(자리.트리, { recursive: true });
    const 친다 = (c: { 명령: string; 인자: string[] }) => {
      const r = spawnSync(c.명령, c.인자, { encoding: 'utf8', env: 깨끗한환경 });
      expect(r.status, `${c.인자.join(' ')}: ${r.stderr}`).toBe(0);
    };
    도구풀기({ 원천: 도구.자리, sha: 도구.sha }, 자리).forEach(친다);
    for (const 뺄것 of 도구에서뺄것) rmSync(join(자리.트리, 뺄것), { recursive: true, force: true });
    대상사본준비(자리, 대상.자리, 대상.자리, 대상.sha).forEach(친다);
    writeFileSync(join(자리.git, 'info', 'sparse-checkout'), 대상펼칠것);
    writeFileSync(join(자리.git, 'info', 'exclude'), 대상사본제외);
    친다(풀기(자리, 대상.sha));
    mkdirSync(join(자리.트리, 'node_modules'));
    symlinkSync(도구.자리, join(자리.트리, 'node_modules', 'x'));

    const 있나 = (f: string) => existsSync(join(자리.트리, f));
    expect(['apps/x.ts', 'playwright.config.ts', 'docs/other.md', 'tests/dmw/DMW-001.spec.ts', 'docs/cases/DMW.md'].filter((f) => !있나(f))).toEqual([]);
    expect(['tests/todo/TODO-001.spec.ts', 'docs/cases/TODO.md', 'src/app.ts', 'docs/README.md'].filter(있나)).toEqual([]);
    expect(readFileSync(join(자리.트리, 'package.json'), 'utf8')).toContain('commander');

    const env = 사본환경(자리);
    expect(깃(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('');
    writeFileSync(join(자리.트리, 'tests', 'dmw', 'DMW-002.spec.ts'), 'dmw2\n');
    writeFileSync(join(자리.트리, 'docs', 'other.md'), '자식이 고친 Commander 문서\n');
    writeFileSync(join(자리.트리, 'stray.log'), 'x\n');
    expect(깃(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('?? tests/dmw/DMW-002.spec.ts\n');

    expect(깃(['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '--', 'tests/dmw/DMW-002.spec.ts'], 자리.트리, env).status).toBe(0);
    expect(깃(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'y'], 자리.트리, env).status).toBe(0);
    expect(깃(['diff', '--name-only', `${대상.sha}...HEAD`], 자리.트리, env).stdout).toBe('tests/dmw/DMW-002.spec.ts\n');
    expect(깃(['remote', 'get-url', 'origin'], 자리.트리, env).stdout.trim()).toBe(대상.자리);
    // 보류 반영이 트리를 되돌리고 자식 커밋으로 가도 Commander 도구는 그대로다
    expect(깃(['reset', '-q', '--hard'], 자리.트리, env).status).toBe(0);
    expect(깃(['-c', 'core.hooksPath=/dev/null', 'checkout', '-q', '--detach', '-f', 대상.sha], 자리.트리, env).status).toBe(0);
    expect(readFileSync(join(자리.트리, 'package.json'), 'utf8')).toContain('commander');
    expect(있나('tests/dmw/DMW-002.spec.ts')).toBe(false);
    expect(깃(['status', '--porcelain', '-uall'], 자리.트리, env).stdout).toBe('');
  });
});
