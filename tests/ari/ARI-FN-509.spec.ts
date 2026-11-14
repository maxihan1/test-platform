import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 두번째캐릭터번호, 성공이면지급정리, 아이템종류들 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-509',
  name: '아이템 5종으로 지급하면 200 이다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    아이템종수5: z.number().int().describe('지급할 아이템 종류 수 — 1~5').default(5),
    아이템종수6: z.number().int().describe('지급할 아이템 종류 수 — 6~10').default(6),
  }),
  expected: z.object({
    응답코드_5종: z.number().describe('아이템 5종 지급의 응답 코드').default(200),
    응답코드_6종: z.number().describe('아이템 6종 지급의 응답 코드').default(400),
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
  await test.step('아이템 5종으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-509', { items: 아이템종류들(params.아이템종수5) }));
    try {
      await verify('아이템 5종으로 지급하면 200 이다', 응답.status(), expected.응답코드_5종);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('아이템 6종으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-509', { items: 아이템종류들(params.아이템종수6) }));
    try {
      const 코드 = await verify('아이템 6종 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_6종);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('아이템 6종 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('아이템 6종일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
