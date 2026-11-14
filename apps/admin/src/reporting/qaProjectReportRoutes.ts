// 프로젝트 QA 리포트 통로 — 목록 · 만들기 · 하나 · 파일 · 문장 고치기 (도메인/리포팅 §7 「QA 리포트 통로」 프로젝트 줄 · 인증 §7 QA 리포트 줄)
// 프로젝트에 매인 통로라 문은 로그인 · 등급만 본다. 그 프로젝트의 실행 칸은 여기서 본다(정기 실행 세트와 같은 길 — sched/routes.ts)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { 칸이되나 } from '../auth/permissions.js';
import { 정수 } from '../routeParams.js';
import { 틀린시간대, 시간대확인 } from './dashboardResults.js';
import { PDF로 } from './generate.js';
import { 프로젝트리포트만들기, 프로젝트리포트목록, 프로젝트리포트읽기, 프로젝트리스크고치기, 리포트프로젝트 } from './qaProjectReport.js';
import { renderProjectReportDocx, renderProjectReportHtml } from './qaProjectReportDoc.js';
import { 기간까닭 } from './qaProjectReportShape.js';
import { 리스크일닫기 } from './qaReportAi.js';

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 없음 = (reply: FastifyReply) => reply.code(404).send({ error: 'NOT_FOUND' });
const 막힘 = (reply: FastifyReply, 필요: 'read' | 'write') => reply.code(403).send({ error: 'FORBIDDEN', need: `runs:${필요}` });

const 만들기본문 = z.object({ projectId: z.number().int().positive(), from: z.string(), to: z.string(), tz: z.string().min(1).max(64) });
const 고칠글 = z.object({ text: z.string().trim().min(1).max(4000) });

/** 그 프로젝트의 실행 칸이 되나 — 권한은 프로젝트에 붙어 그 프로젝트 애플리케이션 줄마다 같은 값이다 (인증 §3.5) */
const 프로젝트칸 = (req: FastifyRequest, projectId: number, 필요: 'read' | 'write') =>
  req.user?.services.some((s) => s.projectId === projectId && 칸이되나(s.permissions.runs, 필요)) ?? false;

const 형식들 = {
  PDF: { ext: 'pdf', mime: 'application/pdf', 펼침: 'inline' },
  HTML: { ext: 'html', mime: 'text/html; charset=utf-8', 펼침: 'inline' },
  DOCX: { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 펼침: 'attachment' },
} as const;

/**
 * 리포트 번호로 막는다 — 없으면 404, 프로젝트를 지운 리포트는 admin 만 본다(배정을 볼 곳이 없다 — §7 머리).
 * 통과면 null, 막혔으면 이미 답을 보냈다
 */
async function 리포트문(req: FastifyRequest, reply: FastifyReply, id: number, 필요: 'read' | 'write'): Promise<FastifyReply | null> {
  const p = await 리포트프로젝트(id);
  if (p === undefined) return 없음(reply);
  if (p === null) return req.user?.role === 'admin' ? null : 막힘(reply, 필요);
  return 프로젝트칸(req, p, 필요) ? null : 막힘(reply, 필요);
}

export default async function qaProjectReportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: Record<string, unknown> }>('/qa-project-reports', async (req, reply) => {
    const { projectId, page } = req.query;
    const 프 = typeof projectId === 'string' ? 정수(projectId) : null;
    if (프 === null) return 잘못(reply, 'projectId 가 필요합니다');
    const 쪽 = page === undefined ? 1 : typeof page === 'string' ? 정수(page) : null;
    if (쪽 === null || 쪽 < 1) return 잘못(reply, 'page 번호가 틀렸습니다');
    if (!프로젝트칸(req, 프, 'read')) return 막힘(reply, 'read');
    return 프로젝트리포트목록(프, 쪽);
  });

  app.post('/qa-project-reports', async (req, reply) => {
    const p = 만들기본문.safeParse(req.body);
    if (!p.success) return 잘못(reply, p.error.message);
    const { projectId, from, to, tz } = p.data;
    if (!프로젝트칸(req, projectId, 'write')) return 막힘(reply, 'write');
    const { pool } = await import('../db/index.js');
    try {
      await 시간대확인(pool, tz);
    } catch (err) {
      if (err instanceof 틀린시간대) return 잘못(reply, `시간대를 알 수 없습니다: ${tz}`);
      throw err;
    }
    // 오늘은 만든 사람 시간대로 — 그 사람 달력의 오늘까지 고를 수 있다
    const 오늘 = (await pool.query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE $1::text)::date, 'YYYY-MM-DD') AS d`, [tz])).rows[0]!.d;
    const 까닭 = 기간까닭(from, to, 오늘);
    if (까닭 !== null) return 잘못(reply, 까닭);
    const 나 = req.user!;
    const id = await 프로젝트리포트만들기(projectId, { from, to, tz }, 'MANUAL', 나.displayName || 나.username);
    return reply.code(201).send({ id });
  });

  app.get<{ Params: { id: string } }>('/qa-project-reports/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const 막음 = await 리포트문(req, reply, id, 'read');
    if (막음 !== null) return 막음;
    let 읽음 = await 프로젝트리포트읽기(id);
    // AI 일이 기다리는 중일 때만 꺼진 에이전트 · 오래 쥔 일을 닫는다 — 애플리케이션 리포트와 같은 길
    if (읽음?.aiPending === true) {
      await 리스크일닫기();
      읽음 = await 프로젝트리포트읽기(id);
    }
    return 읽음 === null ? 없음(reply) : 읽음.응답;
  });

  app.patch<{ Params: { id: string } }>('/qa-project-reports/:id/ai', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const p = 고칠글.safeParse(req.body);
    if (!p.success) return 잘못(reply, p.error.message);
    const 막음 = await 리포트문(req, reply, id, 'write');
    if (막음 !== null) return 막음;
    const 나 = req.user!;
    const r = await 프로젝트리스크고치기(id, p.data.text, 나.displayName || 나.username);
    return r === 'NOT_FOUND' ? 없음(reply) : r;
  });

  // HTML 은 화면 안 보기용이다 — 애플리케이션 리포트와 같이 HTML → PDF 한 길로 그린다 (§3.17 「내는 형식」)
  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>('/qa-project-reports/:id/file', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, '리포트 번호가 틀렸습니다');
    const 형식 = req.query.format;
    if (형식 !== 'PDF' && 형식 !== 'HTML' && 형식 !== 'DOCX') return 잘못(reply, 'format 은 PDF · HTML · DOCX 중 하나입니다');
    const 막음 = await 리포트문(req, reply, id, 'read');
    if (막음 !== null) return 막음;
    const 읽음 = await 프로젝트리포트읽기(id);
    if (읽음 === null) return 없음(reply);
    const f = 형식들[형식];
    const 보낸다 = (파일: Buffer | string) => reply.type(f.mime).header('content-disposition', `${f.펼침}; filename="qa-project-report-${id}.${f.ext}"`).send(파일);
    if (형식 === 'DOCX') return 보낸다(await renderProjectReportDocx(읽음.응답));
    const html = renderProjectReportHtml(읽음.응답);
    return 보낸다(형식 === 'HTML' ? html : await PDF로(html));
  });
}
