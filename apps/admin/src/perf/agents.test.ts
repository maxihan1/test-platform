// 성능 에이전트 설치 명령이 가리킬 QA Hub 주소를 고르는 규칙 검사
import { describe, expect, it } from 'vitest';

import { 설치주소 } from './agents.js';

describe('성능 에이전트 설치 명령 주소', () => {
  it('PLATFORM_PUBLIC_URL 이 있으면 앞단(Caddy) 뒤의 http 요청이어도 그 주소를 쓴다', () => {
    expect(설치주소('https://qahub.maxihan.com/', 'http', 'qahub.maxihan.com')).toBe('https://qahub.maxihan.com');
  });

  it('PLATFORM_PUBLIC_URL 이 비면 요청이 들어온 주소를 쓴다', () => {
    expect(설치주소(undefined, 'http', 'localhost:3000')).toBe('http://localhost:3000');
    expect(설치주소('', 'http', undefined)).toBe('http://localhost');
  });
});
