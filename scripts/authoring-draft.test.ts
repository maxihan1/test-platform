// PRD 초안 자식 — 일 가르기 · 화면을 열지 · 입력 파일 · 비밀번호 가리기 · 지시문 · 출력 읽기 · 자식 인자 (도메인/BTS 「PRD 초안 → 결정 필요」)

import { describe, expect, it } from 'vitest';

import { 초안자식인자 } from './authoring-draft.js';
import { 값가리기, 비밀섞였나, 요청글, 초안일인가, 초안지시문, 출력읽기, 화면보나, type 초안자료 } from './authoring-draft-prompt.js';
import { 가림표 } from './authoring-reverse.js';

const 자료: 초안자료 = {
  projectId: 7,
  services: [
    { prefix: 'MKW', name: '데모마켓 웹', kind: 'SCREEN' },
    { prefix: 'MKO', name: '데모마켓 운영툴', kind: 'SCREEN' },
  ],
  issueKeys: ['DM-12', 'DM-13'],
  buildNo: 'a1b2c3d-202610311530',
};

describe('초안일인가', () => {
  it('draft 칸이 꼴에 맞을 때만 초안 일이다', () => {
    expect(초안일인가({ draft: 자료 })).toBe(true);
    expect(초안일인가({})).toBe(false);
    expect(초안일인가({ draft: { projectId: 7 } })).toBe(false);
    expect(초안일인가({ draft: null })).toBe(false);
  });
});

describe('화면보나', () => {
  it('웹(또는 종류를 모르는 옛 서비스)이고 주소가 있을 때만 화면을 연다', () => {
    expect(화면보나('SCREEN', 'https://qa.mk.test')).toBe(true);
    expect(화면보나(undefined, 'https://qa.mk.test')).toBe(true);
    expect(화면보나('APP', 'https://qa.mk.test')).toBe(false);
    expect(화면보나('API', 'https://qa.mk.test')).toBe(false);
    expect(화면보나('SCREEN', '')).toBe(false);
    expect(화면보나('SCREEN', undefined)).toBe(false);
  });
});

describe('입력 파일', () => {
  it('요청 파일에는 맡은 이슈 · 애플리케이션 목록만 싣고 계정은 안 싣는다', () => {
    const 글 = JSON.parse(요청글({ 자료, 서비스: 'MKW', 종류: undefined, env: 'qa', 화면: true })) as Record<string, unknown>;
    expect(글).toEqual({ projectId: 7, service: 'MKW', kind: 'SCREEN', env: 'qa', build: 'a1b2c3d-202610311530', issueKeys: ['DM-12', 'DM-13'], projectServices: 자료.services, screen: true });
  });

  it('PRD 의 글 어디에 든 비밀번호든 가린다 — 따옴표가 든 비밀번호도', () => {
    const 판 = { version: 3, items: [{ reqId: 'MKW-1', text: '테스트 계정 qa1 / pa"ss 로 로그인한다', basis: ['pa"ss'] }] };
    expect(값가리기(판, ['pa"ss'])).toEqual({ version: 3, items: [{ reqId: 'MKW-1', text: `테스트 계정 qa1 / ${가림표} 로 로그인한다`, basis: [가림표] }] });
    expect(값가리기(판, [])).toBe(판);
  });
});

describe('초안지시문', () => {
  it('웹이면 playwright-cli 로 이슈가 말한 화면만 열고 계정은 변수째 넘기게 한다', () => {
    const 글 = 초안지시문({ 자료, 서비스: 'MKW', 폴더: '/w/data', 화면: true });
    expect(글).toContain('playwright-cli');
    expect(글).toContain('"$TARGET_LOGIN_PASSWORD"');
    expect(글).toContain('DM-12 · DM-13');
    expect(글).toContain('/w/data/draft-output.json');
  });

  it('화면이 없으면 열지 말라고 하고, 같은 프로젝트의 다른 애플리케이션이 있을 때만 E2E 제안을 말한다', () => {
    const 혼자 = 초안지시문({ 자료: { ...자료, services: [자료.services[0]!] }, 서비스: 'MKW', 폴더: '/w', 화면: false });
    expect(혼자).toContain('화면을 열지 않는다');
    expect(혼자).not.toContain('playwright-cli');
    expect(혼자).not.toContain('E2E 시나리오를 제안');
    expect(초안지시문({ 자료, 서비스: 'MKW', 폴더: '/w', 화면: false })).toContain('MKO 데모마켓 운영툴');
  });
});

describe('출력읽기', () => {
  it('rows 목록과 있으면 e2e 목록을 읽는다 — 줄 꼴은 서버가 본다', () => {
    expect(출력읽기('{"rows":[{"op":"ADD"}]}')).toEqual({ rows: [{ op: 'ADD' }] });
    expect(출력읽기('{"rows":[],"e2e":[{"title":"x"}]}')).toEqual({ rows: [], e2e: [{ title: 'x' }] });
  });

  it('JSON 이 아니거나 rows 가 없거나 e2e 가 목록이 아니면 까닭을 낸다', () => {
    expect(출력읽기('rows')).toEqual({ 까닭: '출력 파일이 JSON 이 아니다' });
    expect(출력읽기('{}')).toEqual({ 까닭: '출력 파일에 rows 목록이 없다' });
    expect(출력읽기('{"rows":[],"e2e":{}}')).toEqual({ 까닭: '출력 파일의 e2e 는 목록이어야 한다' });
  });

  it('낸 초안에 비밀번호가 섞였는지 본다', () => {
    expect(비밀섞였나({ rows: [{ basis: '화면에서만 봄 — 비밀번호 s3cret! 입력' }] }, ['s3cret!'])).toBe(true);
    expect(비밀섞였나({ rows: [{ basis: '화면에서만 봄' }] }, ['s3cret!'])).toBe(false);
  });
});

describe('초안자식인자', () => {
  it('웹이면 Bash 를 열되 playwright-cli 만 허용하고, 아니면 Bash 를 안 연다', () => {
    const 웹 = 초안자식인자('sonnet' as never, '/w/data', '/w/tmp', '/w/tmp/mcp.json', true);
    expect(웹).toContain('Read,Write,Edit,Glob,Grep,Bash');
    expect(웹.slice(웹.indexOf('--allowedTools') + 1)).toEqual(['mcp__qa-hub', 'Bash(playwright-cli:*)']);
    const 앱 = 초안자식인자('sonnet' as never, '/w/data', '/w/tmp', '/w/tmp/mcp.json', false);
    expect(앱).toContain('Read,Write,Edit,Glob,Grep');
    expect(앱.slice(앱.indexOf('--allowedTools') + 1)).toEqual(['mcp__qa-hub']);
    expect(앱).not.toContain('--bare');
  });
});
