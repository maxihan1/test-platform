import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-297',
  name: '채팅 창 탭과 접속 알림 줄을 읽으면 채팅 창 탭이 「전체」 · 「파티」 · 「길드」다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 두 번째 플레이어 봇이 접속해 있다', '일반 회원으로 로그인해 로비에 있다'],
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

  await test.step('채팅 창 탭과 접속 알림 줄을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    const 전체탭 = await verify('채팅 창 탭에 「전체」가 보인다', await 창.탭글('전체'), '전체');
    const 파티탭 = await verify('채팅 창 탭에 「파티」가 보인다', await 창.탭글('파티'), '파티');
    const 길드탭 = await verify('채팅 창 탭에 「길드」가 보인다', await 창.탭글('길드'), '길드');
    await verify('채팅 창 탭과 접속 알림 줄을 읽으면 채팅 창 탭이 「전체」 · 「파티」 · 「길드」다', 전체탭 && 파티탭 && 길드탭, true);
  });

  await test.step('두 번째 플레이어 봇을 켜고 채팅 창을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 알림줄 = await 창.줄기다리기((글) => 색글떼기(글).includes(둘아이디 + ' 님이 접속했습니다'), 10, 15_000);
    await verify('다른 사람이 접속한 뒤 그 알림이 「[알림]」 시스템 줄로 온다', 알림줄 !== null && 색글떼기(알림줄).startsWith('[알림]'), true);
  });
});
