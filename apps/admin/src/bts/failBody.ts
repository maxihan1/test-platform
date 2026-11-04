// 실패 하나를 BTS 이슈 제목 · 본문 · 댓글 · 꼬리표로 옮기는 순수 함수 — 크기 상한 · 꼬리표 규칙 (도메인/BTS 「버그 바퀴」)
// DB 를 안 본다. 가리기는 부르는 쪽(failReport.ts)이 다 만든 글에 한 번 더 건다

import type { DeviceInfo, ItemStatus } from '@platform/kit';

import type { 실패유형 } from '../reporting/failureType.js';

/** BTS IssueTextConstraints.DESCRIPTION_MAX · COMMENT_BODY_MAX. BTS 는 글자로 세지만 여기는 바이트로 센다 — 한글이 3바이트라 늘 안에 든다 */
export const 본문상한 = 32767;
/** BTS IssueTextConstraints.SUMMARY_MAX */
export const 제목상한 = 255;
/** 첨부는 캡처 먼저 이 개수까지 (도메인/BTS 「크기 상한」) */
export const 첨부상한 = 5;

export type 꼬리표 = '버그 가능성 높음' | '테스트 문제 같음' | '흔들림 같음';

/**
 * AI 를 부르지 않고 규칙으로 고른다(BTS-F3-03 시작 질문 2026-10-31). 앞 실행들에서 통과와 실패가 섞였으면 흔들림이 먼저다 —
 * 같은 테스트가 오락가락하면 확인 문장이 틀렸어도 버그라고 하기 이르다. 앞실행 에 이번 실행을 넣지 않는다
 */
export function 꼬리표고르기(유형: 실패유형 | null, 앞실행: ItemStatus[]): 꼬리표 {
  if (앞실행.includes('PASS') && 앞실행.includes('FAIL')) return '흔들림 같음';
  return 유형 === 'mismatch' ? '버그 가능성 높음' : '테스트 문제 같음';
}

export interface 실패재료 {
  애플리케이션: string;
  tcId: string;
  tcName: string;
  env: string;
  build: string | null;
  device: DeviceInfo | null;
  steps: { title: string; status: ItemStatus }[];
  reqs: { reqId: string; text: string | null }[];
  /** 실패한 첫 확인 — 없으면 항목 오류로 실패한 것 */
  확인: { statement: string; expected: unknown; actual: unknown } | null;
  원인: string | null;
  /** trace 를 아직 안 풀었으면 null — 실행 뒤 따로 푼다(execution/traceIngest.ts) */
  네트워크: string[] | null;
  콘솔: string[] | null;
  /** 앱 · 게임 항목만 — 있으면 네트워크 · 콘솔 절 대신 이 절이 나간다. 웹 항목은 null, 받아 둔 logcat 이 없으면 '없음' */
  폰로그: 폰오류줄 | '없음' | null;
  결과주소: string | null;
  꼬리표: 꼬리표;
}

/** 이슈에 싣는 logcat 줄 수 · 줄마다 글자 수 */
export const 폰로그상한 = 10;
const 폰줄글자상한 = 500;

export interface 폰오류줄 {
  /** 자르지 않은 줄 — 가린 뒤에 본문이 자른다. 자른 뒤 가리면 잘린 자리에 걸친 비밀값 앞부분이 그대로 나간다 */
  줄: string[];
  /** 상한에 걸려 못 실은 오류 줄 수 */
  더: number;
}

// threadtime 꼴 `11-04 10:00:03.000  4321  4321 E 태그: 글` — 수준 E · F 만
const 오류줄꼴 = /^\d\d-\d\d \d\d:\d\d:\d\d\.\d+\s+(\d+)\s+\d+\s+([EF])\s/;
// Appium 연결이 띄운 앱 — `for top-activity` · `for next-top-activity` 이고 Android 9 까지는 `for activity` 다. 프로세스 이름은 `패키지` 나 `패키지:하위` 다
const 프로세스시작 = /Start proc (\d+):([^/\s]+)\/\S+ for (\S+)/;
const 활동관리 = /\sActivity(?:Task)?Manager\s*:/;

