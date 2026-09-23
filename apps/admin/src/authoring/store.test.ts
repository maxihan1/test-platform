// 작성 대기줄 표와 그것을 읽고 쓰는 자리 검사 (SPEC 공통/4-데이터모델 §6 · 도메인/작성 §3.6)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 끝내기, 단계올리기, 사진자리, 줄세우기, 집기, 한건, 한쪽 } from './store.js';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 XWA — 이 파일은 authoring_request 를 service_id 로만 지운다.
// routes.test.ts 는 XWAR 을 쓰고 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWA';

describe.skipIf(연결 === undefined)('작성 대기줄', () => {
  let 서비스 = 0;
  let 남의서비스 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 만들기 = async (prefix: string): Promise<number> => {
      const r = await pool.query<{ id: number }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $2, '#3A5FCD', '', $3)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [prefix, `${prefix} 작성 검사용`, prefix.toLowerCase()],
      );
      // service.id 는 BIGSERIAL 이라 pg 가 문자열로 준다. 표를 읽는 쪽은 숫자로 다룬다
      return Number(r.rows[0]!.id);
    };
    서비스 = await 만들기(접두사);
    남의서비스 = await 만들기(`${접두사}X`);
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [
      [서비스, 남의서비스],
    ]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [
      [서비스, 남의서비스],
    ]);
    // ★ 만든 서비스도 치운다. 안 치우면 다음 실행에서 **세상이 달라진다** —
    // 다른 검사들이 「지금 살아 있는 서비스」를 훑기 때문에 1회차는 통과하고 2회차부터 깨진다
    // (2026-09-22 실측. 연속 3회 규칙이 잡으라는 바로 그 경우다)
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[서비스, 남의서비스]]);
  });

  describe('표가 잘못된 행을 막는다', () => {
    it('가리키는 것 없는 머지 요청은 INSERT 가 거부한다', async () => {
      const { pool } = await import('../db/index.js');
      await expect(
        pool.query(
          `INSERT INTO authoring_request
             (service_id, kind, spec_text, requested_by, requested_by_name, status)
           VALUES ($1, 'MERGE', '기획서', 'xwa', '검사', 'PENDING')`,
          [서비스],
        ),
      ).rejects.toThrow();
    });

    it('작성 요청이 남의 행을 가리키면 INSERT 가 거부한다', async () => {
      const { pool } = await import('../db/index.js');
      const 원본 = await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '원본',
        누가: 'xwa',
        이름: '검사',
      });
      await expect(
        pool.query(
          `INSERT INTO authoring_request
             (service_id, kind, source_id, spec_text, requested_by, requested_by_name, status)
           VALUES ($1, 'AUTHOR', $2, '기획서', 'xwa', '검사', 'PENDING')`,
          [서비스, 원본],
        ),
      ).rejects.toThrow();
    });

    it('모르는 kind 는 INSERT 가 거부한다', async () => {
      const { pool } = await import('../db/index.js');
      await expect(
        pool.query(
          `INSERT INTO authoring_request
             (service_id, kind, spec_text, requested_by, requested_by_name, status)
           VALUES ($1, 'PUBLISH', '기획서', 'xwa', '검사', 'PENDING')`,
          [서비스],
        ),
      ).rejects.toThrow();
    });
  });

  describe('자료 표가 서고 DRAFT 가 된다 (2026-09-23)', () => {
    it('DRAFT 행을 넣을 수 있다 — 자료를 올리는 동안 줄에 안 선다', async () => {
      const { pool } = await import('../db/index.js');
      await expect(
        pool.query(
          `INSERT INTO authoring_request
             (service_id, kind, spec_text, requested_by, requested_by_name, status)
           VALUES ($1, 'AUTHOR', '기획서', 'xwa', '검사', 'DRAFT')`,
          [서비스],
        ),
      ).resolves.toBeDefined();
    });

    it('기획서 본문 없이 행을 넣을 수 있다 — 기획서는 자료로 온다', async () => {
      const { pool } = await import('../db/index.js');
      await expect(
        pool.query(
          `INSERT INTO authoring_request
             (service_id, kind, requested_by, requested_by_name, status)
           VALUES ($1, 'AUTHOR', 'xwa', '검사', 'DRAFT')`,
          [서비스],
        ),
      ).resolves.toBeDefined();
    });

    it('모르는 자료 종류는 INSERT 가 거부한다', async () => {
      const { pool } = await import('../db/index.js');
      const r = await pool.query<{ id: string }>(
        `INSERT INTO authoring_request
           (service_id, kind, requested_by, requested_by_name, status)
         VALUES ($1, 'AUTHOR', 'xwa', '검사', 'DRAFT') RETURNING id`,
        [서비스],
      );
      await expect(
        pool.query(
          `INSERT INTO authoring_asset (request_id, position, kind, name)
           VALUES ($1, 1, 'X', '이상한 것')`,
          [r.rows[0]!.id],
        ),
      ).rejects.toThrow();
    });

    it('서비스에 피그마 토큰 칸이 있다', async () => {
      const { pool } = await import('../db/index.js');
      const r = await pool.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_name = 'service' AND column_name = 'figma_token'`,
      );
      expect(r.rowCount).toBe(1);
    });
  });

  describe('줄을 세우고 집는다', () => {
    it('세운 요청은 대기 중으로 줄에 선다', async () => {
      const id = await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '할 일을 한 건 만든다',
        누가: 'xwa',
        이름: '검사',
      });
      const 행 = await 한건(id);
      expect(행?.status).toBe('PENDING');
      expect(행?.claimedBy).toBe(null);
    });

    it('집으면 도는 중이 되고 집은 사람이 적힌다', async () => {
      // 집기는 가장 오래된 대기 중을 집는다. 앞 검사가 남긴 줄이 있으면 그것부터 집힌다
      while ((await 집기(서비스, 'xwa-비우기')) !== null) {
        /* 줄을 비운다 */
      }
      const id = await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '집기 검사',
        누가: 'xwa',
        이름: '검사',
      });
      const 집은것 = await 집기(서비스, 'xwa-mac');
      expect(집은것?.id).toBe(id);
      const 행 = await 한건(id);
      expect(행?.status).toBe('RUNNING');
      expect(행?.claimedBy).toBe('xwa-mac');
      expect(행?.startedAt).not.toBe(null);
    });

    it('줄이 비면 집기가 아무것도 안 준다', async () => {
      while ((await 집기(서비스, 'xwa-mac')) !== null) {
        /* 앞 검사가 남긴 것을 비운다 */
      }
      expect(await 집기(서비스, 'xwa-mac')).toBe(null);
    });

    it('남의 서비스 줄은 안 집는다 — 그 행에 기획서 본문이 실려 있다', async () => {
      await 줄세우기({
        서비스: 남의서비스,
        kind: 'AUTHOR',
        기획서: '남의 기획서 본문',
        누가: 'xwa',
        이름: '검사',
      });
      expect(await 집기(서비스, 'xwa-mac')).toBe(null);
    });

    it('같은 행을 둘이 집지 못한다', async () => {
      await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '한 번만 집힌다',
        누가: 'xwa',
        이름: '검사',
      });
      const 먼저 = await 집기(서비스, 'xwa-mac1');
      const 나중 = await 집기(서비스, 'xwa-mac2');
      expect(먼저).not.toBe(null);
      expect(나중).toBe(null);
    });
  });

  describe('상태 전이를 벗어나면 거부한다', () => {
    it('안 집은 행의 단계는 못 올린다', async () => {
      const id = await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '대기 중',
        누가: 'xwa',
        이름: '검사',
      });
      expect(await 단계올리기(id, '케이스 2건째')).toBe(false);
    });

    it('끝난 행에 또 끝났다고 하면 거부한다', async () => {
      await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '두 번 끝내기',
        누가: 'xwa',
        이름: '검사',
      });
      const 집은것 = await 집기(서비스, 'xwa-mac');
      const id = 집은것!.id;
      expect(await 끝내기(id, { status: 'DONE', prUrl: '첫 번째' })).toBe(true);
      expect(await 끝내기(id, { status: 'DONE', prUrl: '두 번째' })).toBe(false);
      const 행 = await 한건(id);
      expect(행?.prUrl).toBe('첫 번째');
    });
  });

  describe('한 쪽씩 읽는다', () => {
    it('그 서비스 것만 나온다', async () => {
      const 쪽 = await 한쪽({ 서비스: 서비스, 쪽: 1 });
      expect(쪽.items.every((r) => r.serviceId === 서비스)).toBe(true);
      expect(쪽.total).toBeGreaterThan(0);
    });

    it('목록 항목에 기획서 본문을 싣지 않는다 — 목록은 본문을 안 그린다', async () => {
      const 쪽 = await 한쪽({ 서비스: 서비스, 쪽: 1 });
      expect(쪽.items.length).toBeGreaterThan(0);
      expect(쪽.items.every((r) => !('specText' in r))).toBe(true);
    });

    it('상태로 거르면 그것만 나온다', async () => {
      const 쪽 = await 한쪽({ 서비스: 서비스, 상태: 'PENDING', 쪽: 1 });
      expect(쪽.items.every((r) => r.status === 'PENDING')).toBe(true);
    });
  });
});

describe('사진 자리는 대기줄 행 번호로 가른다', () => {
  it('요청마다 다른 폴더를 준다 — 안 가르면 직전 요청 사진을 덮는다', () => {
    expect(사진자리(41)).not.toBe(사진자리(42));
    expect(사진자리(42)).toContain('42');
  });
});
