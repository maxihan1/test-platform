// 역방향 작성의 에이전트 쪽 순수 판정 검사 — 집을 때 재대조 · 자식 환경 · 차이 파일 · 비밀번호 원문 · 역기획서 변환 (도메인/작성 §3.6 「★ 역방향」)
import { describe, expect, it } from 'vitest';

import {
  type 대상,
  계정섞였나,
  글모두,
  대상점검,
  대상환경,
  되읽기인자,
  변환인자,
  사유거르기,
  올리기전검사,
  변환환경,
  산출물주소,
  원고거부사유,
  차이정리,
} from './authoring-reverse.js';
import { 줄프롬프트 } from './authoring-rules.js';

const 비밀 = 'Qa-pw-7731';

const 정상: 대상 = {
  env: 'qa',
  baseUrl: 'https://qa.example.com',
  startUrl: 'https://qa.example.com/orders',
  loginId: 'tester',
  loginPassword: 비밀,
};

describe('대상점검 — 집을 때 다시 대조한다', () => {
  it('target 이 없으면 정방향이라 볼 것이 없다', () => {
    expect(대상점검(undefined)).toBeNull();
  });

  it('정상이면 null', () => {
    expect(대상점검(정상)).toBeNull();
    expect(대상점검({ ...정상, startUrl: null })).toBeNull();
  });

  it('대상 서버 줄이 없어졌거나 주소가 http·https 가 아니면 사유', () => {
    expect(대상점검({ ...정상, baseUrl: null })).toContain('대상 서버');
    expect(대상점검({ ...정상, baseUrl: 'ftp://qa.example.com' })).toContain('대상 서버');
    expect(대상점검({ ...정상, baseUrl: '깨진 주소' })).toContain('대상 서버');
  });

  it('테스트 계정이 빠졌으면 사유', () => {
    for (const 빠짐 of [{ loginId: null }, { loginId: '' }, { loginPassword: null }, { loginPassword: '' }]) {
      expect(대상점검({ ...정상, ...빠짐 })).toContain('테스트 계정');
    }
  });

  it('비밀번호가 4자보다 짧으면 새는지 검사할 수 없어 사유', () => {
    expect(대상점검({ ...정상, loginPassword: 'abc' })).toContain('4자');
    expect(대상점검({ ...정상, loginPassword: 'abcd' })).toBeNull();
  });

  it('시작 주소 출처가 대상 서버와 어긋나면 사유', () => {
    expect(대상점검({ ...정상, startUrl: 'https://evil.example.com/' })).toContain('시작 주소');
    expect(대상점검({ ...정상, startUrl: 'http://qa.example.com/' })).toContain('시작 주소');
    expect(대상점검({ ...정상, startUrl: 'javascript:alert(1)' })).toContain('시작 주소');
  });

  it('사유 글에 아이디·비밀번호 원문이 없다', () => {
    const 사유들 = [
      대상점검({ ...정상, baseUrl: null }),
      대상점검({ ...정상, loginPassword: 'abc' }),
      대상점검({ ...정상, startUrl: 'https://evil.example.com/' }),
    ].join('\n');
    expect(사유들).not.toContain(비밀);
    expect(사유들).not.toContain('tester');
  });
});

describe('대상환경 — 계정은 자식 환경 변수로만 넘긴다', () => {
  it('다섯 칸을 TARGET_* 로 준다', () => {
    expect(대상환경(정상)).toEqual({
      TARGET_ENV: 'qa',
      TARGET_BASE_URL: 'https://qa.example.com',
      TARGET_START_URL: 'https://qa.example.com/orders',
      TARGET_LOGIN_ID: 'tester',
      TARGET_LOGIN_PASSWORD: 비밀,
    });
  });

  it('시작 주소가 없으면 키를 싣지 않는다', () => {
    expect(Object.keys(대상환경({ ...정상, startUrl: null }))).not.toContain('TARGET_START_URL');
  });
});

