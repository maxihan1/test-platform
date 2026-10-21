// 녹화 가리기 · AI 재료 줄이기

import { describe, expect, it } from 'vitest';

import { AI재료, AI줄상한, 가리기, 가림표, 남길녹화, 비밀값모으기, 정적인가, 줄잇기, type HAR줄 } from './har.js';

const 줄 = (at: string, method: string, url: string, more: Partial<HAR줄> & { mime?: string; resText?: string; reqText?: string; reqHeaders?: [string, string][]; resHeaders?: [string, string][] } = {}): HAR줄 => ({
  startedDateTime: at,
  time: more.time ?? 100,
  request: {
    method,
    url,
    headers: (more.reqHeaders ?? []).map(([name, value]) => ({ name, value })),
    ...(more.reqText !== undefined && { postData: { mimeType: 'application/json', text: more.reqText } }),
  },
  response: { status: 200, headers: (more.resHeaders ?? []).map(([name, value]) => ({ name, value })), content: { mimeType: more.mime ?? 'application/json', text: more.resText } },
  ...(more._resourceType !== undefined && { _resourceType: more._resourceType }),
});

const 로그인 = 줄('2026-10-21T00:00:00.000Z', 'POST', 'http://shop.test/api/login', {
  reqText: JSON.stringify({ id: 'tester01', password: 'pw-secret!' }),
  resText: JSON.stringify({ accessToken: 'tok-abcdef123456', user: { name: '홍길동' } }),
  resHeaders: [['set-cookie', 'SID=sess-998877; Path=/; HttpOnly']],
});
const 주문 = 줄('2026-10-21T00:00:03.400Z', 'GET', 'http://shop.test/api/orders', {
  reqHeaders: [['Authorization', 'Bearer tok-abcdef123456'], ['User-Agent', 'Chrome'], ['Cookie', 'SID=sess-998877'], ['Content-Type', 'application/json']],
  resText: '[]',
});
const 그림 = 줄('2026-10-21T00:00:01.000Z', 'GET', 'http://cdn.test/a.png', { mime: 'image/png', resText: 'iVBOR', _resourceType: 'image' });

describe('녹화 가리기', () => {
  it('줄을 여러 파일에서 시각 차례로 잇고 모양이 아닌 것은 버린다', () => {
    const 이은 = 줄잇기([{ log: { entries: [주문, { 망가짐: true }] } }, { log: { entries: [로그인, 그림] } }, null]);
    expect(이은.map((e) => e.request.url)).toEqual(['http://shop.test/api/login', 'http://cdn.test/a.png', 'http://shop.test/api/orders']);
  });

  it('이미지 · 폰트 · CSS 는 정적 리소스다', () => {
    expect(정적인가(그림)).toBe(true);
    expect(정적인가(줄('2026-10-21T00:00:00Z', 'GET', 'http://x/a.css', { mime: 'text/css' }))).toBe(true);
    expect(정적인가(주문)).toBe(false);
  });

  it('토큰 · 쿠키 · 비밀번호 칸의 값을 모으고 Bearer 앞말은 뗀다', () => {
    const 비밀 = 비밀값모으기([로그인, 주문]);
    expect(비밀).toEqual(expect.arrayContaining(['pw-secret!', 'tok-abcdef123456', 'sess-998877']));
    expect(비밀.some((v) => v.startsWith('Bearer'))).toBe(false);
    expect(비밀).not.toContain('/');
  });

  it('계정은 ${username} · ${password} 로, 나머지는 같은 값이면 같은 꼬리표로 바꾼다', () => {
    const 표 = 가림표(비밀값모으기([로그인, 주문]), [{ loginId: 'tester01', loginPassword: 'pw-secret!' }]);
    const [로, 주] = 가리기([로그인, 주문], 표);
    const 글 = JSON.stringify([로, 주]);
    expect(글).not.toContain('pw-secret!');
    expect(글).not.toContain('tok-abcdef123456');
    expect(글).not.toContain('tester01');
    expect(로!.request.postData?.text).toBe(JSON.stringify({ id: '${username}', password: '${password}' }));
    const 토큰꼬리표 = 표.get('tok-abcdef123456');
    expect(토큰꼬리표).toMatch(/^<<비밀\d+>>$/);
    expect(로!.response.content.text).toContain(토큰꼬리표);
    expect(주!.request.headers.find((h) => h.name === 'Authorization')?.value).toBe(`Bearer ${토큰꼬리표}`);
  });

  it('주소에 인코딩되어 들어간 비밀도 같은 꼬리표다', () => {
    const 표 = 가림표(['a b+c/d=e'], []);
    const 가린 = 가리기('http://x/?k=' + encodeURIComponent('a b+c/d=e'), 표);
    expect(가린).toBe(`http://x/?k=${표.get('a b+c/d=e')}`);
  });

  it('짧은 아이디는 주소를 망가뜨리지 않게 바꾸지 않는다', () => {
    const 표 = 가림표([], [{ loginId: 'admin', loginPassword: null }]);
    expect(가리기('/admin/users', 표)).toBe('/admin/users');
  });

  it('남길 녹화는 정적 리소스 본문을 버린다', () => {
    const 남길 = 남길녹화([그림, 주문]);
    expect(남길.log.entries[0]?.response.content.text).toBeUndefined();
    expect(남길.log.entries[1]?.response.content.text).toBe('[]');
  });
});

describe('AI 재료', () => {
  it('정적 리소스를 빼고 다음 요청까지 간격을 1초 단위로 반올림한다', () => {
    const 재료 = AI재료(줄잇기([{ log: { entries: [로그인, 그림, 주문] } }]));
    expect(재료).toMatchObject({ total: 3, staticExcluded: 1, cut: 0 });
    expect(재료.entries.map((e) => [e.i, e.method, e.gapSec])).toEqual([[1, 'POST', 3], [2, 'GET', 0]]);
  });

  it('브라우저 머리글 · 쿠키는 빼고 필요한 머리글만 남긴다', () => {
    const [e] = AI재료([주문]).entries;
    expect(e?.reqHeaders).toEqual({ authorization: 'Bearer tok-abcdef123456', 'content-type': 'application/json' });
  });

  it('긴 본문은 자르고 줄 수는 상한까지다', () => {
    const 긴 = 줄('2026-10-21T00:00:00Z', 'POST', 'http://x/a', { reqText: 'x'.repeat(5000), resText: 'y'.repeat(3000) });
    const [e] = AI재료([긴]).entries;
    expect(e?.reqBody?.length).toBeLessThan(4100);
    expect(e?.resBody).toContain('3000자 중 2000자');
    const 많은 = Array.from({ length: AI줄상한 + 5 }, (_, i) => 줄(new Date(Date.UTC(2026, 9, 21, 0, 0, i)).toISOString(), 'GET', `http://x/${i}`));
    expect(AI재료(많은)).toMatchObject({ cut: 5 });
  });
});
