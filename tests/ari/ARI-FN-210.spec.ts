import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 같은번호들, 두번째캐릭터번호, 성공이면지급정리 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-210',
  name: '받는 캐릭터 0명으로 지급하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    번호개수50: z.number().int().describe('같은 캐릭터 번호를 넣는 개수 — 1~50').default(50),
    번호개수51: z.number().int().describe('같은 캐릭터 번호를 넣는 개수 — 51~100').default(51),
  }),
  expected: z.object({
    응답코드_0명: z.number().describe('받는 캐릭터 0명 지급의 응답 코드').default(400),
    응답코드_1명: z.number().describe('받는 캐릭터 1명 지급의 응답 코드').default(200),
    응답코드_50개: z.number().describe('캐릭터 번호 50개 지급의 응답 코드').default(200),
    응답코드_51개: z.number().describe('캐릭터 번호 51개 지급의 응답 코드').default(400),
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
  await test.step('받는 캐릭터 0명으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-210', { characterIds: [] }));
    try {
      const 코드 = await verify('받는 캐릭터 0명 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_0명);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('받는 캐릭터 0명 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('받는 캐릭터 0명으로 지급하면 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('받는 캐릭터 1명으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-210', { characterIds: [캐릭터] }));
    try {
      await verify('받는 캐릭터 1명일 때 200 으로 지급된다', 응답.status(), expected.응답코드_1명);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('같은 캐릭터 번호 50개로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-210', { characterIds: 같은번호들(캐릭터, params.번호개수50) }));
    try {
      await verify('받는 캐릭터 번호 50개일 때 200 으로 지급된다', 응답.status(), expected.응답코드_50개);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('같은 캐릭터 번호 51개로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-210', { characterIds: 같은번호들(캐릭터, params.번호개수51) }));
    try {
      const 코드 = await verify('캐릭터 번호 51개 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_51개);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('캐릭터 번호 51개 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('받는 캐릭터 번호 51개일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
