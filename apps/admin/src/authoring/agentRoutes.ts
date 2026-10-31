// 작성 에이전트가 부르는 통로 — 집기 · 단계 올리기 · 사진 올리기 · 끝내기 (SPEC 도메인/작성 §7)
// routes.ts 가 300줄을 넘어 뗐다. app.ts 가 routes.ts 와 같은 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 테스트고침댓글 } from '../bts/close.js';
import { 수정PR주소인가, 수정집기칸 } from '../bts/bugfix.js';
import { 수정끝내기틀림, 수정끝냄 } from '../bts/bugfixRoutes.js';
import { 초안다시세우기, 초안집기칸, 초안있나 } from '../bts/draft.js';
import { 집기API칸 } from './apiDoc.js';
import { 병합뒤훑기 } from '../catalog/scanRun.js';
import { 일열쇠내기 } from '../mcp/jobKey.js';
import { 노트집기칸읽기 } from '../projectNote/claim.js';
import { 남은사건있으면세우기, 앱노트사건쌓기 } from '../projectNote/events.js';
import { 자료목록 } from './assetStore.js';
import { 끝내기케이스맞나 } from './cases.js';
import { 끝내기겹침맞나, 집기겹침칸 } from './conflict-routes.js';
import { 커버리지모양검사, 커버리지칸 } from './coverage.js';
import { 행의고칠것 } from './edit.js';
import { 반영뒤저장값 } from './edit-finish.js';
import { 보류모양검사, 옮겨올입력 } from './held.js';
import { 뿌리, 뿌리잠그고 } from './history.js';
import { 머지집기칸 } from './held-routes.js';
import { 끝냈다고알림 } from './notify.js';
import { 집기대상칸 } from './reverse.js';
import { 진척검사 } from './stop.js';
import { 사용량통로 } from './usage.js';
import { 기획서밖화면세우기 } from './uncovered.js';
import { 번호 } from './params.js';
import { 서비스번호 } from './routes.js';
import { 사진통로 } from './screenshotRoutes.js';
import {
  끝내기,
  단계올리기,
  병합주소인가,
  서비스저장소,
  집기,
  집기되돌리기,
  피그마토큰,
  한건,
  type 요청,
} from './store.js';

/**
 * **맥 전용 계정인가.**
 *
 * 명세는 「집어 가는 쪽은 맥 하나다. 그래서 줄도 하나다」를 **전제로** 삼고
 * 「★ 그 계정은 `operator` 다」로 계정까지 지목하는데, **서버가 그 지목을 안 보면
 * 전제가 전제로만 남는다** (2026-09-22 보안 검토가 잡았다).
 *
 * 안 보면 이렇게 뚫린다 — 그 서비스에 배정된 **아무 `operator`** 가 집기를 두드려
 * 맥보다 먼저 집고, `finish` 에 **자기가 고른 `pr_url`** 을 실는다. 그 행은 정상 완료로 보이고,
 * `admin` 이 「이 요청을 머지할까」에 예를 누르면 **그 사람이 고른 PR 이 병합된다.**
 * **집은 쪽 대조만으로는 못 막는다** — 그것은 「A 가 집은 행에 B 가 쓰는 것」을 막을 뿐이고
 * B 는 그냥 **먼저 집으면** 된다. 경계가 아니라 경주다.
 *
 * **이름이 안 정해져 있으면 아무도 못 집는다.** `scope.ts` 의 「모르면 막는다」와 같은 방향이다 —
 * 열어 두면 위 공격이 그대로 살고, 닫아 두면 맥이 안 돌아 **그 자리에서 시끄럽게 드러난다.**
 */
function 맥계정인가(req: FastifyRequest): boolean {
  // 토큰 발급과 같은 판정을 쓴다 — 둘이 갈리면 발급할 수 있는 계정과 집을 수 있는 계정이 달라진다
  return 작성계정인가(req.user?.username ?? '');
}

/**
 * 이 행을 집은 사람이 지금 부르는 사람인가.
 *
 * **집은 쪽을 안 보면 실행 등급 누구나 남의 작업에 임의의 PR 주소를 실을 수 있다.**
 * 뒤에 운영 등급이 머지를 누르면 그 사람이 고른 PR 이 병합된다 — 사람 게이트는
 * 「이 요청을 머지할까」만 묻고 「이 주소가 그 요청이 만든 것 맞나」는 아무도 안 본다
 * (2026-09-22 검토가 잡았다).
 */
