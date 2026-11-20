// Android 앱 명령을 부른 화면 파일 함수 이름이 절차 기록에 남는지 본다 — 가짜 Appium 서버에 진짜 WebdriverIO 로 붙는다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 10)

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { remote } from 'webdriverio';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { StepResult } from '../types.js';
import type { AppDriver } from './app.js';
import type { RunScope } from './context.js';
import { 홈화면 } from './fixtures/pages/home.page.js';
import { 앱함수를적게건다 } from './gameFns.js';
import { runStep } from './step.js';

const W3C요소 = 'element-6066-11e4-a52e-4f735466cecf';
let 서버: Server;
let 주소 = 0;

beforeAll(async () => {
  // 「~없음」은 못 찾고, 「~가려진」(e2)은 찾아도 누르기 · 손짓이 실패하고, 「~사라진」(e4)은 누르면 stale, 「~늦게」(e3)는 두 번째 찾기부터 뜨는 가짜 Appium
  let 늦게찾기 = 0;
  서버 = createServer((req, res) => {
    let 몸 = '';
    req.on('data', (c: Buffer) => (몸 += c.toString()));
    req.on('end', () => {
      const url = req.url ?? '';
      res.setHeader('content-type', 'application/json');
      const 늦음 = url.endsWith('/element') && 몸.includes('늦게') && 늦게찾기++ === 0;
      if (url.endsWith('/element') && (몸.includes('없음') || 늦음)) {
        res.writeHead(404);
        res.end(JSON.stringify({ value: { error: 'no such element', message: '없음', stacktrace: '' } }));
        return;
      }
      if (url.endsWith('/element/e2/click') || (url.endsWith('/execute/sync') && 몸.includes('e2'))) {
        res.writeHead(400);
        res.end(JSON.stringify({ value: { error: 'element click intercepted', message: '다른 창에 가려졌다', stacktrace: '' } }));
        return;
      }
      if (url.endsWith('/element/e4/click')) {
        res.writeHead(404);
        res.end(JSON.stringify({ value: { error: 'stale element reference', message: '화면에서 사라졌다', stacktrace: '' } }));
        return;
      }
      const value =
        url === '/session' ? { sessionId: 's1', capabilities: { platformName: 'Android' } }
        : url.endsWith('/elements') ? (몸.includes('늦게') ? [{ [W3C요소]: 'e3' }] : [])
        : url.endsWith('/element') ? { [W3C요소]: 몸.includes('가려진') ? 'e2' : 몸.includes('늦게') ? 'e3' : 몸.includes('사라진') ? 'e4' : 'e1' }
        : url.endsWith('/text') ? '알림 3'
        : null;
      res.end(JSON.stringify({ value }));
    });
  });
  await new Promise<void>((r) => 서버.listen(0, '127.0.0.1', r));
  주소 = (서버.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((r) => 서버.close(() => r())));

async function 폰(걸기 = true): Promise<AppDriver> {
  const driver = await remote({ hostname: '127.0.0.1', port: 주소, path: '/', logLevel: 'silent', connectionRetryCount: 0, waitforTimeout: 200, capabilities: { platformName: 'Android' } });
  if (걸기) 앱함수를적게건다(driver);
  return driver;
}

function makeRun(): { run: RunScope; emitted: StepResult[] } {
  const emitted: StepResult[] = [];
  const run: RunScope = { seq: 0, failed: false, stopped: false, 맵함수: true, capture: async () => undefined, emit: async (r) => void emitted.push(r) };
  return { run, emitted };
}

describe('앱 명령마다 함수 이름을 적는다', () => {
  it('화면 파일 함수 · 정적 함수가 부른 찾기가 그 절차의 gameFns 에 겹침 없이 남고, $ 사슬은 그대로 돈다', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    let 제목 = '';
    await runStep(run, '알림을 연다', async () => {
      const 홈 = await 홈화면.열기(driver);
      await 홈.알림열기();
      await 홈.알림열기();
      제목 = await 홈.제목읽기();
    });
    expect(제목).toBe('알림 3');
    expect(emitted[0]).toMatchObject({ status: 'PASS', gameFns: ['홈화면.열기', '홈화면.알림열기', '홈화면.제목읽기'] });
    expect(emitted[0]).not.toHaveProperty('gameFailedFns');
  });

  it('요소를 못 찾거나 기다리다 끝나면 gameFailedFns 에 그 화면 파일 함수 이름이 남는다', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '없는 버튼을 누른다', () => new 홈화면(driver).없는것누르기());
    await runStep(run, '없는 버튼을 기다린다', () => new 홈화면(driver).없는것기다리기());
    expect(emitted[0]).toMatchObject({ status: 'FAIL', gameFailedFns: ['홈화면.없는것누르기'] });
    expect(emitted[0]!.error?.message).toContain("element wasn't found");
    expect(emitted[1]).toMatchObject({ status: 'FAIL', gameFailedFns: ['홈화면.없는것기다리기'] });
    expect(emitted[1]!.error?.message).toContain('still not displayed after');
  });

  it('없으면 넘어가는 화면 파일 함수는 요소를 못 찾았으면 지난 것으로 세지 않는다 — 깨진 줄에 새 빌드가 적히지 않게', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '팝업이 있으면 닫는다', () => new 홈화면(driver).팝업있으면닫기());
    expect(emitted[0]).toMatchObject({ status: 'PASS' });
    expect(emitted[0]).not.toHaveProperty('gameFns');
  });

  it('찾은 요소의 누르기가 실패했는데 화면 파일이 삼켰으면 그 함수는 지난 것으로 세지 않고, 뒤에 다른 요소를 눌러도 다시 안 적힌다', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '가려진 버튼을 눌러 본다', async () => {
      await 홈화면.열기(driver);
      await new 홈화면(driver).가려진것삼키고닫기();
    });
    expect(emitted[0]).toMatchObject({ status: 'PASS', gameFns: ['홈화면.열기'] });
  });

  it('부른 순간 아직 없던 요소도 누르기가 기다렸다가 되면 지난 것으로 센다 — WebdriverIO 가 기다리며 부르는 $$ 가 찾는다', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '늦게 뜨는 버튼을 누른다', () => new 홈화면(driver).늦게뜬것누르기());
    expect(emitted[0]).toMatchObject({ status: 'PASS', gameFns: ['홈화면.늦게뜬것누르기'] });
  });

  it('하위 요소 · 손짓 명령의 실패를 삼켜도 그 요소를 찾은 맨 안쪽 함수만 빠지고, 부른 바깥 함수는 남는다', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '목록 안 가려진 항목을 눌러 본다', () => new 홈화면(driver).목록에서눌러보기());
    await runStep(run, '가려진 버튼을 손짓으로 눌러 본다', () => new 홈화면(driver).손짓으로눌러보기());
    expect(emitted[0]).toMatchObject({ status: 'PASS', gameFns: ['홈화면.목록에서눌러보기'] });
    expect(emitted[1]).toMatchObject({ status: 'PASS' });
    expect(emitted[1]).not.toHaveProperty('gameFns');
  });

  it('stale element 실패는 WebdriverIO 가 스스로 다시 찾는 실패라 빼지 않는다 — 사라지기를 기다리는 함수가 빠지지 않게', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '사라진 버튼을 눌러 본다', () => new 홈화면(driver).사라진것눌러보기());
    expect(emitted[0]).toMatchObject({ status: 'PASS', gameFns: ['홈화면.사라진것눌러보기'] });
  });

  it('waitUntil 에 문구를 줬어도 시간이 넘었으면 오류 머리에 「waitUntil condition timed out」이 붙는다 — 실패 유형이 타임아웃이 되게', async () => {
    const driver = await 폰();
    const { run, emitted } = makeRun();
    await runStep(run, '홈이 열린다', () => new 홈화면(driver).열릴때까지());
    expect(emitted[0]).toMatchObject({ status: 'FAIL', gameFailedFns: ['홈화면.열릴때까지'] });
    expect(emitted[0]!.error?.message).toBe('waitUntil condition timed out — 홈 화면이 그려지지 않았다');
  });

  it('걸지 않은 드라이버(웹 · 게임 항목)는 두 칸 다 없고, 두 번 걸어도 한 번만 적는다', async () => {
    const 안건 = await 폰(false);
    const { run, emitted } = makeRun();
    await runStep(run, '알림을 연다', () => new 홈화면(안건).알림열기());
    expect(emitted[0]).not.toHaveProperty('gameFns');
    const 건 = await 폰();
    앱함수를적게건다(건);
    await runStep(run, '알림을 연다', () => new 홈화면(건).알림열기());
    expect(emitted[1]).toMatchObject({ gameFns: ['홈화면.알림열기'] });
  });
});
