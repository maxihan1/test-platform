import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장비끼기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-515',
  name: '가방 창 무기 칸을 읽으면 장착한 무기 칸에 「강철 롱소드」 이름이 희귀 색 #5AB8FF 로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「강철 롱소드」를 장착했다'],
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

  await test.step('「강철 롱소드」를 장착한 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 장비끼기(game, '강철 롱소드');
    const 가방 = await 가방창.열기(game);
    await verify('무기 칸에 「강철 롱소드」가 있다', 색글떼기(await 가방.칸글('무기')).includes('강철 롱소드'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('가방 창 무기 칸을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 칸글 = await 가방.칸글('무기');
    const 설명 = await 가방.칸설명있나('무기', '공격력 +12%');
    const 해제 = await 가방.해제버튼있나('무기');
    await 가방.닫기();
    const 이름 = await verify('무기 칸에 「강철 롱소드」 이름이 보인다', 색글떼기(칸글), '강철 롱소드');
    const 색 = await verify('무기 칸 이름 색이 희귀 색 #5AB8FF 다', 가방창.글색(칸글), '#5AB8FF');
    await verify('가방 창 무기 칸을 읽으면 장착한 무기 칸에 「강철 롱소드」 이름이 희귀 색 #5AB8FF 로 보인다', 이름 && 색, true);
    const 설명봄 = await verify('장착한 무기 칸에 설명 「공격력 +12%」가 보인다', 설명, true);
    const 해제봄 = await verify('장착한 무기 칸에 「해제」 버튼이 보인다', 해제, true);
    await verify('장착한 무기 칸에 설명 「공격력 +12%」와 「해제」 버튼이 보인다', 설명봄 && 해제봄, true);
  });
});