/**
 * 팜 logcat 은 폰 전체 기록이라 남의 앱 오류가 훨씬 많다(adbd · keystore …). 앱이 뜬 줄(화면을 띄우려고 시작한 프로세스)에서
 * 앱 PID 를 찾아 그 PID 의 E · F 줄과 시스템이 앱을 두고 남긴 오류 줄(ANR · 네이티브 크래시)만 고른다.
 * 죽은 자리가 가장 쓸모 있어 FATAL 이 있으면 거기서부터, 없으면 실패 순간에 가까운 끝에서부터 싣는다
 */
export function logcat오류줄(글: string): 폰오류줄 {
  const 줄들 = 글.split('\n');
  const 시작들 = 줄들.flatMap((l) => {
    const m = 프로세스시작.exec(l);
    return m === null ? [] : [{ pid: m[1]!, 패키지: m[2]!.split(':')[0]!, 앱: m[3]!.endsWith('activity') }];
  });
  const 앱 = new Set(시작들.filter((s) => s.앱).map((s) => s.패키지));
  const 앱pid = new Set(시작들.filter((s) => 앱.has(s.패키지)).map((s) => s.pid));
  // 패키지 이름 뒤가 끊겨야 한다 — com.demo.market 이 com.demo.market.ops 줄을 잡지 않게
  const 앱이름 = new RegExp(`(?:${[...앱].map((p) => p.replaceAll('.', '\\.')).join('|')})(?![\\w.])`);
  const 고른 = 줄들.filter((l) => {
    const m = 오류줄꼴.exec(l);
    if (m === null) return false;
    // 앱이 뜬 줄이 없으면(연결 전에 이미 떠 있었다) 누구 것이든 죽은 줄만 — 남은 E 줄은 거의 다 남의 것이다
    if (앱.size === 0) return m[2] === 'F' || l.includes('FATAL');
    if (앱pid.has(m[1]!)) return true;
    // 남이 남긴 앱 줄은 ANR(ActivityManager)과 네이티브 크래시 머리(F)만 — 화면 합성(SurfaceFlinger · WindowManager)도 패키지를 달지만 오류가 아니다
    return (m[2] === 'F' || 활동관리.test(l)) && 앱이름.test(l);
  });
  const 첫 = 고른.findIndex((l) => l.includes('FATAL'));
  const 실을 = 첫 === -1 ? 고른.slice(-폰로그상한) : 고른.slice(첫, 첫 + 폰로그상한);
  return { 줄: 실을.map((l) => l.trimEnd()), 더: 고른.length - 실을.length };
}

const 바이트 = (글: string): number => Buffer.byteLength(글, 'utf8');

const 짧게 = (값: unknown, 상한 = 300): string => {
  const 글 = typeof 값 === 'string' ? 값 : JSON.stringify(값) ?? String(값);
  return 글.length > 상한 ? `${글.slice(0, 상한)}…` : 글;
};

export function 이슈제목(재료: Pick<실패재료, '애플리케이션' | 'tcName'>): string {
  const 제목 = `[${재료.애플리케이션}] ${재료.tcName}`;
  return 제목.length > 제목상한 ? `${제목.slice(0, 제목상한 - 1)}…` : 제목;
}

function 환경줄(재료: 실패재료): string {
  const 칸 = [`대상 서버 ${재료.env}`];
  if (재료.build !== null) 칸.push(`빌드 ${재료.build}`);
  const d = 재료.device;
  if (d !== null) 칸.push(`디바이스 ${d.model} · Android ${d.osVersion} · 앱 ${d.appVersion}${d.appBuild ? ` (${d.appBuild})` : ''}`);
  return `**환경** — ${칸.join(' · ')}`;
}

