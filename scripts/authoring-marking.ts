// 역방향 표시 껍데기 — 원본을 서버에서 다시 받아 메모 사본을 올리고 피그마에 댓글을 단다 (도메인/작성 §3.6 「★ 역방향」 표시)
// 판단은 authoring-mark · authoring-docx 의 순수 함수에 있다. 여기는 네트워크뿐이다

import { extname } from 'node:path';

import type { 자료 } from './authoring-assets.js';
import { 비밀섞였나, 한줄 } from './authoring-chain.js';
import { 메모달기 } from './authoring-docx.js';
import { 인증헤더, 한번더건다 } from './authoring-io.js';
import { 메모글, 피그마댓글요청, 피그마실패사유, 표시결과합치기, 표시계획 } from './authoring-mark.js';
import { type 차이, 계정섞였나, 사유거르기, 산출물주소 } from './authoring-reverse.js';

/** 서버를 부를 때 쓰는 것 */
export interface 서버손 {
  주소기지: string;
  토큰: string;
}

/**
 * 자료 파일 하나를 서버에서 받는다. 못 받으면 응답 코드.
 * **표시는 이것으로 받은 원본에만 한다** — 자료 폴더의 사본은 자식이 바꿀 수 있다 (2026-09-26 계획)
 */
export async function 자료받기(
  손: 서버손,
  서비스: string,
  요청: number,
  자료번호: number,
): Promise<{ 몸: Buffer } | { 코드: number }> {
  // 상한 크기 파일도 로컬 망에서 이 안에 온다. 안 오면 서버가 멈춘 것이다
  const 답 = await 한번더건다(() =>
    fetch(`${손.주소기지}/api/authoring/requests/${String(요청)}/assets/${String(자료번호)}?service=${encodeURIComponent(서비스)}`, {
      headers: 인증헤더(손.토큰),
      signal: AbortSignal.timeout(120_000),
    }),
  );
  return 답.ok ? { 몸: Buffer.from(await 답.arrayBuffer()) } : { 코드: 답.status };
}

/** 산출물 하나를 `outputs` 로 올린다. 서버 응답 코드를 준다 — 던지는 것(시간 초과·연결 끊김)은 부르는 쪽이 잡는다 */
export async function 산출물보내기(
  손: 서버손,
  요청: number,
  서비스: string,
  이름: string,
  역할: 'MARKED' | 'REVERSE_SPEC',
  몸: Uint8Array,
  원본?: number,
): Promise<number> {
  const 답 = await 한번더건다(() =>
    fetch(`${손.주소기지}${산출물주소(요청, 서비스, 이름, 역할, 원본)}`, {
      method: 'POST',
      headers: { ...인증헤더(손.토큰), 'content-type': 'application/octet-stream' },
      body: new Uint8Array(몸),
      signal: AbortSignal.timeout(120_000),
    }),
  );
  return 답.status;
}

/** 우리 서버가 에이전트 토큰을 거절한 것 — 다시 던져 줄 돌기가 멈추게 한다(`닫으며` 와 같은 규칙) */
function 거절인가(err: unknown): boolean {
  return err instanceof Error && err.message.includes('서버가 거절했다');
}

type 결과 = { 번호: number; 됨: boolean; 사유?: string };

/** PR 을 세우기 전에 만들어 둔 표시 — 사본은 검사를 마친 것만 들어 있다 */
export interface 표시준비물 {
  사본들: { 자료: 자료; 이름: string; 바이트: Uint8Array; 번호들: number[]; 찾음: boolean[] }[];
  댓글들: { 자료: 자료; 번호들: number[] }[];
  결과들: 결과[];
}

/**
 * **push 전에** 표시를 준비한다 — 원본을 서버에서 다시 받아 메모 사본을 만들고, 올릴 것 전부에서 비밀값을 찾는다.
 * 새면 `누설` — 요청을 FAILED 로 끝낸다(명세 §3.6 「있으면 올리지 않고 FAILED」). PR 뒤에 알면 이미 선 PR 이 실패 요청에 매달린다 (2026-09-26 검사).
 * 그 밖의 실패는 그 차이의 이유로만 남는다 — 표시는 실패해도 요청을 실패시키지 않는다
 */
