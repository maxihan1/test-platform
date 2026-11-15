import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급정리, 지급하고번호 } from './helpers/api.helper.js';
import { 서버토큰, 아이템저장글들, 첨부번호글들 } from './helpers/data.helper.js';
import { 우편저장글읽기, 지급우편번호 } from './helpers/grant-mail.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-206',
  name: '재화를 지급하면 우편 첨부에 System Currency Loot Item 이 들어 있다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    재화아이템: z.string().describe('재화 첨부 아이템 이름').default('System Currency Loot Item'),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  let 토큰 = '';
  let 캐릭터 = 0;
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터에게 골드를 지급한 뒤 그 우편의 첨부 아이템 인스턴스를 읽는다', async () => {
    let 지급번호 = 0;
    try {
      지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-206', { items: [], currencyAmount: 100 }));
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 우편번호 = await 지급우편번호(admin, 지급번호);
      await verify('지급 우편을 찾았다', 우편번호 > 0, true, { blocker: true });
      const 번호글들 = 첨부번호글들(await 우편저장글읽기(request, 토큰, 우편번호));
      await verify('지급 우편에 첨부가 있다', 번호글들.length > 0, true, { blocker: true });
      const 저장글들 = await 아이템저장글들(request, 토큰, 번호글들);
      await verify('첨부 아이템 인스턴스를 읽었다', 저장글들.length > 0, true, { blocker: true });
      await verify('재화를 지급하면 우편 첨부에 System Currency Loot Item 이 들어 있다', 저장글들.some((글) => 글.includes(expected.재화아이템)), true);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
