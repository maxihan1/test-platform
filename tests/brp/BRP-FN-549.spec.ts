import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드세우기, 길드원으로들어가기, 길드창다시열기, 봇길드만들기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-549',
  name: '길드 창을 열면 길드장 화면에는 안내 글 「초대할 캐릭터 이름」 칸과 「초대」 버튼이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있다', '두 번째 플레이어가 길드장인 길드에 일반 회원이 길드원이다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
  });

  await test.step('길드 창을 연다', async () => {
    const 창 = await 길드창.열기(game);
    const 칸안내 = await verify('초대 칸 안내 글이 「초대할 캐릭터 이름」이다', await 창.초대칸안내글(), '초대할 캐릭터 이름');
    const 버튼보임 = await verify('「초대」 버튼이 보인다', await 창.초대버튼있나(), true);
    await verify('길드 창을 열면 길드장 화면에는 안내 글 「초대할 캐릭터 이름」 칸과 「초대」 버튼이 보인다', 칸안내 && 버튼보임, true);
  });

  await test.step('길드장이 아닌 사람으로 길드 창을 연다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.탈퇴();
    await verify('두 번째 플레이어 봇이 길드장인 길드가 있다', await 봇길드만들기(admin, 둘아이디, 길드이름), true, { blocker: true });
    await verify('일반 회원이 길드원이다', await 길드원으로들어가기(admin, game, 둘아이디, 내아이디), true, { blocker: true });
    const 새창 = await 길드창다시열기(game);
    const 칸없음 = await verify('초대 칸이 보이지 않는다', await 새창.초대칸있나(), false);
    const 버튼없음 = await verify('「초대」 버튼이 보이지 않는다', await 새창.초대버튼있나(), false);
    await verify('길드장이 아닌 사람 화면에는 초대 칸과 「초대」 버튼이 보이지 않는다', 칸없음 && 버튼없음, true);
  });
});
