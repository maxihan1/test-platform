import { describe, expect, it } from 'vitest';

import { 계정못보내는이유, 서비스못보내는이유 } from './settingsView.js';

describe('애플리케이션을 아직 못 보내는 이유 (SPEC §8.2 — 버튼은 살려 두고 사유를 말한다)', () => {
  const 채운것 = {
    새것: true,
    prefix: 'PAY',
    name: '결제 애플리케이션',
    testsDir: 'pay',
    envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test' }],
    제외: '',
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

  it('키가 같은 대상 서버 줄이 둘이면 막는다. 키가 줄을 가르는 이름이라 서버가 400 을 낸다', () => {
    const 두줄 = [{ env: 'qa', baseUrl: 'https://qa.pay.test' }, { env: 'qa', baseUrl: 'https://qa2.pay.test' }];
    expect(서비스못보내는이유({ ...채운것, envs: 두줄 }, 'ko')).toBe('같은 키의 대상 서버가 둘 있습니다. 키를 다르게 적어 주세요');
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

  it('탐색 제외 경로는 빈 줄 · 앞뒤 공백 · 끝의 / 를 봐준다', () => {
    expect(서비스못보내는이유({ ...채운것, 제외: '/daejeon/\n\n  /gyeongnam  ' }, 'ko')).toBe(null);
  });

  it('/ 로 시작하지 않거나 셸 글자가 든 줄은 그 줄을 짚어 말한다', () => {
    expect(서비스못보내는이유({ ...채운것, 제외: '/ok\ndaejeon' }, 'ko')).toContain('「daejeon」');
    expect(서비스못보내는이유({ ...채운것, 제외: '/a;rm' }, 'ko')).toContain('/ 로 시작');
  });

  it('경로가 너무 길거나 너무 많으면 한도를 말한다', () => {
    expect(서비스못보내는이유({ ...채운것, 제외: `/${'a'.repeat(100)}` }, 'ko')).toContain('100자');
    const 스물하나 = Array.from({ length: 21 }, (_, i) => `/p${i}`).join('\n');
    expect(서비스못보내는이유({ ...채운것, 제외: 스물하나 }, 'ko')).toContain('20개');
  });

  it('영어로도 낸다', () => {
    expect(서비스못보내는이유({ ...채운것, 제외: 'daejeon' }, 'en')).toContain('"daejeon"');
  });

  it('역할 계정 이름은 서버 BAD_ROLE 과 같은 규칙으로 먼저 짚는다 — 앞뒤 공백은 봐준다', () => {
    const 역할 = (...이름들: string[]) => ({ ...채운것, envs: [{ env: 'qa', baseUrl: 'https://qa.pay.test', 역할들: 이름들.map((role) => ({ role })) }] });
    expect(서비스못보내는이유(역할(' 관리자 ', '판매자'), 'ko')).toBe(null);
    expect(서비스못보내는이유(역할('가'.repeat(41)), 'ko')).toContain('40자');
    expect(서비스못보내는이유(역할(...Array.from({ length: 21 }, (_, i) => `역할${String(i)}`)), 'ko')).toContain('20개');
    expect(서비스못보내는이유(역할('관리자', '관리자 '), 'ko')).toContain('중복됩니다');
    expect(서비스못보내는이유(역할('일반 회원'), 'en')).toContain('"Regular user"');
  });
});

describe('계정을 아직 못 보내는 이유', () => {
  it('다 채웠으면 이유가 없다', () => {
    expect(계정못보내는이유({ username: 'kim', displayName: '김철수', 새것: true }, 'ko')).toBe(null);
  });

  it('아이디가 비면 그것을 말한다', () => {
    expect(계정못보내는이유({ username: '', displayName: '김철수', 새것: true }, 'ko')).toContain('아이디');
  });

  it('이름이 비면 그것을 말한다', () => {
    expect(계정못보내는이유({ username: 'kim', displayName: '', 새것: true }, 'ko')).toContain('이름');
  });

  it('아이디 모양이 서버 규칙과 다르면 보내기 전에 서버와 같은 말로 알린다', () => {
    for (const 틀린것 of ['Admin', 'k', '-kim', 'kim lee', 'a'.repeat(33)]) {
      expect(계정못보내는이유({ username: 틀린것, displayName: '김철수', 새것: true }, 'ko'), 틀린것).toBe(
        '아이디는 영문 소문자 · 숫자 · 마침표(.) · 밑줄(_) · 하이픈(-)으로 2~32자입니다',
      );
    }
  });

  it('이미 있는 계정을 고칠 때는 아이디 칸이 잠겨 있어 모양을 따지지 않는다', () => {
    expect(계정못보내는이유({ username: 'Admin', displayName: '김철수', 새것: false }, 'ko')).toBe(null);
  });
});
