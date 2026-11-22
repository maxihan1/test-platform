import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 상점에서사기, 장비끼기 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드, 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-174',
  name: '무기 칸에 장비가 있을 때 다른 무기를 장착하면 바꿔 끼워 무기 칸에 「강철 롱소드」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 「녹슨 단검」을 장착했고 가방에 「강철 롱소드」가 있다'],
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

  await test.step('「녹슨 단검」을 장착하고 가방에 「강철 롱소드」가 있는 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 장비끼기(game, '녹슨 단검');
    await 상점에서사기(game, ['강철 롱소드']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('강철 롱소드');
    const 장착 = await verify('무기 칸에 「녹슨 단검」이 있다', 색글떼기(await 가방.칸글('무기')).includes('녹슨 단검'), true, { blocker: true });
    const 보유 = await verify('가방에 「강철 롱소드」가 있다', (await 가방.줄찾기('강철 롱소드')) !== null, true, { blocker: true });
    await 가방.닫기();
    await verify('「녹슨 단검」을 장착했고 가방에 「강철 롱소드」가 있다', 장착 && 보유, true, { blocker: true });
  });

  await test.step('「강철 롱소드」 줄의 「장착」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.장착하기('강철 롱소드');
    await 가방.줄이사라질때까지('강철 롱소드');
    await 가방.줄이생길때까지('녹슨 단검');
    const 바뀜 = await verify('무기 칸에 「강철 롱소드」가 보인다', 색글떼기(await 가방.칸글('무기')).includes('강철 롱소드'), true);
    await verify('무기 칸에 장비가 있을 때 다른 무기를 장착하면 바꿔 끼워 무기 칸에 「강철 롱소드」가 보인다', 바뀜, true);
    await verify('바꿔 끼운 뒤 빠진 「녹슨 단검」이 가방 목록으로 돌아온다', await 가방.줄수('녹슨 단검'), 1);
    await 가방.닫기();
  });
});
