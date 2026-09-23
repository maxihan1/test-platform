// 맥이 git·gh 를 어떻게 부를지 정하는 순수 함수 검사. 껍데기는 이 인자를 그대로 친다
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CI실행주소,
  CI판정,
  PR찾기인자,
  PR만들기인자,
  PR본문,
  PR준비인자,
  닫을RUNNING,
  바뀐파일들,
  케이스폴더,
  다시돌릴인자,
  머지인자,
  실행목록인자,
  올릴브랜치,
  작업방준비,
  커밋메시지,
  푸시거부사유,
  PR파일인자,
  머지거부사유,
  커밋뒤거부사유,
  올린파일인자,
  커밋수인자,
  푸시인자,
  플랫폼링크,
  type CI실행,
} from './authoring-chain.js';

describe('케이스 폴더 — 그 접두사의 기존 케이스가 사는 폴더를 찾는다 (2026-09-23 사용자 결정)', () => {
  it('접두사의 케이스가 한 폴더에만 있으면 그 폴더다', () => {
    const 파일들 = ['tests/demo/DEMO-001.spec.ts', 'tests/demo/DEMO-011.spec.ts', 'tests/todo/TODO-001.spec.ts'];
    expect(케이스폴더(파일들, 'DEMO')).toBe('demo');
    expect(케이스폴더(파일들, 'TODO')).toBe('todo');
  });

  it('그 접두사의 케이스가 없으면 모른다 — 첫 케이스는 사람이 /tpx 로 만든다', () => {
    expect(케이스폴더(['tests/todo/TODO-001.spec.ts'], 'PAY')).toBe(null);
  });

  it('두 폴더에 흩어져 있으면 고르지 않는다 — 지어내지 않는다', () => {
    expect(케이스폴더(['tests/a/PAY-001.spec.ts', 'tests/b/PAY-002.spec.ts'], 'PAY')).toBe(null);
  });

  it('접두사가 앞부분만 같은 것은 남의 케이스다', () => {
    expect(케이스폴더(['tests/demox/DEMOX-001.spec.ts'], 'DEMO')).toBe(null);
  });
});

describe('작업방 준비 — fetch · 떼어 낸 작업방 · @platform 심링크', () => {
  const 명령들 = 작업방준비(12, '/r');

  it('옛 origin/main 을 따지 않게 먼저 fetch 한다', () => {
    expect(명령들[0]).toEqual({ 명령: 'git', 인자: ['fetch', 'origin', 'main'] });
  });

  it('브랜치 없이 origin/main 에서 떼어 낸 작업방을 연다', () => {
    expect(명령들[1]).toEqual({
      명령: 'git',
      인자: ['worktree', 'add', '--detach', '/r/.claude/worktrees/author-12', 'origin/main'],
    });
  });

  it('자기 패키지 셋을 작업방 안으로 건다 — 안 걸면 사용자 체크아웃의 kit 을 본다', () => {
    const 폴더 = '/r/.claude/worktrees/author-12/node_modules/@platform';
    expect(명령들.slice(2)).toEqual([
      { 명령: 'mkdir', 인자: ['-p', 폴더] },
      { 명령: 'ln', 인자: ['-sfn', '../../packages/kit', `${폴더}/kit`] },
      { 명령: 'ln', 인자: ['-sfn', '../../apps/admin', `${폴더}/admin`] },
      { 명령: 'ln', 인자: ['-sfn', '../../apps/runner', `${폴더}/runner`] },
    ]);
  });

  it('링크 목록이 tpx-start 스킬의 것과 같다', () => {
    const 스킬 = readFileSync('.claude/skills/tpx-start/SKILL.md', 'utf8');
    for (const [이름, 대상] of 플랫폼링크) {
      expect(스킬).toMatch(new RegExp(`ln -sfn\\s+${대상.replaceAll('.', '\\.')}\\s+<작업방>/node_modules/@platform/${이름}\\b`));
    }
  });
});

