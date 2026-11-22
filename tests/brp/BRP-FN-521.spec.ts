import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-521',
  name: '가방 창 줄의 버튼을 읽으면 「사용」 버튼은 「체력 물약」 줄에만 있다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 녹슨 단검 · 조약돌 · 체력 물약이 있다'],
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

  await test.step('일반 회원 가방에 녹슨 단검 · 조약돌 · 체력 물약이 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['녹슨 단검', '조약돌']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('조약돌');
    const 이름들 = (await 가방.줄들()).map((줄) => 줄.이름).sort().join(' · ');
    await 가방.닫기();
    await verify('가방에 녹슨 단검 · 조약돌 · 체력 물약이 있다', 이름들, ['녹슨 단검', '조약돌', '체력 물약'].sort().join(' · '), { blocker: true });
  });

  await test.step('가방 창 줄의 버튼을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 단검 = await 가방.사용버튼있나('녹슨 단검');
    const 조약돌 = await 가방.사용버튼있나('조약돌');
    const 물약 = await 가방.사용버튼있나('체력 물약');
    await 가방.닫기();
    const 물약줄 = await verify('「사용」 버튼이 「체력 물약」 줄에 있다', 물약, true);
    const 무기줄 = await verify('「사용」 버튼이 무기 줄에 없다', 단검, false);
    const 전리품줄 = await verify('「사용」 버튼이 전리품 줄에 없다', 조약돌, false);
    await verify('가방 창 줄의 버튼을 읽으면 「사용」 버튼은 「체력 물약」 줄에만 있다', 물약줄 && 무기줄 && 전리품줄, true);
  });
});
