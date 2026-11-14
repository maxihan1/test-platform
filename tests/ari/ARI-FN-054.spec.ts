import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 공지만들기, 공지삭제, 기본지급, 본문JSON, 지급하고번호, 지급회수, 캐릭터번호찾기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-054',
  name: '운영자 API 에 제목이 빈 공지를 보내면 400 과 { code, message } JSON 본문이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다', '「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, params }) => {
  await test.step('고정 운영 키로 제목이 빈 공지를 만든다', async () => {
    const 응답 = await 공지만들기(admin, { title: '', body: '빈 제목 시험', enabled: false });
    try {
      const 코드 = await verify('빈 제목 공지 응답 코드가 400 이다', 응답.status(), 400);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
      const 모양 = await verify('빈 제목 공지 본문에 code 와 message 글자가 있다', typeof 몸.code === 'string' && typeof 몸.message === 'string', true);
      await verify('운영자 API 에 제목이 빈 공지를 보내면 400 과 { code, message } JSON 본문이 돌아온다', 코드 && 모양, true);
    } finally {
      if (응답.ok()) await 공지삭제(admin, (await 본문JSON<{ id: number }>(응답)).id);
    }
  });
  await test.step('고정 운영 키로 없는 공지 번호를 수정한다', async () => {
    const 응답 = await admin.put('/opsapi/notices/2147480000', { data: { title: '[QA] 없는 공지', body: '없는 공지 시험' } });
    const 코드 = await verify('없는 공지 수정 응답 코드가 404 이다', 응답.status(), 404);
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
    const 모양 = await verify('없는 공지 수정 본문에 code 와 message 글자가 있다', typeof 몸.code === 'string' && typeof 몸.message === 'string', true);
    await verify('없는 공지 번호일 때 404 와 { code, message } JSON 본문이다', 코드 && 모양, true);
  });
  await test.step('같은 지급을 두 번 회수한다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    const 캐릭터 = await 캐릭터번호찾기(admin, 계정번호);
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-054'));
    await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
    const 첫회수 = await 지급회수(admin, 지급번호, '[QA] 첫 회수');
    await verify('첫 회수 응답 코드가 200 이다', 첫회수.status(), 200, { blocker: true });
    const 응답 = await 지급회수(admin, 지급번호, '[QA] 다시 회수');
    const 코드 = await verify('다시 회수 응답 코드가 409 이다', 응답.status(), 409);
    const 몸 = (await 응답.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
    const 모양 = await verify('다시 회수 본문에 code 와 message 글자가 있다', typeof 몸.code === 'string' && typeof 몸.message === 'string', true);
    await verify('이미 회수한 지급을 다시 회수할 때 409 와 { code, message } JSON 본문이다', 코드 && 모양, true);
  });
});