export async function 표시준비(
  손: 서버손,
  요청: number,
  서비스: string,
  입력자료: 자료[],
  피그마토큰: string | undefined,
  diffs: 차이[],
  비밀: string | null | undefined,
): Promise<표시준비물 | { 누설: true }> {
  const 계획 = 표시계획(diffs, 입력자료);
  const 준비: 표시준비물 = { 사본들: [], 댓글들: [], 결과들: 계획.못함.map((m) => ({ ...m, 됨: false })) };
  const 모두실패 = (번호들: number[], 사유: string) => {
    for (const 번호 of 번호들) 준비.결과들.push({ 번호, 됨: false, 사유 });
  };
  const 새나 = (글들: string[]) => 계정섞였나(글들, 비밀) || 비밀섞였나(글들, 피그마토큰);

  for (const 일 of 계획.할일) {
    const 메모들 = 일.번호들.map((i) => ({ anchor: diffs[i]?.표시?.anchor ?? null, 글: 메모글(diffs[i]!) }));
    // 댓글은 플랫폼 밖 사람도 본다 — 메모·댓글 글에 비밀값이 있으면 어디에도 안 보낸다
    if (새나(메모들.map((m) => m.글))) return { 누설: true };
    if (일.종류 === '피그마') {
      준비.댓글들.push({ 자료: 일.자료, 번호들: 일.번호들 });
      continue;
    }
    try {
      const 받음 = await 자료받기(손, 서비스, 요청, 일.자료.id);
      if ('코드' in 받음) {
        모두실패(일.번호들, `원본을 다시 받지 못했다 (${String(받음.코드)})`);
        continue;
      }
      const 사본 = await 메모달기(받음.몸, 메모들, new Date().toISOString());
      if ('사유' in 사본) {
        모두실패(일.번호들, 사본.사유);
        continue;
      }
      // 올릴 파일 자체를 본다 — 기획서 본문에 계정이 적혀 있으면 메모 글만 봐서는 모른다 (2026-09-26 계획 검토)
      if (새나(사본.글들)) return { 누설: true };
      // 하나도 못 찾았으면 원본과 같은 파일이다 — 「표시 사본」으로 세우지 않는다 (2026-09-26 검사)
      if (!사본.찾음.some(Boolean)) {
        모두실패(일.번호들, '기획서에서 그 문장을 못 찾았다');
        continue;
      }
      const 이름 = `${일.자료.name.slice(0, -extname(일.자료.name).length)}-표시.docx`;
      준비.사본들.push({ 자료: 일.자료, 이름, 바이트: 사본.바이트, 번호들: 일.번호들, 찾음: 사본.찾음 });
    } catch (err) {
      if (거절인가(err)) throw err;
      모두실패(일.번호들, `표시 사본을 만들다 멈췄다: ${한줄(err)}`);
    }
  }
  return 준비;
}

/** **PR 뒤에** 준비한 사본을 올리고 피그마에 댓글을 단다. 차이마다 `marked`·`markError` 를 채워 돌려준다 */
export async function 표시올리기(
  손: 서버손,
  요청: number,
  서비스: string,
  준비: 표시준비물,
  피그마토큰: string | undefined,
  diffs: 차이[],
  비밀: string | null | undefined,
): Promise<차이[]> {
  const 결과들 = [...준비.결과들];
  for (const 사본 of 준비.사본들) {
    let 사유: string | null = null;
    try {
      const 코드 = await 산출물보내기(손, 요청, 서비스, 사본.이름, 'MARKED', 사본.바이트, 사본.자료.id);
      if (코드 !== 200) 사유 = `표시 사본을 못 올렸다 (${String(코드)})`;
    } catch (err) {
      if (거절인가(err)) throw err;
      사유 = `표시 사본을 못 올렸다: ${한줄(err)}`;
    }
    사본.번호들.forEach((번호, k) =>
      결과들.push(
        사유 !== null
          ? { 번호, 됨: false, 사유 }
          : 사본.찾음[k] === true
            ? { 번호, 됨: true }
            : { 번호, 됨: false, 사유: '기획서에서 그 문장을 못 찾았다' },
      ),
    );
  }
  for (const 일 of 준비.댓글들) await 댓글달기(일.자료, 일.번호들, diffs, 피그마토큰, 결과들);
  return 표시결과합치기(
    diffs,
    결과들.map((r) => (r.사유 === undefined ? r : { ...r, 사유: 사유거르기(r.사유, 비밀) })),
  );
}

/** 피그마 댓글. 거절(401·403)을 한 번 받으면 남은 댓글은 부르지 않는다 — 같은 토큰이라 같은 답이 온다 */
async function 댓글달기(
  자: 자료,
  번호들: number[],
  diffs: 차이[],
  토큰: string | undefined,
  결과들: 결과[],
): Promise<void> {
  let 막힘: string | null = 토큰 === undefined ? '피그마 토큰이 없다 — 설정 화면에 넣어라' : null;
  for (const 번호 of 번호들) {
    const d = diffs[번호]!;
    const 요청 = 피그마댓글요청(자.figmaUrl ?? '', d.표시?.node ?? null, 메모글(d));
    if (막힘 !== null || 요청 === null || 토큰 === undefined) {
      결과들.push({ 번호, 됨: false, 사유: 막힘 ?? '피그마 주소 모양이 다르다' });
      continue;
    }
    let 코드: number;
    try {
      const 답 = await fetch(요청.주소, {
        method: 'POST',
        headers: { 'X-Figma-Token': 토큰, 'content-type': 'application/json' },
        body: JSON.stringify(요청.몸),
        signal: AbortSignal.timeout(30_000),
      });
      코드 = 답.status;
    } catch {
      결과들.push({ 번호, 됨: false, 사유: '피그마에 닿지 못했다' });
      continue;
    }
    if (코드 === 200) {
      결과들.push({ 번호, 됨: true });
      continue;
    }
    const 사유 = 피그마실패사유(코드);
    if (코드 === 401 || 코드 === 403) 막힘 = 사유;
    결과들.push({ 번호, 됨: false, 사유 });
  }
}
