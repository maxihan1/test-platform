import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇에게갖추기, 봇에게시키고알림보기 } from './helpers/items-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-244',
  name: '장착 중인 녹슨 단검 판매를 요청하면 「장착 중인 아이템은 팔 수 없습니다」 오류 알림이 온다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 녹슨 단검을 장착한 봇으로 접속해 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['item:녹슨 단검'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 봇 = '';
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어가 녹슨 단검을 장착한 봇으로 접속한다', async () => {
    봇 = await 봇에게갖추기(game, driver, admin, 둘째, { 아이템: [{ 이름: '녹슨 단검', 개수: 1 }], 장착: ['녹슨 단검'] });
    await verify('접속자에 두 번째 플레이어 봇이 있다', (await 접속자(admin)).bots.includes(봇), true, { blocker: true });
  });
  await test.step('봇에게 녹슨 단검 판매를 시킨다', async () => {
    await verify('장착 중인 녹슨 단검 판매를 요청하면 「장착 중인 아이템은 팔 수 없습니다」 오류 알림이 온다', await 봇에게시키고알림보기(admin, 봇, 'sell:녹슨 단검', '장착 중인 아이템은 팔 수 없습니다'), true);
  });
});
