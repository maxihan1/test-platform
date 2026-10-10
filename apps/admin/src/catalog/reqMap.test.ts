// 지도 ① — 요구사항 표 출처 칸에서 (요구, 케이스, 축)을 뽑고 서비스 몫을 다시 채운다 (카탈로그 §3.1 「지도」)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 지도줄들 } from './reqMap.js';

const 표 = (줄들: string[]) =>
  ['# XMP', '', '## 요구사항', '', '| 요구 | 축 | 출처 | tcId |', '|---|---|---|---|', ...줄들, '', '## 제외', '', '| 요구 | 종류 | 사유 |', '|---|---|---|', '| XMP-REQ-009 | 요구 아님 | 머리글 |'].join('\n');

describe('지도줄들', () => {
  it('출처 칸의 번호마다 그 줄의 tcId · 축을 잇는다 — 범위는 펼치고 같은 줄은 한 번만', () => {
    const 글 = 표([
      '| 1 | 정상 | XMP-REQ-001 · XMP-REQ-002 | `XMP-FN-001` |',
      '| 2 | 정상 | XMP-REQ-001 | XMP-FN-001 |',
      '| 3 | 경계 | XMP-REQ-003~005 | XMP-FN-002 |',
      '| 4 | UI | 화면 검사 — XMP-REQ-006 | XMP-UI-001 |',
    ]);
    expect(지도줄들(글, 'XMP')).toEqual([
      { reqId: 'XMP-REQ-001', tcId: 'XMP-FN-001', axis: '정상' },
      { reqId: 'XMP-REQ-002', tcId: 'XMP-FN-001', axis: '정상' },
      { reqId: 'XMP-REQ-003', tcId: 'XMP-FN-002', axis: '경계' },
      { reqId: 'XMP-REQ-004', tcId: 'XMP-FN-002', axis: '경계' },
      { reqId: 'XMP-REQ-005', tcId: 'XMP-FN-002', axis: '경계' },
      { reqId: 'XMP-REQ-006', tcId: 'XMP-UI-001', axis: 'UI' },
    ]);
  });

  it('표준 기획서에 없는 번호(옛 표의 원본 번호)도 그대로 넣는다', () => {
    expect(지도줄들(표(['| 1 | 예외 | 기획서.docx §2 REQ-COM-006 | XMP-018 |']), 'XMP')).toEqual([
      { reqId: 'REQ-COM-006', tcId: 'XMP-018', axis: '예외' },
    ]);
  });

  it('지운 케이스 · 판정 불가 · 남의 접두사 · 넷 밖 축 · 다른 절의 표는 건너뛴다', () => {
    const 글 = 표([
      '| 1 | 경계 | XMP-REQ-001 | 제거함(XMP-FN-554) |',
      '| 2 | 정상 | XMP-REQ-001 | — |',
      '| 3 | 정상 | XMP-REQ-001 | MKT-FN-001 |',
      '| 4 | 성능 | XMP-REQ-001 | XMP-FN-003 |',
    ]);
    expect(지도줄들(글, 'XMP')).toEqual([]);
  });
});

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('지도채우기', () => {
  let 서비스 = 0;
  let 폴더 = '';
  const 옛뿌리 = process.env.PLATFORM_CASES_DIR;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 지도 = async () =>
    (await q<{ req_id: string; tc_id: string; axis: string }>(
      'SELECT req_id, tc_id, axis FROM req_case WHERE service_id = $1 ORDER BY req_id, tc_id',
      [서비스],
    )).rows.map((r) => `${r.req_id} ${r.tc_id} ${r.axis}`);
  const 채우기 = async () => (await import('./reqMap.js')).지도채우기(서비스, 'XMP');

  beforeAll(async () => {
    폴더 = await mkdtemp(join(tmpdir(), 'xmp-'));
    process.env.PLATFORM_CASES_DIR = 폴더;
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XMP', '지도 검사', '#888888', 'https://example.com/xmp', 'xmp') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
  });

  afterAll(async () => {
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    if (옛뿌리 === undefined) delete process.env.PLATFORM_CASES_DIR;
    else process.env.PLATFORM_CASES_DIR = 옛뿌리;
    await rm(폴더, { recursive: true, force: true });
  });

  it('스캔마다 그 서비스 몫을 지우고 표에서 다시 채운다 — 표에서 뺀 줄은 지도에서도 빠진다', async () => {
    await writeFile(join(폴더, 'XMP.md'), 표(['| 1 | 정상 | XMP-REQ-001 · XMP-REQ-002 | XMP-FN-001 |']));
    expect(await 채우기()).toBe(2);
    expect(await 지도()).toEqual(['XMP-REQ-001 XMP-FN-001 정상', 'XMP-REQ-002 XMP-FN-001 정상']);

    await writeFile(join(폴더, 'XMP.md'), 표(['| 1 | 예외 | XMP-REQ-002 | XMP-FN-003 |']));
    await 채우기();
    expect(await 지도()).toEqual(['XMP-REQ-002 XMP-FN-003 예외']);
  });

  it('표 파일이 없으면 지도를 비운다', async () => {
    await writeFile(join(폴더, 'XMP.md'), 표(['| 1 | 정상 | XMP-REQ-001 | XMP-FN-001 |']));
    await 채우기();
    await rm(join(폴더, 'XMP.md'));
    expect(await 채우기()).toBe(0);
    expect(await 지도()).toEqual([]);
  });

  it('표 뿌리 폴더가 통째로 없으면 마운트가 틀린 것이라 던지고 옛 지도를 그대로 둔다', async () => {
    await writeFile(join(폴더, 'XMP.md'), 표(['| 1 | 정상 | XMP-REQ-001 | XMP-FN-001 |']));
    await 채우기();
    process.env.PLATFORM_CASES_DIR = join(폴더, '없는-폴더');
    try {
      await expect(채우기()).rejects.toThrow();
    } finally {
      process.env.PLATFORM_CASES_DIR = 폴더;
    }
    expect(await 지도()).toEqual(['XMP-REQ-001 XMP-FN-001 정상']);
  });

  it('표를 읽다 깨지면 던지고 옛 지도를 그대로 둔다', async () => {
    await writeFile(join(폴더, 'XMP.md'), 표(['| 1 | 정상 | XMP-REQ-001 | XMP-FN-001 |']));
    await 채우기();
    await rm(join(폴더, 'XMP.md'));
    // 파일 자리에 폴더가 있으면 읽기가 EISDIR 로 깨진다 — 없는 것과 다르다
    await mkdir(join(폴더, 'XMP.md'));
    await expect(채우기()).rejects.toThrow();
    expect(await 지도()).toEqual(['XMP-REQ-001 XMP-FN-001 정상']);
  });
});
