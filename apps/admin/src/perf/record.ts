// 녹화 실행 — 케이스 · E2E 를 서버 러너로 한 번 돌려 HAR 를 받고, 가려서 AI 일 재료로 바꾼다 (도메인/성능 §3.9 「시나리오 만들기」 · 도메인/러너 「녹화 실행」)

import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BrowserPlatform, ExecuteRequest } from '@platform/kit';

import { 케이스판 } from '../apidoc/caseDoc.js';
import { 볼륨목록, 볼륨파일읽기 } from '../artifactFile.js';
import type { 대상줄 } from '../authoring/reverse.js';
import { enqueue } from '../execution/dispatcher.js';
import { artifactsDir } from '../execution/routes.js';
import { callScenarioRunner, httpTimeoutMs, 러너에보낸다 } from '../execution/runner.js';
import { 저장값을채운다 } from '../execution/savedInput.js';
import { 비밀글자들 } from '../execution/trial.js';
import { 삭제코드합치기 } from '../scenario/apps.js';
import { 시험재료 } from '../scenario/trial.js';
import { 시나리오제한시간 } from '../scenario/validate.js';
import { 녹화끝, 녹화중 } from './ai.js';
import { AI재료, 가리기, 가림표, 남길녹화, 비밀값모으기, 줄잇기, type 녹화계정 } from './har.js';
import { 풀 } from './store.js';

const 케이스제한ms = 300_000;

export type 녹화대상 =
  | { 케이스: { tcId: string; platform: BrowserPlatform; filePath: string; paramSchema: unknown; expectedSchema: unknown }[] }
  | { 시나리오: { service: string; platform: BrowserPlatform; parts: Parameters<typeof 시험재료>[0]['parts'] } };

const 녹화폴더 = (jobId: number) => join(artifactsDir(), 'perf-record', String(jobId));
/** 가린 녹화 파일 이름 — perf_scenario_version.recording 에 이 이름을 남긴다 */
export const 녹화파일 = (jobId: number) => `${jobId}.har`;

async function 케이스돌리기(jobId: number, 줄: 대상줄, 케이스: Extract<녹화대상, { 케이스: unknown }>['케이스']): Promise<string[]> {
  const 비밀: string[] = [];
  for (const c of 케이스) {
    // 진짜 실행과 같은 채우기다 — 로그인 칸이 대상 서버 계정으로 차야 녹화에 로그인이 들어간다
    const client = await (await 풀()).connect();
    let 채움;
    try {
      [채움] = await 저장값을채운다(client, [{ tcId: c.tcId, platforms: [c.platform], params: {}, expected: {} }], new Map([[c.tcId, { param_schema: c.paramSchema, expected_schema: c.expectedSchema }]]), 줄.계정들);
    } finally {
      client.release();
    }
    const params = 채움?.params ?? {};
    const expected = 채움?.expected ?? {};
    비밀.push(...비밀글자들({ paramSchema: c.paramSchema, expectedSchema: c.expectedSchema, params, expected }));
    const 판 = await 케이스판(c.tcId);
    const 요청: ExecuteRequest = {
      runId: 0,
      historyId: Date.now(),
      tcId: c.tcId,
      platform: c.platform,
      filePath: c.filePath,
      baseUrl: 줄.baseUrl,
      params,
      expected,
      timeoutMs: 케이스제한ms,
      ...(줄.apiAuths.length > 0 && { apiAuths: 줄.apiAuths }),
      ...('apiDoc' in 판 && 판.apiDoc !== undefined && { apiDoc: 판.apiDoc }),
      recordHar: { jobId },
    };
    // 기능 테스트와 같은 줄의 한 자리를 쓴다 — 녹화도 서버 러너의 브라우저 하나다
    const res = await enqueue(() => 러너에보낸다('/execute', 요청, httpTimeoutMs(케이스제한ms)));
    await rm(join(artifactsDir(), 'runs', '0', String(요청.historyId)), { recursive: true, force: true });
    if (res.status < 200 || res.status >= 300) throw new Error(`러너가 ${c.tcId} 녹화를 ${res.status}로 거절했습니다`);
    // 판정을 못 낸 실행은 중간에 끊겼을 수 있다 — 반쪽 녹화로 초안을 만들지 않는다. FAIL 은 요청이 다 오가서 쓴다
    if ((res.json as { status?: string } | null)?.status === 'NA') throw new Error(`${c.tcId} 를 끝까지 돌리지 못했습니다`);
  }
  return 비밀;
}