function 앞뒤(재료: 실패재료): { 앞: string[]; 뒤: string[] } {
  const 앞 = [
    `**케이스** — ${재료.tcId}`,
    환경줄(재료),
    `**꼬리표** — ${재료.꼬리표} (Test Commander 규칙으로 붙였습니다)`,
    '',
    '### 재현 단계',
  ];
  const 실제 = [
    ...(재료.확인 === null
      ? []
      : [`- 실패한 확인: ${재료.확인.statement}`, `  - 기대 값: ${짧게(재료.확인.expected)}`, `  - 실제 값: ${짧게(재료.확인.actual)}`]),
    ...(재료.원인 === null ? [] : [`- 실패 원인: ${재료.원인}`]),
  ];
  const 폰 = 재료.폰로그;
  // 앱 · 게임 항목은 브라우저 trace 가 없다 — 네트워크 · 콘솔 대신 폰 logcat 오류 줄이다
  const 기록 =
    폰 !== null
      ? [
          '### 폰 로그(logcat)',
          ...(폰 === '없음'
            ? ['이 항목은 받아 둔 폰 로그가 없습니다']
            : 폰.줄.length === 0
              ? ['- 앱 오류 줄 없음']
              : // 줄 안의 ``` 가 코드 블록을 닫으면 뒤 본문(실행 결과 고리)이 깨진다
                ['```', ...폰.줄.map((l) => 짧게(l, 폰줄글자상한).replaceAll('```', "'''")), '```']),
          ...(폰 !== '없음' && 폰.더 > 0 ? [`나머지 오류 줄 ${String(폰.더)}개는 Test Commander 실행 결과의 logcat 에서 보세요`] : []),
        ]
      : [
          '### 네트워크 · 콘솔',
          ...(재료.네트워크 === null || 재료.콘솔 === null
            ? ['네트워크 · 콘솔 기록은 Test Commander 실행 결과에서 보세요']
            : [
                ...(재료.네트워크.length === 0 ? ['- 실패한 네트워크 요청 없음'] : 재료.네트워크.map((n) => `- 요청: ${n}`)),
                ...(재료.콘솔.length === 0 ? ['- 콘솔 오류 없음'] : 재료.콘솔.map((c) => `- 콘솔: ${c}`)),
              ]),
        ];
  const 뒤 = [
    '',
    '### 기대 (PRD)',
    ...(재료.reqs.length === 0 ? ['이 케이스가 덮는 PRD 요구가 없습니다'] : 재료.reqs.map((r) => `- ${r.reqId} ${r.text ?? ''}`.trimEnd())),
    '',
    '### 실제',
    ...(실제.length === 0 ? ['- 실패 원인을 가르지 못했습니다'] : 실제),
    '',
    ...기록,
    ...(재료.결과주소 === null ? [] : ['', `Test Commander 실행 결과 — ${재료.결과주소}`]),
  ];
  return { 앞, 뒤 };
}

/** 상한을 넘으면 재현 단계를 뒤에서부터 덜어 내고 남은 수를 적는다 — 기대 · 실제 · 고리는 늘 남는다 */
export function 이슈본문(재료: 실패재료): string {
  const { 앞, 뒤 } = 앞뒤(재료);
  const 단계 = 재료.steps.map((s, i) => `${String(i + 1)}. ${s.title}${s.status === 'FAIL' ? ' ← 여기서 실패' : ''}`);
  for (let 남길 = 단계.length; 남길 >= 0; 남길--) {
    const 뺀수 = 단계.length - 남길;
    const 글 = [...앞, ...단계.slice(0, 남길), ...(뺀수 > 0 ? [`이하 ${String(뺀수)}단계는 Test Commander 실행 결과에서`] : []), ...뒤].join('\n');
    if (바이트(글) <= 본문상한) return 글;
  }
  // 단계를 다 빼도 넘으면 끝을 자른다 — 요구 문장 · 기록이 유난히 긴 경우뿐이다
  const 글 = [...앞, `이하 ${String(단계.length)}단계는 Test Commander 실행 결과에서`, ...뒤].join('\n');
  return Buffer.from(글, 'utf8').subarray(0, 본문상한 - 3).toString('utf8').replace(/�$/, '') + '…';
}

/** 열린 이슈에 다는 「또 실패」 댓글 */
export function 또실패댓글(재료: Pick<실패재료, 'env' | 'build' | '원인' | '결과주소' | '꼬리표'>, runId: number): string {
  return [
    `Test Commander 실행 #${String(runId)} 에서 또 실패했습니다 — 대상 서버 ${재료.env}${재료.build === null ? '' : ` · 빌드 ${재료.build}`}`,
    ...(재료.원인 === null ? [] : [`실패 원인: ${재료.원인}`]),
    `꼬리표: ${재료.꼬리표}`,
    ...(재료.결과주소 === null ? [] : [재료.결과주소]),
  ].join('\n');
}
