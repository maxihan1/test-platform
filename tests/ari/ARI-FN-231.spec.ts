import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하고번호, 지급정리, 지급회수 } from './helpers/api.helper.js';
import { 길이글, 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-231',
  name: '회수 사유 0자로 회수하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    사유글자수1: z.number().int().describe('회수 사유 글자 수 — 1~200').default(1),
    사유글자수200: z.number().int().describe('회수 사유 글자 수 — 1~200').default(200),
    사유글자수201: z.number().int().describe('회수 사유 글자 수 — 201~300').default(201),
  }),
  expected: z.object({
    응답코드_0자: z.number().describe('회수 사유 0자으로 회수한 응답 코드').default(400),
    응답코드_1자: z.number().describe('회수 사유 1자으로 회수한 응답 코드').default(200),
    응답코드_200자: z.number().describe('회수 사유 200자으로 회수한 응답 코드').default(200),
    응답코드_201자: z.number().describe('회수 사유 201자으로 회수한 응답 코드').default(400),
    오류코드: z.string().describe('실패 응답의 code').default('INVALID'),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('회수 사유 0자로 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-231'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, '');
      회수됨 = 응답.ok();
      const 코드 = await verify('회수 사유 0자 회수 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_0자);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('회수 사유 0자 회수 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('회수 사유 0자로 회수하면 400 INVALID 다', 코드 && 오류, true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
  await test.step('회수 사유 1자로 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-231'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, 길이글(params.사유글자수1));
      회수됨 = 응답.ok();
      await verify('회수 사유 1자일 때 200 으로 회수된다', 응답.status(), expected.응답코드_1자);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
  await test.step('회수 사유 200자로 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-231'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, 길이글(params.사유글자수200));
      회수됨 = 응답.ok();
      await verify('회수 사유 200자일 때 200 으로 회수된다', 응답.status(), expected.응답코드_200자);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
  await test.step('회수 사유 201자로 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-231'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, 길이글(params.사유글자수201));
      회수됨 = 응답.ok();
      const 코드 = await verify('회수 사유 201자 회수 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_201자);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('회수 사유 201자 회수 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('회수 사유 201자일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
});
