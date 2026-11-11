// trace.zip 을 풀어 네트워크 · 조작 · 콘솔 줄로 바꾸는 순수 파서. 가리기 · 저장은 traceIngest.ts 가 한다 (SPEC 도메인/실행 §3.2 「trace」)
// 형식은 Playwright 가 공개로 약속한 것이 아니다 — 올렸을 때 조용히 비지 않게 traceContract.test.ts 가 진짜 zip 으로 지킨다.
// 서버 적재와 작성 중 실패 요약(scripts/authoring-trace.ts)이 같이 쓴다. 이름에 trace.ts 를 안 쓴다 — prd/trace.ts 는 요구사항 추적표다

import JSZip from 'jszip';

export interface 네트워크줄 {
  seq: number | null;
  atMs: number;
  method: string;
  url: string;
  status: number | null;
  resourceType: string;
  durationMs: number | null;
  failure: string | null;
  requestBody: string | null;
  responseBody: string | null;
}

export interface 조작줄 {
  seq: number | null;
  atMs: number;
  title: string;
  target: string | null;
  value: string | null;
  // 브라우저가 type="password" 칸이라고 알려 준 조작. 값이 무엇이든 가린다
  secretField: boolean;
  durationMs: number | null;
  error: string | null;
}

export interface 콘솔줄 {
  seq: number | null;
  atMs: number;
  level: string;
  text: string;
  url: string | null;
}

/** kit 이 단계마다 남긴 결과(platform-step 첨부). 실패 판정(verify)은 예외가 아니라 여기에만 남는다 — 작성 중 실패 요약이 「값 다름」을 이것으로 가른다 */
export interface 단계줄 {
  seq: number;
  title: string;
  status: string;
  error: string | null;
  failed: { statement: string; expected: unknown; actual: unknown }[];
}

export interface 풀린trace {
  network: 네트워크줄[];
  actions: 조작줄[];
  console: 콘솔줄[];
}

type 줄 = Record<string, unknown>;

const 글 = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const 수 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const 객체 = (v: unknown): 줄 => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as 줄) : {});
// Playwright 는 오류 글에 색 코드를 섞는다
const 색뺀다 = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, '');

// 한 줄이 깨져도 나머지는 산다 — 쓰다 만 마지막 줄이 흔하다
function 줄들(text: string): 줄[] {
  return text.split('\n').flatMap((l) => {
    if (l.trim() === '') return [];
    try {
      return [객체(JSON.parse(l))];
    } catch {
      return [];
    }
  });
}

// 이미지 · 글꼴 · 스크립트가 잘 온 줄은 버린다. API · 페이지 이동 · 실패만 남긴다 (실행 §3.2 「trace」)
const 남길종류 = new Set(['fetch', 'xhr', 'document']);
// API 요청 문맥(request 도구)의 줄은 종류가 비어 온다 — API 로 친다
const API종류 = new Set(['fetch', 'xhr', 'api']);
const 글본문 = /json|text|xml|javascript|x-www-form-urlencoded/i;
// 케이스가 남기는 증적 사진이다. 사람의 조작이 아니다
const 뺄조작 = new Set(['Screenshot']);
// E2E 러너가 부품마다 부르는 창 열기 · 닫기 · 모킹 응답이다. 케이스의 조작이 아니다 — 부른 자리(첫 stack 칸)로 가른다 (도메인/시나리오 §7 「실패 기록」)
const 러너가부름 = (l: 줄): boolean => {
  const 첫칸 = Array.isArray(l.stack) ? 객체(l.stack[0]) : {};
  return (글(첫칸.file) ?? '').replaceAll('\\', '/').includes('/apps/runner/scenario/');
};

/**
 * trace.zip 한 개를 푼다. `본문` 이 거짓이면 요청 · 응답 본문을 안 읽는다 — 통과 항목은 본문을 안 남긴다.
 * 시각(atMs)은 테스트가 시작한 때부터 잰 밀리초다. 단계 번호(seq)는 kit 이 단계마다 남기는 `platform-step` 첨부로 붙인다
 */
