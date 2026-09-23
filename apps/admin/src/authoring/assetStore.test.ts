// 작성 자료 표를 읽고 쓰는 자리 검사 (SPEC 공통/4-데이터모델 §6 「작성 자료」 · 도메인/작성 §7 「자료」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 자료더하기, 자료목록, 자료지우기, 제출, 준비세우기 } from './assetStore.js';
import { 줄세우기, 한건 } from './store.js';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 XWS — authoring_request 를 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWS';

describe.skipIf(연결 === undefined)('작성 자료', () => {
  let 서비스 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', $3)
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 자료 검사용`, 접두사.toLowerCase()],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  const 준비 = (피그마: string[] = []) =>
    준비세우기({ 서비스, 누가: 'xws', 이름: '검사', 피그마 });

  it('준비 행은 DRAFT 로 서고 피그마 주소마다 자료 한 행이 순서대로 붙는다', async () => {
    const id = await 준비(['https://www.figma.com/design/A1/?node-id=1-2', 'https://www.figma.com/design/B2/']);
    expect((await 한건(id))?.status).toBe('DRAFT');
    expect((await 한건(id))?.specText).toBe(null);
    const 자료 = await 자료목록(id);
    expect(자료.map((a) => [a.position, a.kind, a.name, a.figmaUrl])).toEqual([
      [1, 'FIGMA', 'https://www.figma.com/design/A1/?node-id=1-2', 'https://www.figma.com/design/A1/?node-id=1-2'],
      [2, 'FIGMA', 'https://www.figma.com/design/B2/', 'https://www.figma.com/design/B2/'],
    ]);
  });

  it('자료를 더하면 다음 순서 번호가 붙고 목록이 순서대로 나온다', async () => {
    const id = await 준비(['https://www.figma.com/design/A1/']);
    const 첫 = await 자료더하기(id, { name: '기획서.pdf', size: 10 });
    const 둘 = await 자료더하기(id, { name: '화면.docx', size: 20 });
    expect(typeof 첫).toBe('object');
    expect(typeof 둘).toBe('object');
    const 자료 = await 자료목록(id);
    expect(자료.map((a) => [a.position, a.kind, a.name, a.size])).toEqual([
      [1, 'FIGMA', 'https://www.figma.com/design/A1/', null],
      [2, 'FILE', '기획서.pdf', 10],
      [3, 'FILE', '화면.docx', 20],
    ]);
  });

  it('동시에 두 번 더해도 둘 다 붙고 번호가 다르다', async () => {
    const id = await 준비();
    const [가, 나] = await Promise.all([
      자료더하기(id, { name: 'a.pdf', size: 1 }),
      자료더하기(id, { name: 'b.pdf', size: 1 }),
    ]);
    expect(typeof 가).toBe('object');
    expect(typeof 나).toBe('object');
    const 번호들 = (await 자료목록(id)).map((a) => a.position).sort();
    expect(번호들).toEqual([1, 2]);
  });

  it('상한 20 을 넘기면 거절한다 — 동시에 몰려도', async () => {
    const id = await 준비();
    const 결과 = await Promise.all(
      Array.from({ length: 21 }, (_, i) => 자료더하기(id, { name: `${String(i)}.pdf`, size: 1 })),
    );
    expect(결과.filter((r) => r === 'TOO_MANY')).toHaveLength(1);
    expect(await 자료목록(id)).toHaveLength(20);
  });

  it('DRAFT 가 아닌 행에는 안 붙는다', async () => {
    const id = await 줄세우기({ 서비스, kind: 'AUTHOR', 기획서: '옛 행', 누가: 'xws', 이름: '검사' });
    expect(await 자료더하기(id, { name: 'a.pdf', size: 1 })).toBe('NOT_DRAFT');
  });

  it('제출 — 자료 0 이면 false, 있으면 PENDING, 두 번째는 false', async () => {
    const 빈것 = await 준비();
    expect(await 제출(빈것)).toBe(false);
    expect((await 한건(빈것))?.status).toBe('DRAFT');

    const id = await 준비(['https://www.figma.com/design/A1/']);
    expect(await 제출(id)).toBe(true);
    expect((await 한건(id))?.status).toBe('PENDING');
    expect(await 제출(id)).toBe(false);
  });

  it('자료지우기 — 파일 쓰기에 실패한 행을 되돌린다', async () => {
    const id = await 준비();
    const 붙은것 = await 자료더하기(id, { name: 'a.pdf', size: 1 });
    if (typeof 붙은것 !== 'object') throw new Error(`자료가 안 붙었다: ${붙은것}`);
    await 자료지우기(붙은것.id);
    expect(await 자료목록(id)).toEqual([]);
  });
});
