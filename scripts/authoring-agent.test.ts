// 작성 에이전트의 순수 함수 검사. 과금 안전핀과 선행 조건이 여기서 고정된다
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  admin주소,
  거절인가,
  과금위험,
  기다렸다다시인가,
  대기줄전제,
  보고간격,
  머지인자,
  주소안전한가,
  집은것인가,
  PR주소찾기,
  PR표시,
  머지할수있나,
  선행검사,
  오늘날짜,
  클로드인자,
  푸시막힘,
  줄프롬프트,
} from './authoring-agent.js';

describe('대기줄 전제 — 켜자마자 보는 것', () => {
  it('맥 계정 이름이 없으면 멈춘다. 서버가 그 이름에만 집기를 열어 아무도 못 집는다', () => {
    expect(대기줄전제({})).toMatch(/AUTHORING_AGENT_USER/);
  });

  it('이름이 있으면 통과한다', () => {
    expect(대기줄전제({ AUTHORING_AGENT_USER: 'mac' })).toBe(null);
  });

  it('주소를 안 주면 로컬 admin 을 본다. compose 의 기본 포트와 같은 숫자다', () => {
    expect(admin주소({})).toBe('http://localhost:3000');
  });

  it('주소를 주면 그것을 쓴다', () => {
    expect(admin주소({ PLATFORM_ADMIN_URL: 'https://qa.example.com' })).toBe('https://qa.example.com');
  });
});

describe('거절당하면 멈춘다', () => {
  it('401 은 거절이다. 조용히 계속 돌면서 전부 실패하는 것이 최악이다', () => {
    expect(거절인가(401)).toBe(true);
  });

  it('403 도 거절이다. 등급이 모자라면 아무리 다시 물어도 같다', () => {
    expect(거절인가(403)).toBe(true);
  });

  it('줄이 비었다는 답(204)은 거절이 아니다', () => {
    expect(거절인가(204)).toBe(false);
  });

  it('서버가 잠깐 흔들린 것(500)은 거절이 아니다. 다시 물어볼 만하다', () => {
    expect(거절인가(500)).toBe(false);
  });
});

describe('줄에서 집어 일한다', () => {
  it('작성 요청의 기획서는 경로가 아니라 본문이다. 맥은 다른 기계라 경로를 못 읽는다', () => {
    const 글 = 줄프롬프트({ id: 3, kind: 'AUTHOR', specText: '할 일을 추가할 수 있다' }, 'TODO', []);
    expect(글).toContain('할 일을 추가할 수 있다');
    expect(글).not.toMatch(/기획서 경로/);
  });

  it('작성 프롬프트도 초안 PR 까지만 하라고 못박는다', () => {
    const 글 = 줄프롬프트({ id: 3, kind: 'AUTHOR', specText: '본문' }, 'TODO', []);
    expect(글).toMatch(/gh pr ready 와 병합은 절대 하지 마라/);
  });

  it('머지 요청은 집으면 PR 주소가 있어야 한다. 없으면 실패로 끝낸다', () => {
    expect(머지할수있나({ kind: 'MERGE', prUrl: null })).toBe(false);
    expect(머지할수있나({ kind: 'MERGE', prUrl: 'https://github.com/x/y/pull/3' })).toBe(true);
  });

  it('머지 명령에 강제 깃발을 절대 안 붙인다', () => {
    const 인자 = 머지인자('https://github.com/x/y/pull/3');
    expect(인자.join(' ')).not.toMatch(/--force|-D\b|--admin/);
    expect(인자).toContain('--merge');
  });
});

// 2026-09-23 검토가 잡은 자리들. **기능이 통째로 죽은 채로 검사가 전부 초록이었다**
describe('집기 응답을 믿지 않는다 — 500 의 오류 본문이 「집은 한 건」이 되면 안 된다', () => {
  it('200 이고 번호가 숫자여야 집은 것이다', () => {
    expect(집은것인가(200, { id: 3, kind: 'AUTHOR' })).toBe(true);
  });

  it('줄이 비었다는 204 는 집은 것이 아니다', () => {
    expect(집은것인가(204, null)).toBe(false);
  });

  // 이것을 안 막으면 번호가 undefined 인 채로 빈 기획서를 claude 에 먹이고 **쉬지도 않고 반복**한다
  it('서버가 500 과 오류 본문을 내도 집은 것이 아니다', () => {
    expect(집은것인가(500, { error: 'Internal Server Error', message: '어쩌고' })).toBe(false);
  });

  it('번호가 없거나 숫자가 아니면 집은 것이 아니다', () => {
    expect(집은것인가(200, { kind: 'AUTHOR' })).toBe(false);
    expect(집은것인가(200, { id: '3' })).toBe(false);
  });

  it('5xx 는 기다렸다 다시 묻는다. 서버가 잠깐 죽었다고 맥까지 죽으면 안 된다', () => {
    expect(기다렸다다시인가(500)).toBe(true);
    expect(기다렸다다시인가(503)).toBe(true);
    expect(기다렸다다시인가(403)).toBe(false);
  });
});

