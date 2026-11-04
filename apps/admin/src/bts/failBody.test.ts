// BTS 이슈 본문 · 꼬리표 · 크기 상한 (도메인/BTS 「버그 바퀴」)

import { describe, expect, it } from 'vitest';

import { 꼬리표고르기, 또실패댓글, 본문상한, 이슈본문, 이슈제목, 제목상한, type 실패재료 } from './failBody.js';

const 재료 = (덮어쓰기: Partial<실패재료> = {}): 실패재료 => ({
  애플리케이션: '데모마켓 웹',
  tcId: 'MKW-FN-012',
  tcName: '비밀번호 10자 미만 오류',
  env: 'qa',
  build: 'a1b2c3d-202610311530',
  device: null,
  steps: [
    { title: '가입 화면을 연다', status: 'PASS' },
    { title: '비밀번호에 9자를 넣는다', status: 'FAIL' },
  ],
  reqs: [{ reqId: 'MKW-REQ-012', text: '비밀번호는 10자 이상이어야 한다' }],
  확인: { statement: '오류 문구가 보인다', expected: '10자 이상 입력하세요', actual: null },
  원인: '기대 결과와 다릅니다',
  네트워크: ['POST /api/signup → 500'],
  콘솔: [],
  결과주소: 'https://qahub.example.com/runs/812',
  꼬리표: '버그 가능성 높음',
  화면: null,
  둘째: null,
  ...덮어쓰기,
});

const 모바일재료 = {
  steps: [
    { title: '가입 화면을 연다', status: 'PASS' as const },
    { title: '메뉴를 펼친다', status: 'FAIL' as const },
  ],
  확인: { statement: '메뉴가 열린다', expected: '열림', actual: '닫힘' },
  원인: '기대 결과와 다릅니다',
  네트워크: [],
  콘솔: ['[error] menu is undefined'],
};

describe('꼬리표', () => {
  it('앞 실행들에서 통과와 실패가 섞였으면 실패 유형과 상관없이 흔들림 같음이다', () => {
    expect(꼬리표고르기('mismatch', ['FAIL', 'PASS', 'FAIL'])).toBe('흔들림 같음');
  });

  it('앞 실행이 다 통과였던 새 회귀는 흔들림이 아니다', () => {
    expect(꼬리표고르기('mismatch', ['PASS', 'PASS', 'PASS'])).toBe('버그 가능성 높음');
  });

  it('기대와 다르면 버그 가능성 높음 · 요소 못 찾음 · 시간 초과 · 환경은 테스트 문제 같음이다', () => {
    expect(꼬리표고르기('mismatch', ['FAIL', 'FAIL'])).toBe('버그 가능성 높음');
    expect(꼬리표고르기('notFound', ['FAIL'])).toBe('테스트 문제 같음');
    expect(꼬리표고르기('timeout', [])).toBe('테스트 문제 같음');
    expect(꼬리표고르기('environment', ['FAIL', 'NA'])).toBe('테스트 문제 같음');
  });
});

describe('이슈 본문', () => {
  it('재현 단계 · 기대(PRD 요구) · 실제 · 네트워크 · 실행 결과 고리가 든다', () => {
    const 글 = 이슈본문(재료());
    expect(글).toContain('1. 가입 화면을 연다');
    expect(글).toContain('2. 비밀번호에 9자를 넣는다 ← 여기서 실패');
    expect(글).toContain('- MKW-REQ-012 비밀번호는 10자 이상이어야 한다');
    expect(글).toContain('- 실패한 확인: 오류 문구가 보인다');
    expect(글).toContain('- 요청: POST /api/signup → 500');
    expect(글).toContain('- 콘솔 오류 없음');
    expect(글).toContain('빌드 a1b2c3d-202610311530');
    expect(글).toContain('https://qahub.example.com/runs/812');
  });

  it('trace 를 아직 안 풀었으면 네트워크 · 콘솔 자리에 실행 결과를 보라고 적는다', () => {
    expect(이슈본문(재료({ 네트워크: null, 콘솔: null }))).toContain('네트워크 · 콘솔 기록은 Test Commander 실행 결과에서 보세요');
  });

  it('바이트 상한을 넘으면 재현 단계를 뒤에서부터 덜고 남은 수를 적는다 · 기대와 고리는 남는다', () => {
    const steps = Array.from({ length: 400 }, (_, i) => ({ title: `${String(i)}번째 단계 ${'가'.repeat(30)}`, status: 'PASS' as const }));
    const 글 = 이슈본문(재료({ steps }));
    expect(Buffer.byteLength(글, 'utf8')).toBeLessThanOrEqual(본문상한);
    expect(글).toMatch(/이하 \d+단계는 Test Commander 실행 결과에서/);
    expect(글).toContain('MKW-REQ-012');
    expect(글).toContain('https://qahub.example.com/runs/812');
  });

  it('단계를 다 빼도 넘으면 끝을 잘라 상한 안에 든다', () => {
    const reqs = Array.from({ length: 50 }, (_, i) => ({ reqId: `R-${String(i)}`, text: '나'.repeat(300) }));
    expect(Buffer.byteLength(이슈본문(재료({ reqs })), 'utf8')).toBeLessThanOrEqual(본문상한);
  });
});

