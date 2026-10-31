// 프로젝트마다 BTS 연결 하나 — 읽기 · 저장 · 끊기 · 배포 열쇠 · 규칙 토큰 만들기 (도메인/BTS §3.12 「설정 · 고장 대응」 · §7 「설정 › BTS 연결」)
// BTS 와 이어지는 자리는 이 폴더 하나에 모은다 — 다른 BTS(Jira 등)가 오면 여기만 갈아 끼운다 (도메인/BTS 「1차 밖 · 나중」)

import { randomBytes } from 'node:crypto';

import type { Pool } from 'pg';
import { z } from 'zod';

import { 토큰해시 } from '../auth/agentToken.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 단계 이름이 정본이다 — 회사마다 다른 BTS 상태 · 해결 상태 이름을 이 단계에 짝짓는다 (도메인/BTS 「짝지을 이름」).
// 빈 이름도 받아 둔다 — 짝이 빈 단계는 모양 오류가 아니라 MAP_INCOMPLETE 로 알린다(화면이 그 단계를 짚는다)
const 이름 = z.string().trim().max(200).default('');
export const 상태짝틀 = z
  .object({ DEPLOY_WAIT: 이름, QA_REQUEST: 이름, QA_REVIEW: 이름, DEV_REQUEST: 이름, CODE_REVIEW: 이름, CLOSED: 이름 })
  .strict();
export const 해결짝틀 = z.object({ SCREEN_RIGHT: 이름, TEST_PROBLEM: 이름, FLAKY: 이름, ENV: 이름, DUPLICATE: 이름 }).strict();

// 애플리케이션 코드 저장소 한 줄. 수정 AI 가 clone 할 주소라 https 만 받는다 (도메인/BTS §7 「애플리케이션 코드 저장소」)
export const 코드저장소 = z.object({
  name: z.string().trim().min(1).max(50),
  url: z.string().trim().url().max(500).refine((u) => u.startsWith('https://'), 'url 은 https:// 로 시작해야 합니다'),
});
export type 코드저장소줄 = z.infer<typeof 코드저장소>;

export type 상태짝 = z.infer<typeof 상태짝틀>;
export type 해결짝 = z.infer<typeof 해결짝틀>;

export interface 열쇠정보 {
  tail: string;
  createdAt: string;
}

export interface BTS연결보기 {
  linked: boolean;
  baseUrl: string | null;
  btsProject: string | null;
  botKeyTail: string | null;
  statusMap: Partial<상태짝>;
  resolutionMap: Partial<해결짝>;
  deployKey: 열쇠정보 | null;
  ruleToken: 열쇠정보 | null;
}

interface 연결원행 {
  base_url: string;
  bts_project: string;
  bot_key: string;
  webhook_secret: string;
  deploy_key_tail: string | null;
  deploy_key_at: Date | null;
  rule_token_tail: string | null;
  rule_token_at: Date | null;
  status_map: 상태짝;
  resolution_map: 해결짝;
}

const 열쇠 = (tail: string | null, at: Date | null): 열쇠정보 | null =>
  tail === null || at === null ? null : { tail, createdAt: at.toISOString() };

async function 프로젝트있나(pool: Pool, projectId: number): Promise<boolean> {
  return (await pool.query('SELECT 1 FROM project WHERE id = $1', [projectId])).rowCount === 1;
}

async function 원행(pool: Pool, projectId: number): Promise<연결원행 | undefined> {
  const r = await pool.query<연결원행>('SELECT * FROM bts_link WHERE project_id = $1', [projectId]);
  return r.rows[0];
}

/** 그 애플리케이션의 프로젝트가 BTS 를 이었으면 그 프로젝트 번호, 아니면 null — 이으면 「버그야, 아니야?」를 BTS 에서만 판정한다 (도메인/BTS 「지킬 것」 4) */
export async function BTS이은프로젝트(서비스: number): Promise<number | null> {
  const r = await (await db()).query<{ project_id: string }>('SELECT l.project_id FROM service s JOIN bts_link l ON l.project_id = s.project_id WHERE s.id = $1', [서비스]);
  return r.rows[0] === undefined ? null : Number(r.rows[0].project_id);
}

export const BTS이은서비스인가 = async (서비스: number): Promise<boolean> => (await BTS이은프로젝트(서비스)) !== null;

/**
 * 화면이 「QA Hub AI」 열쇠를 다시 안 적었을 때 쓸 저장한 열쇠. 저장한 주소와 같은 주소일 때만 준다 —
 * 끝 4자리만 본 사람이 원문을 다른 주소로 보내게 하지 않는다(BTS연결저장 의 BOT_KEY_REQUIRED 와 같은 판단)
 */
export async function 저장한열쇠(projectId: number, baseUrl: string): Promise<string | undefined> {
  const 행 = await 원행(await db(), projectId);
  return 행?.base_url === baseUrl ? 행.bot_key : undefined;
}

/** 프로젝트가 없으면 null — 라우트가 404 를 낸다. 연결이 없으면 linked: false 와 빈 칸 */
export async function BTS연결읽기(projectId: number): Promise<BTS연결보기 | null> {
  const pool = await db();
  if (!(await 프로젝트있나(pool, projectId))) return null;
  const 행 = await 원행(pool, projectId);
  if (행 === undefined) {
    return { linked: false, baseUrl: null, btsProject: null, botKeyTail: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null };
  }
  return {
    linked: true,
    baseUrl: 행.base_url,
    btsProject: 행.bts_project,
    // 원문은 BTS 를 부를 때만 쓴다. 응답에는 끝 4자리만 (service_env.admin_key 와 같다)
    botKeyTail: 행.bot_key.slice(-4),
    statusMap: 행.status_map,
    resolutionMap: 행.resolution_map,
    deployKey: 열쇠(행.deploy_key_tail, 행.deploy_key_at),
    ruleToken: 열쇠(행.rule_token_tail, 행.rule_token_at),
  };
}