// 2026-09-23 한 바퀴 실측 — 「끝났다」를 한 번 보내다 fetch failed 로 잃고 요청이 영원히 RUNNING 으로 남았다
describe('끝났다는 보고는 한 번 실패로 버리지 않는다', () => {
  it('처음 몇 번은 점점 길게 기다렸다 다시 보낸다', () => {
    const 간격들 = [0, 1, 2, 3, 4].map(보고간격);
    expect(간격들.every((g) => typeof g === 'number' && g > 0)).toBe(true);
    for (let i = 1; i < 간격들.length; i += 1) expect(간격들[i]!).toBeGreaterThanOrEqual(간격들[i - 1]!);
  });

  it('끝없이 붙잡지 않는다 — 몇 번 뒤에는 포기해 다음 요청으로 간다', () => {
    expect(보고간격(5)).toBe(null);
  });

  it('다 기다려도 몇 분 안이다. 밤새 켜 둔 줄이 한 건에 묶이면 안 된다', () => {
    const 합 = [0, 1, 2, 3, 4].reduce((s, i) => s + (보고간격(i) ?? 0), 0);
    expect(합).toBeLessThanOrEqual(5 * 60_000);
  });
});

describe('초안 PR 주소를 잡아 온다 — 없으면 머지 버튼이 영영 안 뜬다', () => {
  it('자식이 찍은 줄에서 주소를 찾는다', () => {
    expect(PR주소찾기(`뭐라뭐라\n${PR표시} https://github.com/acme/pay/pull/12\n`)).toBe(
      'https://github.com/acme/pay/pull/12',
    );
  });

  it('여러 번 찍혔으면 마지막 것이다. 자식이 프롬프트를 되읽어 찍는 경우가 있다', () => {
    const 출력 = `${PR표시} <초안 PR 주소>\n일하는 중\n${PR표시} https://github.com/a/b/pull/9`;
    expect(PR주소찾기(출력)).toBe('https://github.com/a/b/pull/9');
  });

  it('표시가 없으면 null 이다. 지어내지 않는다', () => {
    expect(PR주소찾기('케이스를 다 만들었다')).toBe(null);
  });

  it('표시는 있는데 주소 모양이 아니면 null 이다', () => {
    expect(PR주소찾기(`${PR표시} 만들었어요`)).toBe(null);
  });

  it('자식에게 그 줄을 찍으라고 프롬프트가 시킨다', () => {
    expect(줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문' }, 'TODO', [])).toContain(PR표시);
  });
});

describe('평문 주소로 비밀번호를 보내지 않는다', () => {
  it('같은 기계는 괜찮다. 망을 안 탄다', () => {
    expect(주소안전한가('http://localhost:3000')).toBe(null);
    expect(주소안전한가('http://127.0.0.1:3000')).toBe(null);
  });

  it('https 는 괜찮다', () => {
    expect(주소안전한가('https://qa.example.com')).toBe(null);
  });

  it('남의 기계에 평문으로 보내면 막는다. 비밀번호가 사내망에 그대로 흐른다', () => {
    expect(주소안전한가('http://qa.example.com')).toMatch(/평문/);
  });

  it('주소 모양이 아니면 막는다', () => {
    expect(주소안전한가('그냥글자')).toMatch(/주소 모양/);
  });
});

describe('비밀번호를 어디에도 안 적는다', () => {
  it('이 스크립트는 비밀번호를 환경이나 파일에서 읽지 않는다. 켤 때 묻고 메모리에만 든다', () => {
    const 소스 = readFileSync(new URL('./authoring-agent.ts', import.meta.url), 'utf8');
    const 읽는곳 = 소스
      .split('\n')
      .filter((줄) => /PASSWORD/i.test(줄))
      .filter((줄) => /env\[|env\.|readFileSync|JSON\.parse/.test(줄));
    expect(읽는곳).toEqual([]);
  });
});

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

// 「기획서 경로를 인자로 받는」 진입 방식은 2026-09-22 에 없어졌다 (docs/SETUP.md §8).
// 그 길은 admin 을 안 불러 **로그인을 지나지 않았다** — 대기줄이 그 자리를 대신한다

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
  it('과금 위험이 계정 설정보다 먼저 걸린다 — 돈이 가장 앞이다', () => {
    expect(선행검사({ env: 더러운환경, 설정들: [], 오늘: '2026-09-21', 기록: [] })).toMatch(/실비 청구/);
  });

  it('환경이 깨끗해도 맥 계정 이름이 없으면 안 돌린다', () => {
    expect(선행검사({ env: {}, 설정들: [], 오늘: '2026-09-21', 기록: [] })).toMatch(/AUTHORING_AGENT_USER/);
  });

  // 비밀번호를 묻기 **전에** 걸러야 한다. 물어 놓고 「사실 못 돈다」고 하면 그 입력이 헛것이다
  it('계정이 있어도 오늘 검사 기록이 없으면 안 돌린다', () => {
    const 막힘 = 선행검사({
      env: { AUTHORING_AGENT_USER: 'mac' },
      설정들: [],
      오늘: '2026-09-22',
      기록: [],
    });
    expect(막힘).toMatch(/push 가 막힌다/);
  });

  it('자식이 셸을 못 돌면 안 돌린다 — 피그마도 관문도 못 돈다', () => {
    const 막힘 = 선행검사({
      env: { AUTHORING_AGENT_USER: 'mac' },
      설정들: [],
      오늘: '2026-09-21',
      기록: ['2026-09-21-무엇.md'],
    });
    expect(막힘).toMatch(/Bash\(\*\)/);
  });

  it('넷 다 통과하면 막지 않는다', () => {
    const 막힘 = 선행검사({
      env: { AUTHORING_AGENT_USER: 'mac' },
      설정들: [{ 어디: '사용자', 값: { permissions: { allow: ['Bash(*)'] } } }],
      오늘: '2026-09-21',
      기록: ['2026-09-21-무엇.md'],
    });
    expect(막힘).toBeNull();
  });
});

