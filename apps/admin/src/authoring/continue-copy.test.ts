// 남은 요구로 이어 작성 — 원본의 입력 자료를 복사해 새 작성 요청을 줄에 세운다 (SPEC 도메인/작성 §3.6 「★ 원장」 「남은 요구로 이어 작성」 · §7)

import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 자료폴더 } from './assets.js';
import { type 판, 판차리기, 셈있음 } from './continue-fixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('이어 작성 — 자료 복사 · 줄 세우기', () => {
  let 판: 판;

  beforeAll(async () => {
    판 = await 판차리기('XWQ');
  });

  afterAll(async () => {
    await 판.닫기();
  });

  const 행 = async (id: number) => {
    const { pool } = await import('../db/index.js');
    return (
      await pool.query(
        `SELECT kind, status, source_id, continue_from, compare, env, start_url, params, spec_text FROM authoring_request WHERE id = $1`,
        [id],
      )
    ).rows[0] as Record<string, unknown>;
  };

  it('새 작성 요청이 원본을 물려받아 곧장 줄에 선다 — 자기가 뿌리다', async () => {
    const { 뿌리 } = await 판.원본({ coverage: 셈있음, compare: true, params: { 값: 1 }, specText: '옛 본문' });
    const 답 = await 판.이어작성({ kind: 'AUTHOR', continueFrom: 뿌리 });
    expect(답.statusCode).toBe(201);
    const id = 답.json<{ id: number }>().id;
    expect(await 행(id)).toEqual({
      kind: 'AUTHOR',
      status: 'PENDING',
      source_id: null,
      continue_from: String(뿌리),
      compare: true,
      env: 'qa',
      start_url: 'https://qa.xwq.test/start',
      params: { 값: 1 },
      spec_text: '옛 본문',
    });
    const 몸 = await 판.상세(id);
    expect(몸.rootId).toBe(id);
    expect(몸.continueFrom).toBe(뿌리);
  });

  it('입력 자료(파일 · 피그마)만 새 번호로 복사되고 파일 바이트가 같다 — 표시 사본은 안 온다', async () => {
    const { 뿌리, 자료 } = await 판.원본({ coverage: 셈있음, 자료: ['FILE', 'FIGMA', 'FILE'] });
    const id = (await 판.이어작성({ kind: 'AUTHOR', continueFrom: 뿌리 })).json<{ id: number }>().id;
    const 새자료 = (await 판.상세(id)).assets as { id: number; kind: string; name: string; role: string; figmaUrl: string | null }[];
    expect(새자료.map((a) => [a.kind, a.name, a.role, a.figmaUrl])).toEqual([
      ['FILE', '기획서0.docx', 'INPUT', null],
      ['FIGMA', 'https://www.figma.com/design/Key1/', 'INPUT', 'https://www.figma.com/design/Key1/'],
      ['FILE', '기획서2.docx', 'INPUT', null],
    ]);
    expect(새자료.every((a) => !자료.includes(a.id))).toBe(true);
    for (const [i, a] of 새자료.entries()) {
      if (a.kind !== 'FILE') continue;
      expect(await readFile(join(자료폴더(id), `${String(a.id)}.docx`), 'utf8')).toBe(`본문${String(i)}`);
      const 받음 = await 판.app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/assets/${String(a.id)}` });
      expect(받음.statusCode).toBe(200);
      expect(받음.body).toBe(`본문${String(i)}`);
    }
  });

  it('동시에 둘을 누르면 하나만 선다', async () => {
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    const 답들 = await Promise.all([1, 2].map(() => 판.이어작성({ kind: 'AUTHOR', continueFrom: 뿌리 })));
    expect(답들.map((d) => d.statusCode).sort()).toEqual([201, 409]);
    expect(답들.find((d) => d.statusCode === 409)?.json()).toEqual({ error: 'ALREADY_CONTINUED' });
  });

  it('파일 복사가 실패하면 500 이고 새 요청 · 자료 행이 남지 않아 다시 누를 수 있다', async () => {
    const { pool } = await import('../db/index.js');
    const { 뿌리, 자료 } = await 판.원본({ coverage: 셈있음 });
    const 파일 = join(자료폴더(뿌리), `${String(자료[0])}.docx`);
    await rm(파일);
    const 답 = await 판.이어작성({ kind: 'AUTHOR', continueFrom: 뿌리 });
    expect(답.statusCode).toBe(500);
    const 남음 = await pool.query('SELECT 1 FROM authoring_request WHERE continue_from = $1', [뿌리]);
    expect(남음.rowCount).toBe(0);
    await writeFile(파일, '본문0');
    expect((await 판.이어작성({ kind: 'AUTHOR', continueFrom: 뿌리 })).statusCode).toBe(201);
  });
});
