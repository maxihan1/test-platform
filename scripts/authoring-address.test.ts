// 에이전트가 토큰을 들고 어디로 가나 — 평문 주소 막기 · 토큰을 읽는 자리 하나
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 주소안전한가 } from './authoring-rules.js';

describe('평문 주소로 비밀번호를 보내지 않는다', () => {
  it('같은 기계는 괜찮다. 망을 안 탄다', () => {
    expect(주소안전한가('http://localhost:3000')).toBe(null);
    expect(주소안전한가('http://127.0.0.1:3000')).toBe(null);
  });

  it('https 는 괜찮다', () => {
    expect(주소안전한가('https://qa.example.com')).toBe(null);
  });

  // 2026-09-23 — 서버 컨테이너의 에이전트는 compose 망 안의 admin 을 부른다. 망 밖으로 안 나간다
  it('compose 안의 admin 은 같은 기계로 친다', () => {
    expect(주소안전한가('http://admin:3000')).toBe(null);
  });

  it('점 없는 다른 이름은 막는다 — 사내 평문 주소일 수 있다', () => {
    expect(주소안전한가('http://qaserver:3000')).toMatch(/평문/);
  });

  it('남의 기계에 평문으로 보내면 막는다. 비밀번호가 사내망에 그대로 흐른다', () => {
    expect(주소안전한가('http://qa.example.com')).toMatch(/평문/);
  });

  it('주소 모양이 아니면 막는다', () => {
    expect(주소안전한가('그냥글자')).toMatch(/주소 모양/);
  });
});

describe('에이전트 토큰은 한 곳에만 둔다', () => {
  // 2026-09-23 — 비밀번호 대신 토큰. 환경변수로도 받게 하면 셸 기록·프로세스 목록에 새고 열쇠가 두 곳이 된다
  // 2026-09-23 서버로 옮기며 — 서버 컨테이너는 .env 의 AUTHORING_AGENT_TOKEN 하나만 읽는다. 다른 이름이 생기면 열쇠가 두 곳이 된다
  it('환경변수에서 읽는 토큰은 AUTHORING_AGENT_TOKEN 하나뿐이다', () => {
    for (const 파일 of ['./authoring-agent.ts', './authoring-token.ts']) {
      const 소스 = readFileSync(new URL(파일, import.meta.url), 'utf8');
      const 읽는곳 = 소스
        .split('\n')
        .filter((줄) => /TOKEN|PASSWORD/i.test(줄) && /env\[|env\./.test(줄))
        .filter((줄) => !/env\.AUTHORING_AGENT_TOKEN\b/.test(줄));
      expect(읽는곳, 파일).toEqual([]);
    }
  });
});
