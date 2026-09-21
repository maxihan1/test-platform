// 작성 에이전트의 순수 함수 검사. 과금 안전핀과 선행 조건이 여기서 고정된다
import { describe, expect, it } from 'vitest';

import { 과금위험, 인자읽기, 푸시막힘 } from './authoring-agent.js';

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
