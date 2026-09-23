// 맥이 git·gh 를 어떻게 부를지 정하는 순수 함수 검사. 껍데기는 이 인자를 그대로 친다
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CI판정,
  PR만들기인자,
  PR본문,
  PR준비인자,
  닫을RUNNING,
  다시돌릴인자,
  머지인자,
  실행목록인자,
  올릴브랜치,
  작업방준비,
  커밋메시지,
  푸시거부사유,
  푸시인자,
  플랫폼링크,
  type CI실행,
} from './authoring-chain.js';

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