export async function 집은쪽인가(req: FastifyRequest, reply: FastifyReply): Promise<요청 | null> {
  // 집은 쪽 대조 앞에 맥 계정을 먼저 본다. 단계·사진·끝내기와 assets.ts 의 산출물 올리기가 전부 맥의 일이다
  if (!맥계정인가(req)) {
    await reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    return null;
  }
  const id = 번호((req.params as { id?: string }).id);
  if (id === null) {
    await reply.code(400).send({ error: 'BAD_ID' });
    return null;
  }
  const 행 = await 한건(id);
  if (행 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  // **서비스 경계는 문이 이미 봤다.** `auth/scope.ts` 가 이 틀을 「번호로 서비스를 찾는」 갈래로
  // 분류해 뒀고, 문이 그 행의 실제 서비스를 DB 에서 되찾아 배정과 대조한다.
  // 그래서 여기서 `?service=` 를 또 요구하지 않는다 — 명세 §7 도 이 넷에는 필수 표시가 없다
  if (행.claimedBy !== req.user?.username) {
    await reply.code(403).send({ error: 'NOT_CLAIMER' });
    return null;
  }
  return 행;
}

export default async function authoringAgentRoutes(app: FastifyInstance): Promise<void> {
  // 사진 올리기 통로와 그 본문 파서 (screenshotRoutes.ts)
  await 사진통로(app);

  app.post<{ Querystring: { service?: string } }>(
    '/authoring/requests/claim',
    async (req, reply) => {
      // 집는 쪽이 맥 하나라는 명세의 전제를 여기서 지킨다. 안 지키면 아무 operator 가 맥인 척한다
      if (!맥계정인가(req)) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });

      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 집은것 = await 집기(서비스, req.user?.username ?? '');
      // 줄이 비었으면 204 다. 맥이 폴링하므로 「없음」이 오류가 아니다
      if (집은것 === null) return reply.code(204).send();
      // 집기는 이미 커밋됐다. 아래가 던지면 맥은 번호를 모르므로 줄로 되돌려 다음 폴링이 다시 집게 한다
      try {
        // 노트 고치기 줄(그 RERUN 포함)은 애플리케이션 칸(자료 · 피그마 · 대상 · API · 겹침 · 보류)이 없다 — note 칸 하나만 싣는다 (도메인/BTS §7)
        if (집은것.projectId !== null) {
          const note = await 노트집기칸읽기({ id: 집은것.id, projectId: 집은것.projectId });
          const mcpKey = await 일열쇠내기(집은것);
          return { ...집은것, assets: [], note, ...(mcpKey === null ? {} : { mcpKey }) };
        }
        // RERUN 은 자기 자료가 없다. 원본 행의 자료는 맥이 원본 번호로 따로 읽는다
        const assets = await 자료목록(집은것.id);
        // 토큰은 피그마 자료가 있을 때만 싣는다. 필요 없는 응답에까지 비밀값을 흘리지 않는다.
        // RERUN 은 원본의 자료를 읽으므로 원본에 피그마가 있는지를 본다
        const 읽을자료 =
          집은것.kind === 'RERUN' && 집은것.sourceId !== null ? await 자료목록(집은것.sourceId) : assets;
        const 토큰 = 읽을자료.some((a) => a.kind === 'FIGMA') ? await 피그마토큰(서비스) : null;
        // 머지는 대조 칸이 없어 아래 target 이 늘 없다. 보류 입력이 있으면 3회 실행할 대상을 여기서 싣는다 (§3.6 「★ 보류 케이스」)
        const 보류칸 = 집은것.kind === 'MERGE' ? await 머지집기칸(서비스, 집은것) : {};
        // 테스트 계정도 같은 길이다 — 대조 target · 역할별 계정 accounts 만 싣고, 에이전트는 자식 환경에만 넘긴다 (§3.6 「로그인」 · 「★ 역할별 계정」)
        const 대상칸 = await 집기대상칸(서비스, 집은것, 보류칸.target?.env);
        // API 애플리케이션 작성 · 재실행은 판 원문과 API 인증을 싣는다 — 대조 행이 아니라 target 이 겹치지 않는다 (§7 「AUTHOR API 문서 판」)
        const api칸 = await 집기API칸(서비스, 집은것);
        // 고치기 실행은 자식 없이 이 목록만으로 고친다 — 키가 있는 것이 곧 고치기 실행이라는 신호다 (§3.6 「★ 케이스 고치기」)
        // 고치기 행이나 그 다시 적용만 — params.edits 가 실린 작성 행은 서버 검사를 안 거친 고침이라 경로를 안 바꾼다
        const 고치기 = 집은것.kind === 'EDIT' || (집은것.kind === 'RERUN' && 집은것.sourceId !== null && (await 한건(집은것.sourceId))?.kind === 'EDIT');
        const edits = 고치기 ? 행의고칠것(집은것.params) : null;
        const 겹침칸 = await 집기겹침칸(집은것);
        // PRD 초안은 자식이 MCP 로 노트 · 이슈를 찾을 프로젝트 번호와 맡은 이슈를 싣는다 (도메인/BTS §7 집기)
        const 초안칸 = 집은것.kind === 'PRD_DRAFT' ? { draft: await 초안집기칸(서비스, 집은것.params) } : {};
        // 수정 AI 는 맡을 때 서버가 읽어 둔 이슈 글과 대상 저장소를 싣는다 — 자식은 BTS 열쇠를 안 갖는다 (도메인/BTS 「수정 AI」)
        const 수정칸 = 집은것.kind === 'BUGFIX' ? { bugfix: 수정집기칸(집은것.params) } : {};
        // BTS 이은 프로젝트의 작성 · 그 재실행만 받는다. 자식이 일하는 동안 QA Hub 조회 도구를 쓰는 열쇠다 (도메인/BTS 「열쇠 표」).
        // 던질 수 있는 것을 다 지난 뒤에 낸다 — 앞에서 던지면 안 보낸 열쇠가 줄에 남는다
        const mcpKey = await 일열쇠내기(집은것);
        return {
          ...집은것,
          assets,
          ...(토큰 === null ? {} : { figmaToken: 토큰 }),
          ...대상칸,
          ...api칸,
          ...보류칸,
          ...겹침칸,
          ...(edits === null ? {} : { edits }),
          ...초안칸,
          ...수정칸,
          ...(mcpKey === null ? {} : { mcpKey }),
        };
      } catch (e) {
        // 되돌리기마저 던지면(DB 가 끊긴 같은 원인일 공산이 크다) 그 오류가 원래 원인을 덮는다.
        // 되돌리기 실패는 로그로 남기고 원래 오류를 낸다 — 오래된 RUNNING 을 치우는 장치는 아직 없다
        try {
          await 집기되돌리기(집은것.id, req.user?.username ?? '');
        } catch (되돌리기오류) {
          req.log.error({ err: 되돌리기오류, id: 집은것.id }, '집기 되돌리기 실패 — 행이 RUNNING 으로 남았다');
        }
        throw e;
      }
    },
  );

  app.patch<{ Querystring: { service?: string }; Params: { id: string }; Body: { stage?: unknown; progress?: unknown } }>(
    '/authoring/requests/:id/stage',
    async (req, reply) => {
      const 행 = await 집은쪽인가(req, reply);
      if (행 === null) return reply;

      const 단계 = req.body?.stage;
      if (typeof 단계 !== 'string' || 단계 === '') {
        return reply.code(400).send({ error: 'STAGE_REQUIRED' });
      }
      const 받은진척 = req.body?.progress;
      const 진척 = 받은진척 === undefined ? undefined : 진척검사(받은진척);
      if (진척 === null) return reply.code(400).send({ error: 'BAD_PROGRESS' });
      // 상태 전이 표 밖이면 409 다. 끝난 행의 단계를 올리면 화면이 끝난 것을 도는 중으로 그린다
      const 올림 = await 단계올리기(행.id, 단계, 진척);
      if (올림 === false) {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }
      return { ok: true, stop: 올림.stop };
    },
  );

  app.post<{
    Querystring: { service?: string };
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/authoring/requests/:id/finish', async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;

    const status = req.body?.status;
    if (status !== 'DONE' && status !== 'FAILED' && status !== 'STOPPED') {
      return reply.code(400).send({ error: 'BAD_STATUS', detail: String(status) });
    }
    // AGENT_LOST 는 서버만 쓴다. USER 는 사람이 실제로 멈춰 달라고 했을 때만 — 멈춘 사람을 거기서 가져온다 (§7)
    const stopReason = req.body?.stopReason;
    const 멈춤이유 = ['USER', 'TIMEOUT', 'LIMIT', 'AGENT_RESTART', 'CRASH', 'REJECTED'].find((v) => v === stopReason);
    // 올리기 거절은 까닭이 이어갈 자식에게 가는 지시다 — 비면 무엇을 고칠지 모른다 (§7 REJECTED)
    const 거절까닭있나 = 멈춤이유 !== 'REJECTED' || (typeof req.body?.error === 'string' && req.body.error !== '');
    // 머지는 멈추는 통로가 없다 — 멈춘 머지가 오면 에이전트가 규칙을 어긴 것이다
    const 이유맞나 =
      status === 'STOPPED'
        ? 행.kind !== 'MERGE' &&
          멈춤이유 !== undefined && (멈춤이유 !== 'USER' || 행.stopRequestedAt !== null) && 거절까닭있나
        : stopReason === undefined;
    if (!이유맞나) return reply.code(400).send({ error: 'BAD_STOP' });

    // ★ 맥이 보낸 주소를 그대로 믿지 않는다. 이 값이 나중에 admin 승인을 거쳐 실제로 병합된다 —
    // 다른 저장소의 PR 이거나 명령줄에 위험한 글자가 섞여 있으면 여기서 끊는다
    const prUrl = req.body?.prUrl;
    if (prUrl !== undefined) {
      // 노트 고치기는 PR 을 안 연다 — 비교할 테스트 저장소도 없다
      // 수정 AI 의 PR 은 테스트 저장소가 아니라 그 일의 대상 코드 저장소 것이다
      const 저장소 = 행.serviceId === null || 행.kind === 'BUGFIX' ? null : await 서비스저장소(행.serviceId);
      const 맞나 = 행.kind === 'BUGFIX' ? 수정PR주소인가(prUrl, 행.params) : 저장소 !== null && 병합주소인가(prUrl, 저장소);
      if (!맞나) {
        return reply.code(400).send({ error: 'BAD_PR_URL' });
      }
    }
    // 모양이 틀리면 400 — 에이전트는 이 거절을 까닭과 함께 FAILED 로 다시 보내므로 행이 도는 중으로 남지 않는다
    const 결과 = req.body?.result;
    const 결과칸 =
      typeof 결과 === 'object' && 결과 !== null
        ? (결과 as { held?: unknown; heldUnknown?: unknown; coverage?: unknown; pulled?: unknown; conflicts?: unknown; cases?: unknown })
        : {};
    const 보류 = 결과칸.held === undefined ? [] : 보류모양검사(결과칸.held);
    if (보류 === null || (결과칸.heldUnknown !== undefined && 결과칸.heldUnknown !== true)) {
      return reply.code(400).send({ error: 'BAD_HELD' });
    }
    // 셈이 틀리면 에이전트가 셈만 빼고 다시 보낸다 — 여기서 받아 버리면 칸 짝 CHECK 가 끝내기 전체를 500 으로 떨군다 (§3.6 「★ 원장」)
    const 셈 = 결과칸.coverage === undefined ? null : 커버리지모양검사(결과칸.coverage);
    if (결과칸.coverage !== undefined && 셈 === null) return reply.code(400).send({ error: 'BAD_COVERAGE' });
    if (!끝내기겹침맞나(행.kind, status, 결과칸.conflicts)) return reply.code(400).send({ error: 'BAD_CONFLICTS' });
    if (!끝내기케이스맞나(행.kind, status, 행.params, 결과칸.cases, req.query.service)) return reply.code(400).send({ error: 'BAD_CASES' });
    // PRD 초안은 결과 통로(bts/draftRoutes.ts)로 초안을 먼저 올려야 끝난다 — 빈 DONE 이면 카드가 설 자리가 없다
    if (행.kind === 'PRD_DRAFT' && status === 'DONE' && !초안있나(행.result)) return reply.code(400).send({ error: 'BAD_DRAFT', detail: 'draft' });
    // 끝내기의 result 는 저장된 result 를 덮는다 — 초안 줄은 결과 통로로만 싣는다
    if (행.kind === 'PRD_DRAFT' && req.body?.result !== undefined) return reply.code(400).send({ error: 'BAD_DRAFT', detail: 'result' });
    const 수정틀림 = 행.kind === 'BUGFIX' ? 수정끝내기틀림(행.result, status, req.body?.result) : null;
    if (수정틀림 !== null) return reply.code(400).send({ error: 'BAD_BUGFIX', detail: 수정틀림 });
    const error = req.body?.error;
    // 입력 옮기기와 끝내기를 뿌리 잠금 안의 한 UPDATE 로 — 사이에 들어온 PUT 을 덮거나, 옮기다 실패해 DONE 만 남지 않게.
    // 고치기 반영의 저장값 지우기도 같은 트랜잭션 — 지우다 실패하면 DONE 도 안 남아 에이전트가 다시 알린다
    const 뿌리번호 = (await 뿌리(행.id)) ?? 행.id;
    const 바뀌었나 = await 뿌리잠그고(뿌리번호, async (손) => {
      const 됨 = await 끝내기(
        행.id,
        {
          status,
          stopReason: 멈춤이유,
          result: req.body?.result,
          testSource: req.body?.testSource,
          prUrl: typeof prUrl === 'string' ? prUrl : undefined,
          error: typeof error === 'string' ? error : undefined,
          heldInput: status === 'DONE' ? await 옮겨올입력(행.id, 보류, 손) : null,
          coverage: 커버리지칸(셈),
        },
        손,
      );
      if (됨 && status === 'DONE' && 행.kind === 'MERGE') {
        await 반영뒤저장값(손, 행, 결과칸.pulled);
        await 기획서밖화면세우기(손, 뿌리번호);
      }
      // 노트 밖 작성이 끝나면 노트 사건 — 같은 트랜잭션이라 끝내기가 롤백되면 사건도 안 남는다 (도메인/BTS 「맥락 — 프로젝트 노트」)
      if (됨 && status === 'DONE' && 행.serviceId !== null && 행.kind !== 'PRD_DRAFT') {
        await 앱노트사건쌓기(행.serviceId, 'AUTHORING_DONE', (service) => ({ requestId: 행.id, service, kind: 행.kind, ...(typeof prUrl === 'string' && { prUrl }) }), 손);
      }
      return 됨;
    });
    // 끝난 행에 또 오면 409 다. 안 막으면 판정과 PR 주소가 덮어써진다
    if (!바뀌었나) return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    // 노트 고치기는 사람에게 알릴 작성이 아니다(작성 목록에 안 보인다). 도는 동안 들어온 사건이 남았으면 다음 노트 고치기를 세운다.
    // 에이전트가 꺼져 멈춘 줄은 AI 탓이 아니라 다시 돌려도 끝없이 돌지 않는다 — 그 줄이 받은 사건으로 바로 다시 세운다.
    // 실패 · 그 밖의 중단은 같은 사건으로 또 깨질 수 있어 다음 사건이 올 때까지 기다린다
    const 서비스 = 행.serviceId;
    if (서비스 === null) {
      if (행.projectId !== null && status === 'DONE') await 남은사건있으면세우기(행.projectId);
      if (행.projectId !== null && 멈춤이유 === 'AGENT_RESTART') await 남은사건있으면세우기(행.projectId, 행.id);
      return { ok: true };
    }
    // PRD 초안도 사람에게 알릴 작성이 아니다 — 사람은 결정 필요 「PRD 초안」 카드에서 본다(BTS-F5-04). 에이전트가 꺼져 멈췄으면 새로 세운다
    if (행.kind === 'PRD_DRAFT') {
      if (멈춤이유 === 'AGENT_RESTART') await 초안다시세우기(행.id);
      return { ok: true };
    }
    // 수정 AI 도 사람 작성 목록 · 알림 밖이다 — BTS 이슈에서 본다
    if (행.kind === 'BUGFIX') return 수정끝냄({ ...행, serviceId: 서비스 }, 멈춤이유, error, app.log);
    끝냈다고알림(행, 뿌리번호, 멈춤이유, app.log);
    // BTS 「테스트 문제」로 세운 작성이 PR 을 열었으면 그 이슈에 댓글 — 보낼 줄에 넣기만 하고 기다리지 않는다 (도메인/BTS 「판정은 BTS 에서」)
    if (status === 'DONE' && typeof prUrl === 'string' && 행.kind !== 'MERGE') {
      void 테스트고침댓글({ ...행, serviceId: 서비스 }, prUrl).catch((err: unknown) => app.log.error(`[bts] ${String(행.id)}번 테스트 고침 댓글을 못 넣었다: ${String(err)}`));
    }
    // 병합한 테스트가 「PRD 관리」 · 목록에 바로 보이게 그 서비스를 다시 훑는다 (PRD-F9-03). main 을 못 받아 왔으면 훑어도 옛 파일이다.
    // 기다리지 않는다 — 큰 서비스는 훑기가 에이전트의 30초 제한을 넘겨, 이미 끝난 보고를 다시 보내게 된다
    if (status === 'DONE' && 행.kind === 'MERGE' && 결과칸.pulled === true) void 병합뒤훑기(서비스, app.log);
    return { ok: true };
  });

  await 사용량통로(app);
}