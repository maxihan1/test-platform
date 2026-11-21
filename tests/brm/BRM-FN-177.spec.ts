import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄, 가방채우기, 서버개수가될때까지, 왼쪽인가 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-177',
  name: '녹슨 단검을 장착하면 가방 목록에서 빠지고 왼쪽 무기 칸에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검을 가지고 로비에 있다', '일반 회원이 녹슨 단검을 장착하고 로비에 있다'],
  elements: ['item:녹슨 단검'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 가방에 녹슨 단검을 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }]);
    await verify('운영툴 캐릭터 아이템에서 녹슨 단검이 1개다', await 서버개수가될때까지(admin, 나, '녹슨 단검', 1), 1, { blocker: true });
  });
  await test.step('가방 창에서 녹슨 단검을 장착한다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.줄버튼누르기(await 가방줄(가방, '녹슨 단검'), '장착');
    await 가방.줄이름사라질때까지('녹슨 단검');
    const 빠짐 = await verify('가방 목록에 녹슨 단검 줄이 없다', await 가방.이름줄수('녹슨 단검'), 0);
    const 칸 = await verify('무기 칸에 「녹슨 단검」이 보인다', await 가방.칸내용('무기'), '녹슨 단검');
    const 왼쪽 = await verify('무기 칸이 가방 창 왼쪽에 있다', await 왼쪽인가(game, 가방창.칸('무기'), 가방창.판), true);
    await verify('녹슨 단검을 장착하면 가방 목록에서 빠지고 왼쪽 무기 칸에 보인다', 빠짐 && 칸 && 왼쪽, true);
  });
  await test.step('가방 창의 무기 칸을 본다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('무기 칸에 「녹슨 단검」이 있다', await 가방.칸내용('무기'), '녹슨 단검', { blocker: true });
    await verify('장착 중인 녹슨 단검에는 「판매」 버튼이 보이지 않는다', await 가방.칸판매버튼있나('무기'), false);
  });
});
