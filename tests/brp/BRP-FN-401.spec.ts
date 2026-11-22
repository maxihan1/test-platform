import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇길드만들기, 봇이초대하기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-401',
  name: '두 번째 플레이어 봇이 친구 신청 · 파티 초대를 차례로 보내면 초대 창 제목이 받은 초대에 따라 「친구 신청」 · 「파티 초대」로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 친구 · 파티 · 길드 없이 접속해 있다', '두 번째 플레이어가 길드장인 길드가 있고 일반 회원은 길드가 없다'],
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

  await test.step('두 번째 플레이어 봇이 친구 신청 · 파티 초대를 차례로 보낸다', async () => {
    await 봇이초대하기(admin, 'friend', 둘아이디, 내아이디);
    const 친구초대 = await 초대창.뜰때까지(game);
    await verify('초대 창이 뜬다', 친구초대 !== null, true, { blocker: true });
    const 친구제목 = await verify('초대 창 제목이 「친구 신청」이다', (await 친구초대?.제목있나('친구 신청')) === true, true);
    await 친구초대?.거절누르기();
    await 친구초대?.닫힐때까지();
    await 봇이초대하기(admin, 'party', 둘아이디, 내아이디);
    const 파티초대 = await 초대창.뜰때까지(game);
    await verify('초대 창이 뜬다', 파티초대 !== null, true, { blocker: true });
    const 파티제목 = await verify('초대 창 제목이 「파티 초대」이다', (await 파티초대?.제목있나('파티 초대')) === true, true);
    await verify('두 번째 플레이어 봇이 친구 신청 · 파티 초대를 차례로 보내면 초대 창 제목이 받은 초대에 따라 「친구 신청」 · 「파티 초대」로 보인다', 친구제목 && 파티제목, true);
    await 파티초대?.거절누르기();
    await 파티초대?.닫힐때까지();
  });

  await test.step('두 번째 플레이어 봇이 길드 초대를 보낸다', async () => {
    await verify('두 번째 플레이어 봇이 길드장인 길드가 있다', await 봇길드만들기(admin, 둘아이디, 길드이름), true, { blocker: true });
    await 봇이초대하기(admin, 'guild', 둘아이디, 내아이디);
    const 길드초대 = await 초대창.뜰때까지(game);
    await verify('초대 창이 뜬다', 길드초대 !== null, true, { blocker: true });
    const 길드제목 = await verify('초대 창 제목이 「길드 초대」이다', (await 길드초대?.제목있나('길드 초대')) === true, true);
    const 수락보임 = await verify('초대 창에 「수락」 버튼이 보인다', (await 길드초대?.수락보임()) === true, true);
    const 거절보임 = await verify('초대 창에 「거절」 버튼이 보인다', (await 길드초대?.거절보임()) === true, true);
    await verify('길드 초대 창 제목은 「길드 초대」이고 버튼은 「수락」 · 「거절」이다', 길드제목 && 수락보임 && 거절보임, true);
  });
});
