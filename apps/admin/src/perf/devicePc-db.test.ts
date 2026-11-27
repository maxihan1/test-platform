// 기기 성능 PC 게임 — VISION PC 한 대 · 빌드 깔기 · 직접 플레이 게임 켜기 · 사양 · PC 줄 잠금과 게임 실행 시간의 game 칸을 실제 DB 와 가짜 팜 · 러너로 본다 (PERF-F2-05)

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PC가비었나, PC를놓는다, PC를바로잡는다 } from '../execution/phone.js';
import type { 차림 } from './dbFixture.js';
import { type 기기차림타입, 기기차림, type 가짜 } from './deviceFixture.js';

vi.mock('../execution/farmToken.js', async (원래) => ({ ...(await 원래<typeof import('../execution/farmToken.js')>()), 서버팜토큰: vi.fn(async () => 'pat_runas') }));

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('기기 성능 PC 게임 · 게임 실행 시간', { timeout: 90_000 }, () => {
  let f: 기기차림타입;
  let 판: 차림;
  let 팜: 가짜;
  let 러너: 가짜;
  let 로컬: 가짜;
  const PC케이스 = 'XQDW-003';
  const 측정 = (...a: Parameters<기기차림타입['측정']>) => f.측정(...a);
  const PC본문 = { build: undefined, devices: [{ serial: 'pc-pc1', where: 'FARM' }], metrics: ['FPS', 'GPU'] };
  const 종류로 = (kind: string, platform: string | null) =>
    판.pool.query('UPDATE service SET kind = $2, game_platform = $3 WHERE id = $1', [판.서비스, kind, platform]);

  beforeAll(async () => {
    f = await 기기차림('XQDW', false);
    ({ 판, 팜, 러너, 로컬 } = f);
    await 판.pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, $1, '["windows"]', '[]', 'x/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
      [PC케이스],
    );
  }, 60_000);

  afterAll(async () => {
    await 판.pool.query('DELETE FROM test_case WHERE tc_id = $1', [PC케이스]);
    await f.정리();
  }, 60_000);

  it('폰 애플리케이션은 VISION PC 를 고르거나 GPU 를 잴 수 없다', async () => {
    expect((await 측정({ devices: [{ serial: 'pc-pc1', where: 'FARM' }] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'Windows PC 는 PC 게임만 잽니다: pc-pc1' });
    expect((await 측정({ metrics: ['FPS', 'GPU'] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'GPU · VRAM 은 PC 게임만 잽니다' });
    expect((await 측정({ build: undefined })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '앱 패키지 이름을 적어 주세요' });
    const 목록 = (await 판.사람(판.읽기만, 'GET', `/api/perf/devices?serviceId=${판.서비스}`)).json<{ devices: { serial: string }[] }>();
    expect(목록.devices.map((d) => d.serial)).toEqual(['FA1', 'FA2', 'FB1', 'LC1']);
  });

  it('모바일 게임 직접 플레이는 내 컴퓨터 러너 시작에 game: true 를 싣는다', async () => {
    await 종류로('GAME', 'android');
    try {
      const runId = await f.만들기({ devices: [{ serial: 'LC1', where: 'LOCAL' }] }, 1);
      await f.끝날때까지(runId);
      expect(로컬.호출들.find((h) => h.path === '/perf/device/start')?.body).toMatchObject({ serial: 'LC1', game: true });
    } finally {
      await 종류로('APP', null);
    }
  });

  describe('PC 게임', () => {
    beforeAll(async () => {
      await 종류로('GAME', 'windows');
    });

    it('기기 목록은 VISION PC 줄만이고 내 컴퓨터 러너 폰은 없다', async () => {
      const 목록 = (await 판.사람(판.읽기만, 'GET', `/api/perf/devices?serviceId=${판.서비스}`)).json<{ devices: { serial: string; where: string }[] }>();
      expect(목록.devices).toEqual([{ serial: 'pc-pc1', model: 'pc-pc1', os: 'Windows', where: 'FARM', status: 'IDLE' }]);
    });

    it('PC 한 대 · 배터리 온도 목표 없음 · 실행 빌드가 있어야 한다. PC 줄이 바쁘면 409', async () => {
      expect((await 측정({ ...PC본문 })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'Windows 빌드가 없습니다' });
      const zip = join(f.임시, 'game.zip');
      await writeFile(zip, 'PK\x03\x04zip');
      await 판.pool.query(`INSERT INTO app_build (service_id, env, build_no, file_path, uploaded_by) VALUES ($1, 'qa', '59', $2, 'xqdw')`, [판.서비스, zip]);
      expect((await 측정({ ...PC본문, devices: [{ serial: 'pc-pc1', where: 'FARM' }, { serial: 'FA1', where: 'FARM' }] })).json()).toMatchObject({ detail: 'PC 게임은 Device VISION PC 한 대만 잴 수 있습니다' });
      expect((await 측정({ ...PC본문, devices: [{ serial: 'LC1', where: 'LOCAL' }] })).json()).toMatchObject({ detail: 'PC 게임은 Device VISION PC 한 대만 잴 수 있습니다' });
      expect((await 측정({ ...PC본문, devices: [{ serial: 'FA1', where: 'FARM' }] })).json()).toMatchObject({ detail: 'Device VISION 의 Windows PC 가 아닙니다: FA1' });
      expect((await 측정({ ...PC본문, targets: [{ metric: 'MAX_TEMP', op: '<=', value: 45, source: 'MANUAL' }] })).json()).toMatchObject({ detail: 'PC 게임은 배터리 온도를 재지 않습니다' });
      expect(PC를바로잡는다()).toBe(true);
      try {
        const r = await 측정({ ...PC본문 });
        expect(r.statusCode).toBe(409);
        expect(r.json()).toMatchObject({ error: 'DEVICE_BUSY' });
      } finally {
        PC를놓는다();
      }
    });

    it('직접 플레이는 잡기 perf 에 앱 이름 없이 켜고 빌드를 깐 뒤 게임을 켠다. 사양을 남기고 끝나면 PC 줄을 놓는다', async () => {
      const runId = await f.만들기({ ...PC본문, targets: [{ metric: 'JANK_PER_MIN', op: '<=', value: 1, source: 'MANUAL' }] }, 1);
      expect((await f.끝날때까지(runId)).status).toBe('DONE');
      const 부름 = 팜.호출들.filter((h) => h.path.startsWith('/api/devices/pc-pc1') && h.method === 'POST');
      expect(부름.map((h) => h.path)).toEqual(['/api/devices/pc-pc1/hold', '/api/devices/pc-pc1/install', '/api/devices/pc-pc1/launch']);
      expect(부름[0]?.body).toMatchObject({ perf: { intervalSec: 1, record: true } });
      expect(부름[0]?.body.perf).not.toHaveProperty('package');
      expect(부름[2]?.body).toEqual({ game: 'CatsGo.exe' });
      const 설정 = (await 판.pool.query<{ config: { package: string; devices: { spec: unknown }[] } }>('SELECT config FROM perf_run WHERE id = $1', [runId])).rows[0]!.config;
      expect(설정.package).toBe('');
      expect(설정.devices[0]?.spec).toEqual({ cpu: 'Intel i5', gpu: 'RTX 3060', resolution: '1920x1080' });
      expect((await f.결과(runId)).devices[0]).toMatchObject({ serial: 'pc-pc1', spec: { gpu: 'RTX 3060' }, summary: { jankPerMin: 0 } });
      expect(f.홀드삭제수('pc-pc1')).toBeGreaterThan(0);
      expect(PC가비었나()).toBe(true);
    });

    it('게임 케이스는 windows 케이스만 받고, 러너에 깐 게임 이름을 windows · GAME 으로 보낸다. 게임은 케이스가 켠다', async () => {
      expect((await 측정({ ...PC본문, drive: 'GAME', durationSec: undefined, caseIds: ['XQDW-001'] })).json()).toMatchObject({ detail: '게임 케이스가 아닙니다: XQDW-001' });
      const 켜기전 = 팜.호출들.filter((h) => h.path === '/api/devices/pc-pc1/launch').length;
      const runId = await f.만들기({ ...PC본문, drive: 'GAME', durationSec: undefined, caseIds: [PC케이스] }, 0);
      expect((await f.끝날때까지(runId)).status).toBe('DONE');
      expect(러너.호출들.filter((h) => h.path === '/execute').at(-1)?.body).toMatchObject({ platform: 'windows', udid: 'pc-pc1', app: 'CatsGo.exe', engine: 'GAME' });
      expect(팜.호출들.filter((h) => h.path === '/api/devices/pc-pc1/launch').length).toBe(켜기전);
      expect(PC가비었나()).toBe(true);
    });
  });
});
