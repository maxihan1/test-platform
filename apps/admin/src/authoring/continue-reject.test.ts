// 남은 요구로 이어 작성 — POST { kind: 'AUTHOR', continueFrom } 의 거절 (SPEC 도메인/작성 §7 · §3.6 「★ 원장」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type 판, 판차리기, 셈있음 } from './continue-fixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('이어 작성 — 거절', () => {
  let 판: 판;

  beforeAll(async () => {
    판 = await 판차리기('XWP');
  });

  afterAll(async () => {
    await 판.닫기();
  });

  const 오류 = async (본문: Record<string, unknown>, 서비스접두사?: string) => {
    const 답 = await 판.이어작성(본문, 서비스접두사);
    return [답.statusCode, 답.json<{ error: string }>().error] as const;
  };

  it.each([
    ['피그마 주소', { figma: ['https://www.figma.com/design/Abc/'] }, 'BAD_FIGMA_URL'],
    ['대조 켜기', { compare: true }, 'BAD_ENV'],
    ['대상 서버', { env: 'qa' }, 'BAD_ENV'],
    ['시작 주소', { startUrl: 'https://qa.xwp.test/' }, 'BAD_ENV'],
  ])('%s 를 같이 보내면 400 — 자료와 대조 설정은 원본 것을 물려받는다', async (_, 더, 코드) => {
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리, ...더 })).toEqual([400, 코드]);
  });

  it.each([['글자', '7'], ['0', 0], ['음수', -3], ['소수', 1.5]])('continueFrom 이 %s 이면 400', async (_, 값) => {
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 값 })).toEqual([400, 'SOURCE_ID_REQUIRED']);
  });

  it('없는 번호는 404 · 남의 서비스 요청이면 403', async () => {
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 999_999_999 })).toEqual([404, 'NOT_FOUND']);
    const { pool } = await import('../db/index.js');
    const 남 = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XWPB', 'XWPB 남의 서비스', '#3A5FCD', '', 'xwpb')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    try {
      const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
      expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리 }, 'XWPB')).toEqual([403, 'SERVICE_FORBIDDEN']);
    } finally {
      await pool.query('DELETE FROM service WHERE id = $1', [Number(남.rows[0]!.id)]);
    }
  });

  it('뿌리가 아닌 실행 번호(머지)면 409 BAD_SOURCE — 화면은 rootId 를 보낸다', async () => {
    const { 머지 } = await 판.원본({ coverage: 셈있음 });
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 머지 })).toEqual([409, 'BAD_SOURCE']);
  });

  it.each([
    ['반영 전', 'AUTHOR_DONE' as const],
    ['반영 대기', 'MERGE_PENDING' as const],
    ['실패한 반영이 마지막', 'MERGE_FAILED' as const],
  ])('%s 이면 409 NOT_MERGED', async (_, 최신) => {
    const { 뿌리 } = await 판.원본({ coverage: 셈있음, 최신 });
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리 })).toEqual([409, 'NOT_MERGED']);
  });

  it('폐기 안 된 이어 작성이 이미 있으면 409 ALREADY_CONTINUED', async () => {
    const { pool } = await import('../db/index.js');
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, continue_from)
       VALUES ($1, 'AUTHOR', 'xcont', '검사', 'FAILED', $2)`,
      [판.서비스, 뿌리],
    );
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리 })).toEqual([409, 'ALREADY_CONTINUED']);
  });

  it.each([
    ['남은 요구가 없는 셈', { coverage: { ...셈있음, cased: 2, excluded: { '요구 아님': 1 }, missing: [], later: [] } }],
    ['원장이 없는 셈', { coverage: { none: 'PDF 뿐이다' } }],
    ['입력 자료가 없는 원본', { coverage: 셈있음, 자료: [] as ('FILE' | 'FIGMA')[], specText: '옛 본문' }],
  ])('%s 이면 409 NOTHING_LEFT', async (_, 칸) => {
    const { 뿌리 } = await 판.원본(칸);
    expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리 })).toEqual([409, 'NOTHING_LEFT']);
  });

  it('대조 원본인데 대상 서버 줄의 계정이 빠졌으면 400 BAD_ENV — 줄에서 한참 기다린 뒤 실패하지 않게', async () => {
    const { pool } = await import('../db/index.js');
    const { 뿌리 } = await 판.원본({ coverage: 셈있음, compare: true });
    await pool.query("UPDATE service_env SET login_password = NULL WHERE service_id = $1 AND env = 'qa'", [판.서비스]);
    try {
      expect(await 오류({ kind: 'AUTHOR', continueFrom: 뿌리 })).toEqual([400, 'BAD_ENV']);
    } finally {
      await pool.query("UPDATE service_env SET login_password = 'pw-7731' WHERE service_id = $1 AND env = 'qa'", [판.서비스]);
    }
  });
});
