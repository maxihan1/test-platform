import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇알림기다리기, 서버골드 } from './helpers/items-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-612',
  name: '3 골드짜리 조약돌을 팔면 판매가가 0 이 아니라 최소 1 골드라 골드가 1 는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 접속해 있다'],
  techniques: ['경계값 분석'],
  elements: ['flow:골드-판매', 'flow:골드-상점 구매'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 봇 = '';
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어가 봇으로 접속한다', async () => {
    봇 = await 봇켜기(admin, 둘째);
    await verify('접속자에 두 번째 플레이어 봇이 있다', (await 접속자(admin)).bots.includes(봇), true, { blocker: true });
  });
  await test.step('봇에게 조약돌을 사고 팔게 시킨다', async () => {
    await 봇기록(admin, 봇, true);
    await 봇시키기(admin, 봇, 'buy:조약돌');
    await 봇알림기다리기(admin, 봇, '조약돌 1개 구매');
    const 산뒤 = await 서버골드(admin, 둘째);
    await 봇시키기(admin, 봇, 'sell:조약돌');
    await 봇알림기다리기(admin, 봇, '조약돌 판매');
    const 판뒤 = await 서버골드(admin, 둘째);
    await verify('3 골드짜리 조약돌을 팔면 판매가가 0 이 아니라 최소 1 골드라 골드가 1 는다', 판뒤 - 산뒤, 1);
  });
});
