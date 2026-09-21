// 작성 에이전트의 순수 함수 검사. 과금 안전핀과 선행 조건이 여기서 고정된다
import { describe, expect, it } from 'vitest';

import { 과금위험, 선행검사, 오늘날짜, 인자읽기, 클로드인자, 푸시막힘, 프롬프트 } from './authoring-agent.js';

describe('과금위험', () => {
  it('깨끗한 환경이면 아무것도 안 걸린다', () => {
    expect(과금위험({}, [])).toEqual([]);
  });

  it('ANTHROPIC_API_KEY 가 있으면 걸린다 — OAuth 를 건너뛰고 실비로 청구된다', () => {
    expect(과금위험({ ANTHROPIC_API_KEY: 'sk-x' }, [])).toEqual(['ANTHROPIC_API_KEY']);
  });

  it('ANTHROPIC_AUTH_TOKEN 도 같다', () => {
    expect(과금위험({ ANTHROPIC_AUTH_TOKEN: 'tok' }, [])).toEqual(['ANTHROPIC_AUTH_TOKEN']);
  });

  it('둘 다 있으면 둘 다 돌려준다', () => {
    const 걸린것 = 과금위험({ ANTHROPIC_API_KEY: 'sk-x', ANTHROPIC_AUTH_TOKEN: 'tok' }, []);
    expect(걸린것).toContain('ANTHROPIC_API_KEY');
    expect(걸린것).toContain('ANTHROPIC_AUTH_TOKEN');
  });

  it('빈 문자열은 위험이 아니다 — 그렇게 지운 환경을 막으면 쓸 수가 없다', () => {
    expect(과금위험({ ANTHROPIC_API_KEY: '' }, [])).toEqual([]);
  });

  it('3P 제공자는 구독이 아니라 AWS·GCP 계정에 청구된다', () => {
    expect(과금위험({ CLAUDE_CODE_USE_BEDROCK: '1' }, [])).toEqual(['CLAUDE_CODE_USE_BEDROCK']);
    expect(과금위험({ CLAUDE_CODE_USE_VERTEX: '1' }, [])).toEqual(['CLAUDE_CODE_USE_VERTEX']);
  });

  it('설정 파일의 apiKeyHelper 는 환경변수에 안 보이는데 CLI 는 읽는다', () => {
    expect(과금위험({}, [{ 어디: '사용자', 값: { apiKeyHelper: 'echo sk-x' } }])).toEqual([
      '사용자 설정의 apiKeyHelper',
    ]);
  });

  it('설정 파일의 env 블록도 세션 환경에 주입된다', () => {
    expect(과금위험({}, [{ 어디: '사용자', 값: { env: { ANTHROPIC_API_KEY: 'sk-x' } } }])).toEqual([
      '사용자 설정의 env.ANTHROPIC_API_KEY',
    ]);
  });

  it('설정의 env 에 관계없는 값이 있는 것은 위험이 아니다', () => {
    expect(과금위험({}, [{ 어디: '사용자', 값: { env: { FOO: '1' } } }])).toEqual([]);
  });

  // 검토 지적 — env 블록을 ANTHROPIC_ 접두사로만 걸렀더니 3P 제공자 셋이 그대로 통과했다.
  // 환경변수 경로와 설정 경로가 **같은 목록**을 봐야 한다
  it('설정의 env 에 든 3P 제공자도 걸린다', () => {
    expect(과금위험({}, [{ 어디: '사용자', 값: { env: { CLAUDE_CODE_USE_BEDROCK: '1' } } }])).toEqual([
      '사용자 설정의 env.CLAUDE_CODE_USE_BEDROCK',
    ]);
  });

  // 검토 지적 — CLI 는 설정을 user·project·local 여러 곳에서 읽는다.
  // 이 저장소 문서(docs/SETUP.md)가 직접 `.claude/settings.local.json` 의 env 를 쓰라고 가르친다
  it('설정 파일이 여럿이면 전부 본다 — 어디서 걸렸는지도 같이 알린다', () => {
    const 걸린것 = 과금위험({}, [
      { 어디: '사용자', 값: {} },
      { 어디: '프로젝트', 값: { env: { ANTHROPIC_API_KEY: 'sk-x' } } },
    ]);
    expect(걸린것).toEqual(['프로젝트 설정의 env.ANTHROPIC_API_KEY']);
  });
});

