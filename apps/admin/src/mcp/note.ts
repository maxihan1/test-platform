// MCP 도구 note_read — 프로젝트 노트 목차 · 문서 하나 읽기 (도메인/BTS §3.12 「맥락 — 프로젝트 노트」 · §7 「MCP」)

import type { Pool } from 'pg';

import type { 사용자 } from '../auth/store.js';
import { 지금노트 } from '../projectNote/claim.js';
import { 프로젝트읽기막힘, type 도구답 } from './tools.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 이름 없이 부르면 목차(이름 · 한 줄 설명 · 본문 길이), 이름을 주면 그 문서. 권한은 BTS 찾기와 같은 문턱 */
export async function 노트읽기(사람: 사용자, projectId: number, name?: string): Promise<도구답> {
  const 막힘 = 프로젝트읽기막힘(사람, projectId);
  if (막힘 !== null) return 막힘;
  const 연결 = await (await db()).query('SELECT 1 FROM bts_link WHERE project_id = $1', [projectId]);
  if (연결.rowCount === 0) return { ok: false, error: 'NOT_LINKED', detail: `project ${String(projectId)} 은 Issue Bunker 를 잇지 않았다` };
  const 판 = await 지금노트(projectId);
  if (판 === null) return { ok: false, error: 'NOT_FOUND', detail: '노트가 아직 없다' };
  if (name === undefined) {
    return { ok: true, data: { version: 판.version, savedAt: 판.savedAt, docs: 판.docs.map((d) => ({ name: d.name, summary: d.summary, length: d.body.length })) } };
  }
  const 문서 = 판.docs.find((d) => d.name === name);
  if (문서 === undefined) return { ok: false, error: 'NOT_FOUND', detail: name };
  return { ok: true, data: { version: 판.version, savedAt: 판.savedAt, name: 문서.name, summary: 문서.summary, body: 문서.body } };
}
