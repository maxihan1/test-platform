// BTS 이슈 본문 · 꼬리표 · 크기 상한 (도메인/BTS 「버그 바퀴」)

import { describe, expect, it } from 'vitest';

import { logcat오류줄, 같은곳에서깨짐, 꼬리표고르기, 또실패댓글, 본문상한, 이슈본문, 이슈제목, 제목상한, 폰로그상한, type 실패재료 } from './failBody.js';

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
  폰로그: null,
  결과주소: 'https://qahub.example.com/runs/812',
  꼬리표: '결함 가능성 높음',
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
    expect(꼬리표고르기('mismatch', ['PASS', 'PASS', 'PASS'])).toBe('결함 가능성 높음');
  });

  it('기대와 다르면 결함 가능성 높음 · 요소 못 찾음 · 시간 초과 · 환경은 테스트 문제 같음이다', () => {
    expect(꼬리표고르기('mismatch', ['FAIL', 'FAIL'])).toBe('결함 가능성 높음');
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

  it('단계를 다 빼도 넘으면 끝을 잘라 상한 안에 들고 실행 결과 고리는 남긴다', () => {
    const reqs = Array.from({ length: 50 }, (_, i) => ({ reqId: `R-${String(i)}`, text: '나'.repeat(300) }));
    const 글 = 이슈본문(재료({ reqs }));
    expect(Buffer.byteLength(글, 'utf8')).toBeLessThanOrEqual(본문상한);
    expect(글.endsWith('…\n\nTest Commander 실행 결과 — https://qahub.example.com/runs/812')).toBe(true);
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

  it('실패한 단계와 확인 문장이 같으면 실제 값이 달라도 같은 곳에서 깨진 것이다', () => {
    const 첫 = 재료();
    expect(같은곳에서깨짐(첫, { ...첫, 확인: { ...첫.확인!, actual: '375px' }, 네트워크: [] })).toBe(true);
    expect(같은곳에서깨짐(첫, { ...첫, 확인: { ...첫.확인!, statement: '다른 확인' } })).toBe(false);
    expect(같은곳에서깨짐(첫, 모바일재료)).toBe(false);
  });

  it('또 실패 댓글도 깨진 화면을 적는다', () => {
    expect(또실패댓글(재료({ 화면: { 깨짐: ['mobile'], 통과: ['desktop'] } }), 813).split('\n')[0]).toBe(
      'Test Commander 실행 #813 에서 또 실패했습니다 — 대상 서버 qa · 빌드 a1b2c3d-202610311530 · 화면 모바일만(PC 는 통과)',
    );
  });
});

const 줄 = (pid: number, 수준: string, 태그: string, 글: string): string => `11-04 10:00:01.000  ${String(pid)}  ${String(pid)} ${수준} ${태그}: ${글}`;
const 앱시작 = '11-04 10:00:00.100  1459  1568 I ActivityManager: Start proc 4321:com.demo.app/u0a352 for next-top-activity {com.demo.app/.Main}';

describe('logcat 오류 줄', () => {
  it('앱이 뜬 줄로 앱 PID 를 찾아 그 PID 의 E · F 줄과 시스템이 앱을 두고 남긴 ANR · 크래시 줄만 고른다 — 남의 앱 오류 · 앱의 I · W 줄 · 화면 합성 줄은 뺀다', () => {
    const 글 = [
      앱시작,
      '11-04 10:00:00.200  1459  1568 I ActivityManager: Start proc 4400:com.demo.app:push/u0a352 for service {com.demo.app/.Push}',
      줄(3110, 'E', 'adbd', 'failed to connect'),
      줄(4321, 'W', 'DemoApp', '느리다'),
      줄(4321, 'E', 'DemoApp', '주문 저장 실패'),
      줄(4400, 'E', 'Push', '토큰 없음'),
      줄(1120, 'E', 'SurfaceFlinger', 'alpha changed - Surface(name=com.demo.app/.Main)'),
      줄(1459, 'E', 'ActivityManager', 'ANR in com.demo.app'),
      줄(9000, 'F', 'DEBUG', 'pid: 4321, name: demo  >>> com.demo.app <<<'),
    ].join('\n');
    expect(logcat오류줄(글)).toEqual({
      줄: [
        줄(4321, 'E', 'DemoApp', '주문 저장 실패'),
        줄(4400, 'E', 'Push', '토큰 없음'),
        줄(1459, 'E', 'ActivityManager', 'ANR in com.demo.app'),
        줄(9000, 'F', 'DEBUG', 'pid: 4321, name: demo  >>> com.demo.app <<<'),
      ],
      더: 0,
    });
  });

  it('FATAL 이 있으면 거기서부터, 없으면 끝에서부터 상한까지 싣고 못 실은 수를 센다', () => {
    const 앞 = Array.from({ length: 5 }, (_, i) => 줄(4321, 'E', 'DemoApp', `앞 오류 ${String(i)}`));
    const 죽음 = [줄(4321, 'E', 'AndroidRuntime', 'FATAL EXCEPTION: main'), ...Array.from({ length: 12 }, (_, i) => 줄(4321, 'E', 'AndroidRuntime', `\tat a.b${String(i)}`))];
    const 죽음결과 = logcat오류줄([앱시작, ...앞, ...죽음].join('\n'));
    expect(죽음결과.줄[0]).toContain('FATAL EXCEPTION: main');
    expect(죽음결과.줄).toHaveLength(폰로그상한);
    expect(죽음결과.더).toBe(앞.length + 죽음.length - 폰로그상한);

    const 많음 = Array.from({ length: 15 }, (_, i) => 줄(4321, 'E', 'DemoApp', `오류 ${String(i)}`));
    expect(logcat오류줄([앱시작, ...많음].join('\n'))).toEqual({ 줄: 많음.slice(-폰로그상한), 더: 5 });
  });

  it('앱이 뜬 줄이 없으면 누구 것이든 F 수준 · FATAL 줄만 고른다 — 줄은 자르지 않는다(가린 뒤에 본문이 자른다)', () => {
    const 긴줄 = 줄(88, 'E', 'AndroidRuntime', `FATAL EXCEPTION: ${'x'.repeat(600)}`);
    const 결과 = logcat오류줄([줄(3110, 'E', 'adbd', 'failed'), 줄(77, 'F', 'libc', 'Fatal signal 11'), 긴줄].join('\n'));
    expect(결과).toEqual({ 줄: [긴줄], 더: 1 });
  });

  it('Android 9 까지의 「for activity」 도 앱으로 보고, 패키지 이름이 앞부분만 같은 남의 앱 줄은 잡지 않는다', () => {
    const 글 = [
      '11-04 10:00:00.100  1459  1568 I ActivityManager: Start proc 4321:com.demo.app/u0a352 for activity com.demo.app/.Main',
      줄(4321, 'E', 'DemoApp', '주문 저장 실패'),
      줄(1459, 'E', 'ActivityManager', 'ANR in com.demo.app.ops'),
      줄(1459, 'E', 'ActivityManager', 'ANR in com.demo.app'),
    ].join('\n');
    expect(logcat오류줄(글).줄).toEqual([줄(4321, 'E', 'DemoApp', '주문 저장 실패'), 줄(1459, 'E', 'ActivityManager', 'ANR in com.demo.app')]);
  });
});

describe('이슈 본문 — 앱 · 게임 항목', () => {
  it('폰 로그가 있으면 네트워크 · 콘솔 절 대신 「폰 로그(logcat)」 절에 오류 줄과 못 실은 수를 싣는다', () => {
    const 글 = 이슈본문(재료({ 네트워크: null, 콘솔: null, 폰로그: { 줄: ['11-04 E DemoApp: 주문 저장 실패'], 더: 3 } }));
    expect(글).toContain('### 디바이스 로그(logcat)\n```\n11-04 E DemoApp: 주문 저장 실패\n```');
    expect(글).toContain('나머지 오류 줄 3개는 Test Commander 실행 결과의 logcat 에서 보세요');
    expect(글).not.toContain('네트워크 · 콘솔');
  });

  it('줄은 500자에서 자르고 줄 안의 ``` 는 바꿔 코드 블록이 안 닫히게 한다', () => {
    const 글 = 이슈본문(재료({ 폰로그: { 줄: ['E App: 본문 ```json {}```', `E App: ${'y'.repeat(600)}`], 더: 0 } }));
    expect(글).toContain("E App: 본문 '''json {}'''");
    expect(글).toContain(`E App: ${'y'.repeat(493)}…\n\`\`\``);
  });

  it('오류 줄이 없으면 「앱 오류 줄 없음」, 받아 둔 logcat 이 없으면 없다고 적는다', () => {
    expect(이슈본문(재료({ 폰로그: { 줄: [], 더: 0 } }))).toContain('### 디바이스 로그(logcat)\n- 앱 오류 줄 없음');
    expect(이슈본문(재료({ 폰로그: '없음' }))).toContain('### 디바이스 로그(logcat)\n이 항목은 받아 둔 디바이스 로그가 없습니다');
  });
});

it('제목은 [애플리케이션] 케이스 이름이고 BTS 상한을 넘지 않는다', () => {
  expect(이슈제목(재료())).toBe('[데모마켓 웹] 비밀번호 10자 미만 오류');
  expect(이슈제목(재료({ tcName: '긴'.repeat(400) })).length).toBe(제목상한);
});

it('또 실패 댓글은 실행 번호 · 실패 원인 · 고리를 단다', () => {
  expect(또실패댓글(재료(), 813)).toBe(
    'Test Commander 실행 #813 에서 또 실패했습니다 — 대상 서버 qa · 빌드 a1b2c3d-202610311530\n실패 원인: 기대 결과와 다릅니다\n꼬리표: 결함 가능성 높음\nhttps://qahub.example.com/runs/812',
  );
});
