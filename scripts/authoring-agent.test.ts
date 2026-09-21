// 작성 에이전트의 순수 함수 검사. 과금 안전핀과 선행 조건이 여기서 고정된다
import { describe, expect, it } from 'vitest';

import { 과금위험, 인자읽기, 클로드인자, 푸시막힘, 프롬프트 } from './authoring-agent.js';

describe('과금위험', () => {
  it('깨끗한 환경이면 아무것도 안 걸린다', () => {
    expect(과금위험({}, {})).toEqual([]);
  });

  it('ANTHROPIC_API_KEY 가 있으면 걸린다 — OAuth 를 건너뛰고 실비로 청구된다', () => {
    expect(과금위험({ ANTHROPIC_API_KEY: 'sk-x' }, {})).toEqual(['ANTHROPIC_API_KEY']);
  });

  it('ANTHROPIC_AUTH_TOKEN 도 같다', () => {
    expect(과금위험({ ANTHROPIC_AUTH_TOKEN: 'tok' }, {})).toEqual(['ANTHROPIC_AUTH_TOKEN']);
  });

  it('둘 다 있으면 둘 다 돌려준다', () => {
    const 걸린것 = 과금위험({ ANTHROPIC_API_KEY: 'sk-x', ANTHROPIC_AUTH_TOKEN: 'tok' }, {});
    expect(걸린것).toContain('ANTHROPIC_API_KEY');
    expect(걸린것).toContain('ANTHROPIC_AUTH_TOKEN');
  });

  it('빈 문자열은 위험이 아니다 — 그렇게 지운 환경을 막으면 쓸 수가 없다', () => {
    expect(과금위험({ ANTHROPIC_API_KEY: '' }, {})).toEqual([]);
  });

  it('3P 제공자는 구독이 아니라 AWS·GCP 계정에 청구된다', () => {
    expect(과금위험({ CLAUDE_CODE_USE_BEDROCK: '1' }, {})).toEqual(['CLAUDE_CODE_USE_BEDROCK']);
    expect(과금위험({ CLAUDE_CODE_USE_VERTEX: '1' }, {})).toEqual(['CLAUDE_CODE_USE_VERTEX']);
  });

  it('설정 파일의 apiKeyHelper 는 환경변수에 안 보이는데 CLI 는 읽는다', () => {
    expect(과금위험({}, { apiKeyHelper: 'echo sk-x' })).toEqual(['설정의 apiKeyHelper']);
  });

  it('설정 파일의 env 블록도 세션 환경에 주입된다', () => {
    expect(과금위험({}, { env: { ANTHROPIC_API_KEY: 'sk-x' } })).toEqual(['설정의 env.ANTHROPIC_API_KEY']);
  });

  it('설정의 env 에 관계없는 값이 있는 것은 위험이 아니다', () => {
    expect(과금위험({}, { env: { FOO: '1' } })).toEqual([]);
  });
});

describe('인자읽기', () => {
  it('인자가 없으면 쓰는 법을 알려주고 던진다', () => {
    expect(() => 인자읽기([])).toThrow(/쓰는 법/);
  });

  it('기획서 파일이 없으면 던진다 — 없는 파일로 한도를 태우지 않는다', () => {
    expect(() => 인자읽기(['없는파일.md'])).toThrow(/없다/);
  });

  it('있는 파일이면 경로를 돌려준다', () => {
    expect(인자읽기(['docs/cases/TODO-기획서.md'])).toEqual({
      기획서: 'docs/cases/TODO-기획서.md',
      서비스: undefined,
    });
  });

  it('--service 로 접두사를 줄 수 있다', () => {
    expect(인자읽기(['docs/cases/TODO-기획서.md', '--service', 'TODO']).서비스).toBe('TODO');
  });
});

describe('푸시막힘', () => {
  it('오늘 날짜 검사 기록이 있으면 막히지 않는다', () => {
    expect(푸시막힘('2026-09-21', ['2026-09-21-실행상태.md'])).toBeNull();
  });

  it('오늘 것이 없으면 사유를 돌려준다 — pre-push 훅이 초안 PR 을 열기 전에 막는다', () => {
    expect(푸시막힘('2026-09-22', ['2026-09-21-실행상태.md'])).toMatch(/2026-09-22/);
  });

  it('기록이 하나도 없어도 같다', () => {
    expect(푸시막힘('2026-09-22', [])).not.toBeNull();
  });

  it('사유에 --no-verify 를 권하지 않는다 — 그건 저장소 검사를 무인으로 건너뛰는 일이다', () => {
    expect(푸시막힘('2026-09-22', [])).not.toMatch(/no-verify/);
  });
});

describe('클로드인자', () => {
  // 배열을 통째로 비교한다. 「--bare 가 없다」 같은 부정 단언은 **인자가 늘어도 초록**이라
  // 다음 편집을 못 막는다. 통째로 비교하면 하나만 늘어도 깨져서
  // 고치는 사람이 이 파일 맨 위의 과금 규칙을 반드시 다시 읽는다
  it('인자 배열이 기대한 것과 글자 하나까지 같다', () => {
    expect(클로드인자()).toEqual(['-p', '--permission-mode', 'acceptEdits', '--disallowedTools', 'AskUserQuestion']);
  });

  it('--bare 는 절대 안 들어간다 — 그 깃발 하나가 OAuth 를 안 읽고 API 키만 쓴다', () => {
    expect(클로드인자()).not.toContain('--bare');
  });

  // 2026-09-21 실측 — 프롬프트를 배열 끝에 실었더니 --disallowedTools 가 가변 인자라
  // 그것을 도구 이름 목록으로 삼켰고 `Input must be provided...` 로 죽었다.
  // **--disallowedTools 가 마지막이어야 한다**는 것이 이 단언의 알맹이다
  it('마지막 원소 뒤에 아무것도 없다 — 가변 인자가 프롬프트를 삼켰던 자리다', () => {
    const 인자 = 클로드인자();
    expect(인자[인자.length - 2]).toBe('--disallowedTools');
    expect(인자[인자.length - 1]).toBe('AskUserQuestion');
  });
});

describe('프롬프트', () => {
  it('기획서 경로가 그대로 실린다', () => {
    expect(프롬프트('docs/cases/TODO-기획서.md', undefined)).toContain('docs/cases/TODO-기획서.md');
  });

  it('접두사를 주면 싣고, 안 주면 기획서에서 판단하라고 한다', () => {
    expect(프롬프트('x.md', 'TODO')).toContain('TODO');
    expect(프롬프트('x.md', undefined)).toMatch(/기획서에서 판단/);
  });

  it('초안 PR 까지만 하라고 못박는다 — 병합은 사람 몫이다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/초안 PR/);
    expect(프롬프트('x.md', undefined)).toMatch(/gh pr ready/);
  });

  it('--no-verify 를 쓰지 말라고 못박는다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/no-verify/);
  });

  it('내부 게이트 대신 표를 PR 에 실으라고 한다 — 물어볼 사람이 없다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/AskUserQuestion/);
  });

  it('A-0 에서 남의 작업방을 건드리지 말라고 못박는다 — 거기서도 물어볼 사람이 없다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/A-0/);
    expect(프롬프트('x.md', undefined)).toMatch(/남의 작업방/);
  });
});
