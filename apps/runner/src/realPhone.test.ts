// 실제 폰 Chrome 항목의 러너 몫 — 입구 검사 · 자식 환경 · VISION 주소 · 기기 칸 · logcat 받기 · 증적 자리 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 로그한줄, 실제폰환경, 팜주소, 폰기기를묻는다, 폰로그, 폰로그를받는다, 폰영상, 폰증적을둔다, 폰토큰 } from './realPhone.js';
import { executeRequest, scenarioRequest } from './schema.js';

const 케이스 = (덧: Record<string, unknown> = {}) => ({
  runId: 7, historyId: 8, tcId: 'XRP-001', platform: 'mobile', filePath: 'a.spec.ts', baseUrl: 'https://x.test', params: {}, expected: {},
  cdpUrl: 'wss://farm.test/api/devices/R3CR/chrome/cdp', udid: 'R3CR', ...덧,
});
const 시나리오 = (덧: Record<string, unknown> = {}) => ({
  runId: 7, platform: 'mobile', baseUrl: 'https://x.test', timeoutMs: 60_000,
  parts: [{ kind: 'case', tcId: 'XRP-001', params: {}, expected: {}, skipSteps: [], filePath: 'a.spec.ts' }],
  cdpUrl: 'wss://farm.test/api/devices/R3CR/chrome/cdp', udid: 'R3CR', ...덧,
});
const 폰 = { platform: 'mobile' as const, cdpUrl: 'ws://127.0.0.1:1/api/devices/R3CR/chrome/cdp', udid: 'R3CR', farmToken: 'pat_me' };

describe('입구 검사', () => {
  it('폰 Chrome 주소는 mobile 항목에 폰 번호와 같이 온다', () => {
    expect(executeRequest.safeParse(케이스()).success).toBe(true);
    expect(executeRequest.safeParse(케이스({ platform: 'desktop' })).success).toBe(false);
    expect(executeRequest.safeParse(케이스({ udid: undefined })).success).toBe(false);
    expect(scenarioRequest.safeParse(시나리오()).success).toBe(true);
    expect(scenarioRequest.safeParse(시나리오({ platform: 'android' })).success).toBe(false);
  });

  it('ws(s) 주소만 받는다 — 자식 환경값으로 가서 공백 · 다른 꼴을 막는다', () => {
    expect(executeRequest.safeParse(케이스({ cdpUrl: 'https://farm.test/x' })).success).toBe(false);
    expect(executeRequest.safeParse(케이스({ cdpUrl: 'wss://farm.test/a b' })).success).toBe(false);
  });

  it('폰 Chrome 시나리오에는 앱 · 게임 단계를 못 넣는다 — 한 폰을 Appium 과 Chrome 연결이 같이 못 쓴다', () => {
    const 앱단계 = { kind: 'case', tcId: 'XRP-002', params: {}, expected: {}, skipSteps: [], filePath: 'b.spec.ts', appStep: true };
    const 결과 = scenarioRequest.safeParse(시나리오({ parts: [앱단계] }));

    expect(결과.success).toBe(false);
    expect(결과.error?.message).toContain('앱 · 게임 단계');
  });
});

describe('실제폰환경', () => {
  it('폰 Chrome 항목은 주소 · 토큰을 싣고 장면 파일을 비운다 — 영상 경로는 남길 실행에만 준다', () => {
    expect(실제폰환경(폰, '/r/7/8', true)).toEqual({
      PLATFORM_CDP_URL: 폰.cdpUrl, PLATFORM_APPIUM_TOKEN: 'pat_me', PLATFORM_PHONE_VIDEO: join('/r/7/8', 폰영상), PLATFORM_LIVE_FILE: '',
    });
    expect(실제폰환경(폰, '/r/0/8', false).PLATFORM_PHONE_VIDEO).toBe('');
  });

  it('흉내 항목도 두 칸을 빈 값으로 늘 적는다 — 러너를 켠 셸의 값을 안 물려받게', () => {
    expect(실제폰환경({ platform: 'mobile' }, '/r', true)).toEqual({ PLATFORM_CDP_URL: '', PLATFORM_PHONE_VIDEO: '' });
  });
});

describe('폰토큰', () => {
  it('요청 토큰이 먼저고, 없으면 러너 몫 토큰은 러너가 아는 팜과 같은 곳에만 싣는다 — 엉뚱한 주소로 러너 토큰이 새지 않게', () => {
    const 옛값 = { url: process.env.PLATFORM_APPIUM_URL, token: process.env.PLATFORM_APPIUM_TOKEN };
    process.env.PLATFORM_APPIUM_URL = 'https://farm.test/wd/hub';
    process.env.PLATFORM_APPIUM_TOKEN = 'pat_runner';
    try {
      expect(폰토큰({ ...폰, cdpUrl: 'wss://farm.test/api/devices/R3CR/chrome/cdp' })).toBe('pat_me');
      expect(폰토큰({ ...폰, farmToken: undefined, cdpUrl: 'wss://farm.test/api/devices/R3CR/chrome/cdp' })).toBe('pat_runner');
      expect(폰토큰({ ...폰, farmToken: undefined, cdpUrl: 'wss://attacker.test/api/devices/R3CR/chrome/cdp' })).toBeUndefined();
    } finally {
      for (const [키, 값] of [['PLATFORM_APPIUM_URL', 옛값.url], ['PLATFORM_APPIUM_TOKEN', 옛값.token]] as const) {
        if (값 === undefined) delete process.env[키];
        else process.env[키] = 값;
      }
    }
  });
});

