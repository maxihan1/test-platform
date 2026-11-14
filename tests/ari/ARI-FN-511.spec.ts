import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급하기 } from './helpers/api.helper.js';
import { 두번째캐릭터번호, 성공이면지급정리 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-511',
  name: '재화 -1 로 지급하면 400 INVALID 다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    재화음수: z.number().int().describe('지급할 재화 — -1 이하').default(-1),
    재화최대: z.number().int().describe('지급할 재화 — 1~1000000').default(1000000),
    재화초과: z.number().int().describe('지급할 재화 — 1000001 이상').default(1000001),
  }),
  expected: z.object({
    응답코드_재화음수: z.number().describe('재화 -1 지급의 응답 코드').default(400),
    응답코드_재화0: z.number().describe('재화 0 지급의 응답 코드').default(200),
    응답코드_재화최대: z.number().describe('재화 1,000,000 지급의 응답 코드').default(200),
    응답코드_재화초과: z.number().describe('재화 1,000,001 지급의 응답 코드').default(400),
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
  await test.step('재화 -1 로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-511', { currencyAmount: params.재화음수 }));
    try {
      const 코드 = await verify('재화 -1 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_재화음수);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('재화 -1 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('재화 -1 로 지급하면 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('아이템 하나와 재화 0 으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-511', { items: [{ itemName: '체력 물약', quantity: 1 }], currencyAmount: 0 }));
    try {
      await verify('재화 0 에 아이템이 하나 있을 때 200 으로 지급된다', 응답.status(), expected.응답코드_재화0);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('재화 1,000,000 으로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-511', { currencyAmount: params.재화최대 }));
    try {
      await verify('재화 1,000,000 일 때 200 으로 지급된다', 응답.status(), expected.응답코드_재화최대);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
  await test.step('재화 1,000,001 로 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-511', { currencyAmount: params.재화초과 }));
    try {
      const 코드 = await verify('재화 1,000,001 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드_재화초과);
      const 몸 = (await 응답.json().catch(() => ({}))) as { code?: string; message?: string };
      const 오류 = await verify('재화 1,000,001 지급 응답 code 가 기대 결과와 같다', 몸.code ?? '', expected.오류코드);
      await verify('재화 1,000,001 일 때 400 INVALID 다', 코드 && 오류, true);
    } finally {
      await 성공이면지급정리(admin, 응답);
    }
  });
});
