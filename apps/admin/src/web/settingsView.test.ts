import { describe, expect, it } from 'vitest';

import type { UserRow } from './api.js';
import {
  마지막운영계정인가,
  명암비,
  색사유,
  설정오류문장,
  접두사사유,
  웹훅칸,
} from './settingsView.js';

function 계정(username: string, role: 'viewer' | 'operator' | 'admin', isActive = true): UserRow {
  return { username, displayName: username, role, isActive, services: [] };
}

describe('접두사 (SPEC §2 · §8.8)', () => {
  it('대문자로 시작하는 영문·숫자를 받는다', () => {
    expect(접두사사유('PAY')).toBe(null);
    expect(접두사사유('MEM2')).toBe(null);
    expect(접두사사유('A')).toBe(null);
  });

  it('열두 글자까지다', () => {
    expect(접두사사유('ABCDEFGHIJKL')).toBe(null);
    expect(접두사사유('ABCDEFGHIJKLM')).not.toBe(null);
  });

  it('소문자로 시작하면 사유를 준다', () => {
    expect(접두사사유('pay')).not.toBe(null);
  });

  it('숫자로 시작할 수 없다', () => {
    expect(접두사사유('1PAY')).not.toBe(null);
  });

  it('빈 칸은 모양 오류가 아니라 안 채운 것이다. 사람이 아직 타이핑을 안 했을 뿐이다', () => {
    expect(접두사사유('')).toBe(null);
  });

  it('하이픈은 접두사에 들어가지 않는다. tcId 에서 접두사와 번호를 가르는 글자다', () => {
    expect(접두사사유('PAY-')).not.toBe(null);
  });
});

describe('서비스 색의 명암비 (DESIGN.md)', () => {
  it('흰 글자 기준으로 잰다. 띠 바탕이 이 색이고 그 위에 흰 글자가 올라간다', () => {
    // 검정에 가까울수록 흰 글자가 잘 보인다
    expect(명암비('#000000')).toBeCloseTo(21, 0);
    expect(명암비('#ffffff')).toBeCloseTo(1, 1);
  });

  it('DB 의 DEMO 서비스 색이 기준에 못 미친다는 것을 잡는다', () => {
    // 2026-09-19 실측 — ① 에서 넘긴 항목이다
    expect(명암비('#888888')).toBeLessThan(4.5);
    expect(색사유('#888888')).not.toBe(null);
  });

  it('add-service.ts 가 기본으로 넣는 색은 통과한다', () => {
    expect(색사유('#3A5FCD')).toBe(null);
  });

  it('옛 기본색은 기준에 못 미쳤다. 이 검사가 그것을 잡아 고쳤다', () => {
    // 2026-09-19 — 이 함수를 만들면서 실측했다. 새로 만드는 서비스가 전부 미달 색을 받고 있었다
    expect(명암비('#5B7FDE')).toBeLessThan(4.5);
  });

  it('대소문자와 # 없는 표기를 가리지 않는다', () => {
    expect(명암비('5b7fde')).toBeCloseTo(명암비('#5B7FDE'), 5);
  });

  it('색이 아직 모양을 갖추지 않았으면 사유를 내지 않는다. 타이핑하는 중이다', () => {
    expect(색사유('#5B7')).toBe(null);
    expect(색사유('')).toBe(null);
  });
});

describe('Slack 웹훅 칸 (SPEC §8.8)', () => {
  it('설정돼 있으면 주소 대신 설정됨만 보여준다. 비밀값이라 되돌려 보여주지 않는다', () => {
    expect(웹훅칸(true)).toMatchObject({ 글: '설정됨', 버튼: '다시 넣기' });
  });

  it('없으면 넣으라고 말한다', () => {
    expect(웹훅칸(false)).toMatchObject({ 글: '없음', 버튼: '넣기' });
  });

  it('둘 다 주소를 담지 않는다', () => {
    expect(JSON.stringify(웹훅칸(true))).not.toContain('http');
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

describe('서버가 낸 오류를 사람 말로 (SPEC §8.8)', () => {
  it('접두사가 겹치면 무엇을 고쳐야 하는지 말한다', () => {
    expect(설정오류문장('PREFIX_TAKEN')).toContain('접두사');
  });

  it('접두사는 만든 뒤에 못 바꾼다는 것을 이유까지 말한다', () => {
    expect(설정오류문장('PREFIX_IMMUTABLE')).toContain('바꿀 수 없');
  });

  it('마지막 운영 계정을 내리려 하면 왜 막혔는지 말한다', () => {
    expect(설정오류문장('LAST_ADMIN')).toContain('운영');
  });

  it('아이디가 겹치면 그것을 말한다', () => {
    expect(설정오류문장('USERNAME_TAKEN')).toContain('아이디');
  });

  it('모르는 코드는 코드를 그대로 붙여 준다. 삼키면 무엇이 틀렸는지 알 길이 없다', () => {
    expect(설정오류문장('WAT')).toContain('WAT');
  });
});
