import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드원으로들어가기, 길드창다시열기, 봇길드만들기, 봇을길드로맞이하기, 소셜정리, 초록점인가 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇끄기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-551',
  name: '길드원 목록 차례를 읽으면 길드원 목록은 길드장이 맨 위이고 그다음에 접속 중인 사람이 온다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드원이고 두 번째 플레이어가 길드장 · 세 번째 플레이어가 길드원인 길드에 세 번째 플레이어만 접속해 있다'],
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

  await test.step('두 번째 플레이어가 길드장인 길드에 세 번째 플레이어와 일반 회원이 길드원이고 두 번째 플레이어만 접속을 끊은 것을 확인한다', async () => {
    await verify('두 번째 플레이어 봇이 길드를 만들었다', await 봇길드만들기(admin, 둘아이디, 길드이름), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 길드에 들어와 있다', await 봇을길드로맞이하기(admin, 둘아이디, 셋아이디), true, { blocker: true });
    await verify('일반 회원이 길드원이다', await 길드원으로들어가기(admin, game, 둘아이디, 내아이디), true, { blocker: true });
    await 봇끄기(admin, 둘아이디);
    const 창 = await 길드창다시열기(game);
    await verify('길드원 줄이 셋 보인다', (await 창.길드원줄기다리기((줄들) => 줄들.length >= 3)) !== null, true, { blocker: true });
  });

  await test.step('길드원 목록 차례를 읽는다', async () => {
    const 창 = await 길드창다시열기(game);
    const 줄들 = await 창.길드원줄들();
    const 길드장맨위 = await verify('길드원 목록 맨 위가 길드장이다', 색글떼기(줄들[0] ?? '').includes('[길드장]'), true);
    const 다음접속중 = await verify('길드장 다음 줄이 접속 중인 사람이다', 초록점인가(줄들[1] ?? ''), true);
    await verify('길드원 목록 차례를 읽으면 길드원 목록은 길드장이 맨 위이고 그다음에 접속 중인 사람이 온다', 길드장맨위 && 다음접속중, true);
  });
});
