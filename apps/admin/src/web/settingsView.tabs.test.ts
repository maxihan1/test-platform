// 애플리케이션 설정 탭 상태 한 줄과 「필요한 것」 계산 검사
import { describe, expect, it } from 'vitest';

import { 탭상태, 탭필요한것, type 탭입력 } from './settingsView.js';

describe('애플리케이션 설정 탭 상태 한 줄과 「필요한 것」 (SPEC §8.8 · 2026-11-27)', () => {
  const 입력: 탭입력 = { testsRepo: 'https://github.com/x/y', envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }], 피그마있나: false, 웹훅있나: false };

  it('기본 정보 — 테스트 저장소가 비면 주의, 아니면 입력 완료', () => {
    expect(탭상태('basic', 입력, 'ko')).toEqual({ 글: '✓ 입력 완료', 톤: 'ok' });
    expect(탭상태('basic', { ...입력, testsRepo: '  ' }, 'ko')).toEqual({ 글: '테스트 저장소 비어 있음', 톤: 'warn' });
  });

  it('실행 — 주소가 있는 대상 서버가 없으면 주의, 있으면 서버 수와 계정 수(아이디가 적힌 일반 회원 + 역할 계정)', () => {
    expect(탭상태('run', { ...입력, envs: [] }, 'ko')).toEqual({ 글: '대상 서버 없음', 톤: 'warn' });
    // 주소를 아직 안 적은 줄은 서버로 세지 않는다
    expect(탭상태('run', { ...입력, envs: [{ env: 'qa', baseUrl: '' }] }, 'ko')).toEqual({ 글: '대상 서버 없음', 톤: 'warn' });
    const envs: 탭입력['envs'] = [
      { env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'member', 역할들: [{ role: '관리자', loginId: 'admin' }, { role: '판매자', loginId: 'seller' }, { role: '구매자', loginId: ' ' }, { role: '손님', loginId: null }] },
      { env: 'stg', baseUrl: 'https://stg.example.com', loginId: '  ' },
    ];
    expect(탭상태('run', { ...입력, envs }, 'ko')).toEqual({ 글: '✓ 서버 2개 · 계정 3개', 톤: 'ok' });
  });

  it('테스트 작성 — 피그마 토큰이 있으면 통과색, 없으면 흐린색', () => {
    expect(탭상태('author', 입력, 'ko')).toEqual({ 글: '피그마 토큰 없음', 톤: 'dim' });
    expect(탭상태('author', { ...입력, 피그마있나: true }, 'ko')).toEqual({ 글: '✓ 피그마 토큰 설정됨', 톤: 'ok' });
  });

  it('알림 · 연동 — Slack 웹훅이 있으면 통과색, 없으면 흐린색', () => {
    expect(탭상태('link', 입력, 'ko')).toEqual({ 글: 'Slack 없음', 톤: 'dim' });
    expect(탭상태('link', { ...입력, 웹훅있나: true }, 'ko')).toEqual({ 글: '✓ Slack 설정됨', 톤: 'ok' });
  });

  it('실행 탭 필요한 것 — 대상 서버 주소(필수)와 테스트 계정(로그인이 있으면)', () => {
    const 목록 = 탭필요한것('run', { ...입력, envs: [] }, 'ko');
    expect(목록.map((it) => [it.이름, it.필수, it.됨])).toEqual([
      ['대상 서버 주소', true, false],
      ['테스트 계정', false, false],
    ]);
    const 채움 = 탭필요한것('run', { ...입력, envs: [{ env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'member' }] }, 'ko');
    expect(채움.map((it) => it.됨)).toEqual([true, true]);
  });

  it('테스트 작성 탭 필요한 것 — 테스트 저장소 · 실서비스 서버가 아닌 대상 서버 · 피그마 토큰', () => {
    expect(탭필요한것('author', 입력, 'ko').map((it) => [it.이름, it.필수, it.됨])).toEqual([
      ['테스트 저장소', true, true],
      ['실서비스 서버가 아닌 대상 서버', true, true],
      ['피그마 토큰', false, false],
    ]);
  });

  it('실서비스 서버로 체크한 줄(이름이 prod 이면 미리 체크)만 있으면 서버가 아닌 대상 서버는 없는 것이다', () => {
    const 실서비스만 = (envs: 탭입력['envs']) => 탭필요한것('author', { ...입력, envs }, 'ko')[1]?.됨;
    expect(실서비스만([{ env: 'qa', baseUrl: 'https://qa.example.com', isProd: true }])).toBe(false);
    expect(실서비스만([{ env: 'prod', baseUrl: 'https://example.com' }])).toBe(false);
    expect(실서비스만([{ env: 'prod', baseUrl: 'https://example.com' }, { env: 'qa', baseUrl: 'https://qa.example.com' }])).toBe(true);
    // 주소가 없는 줄은 서버가 아니다
    expect(실서비스만([{ env: 'qa', baseUrl: '' }])).toBe(false);
  });

  it('영어로도 같은 판단을 내고 글만 영어다', () => {
    expect(탭상태('run', { ...입력, envs: [] }, 'en').글).toBe('No target servers');
    expect(탭상태('run', 입력, 'en').글).toBe('✓ 1 servers · 0 accounts');
  });
});