describe('웹 화면', () => {
  it('두 화면 다 깨졌으면 환경 아래에 둘 다라고 적는다', () => {
    const 글 = 이슈본문(재료({ 화면: { 깨짐: ['desktop', 'mobile'], 통과: [] } }));
    expect(글).toMatch(/\*\*환경\*\* — [^\n]+\n\*\*화면\*\* — PC · 모바일 둘 다\n/);
  });

  it('한 화면만 깨졌으면 통과한 화면도 적는다', () => {
    expect(이슈본문(재료({ 화면: { 깨짐: ['mobile'], 통과: ['desktop'] } }))).toContain('**화면** — 모바일만(PC 는 통과)');
    expect(이슈본문(재료({ 화면: { 깨짐: ['desktop'], 통과: ['mobile'] } }))).toContain('**화면** — PC 만(모바일은 통과)');
  });

  it('한 화면만 돌았으면 그 화면만 적는다', () => {
    expect(이슈본문(재료({ 화면: { 깨짐: ['mobile'], 통과: [] } }))).toContain('**화면** — 모바일\n');
  });

  it('Android 앱 · 게임은 화면 줄이 없다', () => {
    expect(이슈본문(재료())).not.toContain('**화면**');
  });

  it('두 화면이 다른 곳에서 깨졌으면 재현 단계 · 실제 · 네트워크 · 콘솔을 화면마다 싣는다', () => {
    const 글 = 이슈본문(재료({ 화면: { 깨짐: ['desktop', 'mobile'], 통과: [] }, 둘째: 모바일재료 }));
    expect(글).toContain('### 재현 단계 — PC\n1. 가입 화면을 연다\n2. 비밀번호에 9자를 넣는다 ← 여기서 실패');
    expect(글).toContain('### 재현 단계 — 모바일\n1. 가입 화면을 연다\n2. 메뉴를 펼친다 ← 여기서 실패');
    expect(글).toContain('### 실제 — PC\n- 실패한 확인: 오류 문구가 보인다');
    expect(글).toContain('### 실제 — 모바일\n- 실패한 확인: 메뉴가 열린다');
    expect(글).toContain('### 네트워크 · 콘솔 — PC\n- 요청: POST /api/signup → 500');
    expect(글).toContain('### 네트워크 · 콘솔 — 모바일\n- 실패한 네트워크 요청 없음\n- 콘솔: [error] menu is undefined');
  });

  it('같은 곳에서 깨졌으면 한 번만 싣는다', () => {
    const 글 = 이슈본문(재료({ 화면: { 깨짐: ['desktop', 'mobile'], 통과: [] } }));
    expect(글).toContain('### 재현 단계\n');
    expect(글).not.toContain('### 재현 단계 —');
    expect(글).not.toContain('### 실제 —');
  });

  it('두 화면 단계가 길면 두 화면 다 뒤에서부터 덜어 상한 안에 든다', () => {
    const steps = Array.from({ length: 300 }, (_, i) => ({ title: `${String(i)}번째 단계 ${'가'.repeat(30)}`, status: 'PASS' as const }));
    const 글 = 이슈본문(재료({ steps, 화면: { 깨짐: ['desktop', 'mobile'], 통과: [] }, 둘째: { ...모바일재료, steps } }));
    expect(Buffer.byteLength(글, 'utf8')).toBeLessThanOrEqual(본문상한);
    expect(글.match(/이하 \d+단계는 Test Commander 실행 결과에서/g)).toHaveLength(2);
    expect(글).toContain('### 실제 — 모바일');
  });

  it('또 실패 댓글도 깨진 화면을 적는다', () => {
    expect(또실패댓글(재료({ 화면: { 깨짐: ['mobile'], 통과: ['desktop'] } }), 813).split('\n')[0]).toBe(
      'Test Commander 실행 #813 에서 또 실패했습니다 — 대상 서버 qa · 빌드 a1b2c3d-202610311530 · 화면 모바일만(PC 는 통과)',
    );
  });
});

it('제목은 [애플리케이션] 케이스 이름이고 BTS 상한을 넘지 않는다', () => {
  expect(이슈제목(재료())).toBe('[데모마켓 웹] 비밀번호 10자 미만 오류');
  expect(이슈제목(재료({ tcName: '긴'.repeat(400) })).length).toBe(제목상한);
});

it('또 실패 댓글은 실행 번호 · 실패 원인 · 고리를 단다', () => {
  expect(또실패댓글(재료(), 813)).toBe(
    'Test Commander 실행 #813 에서 또 실패했습니다 — 대상 서버 qa · 빌드 a1b2c3d-202610311530\n실패 원인: 기대 결과와 다릅니다\n꼬리표: 버그 가능성 높음\nhttps://qahub.example.com/runs/812',
  );
});
