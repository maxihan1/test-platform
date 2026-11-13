import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 본문JSON, 지급하고번호, 지급정리, 지급회수 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-227',
  name: '안 가져간 지급을 회수하면 recalled · partlyRecalled · alreadyTaken 우편 수가 돌아온다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    회수사유: z.string().min(1).describe('회수 사유 — 1~200자').default('[QA] ARI-FN-227 회수 시험'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('지급한 건을 사유를 적어 회수한다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-227'));
    let 회수됨 = false;
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 응답 = await 지급회수(admin, 지급번호, params.회수사유);
      회수됨 = 응답.ok();
      const 코드 = await verify('회수 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 몸 = await 본문JSON<Record<string, unknown>>(응답).catch(() => ({}) as Record<string, unknown>);
      const 통째 = await verify('응답 recalled 가 0 이상의 정수다', typeof 몸.recalled === 'number' && Number.isInteger(몸.recalled) && 몸.recalled >= 0, true);
      const 일부 = await verify('응답 partlyRecalled 가 0 이상의 정수다', typeof 몸.partlyRecalled === 'number' && Number.isInteger(몸.partlyRecalled) && 몸.partlyRecalled >= 0, true);
      const 이미 = await verify('응답 alreadyTaken 이 0 이상의 정수다', typeof 몸.alreadyTaken === 'number' && Number.isInteger(몸.alreadyTaken) && 몸.alreadyTaken >= 0, true);
      await verify('안 가져간 지급을 회수하면 recalled · partlyRecalled · alreadyTaken 우편 수가 돌아온다', 코드 && 통째 && 일부 && 이미, true);
    } finally {
      if (!회수됨) await 지급정리(admin, 지급번호);
    }
  });
});
