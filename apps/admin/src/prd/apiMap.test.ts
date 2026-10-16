// 서비스 지도 순수 함수 — 주소 틀 · 같은 사이트 · 지도 줄 모으기
import { describe, expect, it } from 'vitest';

import { 주소틀 as 러너주소틀 } from '@platform/runner/scenario/links.js';

import { API틀, 같은사이트인가, 지도상한, 지도줄들 } from './apiMap.js';

describe('API틀', () => {
  it('숫자 칸은 :n, uuid · 긴 16진 칸은 :id, 물음표 · # 뒤는 뺀다', () => {
    expect(API틀('https://api.example.com/api/orders/123/items?page=2#x')).toEqual({ host: 'api.example.com', path: '/api/orders/:n/items' });
    expect(API틀('https://a.example.com/u/0f8fad5b-d9cb-469f-a165-70867728950e')).toEqual({ host: 'a.example.com', path: '/u/:id' });
    expect(API틀('https://a.example.com/reset/a1b2c3d4e5f60718293a')).toEqual({ host: 'a.example.com', path: '/reset/:id' });
  });

  it('짧은 16진 · 글자 칸은 그대로, 포트는 호스트에 남는다', () => {
    expect(API틀('http://LOCALHOST:3001/api/cafe/v2')).toEqual({ host: 'localhost:3001', path: '/api/cafe/v2' });
    expect(API틀('http://localhost:3001')).toEqual({ host: 'localhost:3001', path: '/' });
  });

  it('http(s) 가 아니거나 주소가 아니면 null', () => {
    expect(API틀('data:text/plain,x')).toBeNull();
    expect(API틀('아님')).toBeNull();
  });
});

describe('같은사이트인가', () => {
  it('하위 도메인 · 포트는 안 보고 끝 두 칸(co.kr 꼴은 세 칸)을 본다', () => {
    expect(같은사이트인가('api.example.com', 'https://www.example.com/')).toBe(true);
    expect(같은사이트인가('localhost:3001', 'http://localhost:3000')).toBe(true);
    expect(같은사이트인가('api.shop.co.kr', 'https://www.shop.co.kr')).toBe(true);
    expect(같은사이트인가('other.co.kr', 'https://www.shop.co.kr')).toBe(false);
    expect(같은사이트인가('www.google-analytics.com', 'https://www.example.com')).toBe(false);
    expect(같은사이트인가('127.0.0.1:8080', 'http://localhost:3000')).toBe(false);
  });
});

describe('러너 주소틀과 같은 규칙', () => {
  // 러너 고정 spec 이 미룬 삭제 코드를 찾을 때 쓰는 한 벌 — 갈리면 배운 코드를 못 찾고 204 로만 답한다 (도메인/러너 §5.2)
  it.each([
    'https://API.example.com:8443/orders/123/items?page=2#x',
    'https://a.example.com/u/0f8fad5b-d9cb-469f-a165-70867728950e',
    'https://a.example.com/reset/a1b2c3d4e5f60718293a',
    'https://a.example.com/reset/a1b2c3',
    'http://demo:3002/api/me',
    'http://demo:3002',
  ])('%s', (url) => {
    const 틀 = API틀(url)!;
    expect(러너주소틀(url)).toBe(틀.host + 틀.path);
  });
});

describe('지도줄들', () => {
  const 기준 = 'https://qa.example.com';

  it('마지막 2xx 코드만 성공 코드로 남긴다 — 4xx · 5xx · 응답 없음은 안 남긴다', () => {
    const 줄들 = 지도줄들(
      [
        { method: 'DELETE', url: 'https://qa.example.com/api/me', resourceType: 'api', status: 200 },
        { method: 'DELETE', url: 'https://qa.example.com/api/me', resourceType: 'api', status: 204 },
        { method: 'DELETE', url: 'https://qa.example.com/api/me', resourceType: 'api', status: 404 },
        { method: 'DELETE', url: 'https://qa.example.com/api/cart/1', resourceType: 'api', status: null },
        // 브라우저 쪽은 케이스가 route 로 꾸민 응답일 수 있어 안 배운다
        { method: 'DELETE', url: 'https://qa.example.com/api/likes/1', resourceType: 'fetch', status: 200 },
      ],
      기준,
    );
    expect(줄들.map((x) => [x.path, x.okStatus])).toEqual([['/api/me', 204], ['/api/cart/:n', undefined], ['/api/likes/:n', undefined]]);
  });

  it('같은 사이트 API 만, (방식, 호스트, 틀)마다 한 줄에 부른 단계를 모은다', () => {
    const 줄들 = 지도줄들(
      [
        { method: 'get', url: 'https://api.example.com/orders/1', resourceType: 'fetch', seq: 2 },
        { method: 'GET', url: 'https://api.example.com/orders/2?x=1', resourceType: 'xhr', seq: 1 },
        { method: 'GET', url: 'https://api.example.com/orders/3', resourceType: 'fetch', seq: null },
        { method: 'POST', url: 'https://qa.example.com/login', resourceType: 'api', seq: null },
        { method: 'GET', url: 'https://qa.example.com/', resourceType: 'document', seq: 1 },
        { method: 'GET', url: 'https://ads.other.net/pixel', resourceType: 'fetch', seq: 1 },
      ],
      기준,
    );
    expect(줄들).toEqual([
      { method: 'GET', host: 'api.example.com', path: '/orders/:n', steps: [1, 2] },
      { method: 'POST', host: 'qa.example.com', path: '/login', steps: [] },
    ]);
  });

  it('종류 칸이 없는 줄(크롤러가 들은 API)은 거르지 않는다 · 상한을 넘는 새 API 는 버린다', () => {
    const 많음 = Array.from({ length: 지도상한 + 5 }, (_, i) => ({ method: 'GET', url: `https://qa.example.com/api/x${i}` }));
    expect(지도줄들(많음, 기준)).toHaveLength(지도상한);
  });
});
