import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 길이글, 두번째캐릭터번호, 성공이면지급정리 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-226',
  name: '지급 사유 0자로 지급하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    사유글자수1: z.number().int().describe('지급 사유 글자 수 — 1~200').default(1),
    사유글자수200: z.number().int().describe('지급 사유 글자 수 — 1~200').default(200),
    사유글자수201: z.number().int().describe('지급 사유 글자 수 — 201~300').default(201),
  }),
  expected: z.object({
    응답코드_0자: z.number().describe('지급 사유 0자 지급의 응답 코드').default(400),
    응답코드_1자: z.number().describe('지급 사유 1자 지급의 응답 코드').default(200),
    응답코드_200자: z.number().describe('지급 사유 200자 지급의 응답 코드').default(200),
    응답코드_201자: z.number().describe('지급 사유 201자 지급의 응답 코드').default(400),
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
  await test.step('지급 사유 0자로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-226', { reason: '' }));
    try {
      const 코드 = await verify('지급 사유 0자 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_0자);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('지급 사유 0자 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('지급 사유 0자로 지급하면 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('지급 사유 1자로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-226', { reason: 길이글(params.사유글자수1) }));
    try {
      await verify('지급 사유 1자일 때 200 으로 지급된다', 응답.status(), expected.응답코드_1자);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('지급 사유 200자로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-226', { reason: 길이글(params.사유글자수200) }));
    try {
      await verify('지급 사유 200자일 때 200 으로 지급된다', 응답.status(), expected.응답코드_200자);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('지급 사유 201자로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-226', { reason: 길이글(params.사유글자수201) }));
    try {
      const 코드 = await verify('지급 사유 201자 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_201자);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('지급 사유 201자 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('지급 사유 201자일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
