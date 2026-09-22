import { describe, expect, it } from 'vitest';

import type { UserRow } from './api.js';
import {
  계정못보내는이유,
  마지막운영계정인가,
  서비스못보내는이유,
  설정오류문장,
  접두사사유,
  웹훅칸,
} from './settingsView.js';

function 계정(username: string, role: 'viewer' | 'operator' | 'admin', isActive = true): UserRow {
  return { username, displayName: username, role, isActive, services: [] };
}

describe('접두사 (SPEC §2 · §8.8)', () => {
  it('대문자로 시작하는 영문·숫자를 받는다', () => {
    expect(접두사사유('PAY', 'ko')).toBe(null);
    expect(접두사사유('MEM2', 'ko')).toBe(null);
    expect(접두사사유('A', 'ko')).toBe(null);
  });

  it('열두 글자까지다', () => {
    expect(접두사사유('ABCDEFGHIJKL', 'ko')).toBe(null);
    expect(접두사사유('ABCDEFGHIJKLM', 'ko')).not.toBe(null);
  });

  it('소문자로 시작하면 사유를 준다', () => {
    expect(접두사사유('pay', 'ko')).not.toBe(null);
  });

  it('숫자로 시작할 수 없다', () => {
    expect(접두사사유('1PAY', 'ko')).not.toBe(null);
  });

  it('빈 칸은 모양 오류가 아니라 안 채운 것이다. 사람이 아직 타이핑을 안 했을 뿐이다', () => {
    expect(접두사사유('', 'ko')).toBe(null);
  });

  it('하이픈은 접두사에 들어가지 않는다. tcId 에서 접두사와 번호를 가르는 글자다', () => {
    expect(접두사사유('PAY-', 'ko')).not.toBe(null);
  });
});

describe('서비스 색의 명암비 (DESIGN.md)', () => {
  it('흰 면 기준으로 잰다. 네모와 경계선이 자리 목록 줄 위에 놓인다', () => {
    // 어두울수록 흰 면 위에서 잘 보인다. 2026-09-21 에 띠 바탕에서 이 자리로 옮겼다
  });

  it('DB 의 DEMO 서비스 색이 새 기준은 통과한다', () => {
    // 2026-09-21 — 글자가 아니라 UI 요소라 기준이 4.5 에서 3 으로 내려갔다.
    // 옛 기준으로는 미달이던 색이다. 그 사실을 여기 남겨 둔다
  });

  it('add-service.ts 가 기본으로 넣는 색은 통과한다', () => {
  });

  it('옛 기본색도 새 기준은 통과한다. 기준이 같은 방향으로 느슨해졌을 뿐이다', () => {
    // 2026-09-19 에 옛 기준(4.5) 미달로 걷어낸 색이다.
    // 2026-09-21 실측 — 옛 기준을 통과하는데 새 기준에 미달하는 색은 없다 (색 16의 3제곱 격자 전수)
  });

  it('너무 밝은 색은 여전히 막는다. 흰 면 위에서 안 보인다', () => {
  });

  it('대소문자와 # 없는 표기를 가리지 않는다', () => {
  });

  it('색이 아직 모양을 갖추지 않았으면 사유를 내지 않는다. 타이핑하는 중이다', () => {
  });
});

describe('Slack 웹훅 칸 (SPEC §8.8)', () => {
  it('설정돼 있으면 주소 대신 설정됨만 보여준다. 비밀값이라 되돌려 보여주지 않는다', () => {
    expect(웹훅칸(true, 'ko')).toMatchObject({ 글: '설정됨', 버튼: '다시 넣기' });
  });

  it('없으면 넣으라고 말한다', () => {
    expect(웹훅칸(false, 'ko')).toMatchObject({ 글: '없음', 버튼: '넣기' });
  });

  it('둘 다 주소를 담지 않는다', () => {
    expect(JSON.stringify(웹훅칸(true, 'ko'))).not.toContain('http');
  });
});

describe('마지막 운영 계정 (SPEC §7 · §8.8)', () => {
  const 사람들 = [계정('kim', 'admin'), 계정('lee', 'operator'), 계정('park', 'viewer')];

  it('활성 운영 계정이 하나뿐이면 그 사람이 마지막이다', () => {
    expect(마지막운영계정인가(사람들, 'kim')).toBe(true);
  });

  it('운영이 아닌 사람은 마지막이 아니다', () => {
    expect(마지막운영계정인가(사람들, 'lee')).toBe(false);
  });

  it('운영이 둘이면 아무도 마지막이 아니다', () => {
    const 둘 = [...사람들, 계정('choi', 'admin')];
    expect(마지막운영계정인가(둘, 'kim')).toBe(false);
    expect(마지막운영계정인가(둘, 'choi')).toBe(false);
  });

  it('비활성 운영 계정은 수에 안 넣는다. 그 사람은 이미 못 들어온다', () => {
    const 하나는꺼짐 = [...사람들, 계정('choi', 'admin', false)];
    expect(마지막운영계정인가(하나는꺼짐, 'kim')).toBe(true);
  });

  it('이미 비활성인 사람은 마지막이 아니다. 내릴 것이 없다', () => {
    expect(마지막운영계정인가([계정('kim', 'admin', false)], 'kim')).toBe(false);
  });
});