describe('오늘날짜', () => {
  // 검토 지적 — toISOString() 은 UTC 다. pre-push 훅은 `date +%F`(로컬)를 쓴다.
  // KST 새벽 9시간 동안 둘이 갈려서 안전핀이 초록을 내고 push 에서 죽는다
  it('훅이 쓰는 로컬 날짜와 같다', () => {
    expect(오늘날짜(new Date('2026-09-22T01:00:00+09:00'), 540)).toBe('2026-09-22');
  });

  it('UTC 로 세면 하루 밀리는 그 자리다', () => {
    expect(new Date('2026-09-22T01:00:00+09:00').toISOString().slice(0, 10)).toBe('2026-09-21');
  });

  it('시차가 0 이면 UTC 와 같다', () => {
    expect(오늘날짜(new Date('2026-09-22T01:00:00Z'), 0)).toBe('2026-09-22');
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
    expect(푸시막힘('2026-09-21', ['2026-09-21-실행상태.md'], {})).toBeNull();
  });

  it('오늘 것이 없으면 사유를 돌려준다 — pre-push 훅이 초안 PR 을 열기 전에 막는다', () => {
    expect(푸시막힘('2026-09-22', ['2026-09-21-실행상태.md'], {})).toMatch(/2026-09-22/);
  });

  it('기록이 하나도 없어도 같다', () => {
    expect(푸시막힘('2026-09-22', [], {})).not.toBeNull();
  });

  it('사유에 --no-verify 를 권하지 않는다 — 그건 저장소 검사를 무인으로 건너뛰는 일이다', () => {
    expect(푸시막힘('2026-09-22', [], {})).not.toMatch(/no-verify/);
  });

  // 검토 지적 — 훅이 ALLOW_PROTECTED=1 이면 검사 기록 확인을 통째로 건너뛴다.
  // 그걸 안 보면 **막히지 않을 push 를 막았다고 거부**한다
  it('ALLOW_PROTECTED=1 이면 훅이 검사 기록을 안 보므로 우리도 안 막는다', () => {
    expect(푸시막힘('2026-09-22', [], { ALLOW_PROTECTED: '1' })).toBeNull();
  });
});

describe('선행검사 — 순서가 뒤집히면 돈이 샌다', () => {
  const 더러운환경 = { ANTHROPIC_API_KEY: 'sk-x' };

  // 검토 지적 — 코드의 순서는 옳은데 그 순서를 붙잡는 자동 검사가 없었다.
  // 반년 뒤 누가 spawn 을 과금 검사 위로 올리면 26개 검사가 전부 초록인 채로
  // **진짜 키가 있는 환경에서 요청이 실제로 나간다**
  it('과금 위험이 인자 오류보다 먼저 걸린다 — 돈이 가장 앞이다', () => {
    const 결과 = 선행검사({ env: 더러운환경, 설정들: [], argv: [], 오늘: '2026-09-21', 기록: [] });
    expect(결과.막힘).toMatch(/실비 청구/);
  });

  it('환경이 깨끗해도 인자가 없으면 안 돌린다', () => {
    const 결과 = 선행검사({ env: {}, 설정들: [], argv: [], 오늘: '2026-09-21', 기록: [] });
    expect(결과.막힘).toMatch(/쓰는 법/);
    expect(결과.입력).toBeNull();
  });

  it('인자가 멀쩡해도 오늘 검사 기록이 없으면 안 돌린다', () => {
    const 결과 = 선행검사({
      env: {},
      설정들: [],
      argv: ['docs/cases/TODO-기획서.md'],
      오늘: '2026-09-22',
      기록: [],
    });
    expect(결과.막힘).toMatch(/push 가 막힌다/);
    expect(결과.입력).toBeNull();
  });

  it('셋 다 통과해야 입력이 나온다 — 하나라도 걸리면 입력은 null 이다', () => {
    const 결과 = 선행검사({
      env: {},
      설정들: [],
      argv: ['docs/cases/TODO-기획서.md', '--service', 'TODO'],
      오늘: '2026-09-21',
      기록: ['2026-09-21-무엇.md'],
    });
    expect(결과.막힘).toBeNull();
    expect(결과.입력).toEqual({ 기획서: 'docs/cases/TODO-기획서.md', 서비스: 'TODO' });
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

  // 검토 지적 — 낱말만 찾으면 지시가 **반대로 뒤집혀도 초록**이다.
  // 「--bare 가 없다」 부정 단언과 같은 약함이라 지시문 모양까지 단언한다
  it('내부 게이트 대신 표를 PR 에 실으라고 한다 — 물어볼 사람이 없다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/AskUserQuestion 을 부르지 마라/);
  });

  it('A-0 에서 남의 작업방을 건드리지 말라고 못박는다 — 거기서도 물어볼 사람이 없다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/남의 작업방과 브랜치는 절대 건드리지 마라/);
  });

  // 검토 지적 — tpx-start 의 「미커밋 변경」 게이트에는 **「버리기」 선택지**가 있다.
  // 사용자가 새 기획서를 떨어뜨리고 바로 돌리는 것이 가장 평범한 사용법인데,
  // 물을 도구가 막혀 있으니 자식이 알아서 「버리기」를 고르면 **그 기획서가 지워진다**
  it('미커밋 변경을 버리지 말라고 못박는다', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/버리지 마라/);
  });

  it('gh pr ready 와 병합을 하지 말라고 못박는다 — 낱말만이 아니라 지시문으로', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/gh pr ready 와 병합은 절대 하지 마라/);
  });

  it('--no-verify 를 쓰지 말라고 못박는다 — 지시문으로', () => {
    expect(프롬프트('x.md', undefined)).toMatch(/--no-verify 를 쓰지 마라/);
  });
});
