// Grafana 대시보드 패널이 SPEC §8.5 대로 프로비저닝됐는지 본다 — 제목 · SQL 실접속
// CI에는 postgres가 없다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { readFileSync } from 'node:fs';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type 타깃 = { rawSql: string; format: string; rawQuery: boolean };
type 패널 = { title: string; type: string; targets: 타깃[] };
type 대시보드 = { panels: 패널[] };

const 대시보드: 대시보드 = JSON.parse(
  readFileSync(
    new URL('../../../../infra/grafana/provisioning/dashboards/test-platform.json', import.meta.url),
    'utf8',
  ),
) as 대시보드;

// 패널 SQL 은 대시보드 계정 권한으로 돌아야 의미가 있다. JOIN 안에 숨은 표는 여기서만 드러난다 (SPEC §8.5 · §6)
const 연결 = process.env.DATABASE_URL;

// 주소를 글자로 박지 않고 DATABASE_URL 에서 가져와 계정만 갈아 끼운다.
// 개발 PC 는 5434, CI 는 5432 라 박아 두면 CI 에서만 ECONNREFUSED 로 죽는다 (2026-09-22 실측).
// CI 에 DB 가 붙기 전에는 이 검사가 통째로 건너뛰어져 드러나지 않았다
function 읽기전용주소(원본: string): string {
  const 주소 = new URL(원본);
  주소.username = 'grafana_ro';
  주소.password = 'grafana_ro';
  return 주소.toString();
}

describe('Grafana 대시보드 프로비저닝', () => {
  it('패널 제목이 SPEC §8.5 목록 그대로다', () => {
    expect(대시보드.panels.map((p) => p.title)).toEqual([
      '평균 소요시간',
      '최근 실행 목록',
      '작성에 걸린 시간',
      '작성 토큰',
      '작성 커버리지',
      '성능 테스트 추세',
    ]);
  });

  it('성공률 추이 · 실패 TOP 10 케이스는 앱 대시보드로 옮겼다 — 되살리지 않는다 (SPEC §8.5 · §8.12)', () => {
    const 제목들 = 대시보드.panels.map((p) => p.title);
    expect(제목들).not.toContain('성공률 추이');
    expect(제목들).not.toContain('실패 TOP 10 케이스');
  });

  it('test_run 을 읽는 패널은 케이스 실행(UI · 기능)만 본다 — 시나리오 실행을 뺀다 (PR #131)', () => {
    const 읽는패널 = 대시보드.panels.filter((p) => p.targets.some((t) => t.rawSql.includes('test_run')));
    expect(읽는패널.map((p) => p.title)).toEqual(['평균 소요시간', '최근 실행 목록']);
    for (const p of 읽는패널) {
      expect(p.targets.every((t) => t.rawSql.includes("kind IN ('UI','FN')")), p.title).toBe(true);
    }
    const 최근 = 대시보드.panels.find((p) => p.title === '최근 실행 목록');
    expect(최근?.targets[0]?.rawSql).toContain('AS "종류"');
  });

  it('성능 테스트 추세는 숫자만 싣는다 — 판정 칸을 읽지 않는다 (도메인/성능 「Grafana」)', () => {
    const sql = 대시보드.panels.find((p) => p.title === '성능 테스트 추세')!.targets[0]!.rawSql;
    expect(sql).not.toContain('verdict');
    expect(sql).toContain('peak_vus');
  });

  it('성능 테스트 추세는 서버 부하 실행(kind = LOAD)만 건다 — 페이지 · 기기 실행의 빈 점이 섞이지 않게', () => {
    const sql = 대시보드.panels.find((p) => p.title === '성능 테스트 추세')!.targets[0]!.rawSql;
    expect(sql).toContain("kind = 'LOAD'");
  });

  describe.skipIf(연결 === undefined)('패널 SQL', () => {
    let 읽기전용: Client;

    beforeAll(async () => {
      읽기전용 = new Client({ connectionString: 읽기전용주소(연결 as string) });
      await 읽기전용.connect();
    });

    afterAll(async () => {
      await 읽기전용.end();
    });

    it.each(대시보드.panels.map((p) => [p.title, p.targets[0]!.rawSql] as const))(
      '%s — grafana_ro 계정으로 실제로 돌아간다',
      async (_제목, sql) => {
        await expect(읽기전용.query(sql)).resolves.toBeDefined();
      },
    );

    // 실행 입력값 · 기대값에는 대상 서버 비밀번호가 원문으로 박제된다. Grafana Viewer 는 SQL 을 직접 보낸다 (리뷰 H4)
    it.each([
      'SELECT params FROM run_item LIMIT 1',
      'SELECT expected FROM run_item LIMIT 1',
      'SELECT error FROM run_item LIMIT 1',
    ])('run_item 은 패널이 읽는 칸만 열린다 — %s 는 거부된다', async (sql) => {
      await expect(읽기전용.query(sql)).rejects.toThrow(/permission denied/);
    });

    // 거부 목록만 보면 tc_name · param_schema 같은 칸이 새로 열려도 초록이다 — 연 칸을 명세 표 그대로 못 박는다
    it('run_item 에서 연 칸은 run_id · duration_ms 둘뿐이고 표 단위 권한은 없다', async () => {
      const 칸 = await 읽기전용.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.column_privileges WHERE grantee = 'grafana_ro' AND table_name = 'run_item' AND privilege_type = 'SELECT' ORDER BY column_name",
      );
      expect(칸.rows.map((r) => r.column_name)).toEqual(['duration_ms', 'run_id']);
      const 표 = await 읽기전용.query<{ 읽나: boolean }>(
        "SELECT has_table_privilege('grafana_ro', 'run_item', 'SELECT') AS \"읽나\"",
      );
      expect(표.rows[0]!.읽나).toBe(false);
    });

    it('평균 소요시간은 측정치라 미확정을 빼지 않는다', () => {
      const sql = 대시보드.panels.find((p) => p.title === '평균 소요시간')!.targets[0]!.rawSql;
      expect(sql).not.toContain('unconfirmed');
    });
  });
});