describe('올릴 브랜치와 push', () => {
  it('브랜치 이름은 author-<번호>', () => {
    expect(올릴브랜치(7)).toBe('author-7');
  });

  it('로컬 브랜치 없이 HEAD 를 그 이름으로 올린다. 강제 깃발은 없다', () => {
    expect(푸시인자(7)).toEqual(['push', 'origin', 'HEAD:refs/heads/author-7']);
  });
});

describe('커밋 메시지와 PR 본문', () => {
  it('커밋 메시지에 번호와 서비스가 있다', () => {
    const 글 = 커밋메시지(7, 'TODO');
    expect(글).toMatch(/7/);
    expect(글).toMatch(/TODO/);
  });

  it('요구사항 표와 자식 요약을 싣고, 관문 3 의 3회 실행이 병합 근거라고 적는다', () => {
    const 글 = PR본문({ 표: '| 요구 | 케이스 |', 요약: '케이스 4건' });
    expect(글).toContain('| 요구 | 케이스 |');
    expect(글).toContain('케이스 4건');
    expect(글).toMatch(/관문 3.*3회.*병합 근거/);
  });

  it('표가 없으면 표 절을 빼고 요약만 싣는다', () => {
    const 글 = PR본문({ 표: '', 요약: '케이스 4건' });
    expect(글).not.toMatch(/요구사항 표/);
    expect(글).toContain('케이스 4건');
  });

  it('요약도 비면 그 절도 뺀다', () => {
    expect(PR본문({ 표: '  ', 요약: '' })).not.toMatch(/## /);
  });
});

describe('gh 인자', () => {
  const 주소 = 'https://github.com/x/y/pull/3';

  it('PR 은 초안으로, 올린 브랜치에서 main 으로 연다', () => {
    const 인자 = PR만들기인자(7, '제목', '본문');
    expect(인자.slice(0, 3)).toEqual(['pr', 'create', '--draft']);
    expect(인자).toEqual(expect.arrayContaining(['--base', 'main', '--head', 'author-7', '--title', '제목', '--body', '본문']));
  });

  it('초안 해제는 pr ready <주소>', () => {
    expect(PR준비인자(주소)).toEqual(['pr', 'ready', 주소]);
  });

  it('병합 인자가 글자 하나까지 같다 — 강제·관리자 우회가 끼면 깨진다', () => {
    expect(머지인자(주소)).toEqual(['pr', 'merge', 주소, '--merge', '--delete-branch']);
    expect(머지인자(주소).join(' ')).not.toMatch(/--force|-D\b|--admin|--auto/);
  });

  it('실행 목록은 판정에 쓰는 칸을 전부 받는다', () => {
    expect(실행목록인자(7)).toEqual([
      'run',
      'list',
      '--branch',
      'author-7',
      '--workflow',
      'ci',
      '--json',
      'headSha,status,conclusion,databaseId,workflowName',
    ]);
  });
});

describe('CI 판정 — PR head SHA 의 최신 ci 실행을 본다', () => {
  const 실행 = (덮기: Partial<CI실행>): CI실행 => ({
    headSha: 'aaa',
    status: 'completed',
    conclusion: 'success',
    databaseId: 1,
    workflowName: 'ci',
    ...덮기,
  });

  it('그 SHA 의 실행이 없으면 아직', () => {
    expect(CI판정('aaa', [실행({ headSha: 'bbb' })])).toEqual({ 판정: '아직' });
    expect(CI판정('aaa', [])).toEqual({ 판정: '아직' });
  });

  it('다른 워크플로는 안 본다', () => {
    expect(CI판정('aaa', [실행({ workflowName: 'deploy' })])).toEqual({ 판정: '아직' });
  });

  it('끝나지 않았으면 도는 중', () => {
    expect(CI판정('aaa', [실행({ status: 'in_progress', conclusion: null, databaseId: 5 })])).toEqual({
      판정: '도는중',
      번호: 5,
    });
  });

  it('success 만 초록', () => {
    expect(CI판정('aaa', [실행({ databaseId: 5 })])).toEqual({ 판정: '초록', 번호: 5 });
  });

  it.each(['failure', 'cancelled', 'skipped', 'timed_out', null])('%s 는 빨강이고 이유를 단다', (결론) => {
    expect(CI판정('aaa', [실행({ conclusion: 결론, databaseId: 5 })])).toEqual({
      판정: '빨강',
      번호: 5,
      이유: String(결론),
    });
  });

  it('같은 SHA 에 여럿이면 가장 최근 것 — 옛 빨강 뒤의 다시 돌린 초록이 이긴다', () => {
    const 목록 = [실행({ databaseId: 9 }), 실행({ databaseId: 4, conclusion: 'failure' })];
    expect(CI판정('aaa', 목록)).toEqual({ 판정: '초록', 번호: 9 });
    expect(CI판정('aaa', [...목록].reverse())).toEqual({ 판정: '초록', 번호: 9 });
  });

  // 초안일 때의 실행은 잡이 건너뛰어져 끝난 것이다. ready 직후 새 실행이 뜨기 전에 그걸 읽으면
  // 검사가 안 돈 채로 병합하거나(success) 바로 실패로 닫는다(skipped)
  it('ready 전에 있던 실행은 안 본다 — 그보다 뒤 번호만 본다', () => {
    expect(CI판정('aaa', [실행({ databaseId: 5 })], 5)).toEqual({ 판정: '아직' });
    expect(CI판정('aaa', [실행({ databaseId: 5 }), 실행({ databaseId: 6, status: 'queued', conclusion: null })], 5)).toEqual({
      판정: '도는중',
      번호: 6,
    });
  });
});

describe('다시 돌리기 — 이미 Ready 인 PR 에 머지를 또 누른 경우', () => {
  it('이미 Ready 이고 최신 실행이 빨강이면 그 실행을 다시 돌린다 — pr ready 는 새 실행을 안 만든다', () => {
    expect(다시돌릴인자(true, { 판정: '빨강', 번호: 5, 이유: 'failure' })).toEqual(['run', 'rerun', '5']);
  });

  it('처음 Ready 로 바꾸는 것이면 다시 돌리지 않는다', () => {
    expect(다시돌릴인자(false, { 판정: '빨강', 번호: 5, 이유: 'failure' })).toBeNull();
  });

  it('빨강이 아니면 다시 돌리지 않는다', () => {
    expect(다시돌릴인자(true, { 판정: '초록', 번호: 5 })).toBeNull();
    expect(다시돌릴인자(true, { 판정: '도는중', 번호: 5 })).toBeNull();
    expect(다시돌릴인자(true, { 판정: '아직' })).toBeNull();
  });
});

describe('push 거부 — 테스트만 바뀐 것만 맥이 올린다', () => {
  it('cases-only 면 막지 않는다', () => {
    expect(푸시거부사유(true, ['tests/todo/a.spec.ts'])).toBeNull();
  });

  it('cases-only 가 아니면 사유를 낸다', () => {
    expect(푸시거부사유(false, ['tests/todo/a.spec.ts', 'apps/admin/x.ts'])).toMatch(/테스트만/);
  });

  it('바뀐 것이 없으면 올릴 것이 없다', () => {
    expect(푸시거부사유(true, [])).toMatch(/바뀐 파일이 없다/);
  });
});

describe('커밋 뒤 판정 — 자식이 몰래 커밋한 것까지 본다', () => {
  it('맥의 커밋 하나에 테스트만이면 올린다', () => {
    expect(커밋뒤거부사유(true, ['tests/todo/a.spec.ts'], 1)).toBeNull();
  });

  it('커밋이 하나가 아니면 자식이 커밋한 것이라 거부한다 — 테스트만이어도', () => {
    expect(커밋뒤거부사유(true, ['tests/todo/a.spec.ts'], 2)).toMatch(/자식이 커밋/);
    expect(커밋뒤거부사유(true, ['tests/todo/a.spec.ts'], 0)).not.toBeNull();
    expect(커밋뒤거부사유(true, ['tests/todo/a.spec.ts'], Number.NaN)).not.toBeNull();
  });

  it('origin/main 과의 차이 전체가 테스트만이 아니면 거부한다', () => {
    expect(커밋뒤거부사유(false, ['tests/todo/a.spec.ts', 'apps/admin/x.ts'], 1)).toMatch(/테스트만/);
  });

  it('차이는 이름 바꾸기를 풀어 origin/main 부터 HEAD 까지 전부 본다', () => {
    expect(올린파일인자).toEqual(['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', 'origin/main...HEAD']);
    expect(커밋수인자).toEqual(['rev-list', '--count', 'origin/main..HEAD']);
  });
});

describe('머지 직전 판정 — PR 이 케이스만 바꿨나', () => {
  it('PR 의 바뀐 파일 목록을 이름만 읽는다', () => {
    expect(PR파일인자('https://github.com/x/y/pull/3')).toEqual(['pr', 'diff', 'https://github.com/x/y/pull/3', '--name-only']);
  });

  it('테스트만이면 막지 않는다', () => {
    expect(머지거부사유(true, ['tests/todo/a.spec.ts'])).toBeNull();
  });

  it('테스트만이 아니면 병합하지 않는다', () => {
    expect(머지거부사유(false, ['apps/admin/x.ts'])).toBe('이 PR 은 케이스만 바꾼 것이 아니다 — 맥은 병합하지 않는다');
  });

  it('바뀐 파일이 없다고 읽혔으면 병합하지 않는다', () => {
    expect(머지거부사유(true, [])).not.toBeNull();
  });
});

describe('켤 때 닫을 RUNNING', () => {
  it('RUNNING 이고 내가 잡은 것만 고른다', () => {
    const 목록 = [
      { id: 1, status: 'RUNNING', claimedBy: 'mac' },
      { id: 2, status: 'RUNNING', claimedBy: 'other' },
      { id: 3, status: 'QUEUED', claimedBy: 'mac' },
      { id: 4, status: 'RUNNING', claimedBy: null },
      { id: 5, status: 'RUNNING', claimedBy: 'mac' },
    ];
    expect(닫을RUNNING(목록, 'mac')).toEqual([1, 5]);
  });
});

describe('바뀐 파일 — 자식이 남긴 것을 작업방 상태에서 읽는다', () => {
  it('새 파일·고친 파일·지운 파일을 다 잡는다', () => {
    const 글 = '?? tests/todo/TODO-009.spec.ts\n M docs/cases/TODO.md\n D tests/todo/TODO-001.spec.ts\n';
    expect(바뀐파일들(글)).toEqual(['tests/todo/TODO-009.spec.ts', 'docs/cases/TODO.md', 'tests/todo/TODO-001.spec.ts']);
  });

  it('이름을 바꾼 것은 옛 이름과 새 이름을 둘 다 낸다 — 옛 자리가 지워진 것도 올려야 한다', () => {
    expect(바뀐파일들('R  tests/todo/a.spec.ts -> tests/todo/b.spec.ts\n')).toEqual([
      'tests/todo/a.spec.ts',
      'tests/todo/b.spec.ts',
    ]);
  });

  it('빈 출력이면 빈 목록이다', () => {
    expect(바뀐파일들('')).toEqual([]);
  });
});

describe('PR 이 이미 있나 — push 뒤 만들기가 실패했다 다시 돌 때', () => {
  it('그 브랜치의 PR 을 주소로 찾는다', () => {
    expect(PR찾기인자(12)).toEqual(['pr', 'list', '--head', 'author-12', '--json', 'url']);
  });
});

describe('CI 실행 주소 — 실패 사유에 싣는다', () => {
  it('PR 주소의 저장소로 실행 주소를 만든다', () => {
    expect(CI실행주소('https://github.com/acme/pay/pull/12', 987)).toBe('https://github.com/acme/pay/actions/runs/987');
  });

  it('PR 주소 모양이 아니면 번호만 낸다 — 지어내지 않는다', () => {
    expect(CI실행주소('엉뚱한 값', 987)).toBe('CI 실행 987번');
  });
});