export async function trace를푼다(zip: Buffer | JSZip, 설정: { 본문: boolean }): Promise<풀린trace> {
  const 묶음 = await 연다(zip);
  const 읽기 = async (이름: string): Promise<string | null> => (await 묶음.file(이름)?.async('string')) ?? null;
  const 이름들 = Object.keys(묶음.files);

  const 테스트줄 = 줄들((await 읽기('test.trace')) ?? '');
  const 시작 = 수(테스트줄.find((l) => l.type === 'context-options')?.monotonicTime) ?? 0;
  const 상대 = (t: number): number => Math.round(t - 시작);

  const { 앞, 뒤 } = 호출들(테스트줄);

  // 단계 경계: platform-step 첨부를 단 때. 그 전에 일어난 일은 그 단계 것이다
  const 경계 = (await 단계첨부들(앞, 뒤, 읽기)).flatMap(({ at, 내용 }) => {
    const seq = 수(내용.seq);
    return seq === null ? [] : [{ at, seq }];
  });
  // 첫 단계는 준비(Before Hooks)가 끝난 뒤 시작한다. 준비 중 일(로그인 fixture 의 API 등)과 마지막 단계 뒤 정리는 단계 밖이다
  const 준비끝 = Math.max(
    -Infinity,
    ...[...앞].filter(([, l]) => l.method === 'hook' && l.title === 'Before Hooks').map(([id]) => 수(뒤.get(id)?.endTime) ?? -Infinity),
  );
  const 단계 = (t: number): number | null => (t < 준비끝 ? null : (경계.find((b) => b.at >= t)?.seq ?? null));

  // 준비 · 정리(fixture · hook) 안의 호출은 케이스의 조작이 아니다
  const 준비안 = (l: 줄): boolean => {
    for (let p = 글(l.parentId); p !== null; p = 글(앞.get(p)?.parentId)) {
      const m = 앞.get(p)?.method;
      if (m === 'fixture' || m === 'hook') return true;
    }
    return false;
  };

  const 문맥줄 = (await Promise.all(이름들.filter((n) => /^\d+-trace\.trace$/.test(n)).map(읽기))).flatMap((t) => 줄들(t ?? ''));
  const 비밀칸 = 비밀칸조작(문맥줄);

  const actions: 조작줄[] = [];
  for (const [id, l] of 앞) {
    if (l.class !== 'Test' || (l.method !== 'pw:api' && l.method !== 'expect') || 준비안(l) || 러너가부름(l)) continue;
    const title = 글(l.title) ?? '';
    if (뺄조작.has(title)) continue;
    const at = 수(l.startTime) ?? 시작;
    const after = 뒤.get(id);
    const 끝 = 수(after?.endTime);
    const params = 객체(l.params);
    const 오류 = 글(객체(after?.error).message);
    actions.push({
      seq: 단계(at),
      atMs: 상대(at),
      title,
      target: 글(params.locator) ?? 글(params.url) ?? 글(l.subtitle),
      // fill 은 value, 한 글자씩(pressSequentially · type)은 text 에 싣는다
      value: 글(params.value) ?? 글(params.text),
      secretField: 비밀칸.has(id),
      durationMs: 끝 === null ? null : Math.round(끝 - at),
      error: 오류 === null ? null : 색뺀다(오류),
    });
  }

  const network: 네트워크줄[] = [];
  for (const 이름 of 이름들.filter((n) => n.endsWith('.network'))) {
    for (const l of 줄들((await 읽기(이름)) ?? '')) {
      if (l.type !== 'resource-snapshot') continue;
      const s = 객체(l.snapshot);
      const req = 객체(s.request);
      const res = 객체(s.response);
      const 종류 = 글(s._resourceType) ?? 'api';
      const 상태 = 수(res.status);
      const status = 상태 !== null && 상태 > 0 ? 상태 : null;
      const failure = 글(res._failureText) ?? (status === null ? '응답 없음' : null);
      if (!남길종류.has(종류) && 종류 !== 'api' && failure === null && (status ?? 0) < 400) continue;
      const at = 수(s._monotonicTime) ?? 시작;
      const 본문읽나 = 설정.본문 && API종류.has(종류);
      const 요청본문 = 객체(req.postData);
      const 응답본문 = 객체(res.content);
      const 걸림 = 수(s.time);
      network.push({
        seq: 단계(at),
        atMs: 상대(at),
        method: 글(req.method) ?? 'GET',
        url: 글(req.url) ?? '',
        status,
        resourceType: 종류,
        durationMs: 걸림 === null ? null : Math.round(걸림),
        failure,
        requestBody: 본문읽나 ? await 본문(요청본문, 읽기) : null,
        responseBody: 본문읽나 ? await 본문(응답본문, 읽기) : null,
      });
    }
  }

  const 콘솔: 콘솔줄[] = [];
  for (const l of 문맥줄) {
    const t = 수(l.time);
    if (t === null) continue;
    // 오류 · 경고만 남긴다. 보통 기록(log · info)은 개발자가 흘린 말이라 실패를 가르는 데 안 쓴다
    if (l.type === 'console' && (l.messageType === 'error' || l.messageType === 'warning')) {
      콘솔.push({ seq: 단계(t), atMs: 상대(t), level: l.messageType, text: 글(l.text) ?? '', url: 글(객체(l.location).url) });
    }
    if (l.type === 'event' && l.method === 'pageError') {
      const 오류 = 객체(객체(객체(l.params).error).error);
      콘솔.push({ seq: 단계(t), atMs: 상대(t), level: 'pageerror', text: 글(오류.stack) ?? 글(오류.message) ?? '', url: 글(객체(객체(l.params).location).url) });
    }
  }

  const 차례 = <T extends { atMs: number }>(a: T, b: T): number => a.atMs - b.atMs;
  return { network: network.sort(차례), actions: actions.sort(차례), console: 콘솔.sort(차례) };
}