describe('차이정리 — 자식이 쓴 차이 파일을 좁혀 받는다', () => {
  const 한줄 = { no: 'D1', kind: 'DIFFERENT', where: '기획서.docx · 3쪽', doc: '저장', screen: '확인', tcId: 'PAY-012' };

  it('파일이 없으면 빈 목록', () => {
    expect(차이정리(null)).toEqual({ diffs: [] });
  });

  it('허용한 칸만 남기고 표시는 아직 안 했다고 강제한다', () => {
    const 글 = JSON.stringify([{ ...한줄, marked: true, 딴칸: 'x', markError: '거짓' }]);
    expect(차이정리(글)).toEqual({
      diffs: [{ ...한줄, marked: false, markError: '표시는 아직 안 한다', 표시: { asset: null, anchor: null, node: null } }],
    });
  });

  it('없는 칸은 null 로 둔다', () => {
    const 결과 = 차이정리(JSON.stringify([{ no: 'D2', kind: 'SCREEN_ONLY' }]));
    expect(결과).toEqual({
      diffs: [{ no: 'D2', kind: 'SCREEN_ONLY', where: null, doc: null, screen: null, tcId: null, marked: false, markError: '표시는 아직 안 한다', 표시: { asset: null, anchor: null, node: null } }],
    });
  });

  it('JSON 이 아니거나 배열이 아니면 사유', () => {
    expect(차이정리('{ 깨짐')).toHaveProperty('사유');
    expect(차이정리('{"diffs": []}')).toHaveProperty('사유');
  });

  it('번호가 없거나 종류가 셋 밖이면 사유', () => {
    expect(차이정리(JSON.stringify([{ kind: 'DIFFERENT' }]))).toHaveProperty('사유');
    expect(차이정리(JSON.stringify([{ no: 'D1', kind: 'ODD' }]))).toHaveProperty('사유');
    expect(차이정리(JSON.stringify([null]))).toHaveProperty('사유');
  });

  it('긴 글은 자른다', () => {
    const 결과 = 차이정리(JSON.stringify([{ ...한줄, doc: 'x'.repeat(5000) }]));
    expect('diffs' in 결과 && (결과.diffs[0]?.doc ?? '').length).toBe(2000);
  });

  it('줄이 너무 많으면 사유', () => {
    const 많음 = Array.from({ length: 501 }, (_, i) => ({ no: `D${i}`, kind: 'DOC_ONLY' }));
    expect(차이정리(JSON.stringify(많음))).toHaveProperty('사유');
  });
});

describe('계정섞였나 — 올리는 글에 비밀번호 원문이 있나', () => {
  it('어느 글에든 있으면 참', () => {
    expect(계정섞였나(['케이스 본문', `로그인 ${비밀}`], 비밀)).toBe(true);
  });

  it('없으면 거짓 · 비밀번호가 비었으면 거짓', () => {
    expect(계정섞였나(['케이스 본문'], 비밀)).toBe(false);
    expect(계정섞였나(['아무 글'], '')).toBe(false);
    expect(계정섞였나(['아무 글'], null)).toBe(false);
  });
});

describe('올리기전검사 — 올리기 전에 모은 글 전부를 본다', () => {
  it('케이스 · PR 본문 · 차이 파일 · 원고 중 하나라도 비밀번호가 있으면 사유 — 값은 싣지 않는다', () => {
    for (const 자리 of ['케이스', 'PR본문', '차이', '원고'] as const) {
      const 글들 = { 케이스: ['a'], PR본문: 'b', 차이: 'c', 원고: 'd', [자리]: 자리 === '케이스' ? [비밀] : 비밀 };
      const 사유 = 올리기전검사(글들, 비밀);
      expect(사유, 자리).toContain('비밀번호');
      expect(사유).not.toContain(비밀);
    }
  });

  it('깨끗하면 null', () => {
    expect(올리기전검사({ 케이스: ['a'], PR본문: 'b', 차이: null, 원고: null }, 비밀)).toBeNull();
  });
});

describe('사유거르기 — 실패 사유에 원문이 섞이면 고정 글로 바꾼다', () => {
  it('섞였으면 고정 글', () => {
    expect(사유거르기(`claude 를 못 띄웠다: ${비밀}`, 비밀)).not.toContain(비밀);
  });

  it('안 섞였으면 그대로', () => {
    expect(사유거르기('push 가 실패했다', 비밀)).toBe('push 가 실패했다');
  });
});

