import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드맞이하기, 길드세우기, 길드창다시열기, 봇줄기다리기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-384',
  name: '길드장이 「추방」을 누르면 확인 창 없이 그 사람이 길드에서 빠져 길드원 줄이 사라진다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장이고 두 번째 · 세 번째 플레이어가 길드원이다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 셋아이디 = params.p3Id ?? '';
  const 셋비밀번호 = params.p3Password ?? '';
  const 길드이름 = params.길드이름;
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
    await 창?.닫기();
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어가 길드원이 된 것을 확인한다', async () => {
    const 창 = await 길드창.열기(game);
    await verify('두 번째 플레이어가 길드에 들어와 있다', await 길드맞이하기(admin, 창, 둘아이디, 내아이디, 2), true, { blocker: true });
    await verify('세 번째 플레이어가 길드에 들어와 있다', await 길드맞이하기(admin, 창, 셋아이디, 내아이디, 3), true, { blocker: true });
    await 창.닫기();
  });

  await test.step('두 번째 플레이어 줄의 「추방」을 누른다', async () => {
    const 창 = await 길드창다시열기(game);
    const 번호 = 창.길드원줄번호(await 창.길드원줄들(), 둘아이디);
    await 창.추방누르기(번호);
    await verify('길드장이 「추방」을 누르면 확인 창 없이 그 사람이 길드에서 빠져 길드원 줄이 사라진다', (await 창.길드원줄기다리기((줄들) => 창.길드원줄번호(줄들, 둘아이디) < 0)) !== null, true);
  });

  await test.step('두 번째 플레이어 줄의 「추방」을 누르고 세 번째 플레이어 봇 기록을 읽는다', async () => {
    await verify('추방한 뒤 남은 길드원에게 「님이 길드를 떠났습니다」 알림이 간다', await 봇줄기다리기(admin, 셋아이디, 'toast', '님이 길드를 떠났습니다'), true);
  });
});
