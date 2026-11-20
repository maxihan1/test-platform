import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 접속중인가, 파티에초대해맺기, 파티초대하기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 손님봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-346',
  name: '4명 파티에서 초대하면 「파티는 최대 4명입니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 · 세 · 네 번째 플레이어 봇이 4명 파티다', '일반 회원과 두 · 세 번째 플레이어 봇이 3명 파티이고 네 번째 플레이어 봇이 접속해 있다'],
  techniques: ['경계값 분석'],
  elements: ['state:파티=있음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  const 봇4 = 계정꺼내기(params.p4Id, params.p4Password, '네 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
    await 계정되돌리기(admin, 봇4);
  });
  await test.step('두 · 세 · 네 번째 플레이어 봇을 켜고 일반 회원과 두 · 세 번째 플레이어 봇을 3명 파티로 만든다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇, 봇3, 봇4]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇3.아이디), true, { blocker: true });
    await verify('네 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇4.아이디), true, { blocker: true });
    const 둘 = await 파티에초대해맺기(game, admin, 나, 봇);
    const 셋 = await 파티에초대해맺기(game, admin, 나, 봇3, '파티 3/4');
    await verify('일반 회원과 두 · 세 번째 플레이어 봇이 3명 파티다', 둘 && 셋, true, { blocker: true });
  });
  await test.step('「qa_player4」에게 「파티 초대」를 누르고 봇이 수락한다', async () => {
    await 파티초대하기(game, admin, 나, 봇4);
    const 창 = await 친구파티창.열기(game);
    await verify('파티 머리줄에 「파티 4/4」가 보인다', await 창.파티머리가될때까지('파티 4/4'), true);
  });
  await test.step('손님 봇 이름으로 「파티 초대」를 누른다', async () => {
    const 손님 = await 손님봇켜기(admin, 'qa손님346');
    const 창 = await 친구파티창.열기(game);
    await verify('일반 회원과 두 · 세 · 네 번째 플레이어 봇이 4명 파티다', await 창.파티머리가될때까지('파티 4/4'), true, { blocker: true });
    await 창.이름넣기(손님);
    await 창.파티초대누르기();
    await verify('4명 파티에서 초대하면 「파티는 최대 4명입니다」가 뜬다', await 창.hud.알림뜸('파티는 최대 4명입니다'), true);
  });
});
