// 미확정 꼬리표 규칙 K11 과 「이미 있던 케이스에 새로 단 꼬리표」 판별을 검사한다

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { checkSource } from './rules.js';
import { gitEnv, newlyUnconfirmed, oldSourceByTcId } from './unconfirmed.js';

function 케이스(extra: string, head = ''): string {
  return `import { defineCase, test, verify } from '@platform/kit';
${head}
export const spec = defineCase({
  tcId: 'DEMO-001',
  name: '메인 화면이 열린다',
  precondition: [],
  params: null,
  expected: null,
  ${extra}
});

test(spec, async ({ page }) => {
  await test.step('화면을 연다', async () => {
    await verify('제목이 보인다', true, true);
  });
});
`;
}

function k11(source: string): string[] {
  return checkSource('x.spec.ts', source)
    .violations.filter((v) => v.rule === 'K11')
    .map((v) => v.what);
}

describe('K11 — unconfirmed 는 비지 않은 문자열 리터럴', () => {
  it('① 사유 리터럴은 통과한다', () => {
    expect(k11(케이스(`unconfirmed: '기획서와 다름',`))).toEqual([]);
  });

  it('② 빈 문자열은 위반이다', () => {
    expect(k11(케이스(`unconfirmed: '',`))).toHaveLength(1);
  });

  it('③ 공백뿐인 문자열은 위반이다', () => {
    expect(k11(케이스(`unconfirmed: '   ',`))).toHaveLength(1);
  });

  it('④ 변수는 위반이다', () => {
    expect(k11(케이스(`unconfirmed: 사유,`, `const 사유 = '기획서와 다름';`))).toHaveLength(1);
  });

  it('⑤ 템플릿 식은 위반이다', () => {
    expect(k11(케이스('unconfirmed: `a${b}`,', `const b = 'x';`))).toHaveLength(1);
  });

  it('⑥ 키가 없으면 통과한다', () => {
    expect(k11(케이스(''))).toEqual([]);
  });

  it('⑦ 축약 { unconfirmed } 는 위반이다', () => {
    expect(k11(케이스('unconfirmed,', `const unconfirmed = '기획서와 다름';`))).toHaveLength(1);
  });

  it('⑧ 펼침이 있으면 위반이다 — 사유를 글자로 못 읽는다', () => {
    expect(k11(케이스('...base,', `const base = { unconfirmed: '기획서와 다름' };`))).toHaveLength(1);
  });
});

describe('newlyUnconfirmed — 이미 있던 케이스에 새로 단 꼬리표', () => {
  const 없음 = 케이스('');
  const 있음 = 케이스(`unconfirmed: '기획서와 다름',`);

  it('전에 없던 파일이면 false — 새 케이스는 역방향이 원래 단다', () => {
    expect(newlyUnconfirmed(null, 있음)).toBe(false);
  });

  it('전에 꼬리표가 없고 지금 있으면 true', () => {
    expect(newlyUnconfirmed(없음, 있음)).toBe(true);
  });

  it('전에도 있었으면 false', () => {
    expect(newlyUnconfirmed(있음, 있음)).toBe(false);
  });

  it('지금 없으면 false', () => {
    expect(newlyUnconfirmed(있음, 없음)).toBe(false);
  });
});

describe('oldSourceByTcId — origin/main 에서 tcId 로 옛 본문을 찾는다', () => {
  const repo = mkdtempSync(join(tmpdir(), 'unconfirmed-'));
  const git = (...args: string[]): string =>
    execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
      encoding: 'utf8',
      env: gitEnv(),
    });
  const 옛본문 = 케이스('');
  const 새본문 = 케이스(`unconfirmed: '기획서와 다름',`);

  mkdirSync(join(repo, 'tests', 'demo'), { recursive: true });
  writeFileSync(join(repo, 'tests', 'demo', 'DEMO-001.spec.ts'), 옛본문);
  git('init', '-q');
  git('add', '.');
  git('commit', '-q', '--no-verify', '-m', 'init');
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');

  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  it('꼬리표 없이 커밋된 케이스에 꼬리표를 달면 새 꼬리표로 잡힌다', async () => {
    writeFileSync(join(repo, 'tests', 'demo', 'DEMO-001.spec.ts'), 새본문);
    const before = await oldSourceByTcId(repo, 'DEMO-001');
    expect(before).toBe(옛본문);
    expect(newlyUnconfirmed(before, 새본문)).toBe(true);
  });

  it('파일을 다른 경로로 옮기며 꼬리표를 달아도 tcId 로 따라간다', async () => {
    rmSync(join(repo, 'tests', 'demo', 'DEMO-001.spec.ts'));
    mkdirSync(join(repo, 'tests', 'moved'), { recursive: true });
    writeFileSync(join(repo, 'tests', 'moved', 'renamed.spec.ts'), 새본문);
    expect(newlyUnconfirmed(await oldSourceByTcId(repo, 'DEMO-001'), 새본문)).toBe(true);
  });

  it('origin/main 에 없는 tcId 는 null', async () => {
    expect(await oldSourceByTcId(repo, 'NEW-001')).toBeNull();
  });

  it('훅이 물려준 GIT_DIR 이 다른 저장소를 가리켜도 주어진 폴더의 저장소를 읽는다', async () => {
    const 미끼 = mkdtempSync(join(tmpdir(), 'unconfirmed-decoy-'));
    execFileSync('git', ['-C', 미끼, 'init', '-q'], { env: gitEnv() });
    const 전 = process.env.GIT_DIR;
    process.env.GIT_DIR = join(미끼, '.git');
    try {
      expect(await oldSourceByTcId(repo, 'DEMO-001')).toBe(옛본문);
    } finally {
      if (전 === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = 전;
      rmSync(미끼, { recursive: true, force: true });
    }
  });
});
