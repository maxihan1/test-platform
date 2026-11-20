import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기, 장착하기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-186',
  name: '무기 칸의 「해제」를 누르면 녹슨 단검이 가방 목록으로 돌아간다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검을 장착하고 로비에 있다'],
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
  await test.step('일반 회원이 녹슨 단검을 장착한다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }]);
    await 장착하기(game, '녹슨 단검');
    const 가방 = await 가방창.열기(game);
    await verify('무기 칸에 「녹슨 단검」이 있다', await 가방.칸내용('무기'), '녹슨 단검', { blocker: true });
  });
  await test.step('가방 창 무기 칸의 「해제」를 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.해제누르기('무기');
    await 가방.줄이름뜰때까지('녹슨 단검');
    const 목록 = await verify('가방 목록에 녹슨 단검 줄이 하나 있다', await 가방.이름줄수('녹슨 단검'), 1);
    const 칸 = await verify('무기 칸이 「비어 있음」이다', await 가방.칸내용('무기'), '비어 있음');
    await verify('무기 칸의 「해제」를 누르면 녹슨 단검이 가방 목록으로 돌아간다', 목록 && 칸, true);
  });
});
