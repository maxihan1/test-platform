import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 두번째캐릭터번호, 성공이면지급정리 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-510',
  name: '수량 0 으로 지급하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    수량0: z.number().int().describe('아이템 수량 — 0 이하').default(0),
    수량1: z.number().int().describe('아이템 수량 — 1~99').default(1),
    수량99: z.number().int().describe('아이템 수량 — 1~99').default(99),
    수량100: z.number().int().describe('아이템 수량 — 100 이상').default(100),
  }),
  expected: z.object({
    응답코드_수량0: z.number().describe('수량 0 지급의 응답 코드').default(400),
    응답코드_수량1: z.number().describe('수량 1 지급의 응답 코드').default(200),
    응답코드_수량99: z.number().describe('수량 99 지급의 응답 코드').default(200),
    응답코드_수량100: z.number().describe('수량 100 지급의 응답 코드').default(400),
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
  await test.step('수량 0 으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-510', { items: [{ itemName: '체력 물약', quantity: params.수량0 }] }));
    try {
      const 코드 = await verify('수량 0 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_수량0);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('수량 0 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('수량 0 으로 지급하면 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('수량 1 로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-510', { items: [{ itemName: '체력 물약', quantity: params.수량1 }] }));
    try {
      await verify('수량 1 일 때 200 으로 지급된다', 응답.status(), expected.응답코드_수량1);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('수량 99 로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-510', { items: [{ itemName: '체력 물약', quantity: params.수량99 }] }));
    try {
      await verify('수량 99 일 때 200 으로 지급된다', 응답.status(), expected.응답코드_수량99);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('수량 100 으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-510', { items: [{ itemName: '체력 물약', quantity: params.수량100 }] }));
    try {
      const 코드 = await verify('수량 100 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_수량100);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('수량 100 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('수량 100 일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
