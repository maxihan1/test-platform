import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기, 글자색, 장착하기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-522',
  name: '장착하면 무기 칸에 「강철 롱소드」(희귀 색) · 설명 「공격력 +12%」 · 「해제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 강철 롱소드를 장착하고 로비에 있다'],
  elements: ['item:강철 롱소드'],
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
  await test.step('일반 회원이 강철 롱소드를 장착한다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '강철 롱소드', 개수: 1 }]);
    await 장착하기(game, '강철 롱소드');
    const 가방 = await 가방창.열기(game);
    await verify('무기 칸에 「강철 롱소드」가 있다', await 가방.칸내용('무기'), '강철 롱소드', { blocker: true });
  });
  await test.step('가방 창을 연다', async () => {
    const 가방 = await 가방창.열기(game);
    const 이름 = await verify('무기 칸에 「강철 롱소드」가 보인다', await 가방.칸내용('무기'), '강철 롱소드');
    const 색 = await verify('「강철 롱소드」가 희귀 색 「#5AB8FF」다', 글자색((await 가방.칸내용색('무기')) ?? ''), '#5AB8FF');
    const 설명 = await verify('무기 칸 설명이 「공격력 +12%」다', await 가방.칸설명('무기'), '공격력 +12%');
    const 해제 = await verify('무기 칸에 「해제」가 보인다', await 가방.해제버튼있나('무기'), true);
    await verify('장착하면 무기 칸에 「강철 롱소드」(희귀 색) · 설명 「공격력 +12%」 · 「해제」가 보인다', 이름 && 색 && 설명 && 해제, true);
  });
});