/** trace.zip 의 단계 결과(platform-step 첨부)를 단계 차례대로. 첨부가 없으면 빈 목록 */
export async function 단계를읽는다(zip: Buffer | JSZip): Promise<단계줄[]> {
  const 묶음 = await 연다(zip);
  const 읽기 = async (이름: string): Promise<string | null> => (await 묶음.file(이름)?.async('string')) ?? null;
  const { 앞, 뒤 } = 호출들(줄들((await 읽기('test.trace')) ?? ''));
  return (await 단계첨부들(앞, 뒤, 읽기)).flatMap(({ 내용 }): 단계줄[] => {
    const seq = 수(내용.seq);
    if (seq === null) return [];
    const 판정 = Array.isArray(내용.assertions) ? 내용.assertions.map(객체) : [];
    const 오류 = 글(객체(내용.error).message);
    return [
      {
        seq,
        title: 글(내용.title) ?? '',
        status: 글(내용.status) ?? '',
        error: 오류 === null ? null : 색뺀다(오류),
        failed: 판정.filter((a) => a.status === 'FAIL').map((a) => ({ statement: 글(a.statement) ?? '', expected: a.expected, actual: a.actual })),
      },
    ];
  });
}

// 이미 연 묶음을 넘기면 다시 안 푼다 — 실패 요약이 조작 · 단계를 같이 읽는다
const 연다 = async (zip: Buffer | JSZip): Promise<JSZip> => (zip instanceof JSZip ? zip : JSZip.loadAsync(zip));

// 테스트 쪽 호출. callId → before 줄 · after 줄
function 호출들(테스트줄: 줄[]): { 앞: Map<string, 줄>; 뒤: Map<string, 줄> } {
  const 앞 = new Map<string, 줄>();
  const 뒤 = new Map<string, 줄>();
  for (const l of 테스트줄) {
    const id = 글(l.callId);
    if (id === null) continue;
    if (l.type === 'before') 앞.set(id, l);
    if (l.type === 'after') 뒤.set(id, l);
  }
  return { 앞, 뒤 };
}

// platform-step 첨부를 단 시각과 그 내용(StepResult 한 줄), 시각 차례
async function 단계첨부들(앞: Map<string, 줄>, 뒤: Map<string, 줄>, 읽기: (이름: string) => Promise<string | null>): Promise<{ at: number; 내용: 줄 }[]> {
  const 결과: { at: number; 내용: 줄 }[] = [];
  for (const [id, after] of 뒤) {
    const 첨부 = Array.isArray(after.attachments) ? after.attachments.map(객체) : [];
    const 파일 = 글(첨부.find((a) => a.name === 'platform-step')?.file);
    const at = 수(앞.get(id)?.startTime);
    if (파일 === null || at === null) continue;
    const 내용 = 줄들((await 읽기(파일)) ?? '')[0];
    if (내용 !== undefined) 결과.push({ at, 내용 });
  }
  return 결과.sort((a, b) => a.at - b.at);
}

// 문맥 trace 의 로그가 「locator resolved to <input … type="password" …>」 이면 그 조작은 비밀번호 칸이다.
// 문맥 호출은 stepId 로 테스트 쪽 조작(pw:api@N)을 가리킨다
function 비밀칸조작(문맥줄: 줄[]): Set<string> {
  const 조작 = new Map<string, string>();
  for (const l of 문맥줄) {
    const id = 글(l.callId);
    const stepId = 글(l.stepId);
    if (l.type === 'before' && id !== null && stepId !== null) 조작.set(id, stepId);
  }
  const 결과 = new Set<string>();
  for (const l of 문맥줄) {
    const id = 글(l.callId);
    if (l.type !== 'log' || id === null || !/type="password"/i.test(글(l.message) ?? '')) continue;
    const stepId = 조작.get(id);
    if (stepId !== undefined) 결과.add(stepId);
  }
  return 결과;
}

async function 본문(칸: 줄, 읽기: (이름: string) => Promise<string | null>): Promise<string | null> {
  const 종류 = 글(칸.mimeType) ?? '';
  if (종류 !== '' && !글본문.test(종류)) return null;
  const 바로 = 글(칸.text);
  if (바로 !== null && 바로 !== '') return 바로;
  const 파일 = 글(칸._file);
  return 파일 === null ? null : 읽기(`resources/${파일.replace(/^resources\//, '')}`);
}
