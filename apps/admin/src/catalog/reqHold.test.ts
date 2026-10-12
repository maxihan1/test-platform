// 계정 보류 지도 — 스캔이 요구사항 표에서 계정이 없어 보류된 요구와 역할을 req_hold 에 다시 채우는지 (도메인/작성 §3.6 「★ 역할별 계정」)

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

const 표 = (요구줄: string[], 제외줄: string[]) =>
  ['# XHD', '', '## 요구사항', '', '| 요구 | 축 | 출처 | tcId |', '|---|---|---|---|', ...요구줄, '', '## 제외', '', '| 요구 | 종류 | 사유 |', '|---|---|---|', ...제외줄].join('\n');

describe.skipIf(연결 === undefined)('지도채우기 — req_hold', () => {
  let 서비스 = 0;
  let 폴더 = '';
  const 옛뿌리 = process.env.PLATFORM_CASES_DIR;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 보류 = async () =>
    (await q<{ req_id: string; role: string }>('SELECT req_id, role FROM req_hold WHERE service_id = $1 ORDER BY req_id, role', [서비스])).rows.map((r) => `${r.req_id} ${r.role}`);
  const 채우기 = async () => (await import('./reqMap.js')).지도채우기(서비스, 'XHD');

  beforeAll(async () => {
    폴더 = await mkdtemp(join(tmpdir(), 'xhd-'));
    process.env.PLATFORM_CASES_DIR = 폴더;
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XHD', '계정 보류 지도 검사', '#888888', 'https://example.com/xhd', 'xhd') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
  });

  afterAll(async () => {
    await q('DELETE FROM req_hold WHERE service_id = $1', [서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    if (옛뿌리 === undefined) delete process.env.PLATFORM_CASES_DIR;
    else process.env.PLATFORM_CASES_DIR = 옛뿌리;
    await rm(폴더, { recursive: true, force: true });
  });

  it('계정 미등록 제외 줄과 역할이 적힌 제거함 줄을 채운다 — 판정 불가로 뺀 제거함은 안 든다', async () => {
    await writeFile(
      join(폴더, 'XHD.md'),
      표(
        ['| 1 | 정상 | XHD-REQ-001 · 보류 — 관리자 계정 비밀번호 | 제거함(XHD-FN-001) |', '| 2 | 정상 | XHD-REQ-002 · 보류 — 값이 없다 | 제거함(XHD-FN-002) |', '| 3 | 정상 | XHD-REQ-003 | XHD-FN-003 |'],
        ['| XHD-REQ-004 | 계정 미등록 | 판매자 |', '| XHD-REQ-005 | 요구 아님 | 머리글 |'],
      ),
    );
    await 채우기();
    expect(await 보류()).toEqual(['XHD-REQ-001 관리자', 'XHD-REQ-004 판매자']);
  });

  it('스캔마다 그 서비스 몫을 지우고 다시 채운다 — 표에서 빠진 줄은 사라지고 표가 없으면 비운다', async () => {
    await writeFile(join(폴더, 'XHD.md'), 표([], ['| XHD-REQ-006 | 계정 미등록 | 관리자 |']));
    await 채우기();
    expect(await 보류()).toEqual(['XHD-REQ-006 관리자']);
    await rm(join(폴더, 'XHD.md'));
    await 채우기();
    expect(await 보류()).toEqual([]);
  });

  it('케이스로 덮인 번호도 넣는다 — 테스트 있음이 이기는 것은 읽는 쪽이 가린다', async () => {
    await writeFile(join(폴더, 'XHD.md'), 표(['| 1 | 정상 | XHD-REQ-007 | XHD-FN-007 |'], ['| XHD-REQ-007 | 계정 미등록 | 관리자 |']));
    await 채우기();
    expect(await 보류()).toEqual(['XHD-REQ-007 관리자']);
  });
});
