import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-312',
  name: '두 번째 플레이어 봇이 전체 채팅 65줄을 보낸 뒤 채팅 창 전체 탭을 끝까지 올려 읽으면 채팅 기록은 최근 60줄까지만 남아 가장 오래된 다섯 줄이 없다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
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

  await test.step('두 번째 플레이어 봇이 전체 채팅 65줄을 보낸 뒤 채팅 창 전체 탭을 끝까지 올려 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('전체');
    for (let i = 1; i <= 65; i += 1) await 봇시키기(admin, 둘아이디, 'say:QA줄' + String(i).padStart(2, '0'));
    await 창.줄기다리기((글) => 글.includes('QA줄65'), 5, 20_000);
    const 줄들 = await 창.최근줄들(80);
    const 오래된줄 = 줄들.filter((글) => ['QA줄01', 'QA줄02', 'QA줄03', 'QA줄04', 'QA줄05'].some((표시) => 글.includes(표시)));
    await verify('두 번째 플레이어 봇이 전체 채팅 65줄을 보낸 뒤 채팅 창 전체 탭을 끝까지 올려 읽으면 채팅 기록은 최근 60줄까지만 남아 가장 오래된 다섯 줄이 없다', 오래된줄.length, 0);
  });
});