export interface BTS연결입력 {
  baseUrl: string;
  btsProject: string;
  botKey?: string;
  webhookSecret?: string;
  statusMap: 상태짝;
  resolutionMap: 해결짝;
}

export type 확인함수 = (baseUrl: string, btsProject: string, botKey: string) => Promise<boolean>;

/**
 * BTS 를 한 번 불러 「QA Hub AI」 열쇠로 그 프로젝트를 읽을 수 있는지 본다. 열쇠 · 프로젝트 키 · 주소 중 하나라도 틀리면 false.
 * BTS 는 PAT 를 `Authorization: Bearer` 로 받는다(BTS SecurityConfig). 5초 안에 답이 없으면 닿지 않은 것으로 친다
 */
export const BTS확인: 확인함수 = async (baseUrl, btsProject, botKey) => {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/projects/${encodeURIComponent(btsProject)}`, {
      headers: { authorization: `Bearer ${botKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
    return res.status === 200;
  } catch {
    return false;
  }
};

export type 저장결과 = 'OK' | 'NOT_FOUND' | 'SECRETS_REQUIRED' | 'BOT_KEY_REQUIRED' | 'BTS_UNREACHABLE';

/**
 * 처음 연결이면 「QA Hub AI」 열쇠를 꼭 받는다. 고칠 때 비우면 저장한 원문을 그대로 쓴다 —
 * 다만 주소가 바뀌면 「QA Hub AI」 열쇠를 다시 받는다. 이으면 끝 4자리만 본 사람이 원문을 아무 주소로나 보내게 할 수 있다(settings/envs.ts 토큰 주소와 같은 판단)
 */
export async function BTS연결저장(projectId: number, 입력: BTS연결입력, 누가: string, 확인: 확인함수 = BTS확인): Promise<저장결과> {
  const pool = await db();
  if (!(await 프로젝트있나(pool, projectId))) return 'NOT_FOUND';
  const 지금 = await 원행(pool, projectId);
  if (지금 === undefined && 입력.botKey === undefined) return 'SECRETS_REQUIRED';
  if (지금 !== undefined && 입력.botKey === undefined && 지금.base_url !== 입력.baseUrl) return 'BOT_KEY_REQUIRED';
  const botKey = 입력.botKey ?? 지금!.bot_key;
  // 알림 서명 비밀은 사람이 옮겨 적지 않는다 — QA Hub 가 만들어 두고 BTS 자동 설정이 BTS 웹훅에 넣는다(BTS-F3-05)
  const webhookSecret = 입력.webhookSecret ?? 지금?.webhook_secret ?? randomBytes(32).toString('base64url');
  if (!(await 확인(입력.baseUrl, 입력.btsProject, botKey))) return 'BTS_UNREACHABLE';
  await pool.query(
    `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (project_id) DO UPDATE
        SET base_url = EXCLUDED.base_url, bts_project = EXCLUDED.bts_project, bot_key = EXCLUDED.bot_key,
            webhook_secret = EXCLUDED.webhook_secret, status_map = EXCLUDED.status_map, resolution_map = EXCLUDED.resolution_map,
            updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [projectId, 입력.baseUrl, 입력.btsProject, botKey, webhookSecret, 입력.statusMap, 입력.resolutionMap, 누가],
  );
  return 'OK';
}

/** 연결 행만 지운다 — 맡은 이슈 · 짝 기록은 남긴다(도메인/BTS §7). 그 프로젝트는 다시 지금처럼 돈다. 프로젝트가 없으면 false */
export async function BTS연결끊기(projectId: number): Promise<boolean> {
  const pool = await db();
  if (!(await 프로젝트있나(pool, projectId))) return false;
  await pool.query('DELETE FROM bts_link WHERE project_id = $1', [projectId]);
  return true;
}

const 열쇠칸 = {
  deploy: { 머리: 'pdk_', 칸: 'deploy_key' },
  rule: { 머리: 'btr_', 칸: 'rule_token' },
} as const;

export type 열쇠종류 = keyof typeof 열쇠칸;

/** 새로 만들면 앞 열쇠는 끊긴다(해시를 덮는다). 원문은 이 반환값 한 번뿐이다 */
export async function BTS열쇠만들기(projectId: number, 종류: 열쇠종류, 누가: string): Promise<{ 열쇠: string } | 'NOT_FOUND' | 'NOT_LINKED'> {
  const { 머리, 칸 } = 열쇠칸[종류];
  const 원문 = `${머리}${randomBytes(32).toString('base64url')}`;
  const pool = await db();
  if (!(await 프로젝트있나(pool, projectId))) return 'NOT_FOUND';
  // 칸 이름은 위 표의 상수뿐이라 글자로 끼워도 된다
  const r = await pool.query(
    `UPDATE bts_link SET ${칸}_hash = $2, ${칸}_tail = $3, ${칸}_by = $4, ${칸}_at = now() WHERE project_id = $1`,
    [projectId, 토큰해시(원문), 원문.slice(-4), 누가],
  );
  return r.rowCount === 1 ? { 열쇠: 원문 } : 'NOT_LINKED';
}