describe('클로드인자', () => {
  // 배열을 통째로 비교한다. 「--bare 가 없다」 같은 부정 단언은 **인자가 늘어도 초록**이라
  // 다음 편집을 못 막는다. 통째로 비교하면 하나만 늘어도 깨져서
  // 고치는 사람이 이 파일 맨 위의 과금 규칙을 반드시 다시 읽는다
  it('인자 배열이 기대한 것과 글자 하나까지 같다', () => {
    expect(클로드인자('/t')).toEqual([
      '-p',
      '--permission-mode',
      'acceptEdits',
      '--add-dir',
      '/t',
      '--disallowedTools',
      'AskUserQuestion',
    ]);
  });

  it('--bare 는 절대 안 들어간다 — 그 깃발 하나가 OAuth 를 안 읽고 API 키만 쓴다', () => {
    expect(클로드인자('/t')).not.toContain('--bare');
  });

  // 2026-09-21 실측 — 프롬프트를 배열 끝에 실었더니 --disallowedTools 가 가변 인자라
  // 그것을 도구 이름 목록으로 삼켰고 `Input must be provided...` 로 죽었다.
  // **--disallowedTools 가 마지막이어야 한다**는 것이 이 단언의 알맹이다
  it('마지막 원소 뒤에 아무것도 없다 — 가변 인자가 프롬프트를 삼켰던 자리다', () => {
    const 인자 = 클로드인자('/t');
    expect(인자[인자.length - 2]).toBe('--disallowedTools');
    expect(인자[인자.length - 1]).toBe('AskUserQuestion');
  });
});

// 옛 셸 진입점(`프롬프트`)의 단언을 그대로 옮겨 왔다. 그 진입점은 2026-09-22 에 없어졌지만
// **경계는 그대로다** — 물어볼 사람이 없는 자리에서 자식이 무엇을 하면 안 되는가
describe('줄프롬프트 — 자식에게 못박는 경계', () => {
  const 글 = () => 줄프롬프트({ id: 1, kind: 'AUTHOR', specText: '본문' }, 'TODO', []);

  it('접두사가 실린다', () => {
    expect(글()).toContain('TODO');
  });

  // 검토 지적 — 낱말만 찾으면 지시가 **반대로 뒤집혀도 초록**이다.
  // 「--bare 가 없다」 부정 단언과 같은 약함이라 지시문 모양까지 단언한다
  it('내부 게이트 대신 표를 PR 에 실으라고 한다 — 물어볼 사람이 없다', () => {
    expect(글()).toMatch(/AskUserQuestion 을 부르지 마라/);
  });

  it('A-0 에서 남의 작업방을 건드리지 말라고 못박는다 — 거기서도 물어볼 사람이 없다', () => {
    expect(글()).toMatch(/남의 작업방과 브랜치는 절대 건드리지 마라/);
  });

  // 검토 지적 — tpx-start 의 「미커밋 변경」 게이트에는 **「버리기」 선택지**가 있다.
  // 물을 도구가 막혀 있으니 자식이 알아서 「버리기」를 고르면 **남의 작업이 지워진다**
  it('미커밋 변경을 버리지 말라고 못박는다', () => {
    expect(글()).toMatch(/버리지 마라/);
  });

  it('--no-verify 를 쓰지 말라고 못박는다 — 지시문으로', () => {
    expect(글()).toMatch(/--no-verify 를 쓰지 마라/);
  });

  it('관문 넷을 전부 돌리라고 한다', () => {
    expect(글()).toMatch(/관문 넷/);
  });
});
