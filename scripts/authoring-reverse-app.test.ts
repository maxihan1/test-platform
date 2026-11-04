// Android 앱 · 게임 역방향 검사 — 집을 때 계정 없이도 가기 · appium-cli crawl 절 · 게임 창 훑기 절 (도메인/작성 §3.6 「앱 · 게임 역방향」 · APP-F2-05 · 06)
import { describe, expect, it } from 'vitest';

import { 게임역방향절, 앱역방향절 } from './authoring-reverse-app.js';
import { type 대상, 대상점검 } from './authoring-reverse.js';
import { 줄프롬프트 } from './authoring-rules.js';

const 앱줄: 대상 = { env: 'qa', baseUrl: 'http://qa.shop.test', startUrl: null, loginId: null, loginPassword: null };

describe('대상점검 — Android 앱', () => {
  it('계정이 없어도 간다 — 로그아웃 판만 훑는다. 웹은 그대로 막는다', () => {
    expect(대상점검(앱줄, true)).toBeNull();
    expect(대상점검({ ...앱줄, loginId: 'tester' }, true)).toBeNull();
    expect(대상점검(앱줄)).toContain('테스트 계정');
  });

  it('계정이 있으면 비밀번호 길이 · 운영 서버 · 서버 주소는 웹과 같이 본다', () => {
    expect(대상점검({ ...앱줄, loginId: 'tester', loginPassword: 'abc' }, true)).toContain('4자');
    expect(대상점검({ ...앱줄, isProd: true }, true)).toContain('운영 서버');
    expect(대상점검({ ...앱줄, baseUrl: null }, true)).toContain('대상 서버');
  });
});

describe('앱역방향절 — 웹 크롤러 대신 appium-cli crawl', () => {
  const 절 = (화면만: boolean) => 앱역방향절({ 화면만, 산출물폴더: '/w/9/자료/out', 요청번호: 9 }).join('\n');

  it('crawl 명령은 저장본 · 크롤 자리를 싣고 8분으로 돈다 — 웹 크롤러 · 훑기 보조 · 시작 주소는 안 쓴다', () => {
    for (const 화면만 of [false, true]) {
      const 글 = 절(화면만);
      expect(글).toContain('npx appium-cli -s=probe crawl --max 100 --minutes 8 --out /w/9/자료/crawl --keep /w/9/자료/kept/index.json');
      expect(글).toContain('references/app.md §6');
      expect(글).not.toContain('authoring-crawl.ts');
      expect(글).not.toContain('TARGET_START_URL');
    }
  });

  it('화면만은 덮은 열쇠 파일로 거르고, 대조는 기획서 화면만 고른다', () => {
    expect(절(true)).toContain('/w/9/자료/covered.json');
    expect(절(true)).toContain('PRD 에 없는 화면 0');
    expect(절(false)).not.toContain('covered.json');
    expect(절(false)).toContain('기획서가 말하는 화면뿐');
  });

  it('줄프롬프트는 앱 표시가 있을 때만 이 절을 싣고 계정 값은 싣지 않는다', () => {
    const 것 = { id: 9, kind: 'AUTHOR' as const, target: { ...앱줄, loginId: 'tester', loginPassword: 'Qa-pw-7731' } };
    const 앱 = 줄프롬프트(것, 'SHOP', [], undefined, { 화면만: true, 산출물폴더: '/w/9/자료/out', 앱: true });
    expect(앱).toContain('appium-cli -s=probe crawl');
    expect(앱).not.toContain('authoring-crawl.ts');
    expect(앱).not.toContain('Qa-pw-7731');
    expect(앱).not.toContain('tester');
    expect(줄프롬프트(것, 'SHOP', [], undefined, { 화면만: true, 산출물폴더: '/w/9/자료/out' })).toContain('authoring-crawl.ts');
  });
});

describe('게임역방향절 — 정방향과 같은 창 훑기', () => {
  const 절 = (화면만: boolean) => 게임역방향절({ 화면만, 산출물폴더: '/w/9/자료/out', 요청번호: 9 }).join('\n');

  it('game.md §7 을 열게 하고 훑은 창 자리를 준다 — 웹 크롤러 · appium-cli crawl · 시작 주소는 안 쓴다', () => {
    for (const 화면만 of [false, true]) {
      const 글 = 절(화면만);
      expect(글).toContain('references/game.md §7');
      expect(글).toContain('/w/9/자료/game-crawl/<이름>/');
      expect(글).toContain('`확인 필요`');
      expect(글).not.toContain('authoring-crawl.ts');
      expect(글).not.toContain('appium-cli');
      expect(글).not.toContain('TARGET_START_URL');
    }
  });

  it('화면만은 덮은 창 열쇠 파일로 거르고, 대조는 기획서가 말하는 창만 쓴다', () => {
    expect(절(true)).toContain('/w/9/자료/covered.json');
    expect(절(true)).toContain('PRD 에 없는 화면 0');
    expect(절(false)).not.toContain('covered.json');
    expect(절(false)).toContain('기획서가 말하는 창 · 장소뿐');
  });

  it('줄프롬프트는 게임 표시가 있을 때 이 절을 싣고 계정 값은 싣지 않는다', () => {
    const 것 = { id: 9, kind: 'AUTHOR' as const, target: { ...앱줄, loginId: 'tester', loginPassword: 'Qa-pw-7731' } };
    const 게임 = 줄프롬프트(것, 'ASH', [], undefined, { 화면만: true, 산출물폴더: '/w/9/자료/out', 게임: true });
    expect(게임).toContain('이 애플리케이션은 **게임**이다');
    expect(게임).not.toContain('authoring-crawl.ts');
    expect(게임).not.toContain('Qa-pw-7731');
    expect(게임).not.toContain('tester');
  });
});