describe('팜주소', () => {
  it('Chrome 연결 주소에서 VISION 주소를 뗀다 — /wd/hub 접두도 남긴다', () => {
    expect(팜주소('wss://farm.test/api/devices/R3CR/chrome/cdp')).toBe('https://farm.test');
    expect(팜주소('ws://127.0.0.1:4723/wd/hub/api/devices/R3CR/chrome/cdp')).toBe('http://127.0.0.1:4723/wd/hub');
  });
});

describe('로그한줄', () => {
  it('VISION 줄을 사람이 읽는 한 줄로 바꾸고 못 읽는 줄은 그대로 둔다', () => {
    expect(로그한줄('{"t":0,"pid":1,"tid":2,"level":"E","tag":"chromium","msg":"오류"}')).toBe('1970-01-01T00:00:00.000Z 1 2 E chromium: 오류');
    expect(로그한줄('{"end":"폰 연결이 끊겼다"}')).toBe('# VISION 이 로그를 닫았다: 폰 연결이 끊겼다');
    expect(로그한줄('모양이 바뀐 줄')).toBe('모양이 바뀐 줄');
  });
});

describe('VISION 기기 목록 · 실시간 로그', () => {
  let 서버: Server;
  let 받은: IncomingMessage[] = [];
  let 주소 = '';

  beforeAll(async () => {
    서버 = createServer((req, res) => {
      받은.push(req);
      if (req.url === '/api/devices') {
        res.end(JSON.stringify({ value: { devices: [{ serial: 'OTHER', model: 'X' }, { serial: 'R3CR', model: 'SM-G996N', osVersion: '15' }] } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      res.write('{"t":0,"pid":1,"tid":2,"level":"I","tag":"chromium","msg":"첫 줄"}\n{"t":0,"pid":1,"tid":2,"level":"E","tag":"chr');
      setTimeout(() => res.write('omium","msg":"둘째 줄"}\n{"t":0,"pid":1,"tid":2,"level":"F","tag":"chromium","msg":"끝 줄"}'), 50);
    });
    await new Promise<void>((끝) => 서버.listen(0, '127.0.0.1', 끝));
    주소 = `ws://127.0.0.1:${(서버.address() as AddressInfo).port}/api/devices/R3CR/chrome/cdp`;
  });

  afterAll(async () => {
    서버.closeAllConnections();
    await new Promise((끝) => 서버.close(끝));
  });

  it('모델 · Android 판은 그 폰 줄에서, Chrome 판은 자식이 준 것으로 채운다 — 누른 사람 토큰으로 묻는다', async () => {
    받은 = [];
    const 기기 = await 폰기기를묻는다({ ...폰, cdpUrl: 주소 })({ model: null, osVersion: null, appVersion: null, browser: '156.0' });

    expect(기기).toEqual({ model: 'SM-G996N', osVersion: '15', appVersion: null, browser: '156.0' });
    expect(받은[0]?.headers.authorization).toBe('Bearer pat_me');
  });

  it('VISION 에 못 닿으면 모델 칸만 비운다 — 판정과 상관없다', async () => {
    expect(await 폰기기를묻는다({ ...폰, cdpUrl: 'ws://127.0.0.1:1/api/devices/R3CR/chrome/cdp' })(undefined)).toEqual({ model: null, osVersion: null, appVersion: null, browser: null });
  });

  it('그 폰 Chrome 줄을 잡은 때부터 받아 끝날 때 닫는다 — 조각에 걸친 줄도 한 줄이고, 줄바꿈 전에 닫혀도 마지막 줄을 남긴다', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xrp-log-'));
    try {
      받은 = [];
      const 끝 = 폰로그를받는다({ ...폰, cdpUrl: 주소 }, join(폴더, 폰로그));
      await new Promise((r) => setTimeout(r, 200));
      await 끝();

      expect(받은[0]?.url).toBe('/api/devices/R3CR/logcat?app=1');
      expect(readFileSync(join(폴더, 폰로그), 'utf8')).toBe(
        '1970-01-01T00:00:00.000Z 1 2 I chromium: 첫 줄\n1970-01-01T00:00:00.000Z 1 2 E chromium: 둘째 줄\n1970-01-01T00:00:00.000Z 1 2 F chromium: 끝 줄\n',
      );
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});

describe('폰증적을둔다', () => {
  it('통과 못 한 항목은 영상 · logcat 을 팜 증적 폴더로 옮기고, 통과면 지운다', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xrp-ev-'));
    try {
      const 쓰기 = () => {
        mkdirSync(폴더, { recursive: true });
        writeFileSync(join(폴더, 폰영상), '영상');
        writeFileSync(join(폴더, 폰로그), '로그');
      };
      쓰기();
      await 폰증적을둔다(폴더, 'FAIL');
      expect(readFileSync(join(폴더, 'farm', 'video-1.webm'), 'utf8')).toBe('영상');
      expect(readFileSync(join(폴더, 'farm', 'logcat.txt'), 'utf8')).toBe('로그');
      expect(existsSync(join(폴더, 폰영상))).toBe(false);

      rmSync(join(폴더, 'farm'), { recursive: true });
      쓰기();
      await 폰증적을둔다(폴더, 'PASS');
      expect(existsSync(join(폴더, 'farm'))).toBe(false);
      expect(existsSync(join(폴더, 폰영상))).toBe(false);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});
