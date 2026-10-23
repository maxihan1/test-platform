// admin 전용 DB 연결 풀. 각 컨텍스트는 여기서 pool을 import 만 하고 직접 만들지 않는다 (WORKSTREAMS 공용 골격)

import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // 연결 문자열이 없으면 조용히 기본값으로 붙지 않는다. 어느 DB에 쓰고 있는지 모르는 상태가 더 위험하다
  throw new Error('DATABASE_URL이 없다. docker-compose.yml의 admin 환경변수를 확인해라');
}

// 연결을 끝없이 기다리지 않는다 — 연결을 쥔 채 하나 더 기다리는 요청이 풀을 다 채우면 서버 전체가 선다 (2026-10-23 리뷰 H1).
// 10초면 그 요청만 오류로 끝나고 연결이 풀린다
export const pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000 });
