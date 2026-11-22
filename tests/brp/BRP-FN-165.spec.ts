import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 상점에서사기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-165',
  name: '가방 창에서 무기 · 갑옷 · 장신구를 차례로 「장착」하면 무기 · 갑옷 · 장신구는 각각 장착 칸 「무기」 · 「갑옷」 · 「장신구」에 들어간다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 체력 물약이 있다'],
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

  await test.step('가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 체력 물약이 있는 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 상점에서사기(game, ['녹슨 단검', '가죽 갑옷', '행운의 반지']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('행운의 반지');
    const 이름들 = (await 가방.줄들()).map((줄) => 줄.이름).sort().join(' · ');
    await 가방.닫기();
    const 기대 = ['녹슨 단검', '가죽 갑옷', '행운의 반지', '체력 물약'].sort().join(' · ');
    await verify('가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 체력 물약이 있다', 이름들, 기대, { blocker: true });
  });

  await test.step('가방 창에서 무기 · 갑옷 · 장신구를 차례로 「장착」한다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.장착하기('녹슨 단검');
    await 가방.칸이될때까지('무기', '녹슨 단검');
    await 가방.장착하기('가죽 갑옷');
    await 가방.칸이될때까지('갑옷', '가죽 갑옷');
    await 가방.장착하기('행운의 반지');
    await 가방.칸이될때까지('장신구', '행운의 반지');
    const 무기 = await verify('무기는 장착 칸 「무기」에 들어간다', 색글떼기(await 가방.칸글('무기')).includes('녹슨 단검'), true);
    const 갑옷 = await verify('갑옷은 장착 칸 「갑옷」에 들어간다', 색글떼기(await 가방.칸글('갑옷')).includes('가죽 갑옷'), true);
    const 장신구 = await verify('장신구는 장착 칸 「장신구」에 들어간다', 색글떼기(await 가방.칸글('장신구')).includes('행운의 반지'), true);
    await verify('가방 창에서 무기 · 갑옷 · 장신구를 차례로 「장착」하면 무기 · 갑옷 · 장신구는 각각 장착 칸 「무기」 · 「갑옷」 · 「장신구」에 들어간다', 무기 && 갑옷 && 장신구, true);
    await 가방.닫기();
  });

  await test.step('가방 창 줄의 버튼을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('물약 줄에는 「장착」 버튼이 없다', await 가방.장착버튼있나('체력 물약'), false);
    await 가방.닫기();
  });
});