describe('변환환경 — pandoc 에 부모의 비밀을 물려주지 않는다', () => {
  it('부모 칸은 전부 지우고 PATH 와 준 자리만 남긴다', () => {
    const 부모 = { PATH: '/opt/homebrew/bin:/usr/bin', AUTHORING_AGENT_TOKEN: 'tpa_x', GH_TOKEN: 'ghp_x', HOME: '/Users/me' };
    expect(변환환경(부모, { HOME: '/w/집', TMPDIR: '/w/임시' })).toEqual({
      PATH: '/opt/homebrew/bin:/usr/bin',
      AUTHORING_AGENT_TOKEN: undefined,
      GH_TOKEN: undefined,
      HOME: '/w/집',
      TMPDIR: '/w/임시',
    });
  });

  it('부모에 PATH 가 없으면 기본 PATH', () => {
    expect(변환환경({}, { HOME: '/h', TMPDIR: '/t' }).PATH).toBe('/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
  });
});

describe('역기획서 원고와 변환', () => {
  it('그림 문법이 있으면 거절한다 — pandoc 이 바깥 파일을 끌어온다', () => {
    expect(원고거부사유('# 주문\n![x](../../proc/1/environ)')).toContain('그림');
    expect(원고거부사유('# 주문\n![x][r]\n\n[r]: /etc/passwd')).toContain('그림');
  });

  it('글과 표·링크만 있으면 받는다', () => {
    expect(원고거부사유('# 주문\n\n| 항목 | 확인 필요 |\n|---|---|\n| 버튼 | 예 |\n\n[화면](https://qa.example.com)')).toBeNull();
  });

  it('변환 인자는 마크다운에서 워드로 · 되읽기 인자는 워드에서 글자로', () => {
    expect(변환인자('/w/out/reverse-spec.md', '/w/out/reverse-spec.docx')).toEqual([
      '-f',
      'markdown',
      '-t',
      'docx',
      '-o',
      '/w/out/reverse-spec.docx',
      '/w/out/reverse-spec.md',
    ]);
    expect(되읽기인자('/w/out/reverse-spec.docx', '/w/out/reverse-spec.check.json')).toEqual([
      '-f',
      'docx',
      '-t',
      'json',
      '-o',
      '/w/out/reverse-spec.check.json',
      '/w/out/reverse-spec.docx',
    ]);
  });
});

describe('산출물주소 — outputs 통로 주소를 만든다', () => {
  it('이름·역할·서비스를 퍼센트 인코딩한다 — 이름에 & 가 있어도 다른 칸으로 새지 않는다', () => {
    expect(산출물주소(12, 'PAY&x', '역기획서 & 확인.docx', 'REVERSE_SPEC')).toBe(
      '/api/authoring/requests/12/outputs?service=PAY%26x&name=%EC%97%AD%EA%B8%B0%ED%9A%8D%EC%84%9C%20%26%20%ED%99%95%EC%9D%B8.docx&role=REVERSE_SPEC',
    );
  });

  it('표시 사본은 원본 번호를 싣는다', () => {
    expect(산출물주소(12, 'PAY', 'a.docx', 'MARKED', 5)).toBe('/api/authoring/requests/12/outputs?service=PAY&name=a.docx&role=MARKED&source=5');
  });
});

describe('글모두 — 되읽은 문서 구조에서 글을 전부 모은다', () => {
  it('링크 주소와 문서 정보까지 모은다 — 본문 글자만 보면 거기 숨긴 원문을 놓친다', () => {
    const 구조 = {
      meta: { title: { t: 'MetaInlines', c: [{ t: 'Str', c: 'Qa-pw-7731' }] } },
      blocks: [{ t: 'Para', c: [{ t: 'Link', c: [['', [], []], [{ t: 'Str', c: '보기' }], ['https://x/?q=Qa-pw-7731', '']] }] }],
    };
    const 글 = 글모두(구조);
    expect(글.filter((g) => g.includes('Qa-pw-7731'))).toHaveLength(2);
  });

  it('숫자·참거짓·null 은 건너뛴다', () => {
    expect(글모두({ a: 1, b: [true, null, '글'] })).toEqual(['글']);
  });
});

describe('차이정리 뒤 검사 — 따옴표·역슬래시가 든 비밀번호도 푼 값에서 찾는다', () => {
  it('JSON 이스케이프로 날 글자에서는 안 보여도 푼 값에서는 보인다', () => {
    const 비밀따옴 = 'ab"cd\\ef';
    const 날글 = JSON.stringify([{ no: 'D1', kind: 'DIFFERENT', doc: `비밀 ${비밀따옴}` }]);
    expect(계정섞였나([날글], 비밀따옴)).toBe(false);
    const 정리 = 차이정리(날글);
    expect('diffs' in 정리 && 계정섞였나(글모두(정리.diffs), 비밀따옴)).toBe(true);
  });
});

describe('줄프롬프트 역방향 절 — 계정 값 없이 자리만 준다', () => {
  it('역방향 요청은 역방향 절을 싣되 계정 값은 싣지 않는다 — 자식 환경 변수 이름만', () => {
    const 것 = {
      id: 9,
      kind: 'AUTHOR' as const,
      target: { env: 'qa', baseUrl: 'https://qa.x.com', startUrl: null, loginId: 'tester', loginPassword: 'Qa-pw-7731' },
    };
    const 글 = 줄프롬프트(것, 'PAY', [], undefined, { 화면만: false, 산출물폴더: '/w/9/자료/out' });
    expect(글).toContain('역방향');
    expect(글).toContain('실제 화면과 대조');
    expect(글).toContain('TARGET_LOGIN_PASSWORD');
    expect(글).toContain('/w/9/자료/out');
    expect(글).toContain('작성 요청 9');
    expect(글).not.toContain('Qa-pw-7731');
    expect(글).not.toContain('tester');
  });

  it('화면만이면 기획서가 없다고 적고 빈 기획서 절을 싣지 않는다', () => {
    const 글 = 줄프롬프트({ id: 9, kind: 'AUTHOR' }, 'PAY', [], undefined, { 화면만: true, 산출물폴더: '/w/out' });
    expect(글).toContain('화면만');
    expect(글).toContain('reverse-spec.md');
    expect(글).not.toContain('--- 기획서 ---');
  });

  it('역방향이 아니면 역방향 절이 없다', () => {
    const 글 = 줄프롬프트({ id: 3, kind: 'AUTHOR', specText: '본문' }, 'TODO', []);
    expect(글).not.toContain('역방향');
    expect(글).not.toContain('TARGET_');
  });
});