async function 시나리오돌리기(jobId: number, env: string, 대상: Extract<녹화대상, { 시나리오: unknown }>['시나리오']): Promise<{ 비밀: string[]; 계정들: 녹화계정[] }> {
  const { 앱들, baseUrl, parts, 비밀 } = await 시험재료({ service: 대상.service, env, platform: 대상.platform, parts: 대상.parts });
  const trialId = randomUUID();
  // 녹화는 서버 러너로만 돈다 — HAR 가 admin 이 읽는 산출물 폴더에 떨어져야 한다
  const 응답 = await enqueue(async () =>
    callScenarioRunner({
      runId: null,
      trialId,
      platform: 대상.platform,
      baseUrl,
      parts,
      timeoutMs: 시나리오제한시간(대상.parts),
      deleteStatuses: await 삭제코드합치기(앱들),
      recordHar: { jobId },
    }),
  );
  await rm(join(artifactsDir(), 'runs', 'trial', trialId), { recursive: true, force: true });
  // 러너 거절 · 끊김도 NA 로 접혀 온다 — 반쪽 녹화로 초안을 만들지 않고 러너가 준 까닭을 남긴다
  if (응답.status === 'NA') throw new Error(`E2E 시나리오를 끝까지 돌리지 못했습니다${응답.error === undefined ? '' : ` — ${응답.error.message.slice(0, 300)}`}`);
  // 계정은 비밀 목록이 아니라 계정으로 넘긴다 — 짧은 아이디를 꼬리표로 바꾸면 주소의 /admin/ 까지 망가진다
  return { 비밀, 계정들: [...앱들.values()].flatMap((앱) => 앱.계정들) };
}

async function HAR읽기(폴더: string): Promise<unknown[]> {
  let 이름들: string[] = [];
  try {
    // 녹화를 돌린 서버 러너가 터널로 이은 맥이면 그 러너의 것도 합친다 (SPEC 공통/3 §5.3 「러너 여러 대」)
    이름들 = (await 볼륨목록(폴더)).map((f) => f.name).filter((n) => /^\d+\.har$/.test(n)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  } catch {
    return [];
  }
  // 러너도 이 볼륨에 쓴다 — 바로가기를 따라가면 admin 의 파일이 AI 재료로 나간다 (리뷰 M4)
  return Promise.all(이름들.map(async (n) => JSON.parse((await 볼륨파일읽기(join(폴더, n))).toString('utf8')) as unknown));
}

/**
 * 녹화를 돌리고 가린 재료로 일을 대기에 세운다. 실패하면 일을 FAILED 로 닫는다.
 * 가리기 전 원본(폴더)은 어떤 끝에서든 지운다
 */
export async function 녹화하기(jobId: number, 줄: 대상줄, 대상: 녹화대상, 재료: { cases: string[]; baseUrl: string; apiHosts: string[] }): Promise<void> {
  녹화중.add(jobId);
  const 폴더 = 녹화폴더(jobId);
  try {
    await mkdir(폴더, { recursive: true });
    const 돈것 = '케이스' in 대상 ? { 비밀: await 케이스돌리기(jobId, 줄, 대상.케이스), 계정들: [] } : await 시나리오돌리기(jobId, 줄.env, 대상.시나리오);
    // 정적 리소스의 본문(embed 로 온 수 MB 의 base64)을 먼저 버리고 가린다 — 어차피 버릴 글자를 훑지 않는다
    const 줄들 = 남길녹화(줄잇기(await HAR읽기(폴더))).log.entries;
    if (줄들.length === 0) throw new Error('녹화 파일이 없습니다 — 러너가 브라우저를 열지 못했습니다');
    const 계정들: 녹화계정[] = [{ loginId: 줄.loginId, loginPassword: 줄.loginPassword }, ...줄.계정들, ...돈것.계정들];
    const API비밀 = 줄.apiAuths.flatMap((a) => [a.clientId, a.clientSecret]);
    const 표 = 가림표([...돈것.비밀, ...API비밀, ...비밀값모으기(줄들)].filter((v) => v.length >= 4), 계정들);
    const 가린 = 가리기(줄들, 표);
    await writeFile(join(artifactsDir(), 'perf-record', 녹화파일(jobId)), JSON.stringify({ log: { version: '1.2', creator: { name: 'Test Commander', version: '1' }, entries: 가린 } }));
    const ai = AI재료(가린);
    if (ai.entries.length === 0) throw new Error(`녹화된 요청 ${ai.total}건이 모두 정적 리소스입니다`);
    await 녹화끝(jobId, { input: { ...재료, ...ai, recording: 녹화파일(jobId) } });
  } catch (e) {
    await 녹화끝(jobId, { error: `녹화하지 못했습니다: ${e instanceof Error ? e.message : String(e)}` });
  } finally {
    await rm(폴더, { recursive: true, force: true });
    녹화중.delete(jobId);
  }
}
