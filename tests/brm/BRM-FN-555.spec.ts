import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 내길드를떠나봇길드원으로, 로비와봇준비, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-555',
  name: '길드 창의 초대 칸을 보면 길드장 화면에는 안내 글 「초대할 캐릭터 이름」 칸과 「초대」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이다', '두 번째 플레이어 봇이 길드장이고 일반 회원이 길드원이다'],
  elements: ['state:길드=길드장', 'state:길드=길드원'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('길드를 만든 일반 회원이 로비에 들어가고 두 번째 플레이어 봇이 접속한다', async () => {
    await verify('일반 회원이 길드장이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa555', 들어옴: [] }), true, { blocker: true });
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
  });
  await test.step('길드 창의 초대 칸을 본다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 1명');
    const 안내 = await verify('초대 칸의 안내 글이 「초대할 캐릭터 이름」이다', await 길드.초대칸안내(), '초대할 캐릭터 이름');
    const 버튼 = await verify('「초대」 버튼이 보인다', await 길드.초대버튼있나(), true);
    await verify('길드 창의 초대 칸을 보면 길드장 화면에는 안내 글 「초대할 캐릭터 이름」 칸과 「초대」가 보인다', 안내 && 버튼, true);
  });
  await test.step('일반 회원이 길드를 떠나 두 번째 플레이어 봇의 길드에 길드원으로 들어간다', async () => {
    await verify('두 번째 플레이어 봇이 길드장이고 일반 회원이 길드원이다', await 내길드를떠나봇길드원으로(game, admin, 나, 봇, 'qa555봇'), true, { blocker: true });
  });
  await test.step('길드 창의 초대 칸을 찾는다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 2명');
    const 칸 = await verify('초대 칸이 보이지 않는다', await 길드.초대칸있나(), false);
    const 초대 = await verify('「초대」 버튼이 보이지 않는다', await 길드.초대버튼있나(), false);
    await verify('길드장이 아닌 길드원 화면에는 초대 칸과 「초대」가 보이지 않는다', 칸 && 초대, true);
  });
});
