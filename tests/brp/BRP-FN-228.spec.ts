import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-228',
  name: '판매를 한 번 누르면 1개만 팔려 「조약돌」이 「x2」에서 하나로 준다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 「조약돌」이 2개 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원 가방에 「조약돌」이 2개 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['조약돌', '조약돌']);
    const 가방 = await 가방창.열기(game);
    await 가방.개수가될때까지('조약돌', 2);
    await verify('가방에 「조약돌」이 2개 있다', (await 가방.줄찾기('조약돌'))?.개수 ?? 0, 2, { blocker: true });
    await 가방.닫기();
  });

  await test.step('「조약돌」 줄의 판매 버튼을 한 번 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.판매하기('조약돌');
    await 가방.개수가될때까지('조약돌', 1);
    const 개수 = (await 가방.줄찾기('조약돌'))?.개수 ?? 0;
    await 가방.닫기();
    await verify('판매를 한 번 누르면 1개만 팔려 「조약돌」이 「x2」에서 하나로 준다', 개수, 1);
  });
});
