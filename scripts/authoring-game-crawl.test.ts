// 게임 창 훑기 결과를 화면 기록 꼴로 — 장면이 붙은 키 · 버튼으로 이어진 창 연결 · 저장본과 견주기(같음 · 바뀜 · 새 창 · 30일)
import { describe, expect, it } from 'vitest';

import { 견주기, 저장목록, 창목록 } from './authoring-game-crawl.js';

const 훑음 = [
  { 주소: 'scene:Login', 이름: 'Login', 틀: 'scene:Login', 파일: '001.yml', 지문: 'aa01', 글자지문: 'bb01', 연곳: null },
  { 주소: '/Canvas/SignupPanel', 이름: '회원가입', 틀: '/Canvas/SignupPanel', 파일: '002.yml', 지문: 'aa02', 글자지문: 'bb02', 연곳: { 창: 'scene:Login', 버튼: 'SignupButton', 글자: '가입' } },
  { 주소: '/Canvas/SignupPanel/Terms[1]', 이름: '약관', 틀: '/Canvas/SignupPanel/Terms', 파일: '003.yml', 지문: 'aa03', 글자지문: 'bb03', 연곳: { 창: '/Canvas/SignupPanel', 버튼: '/Canvas/SignupPanel/TermsLink', 글자: '' } },
];

describe('창목록', () => {
  it('첫 줄의 장면을 키에 붙이고 창 경로는 순번을 뗀 틀로 쓴다', () => {
    expect(창목록(훑음).map((c) => c.키)).toEqual(['game:Login', 'game:Login/Canvas/SignupPanel', 'game:Login/Canvas/SignupPanel/Terms']);
  });

  it('창을 연 버튼을 앞 창의 연결로 단다 — 글자가 있으면 「」 로 붙인다', () => {
    const [시작, 가입] = 창목록(훑음);

    expect(시작!.연결).toEqual([{ toUrl: 'game:Login/Canvas/SignupPanel', via: 'SignupButton 「가입」' }]);
    expect(가입!.연결).toEqual([{ toUrl: 'game:Login/Canvas/SignupPanel/Terms', via: '/Canvas/SignupPanel/TermsLink' }]);
  });

  it('꼴이 틀린 줄은 빼고, 첫 줄이 시작 화면이 아니면 빈 목록이다', () => {
    expect(창목록([...훑음, { ...훑음[1], 파일: '../x.yml' }, { ...훑음[1], 지문: 'ZZ' }])).toHaveLength(3);
    expect(창목록(훑음.slice(1))).toEqual([]);
    expect(창목록({ 주소: 'scene:Login' })).toEqual([]);
  });
});

describe('견주기', () => {
  const 창들 = 창목록(훑음);
  const 저장 = [
    { 상태: '로그아웃' as const, 키: 'game:Login', 지문: 'aa01', 글자지문: 'bb01', 훑은날: '2026-10-20' },
    { 상태: '로그아웃' as const, 키: 'game:Login/Canvas/SignupPanel', 지문: 'aa02', 글자지문: 'XX', 훑은날: '2026-10-20' },
  ];

  it('지문 둘이 같고 30일 안이면 같음, 하나라도 다르면 바뀜, 없으면 새 창', () => {
    expect(견주기(창들, '로그아웃', 저장, '2026-10-23').map((c) => c.저장본)).toEqual(['같음', '바뀜', '새 창']);
  });

  it('30일이 지나면 지문이 같아도 바뀜이다 — 지문이 못 잡는 변화를 언젠가는 본다', () => {
    expect(견주기(창들, '로그아웃', 저장, '2026-11-20')[0]!.저장본).toBe('바뀜');
  });

  it('다른 상태에서 본 같은 창은 견주지 않는다', () => {
    expect(견주기(창들, '로그인:일반 회원', 저장, '2026-10-23').map((c) => c.저장본)).toEqual(['새 창', '새 창', '새 창']);
  });
});

describe('저장목록', () => {
  it('자식이 고칠 수 있는 파일이라 모양이 틀린 줄은 버린다', () => {
    const 맞음 = { 상태: '로그아웃', 키: 'game:Login', 지문: 'aa', 글자지문: 'bb', 훑은날: '2026-10-20', 기록: '001.yml' };

    expect(저장목록([맞음, { ...맞음, 상태: '로그인' }, { ...맞음, 기록: '../../etc/passwd' }, { ...맞음, 훑은날: '어제' }])).toEqual([맞음]);
    expect(저장목록(null)).toEqual([]);
  });
});