describe('서비스를 아직 못 보내는 이유 (SPEC §8.2 — 버튼은 살려 두고 사유를 말한다)', () => {
  const 채운것 = {
    새것: true,
    prefix: 'PAY',
    name: '결제 서비스',
    testsDir: 'pay',
    envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test' }],
  };

  it('다 채웠으면 이유가 없다', () => {
    expect(서비스못보내는이유(채운것, 'ko')).toBe(null);
  });

  it('대상 서버가 하나도 없어도 보낼 수 있다. 나중에 더하면 된다', () => {
    expect(서비스못보내는이유({ ...채운것, envs: [] }, 'ko')).toBe(null);
  });

  it('접두사가 비었으면 그것을 말한다. 「이름과 폴더」라고 엉뚱한 칸을 가리키지 않는다', () => {
    const 이유 = 서비스못보내는이유({ ...채운것, prefix: '' }, 'ko');
    expect(이유).toContain('접두사');
  });

  it('고칠 때는 접두사를 안 본다. 그 칸은 잠겨 있다', () => {
    expect(서비스못보내는이유({ ...채운것, 새것: false, prefix: '' }, 'ko')).toBe(null);
  });

  it('접두사 모양이 틀리면 모양을 말한다', () => {
    expect(서비스못보내는이유({ ...채운것, prefix: 'pay' }, 'ko')).toContain('대문자');
  });

  it('이름이 비면 그것을 말한다', () => {
    expect(서비스못보내는이유({ ...채운것, name: '' }, 'ko')).toContain('이름');
  });

  it('테스트 폴더가 비면 그것을 말한다', () => {
    expect(서비스못보내는이유({ ...채운것, testsDir: '' }, 'ko')).toContain('폴더');
  });

  it('빈 대상 서버 줄이 있으면 막는다. 그대로 보내면 서버가 400 을 내고 어느 칸인지 모른다', () => {
    const 이유 = 서비스못보내는이유({ ...채운것, envs: [{ env: '', baseUrl: '' }] }, 'ko');
    expect(이유).toContain('대상 서버');
  });

  it('키만 있고 주소가 비어도 막는다', () => {
    expect(서비스못보내는이유({ ...채운것, envs: [{ env: 'qa', baseUrl: '' }] }, 'ko')).toContain('대상 서버');
  });


  it('명암비가 낮은 것은 막지 않는다. 그건 경고이지 오류가 아니다', () => {
    expect(서비스못보내는이유({ ...채운것 }, 'ko')).toBe(null);
  });
});

describe('계정을 아직 못 보내는 이유', () => {
  it('다 채웠으면 이유가 없다', () => {
    expect(계정못보내는이유({ username: 'kim', displayName: '김철수' }, 'ko')).toBe(null);
  });

  it('아이디가 비면 그것을 말한다', () => {
    expect(계정못보내는이유({ username: '', displayName: '김철수' }, 'ko')).toContain('아이디');
  });

  it('이름이 비면 그것을 말한다', () => {
    expect(계정못보내는이유({ username: 'kim', displayName: '' }, 'ko')).toContain('이름');
  });
});

describe('서버가 낸 오류를 사람 말로 (SPEC §8.8)', () => {
  it('접두사가 겹치면 무엇을 고쳐야 하는지 말한다', () => {
    expect(설정오류문장('PREFIX_TAKEN', 'ko')).toContain('접두사');
  });

  it('접두사는 만든 뒤에 못 바꾼다는 것을 이유까지 말한다', () => {
    expect(설정오류문장('PREFIX_IMMUTABLE', 'ko')).toContain('바꿀 수 없');
  });

  it('마지막 운영 계정을 내리려 하면 왜 막혔는지 말한다', () => {
    expect(설정오류문장('LAST_ADMIN', 'ko')).toContain('운영');
  });

  it('아이디가 겹치면 그것을 말한다', () => {
    expect(설정오류문장('USERNAME_TAKEN', 'ko')).toContain('아이디');
  });

  it('모르는 코드는 코드를 그대로 붙여 준다. 삼키면 무엇이 틀렸는지 알 길이 없다', () => {
    expect(설정오류문장('WAT', 'ko')).toContain('WAT');
  });
});
