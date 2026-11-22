import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드맞이하기, 길드세우기, 봇줄기다리기, 봇줄수, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-300',
  name: '길드 채팅을 보내고 두 봇 기록을 읽으면 「길드」 채팅은 접속 중인 같은 길드원만 받고 길드 밖 사람은 받지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원 길드에 두 번째 플레이어가 있고 세 번째 플레이어는 길드 밖으로 접속해 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    채팅글: z.string().min(1).max(30).describe('보낼 채팅 글 — 공백이 아닌 30자 이하').default('QA 채팅 시험'),
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
  const 채팅글 = params.채팅글;
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

  await test.step('두 번째 플레이어가 길드원이 된 것을 확인한다', async () => {
    const 창 = await 길드창.열기(game);
    await verify('두 번째 플레이어가 길드에 들어와 있다', await 길드맞이하기(admin, 창, 둘아이디, 내아이디, 2), true, { blocker: true });
    await 창.닫기();
  });

  await test.step('길드 채팅을 보내고 두 봇 기록을 읽는다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭고르기('길드');
    await 창.보내기(채팅글);
    const 둘받음 = await verify('두 번째 플레이어 봇 기록에 보낸 글이 있다', await 봇줄기다리기(admin, 둘아이디, 'chat', 채팅글), true);
    const 셋못받음 = await verify('길드 밖 세 번째 플레이어 봇 기록에 보낸 글이 없다', await 봇줄수(admin, 셋아이디, 'chat', 채팅글), 0);
    await verify('길드 채팅을 보내고 두 봇 기록을 읽으면 「길드」 채팅은 접속 중인 같은 길드원만 받고 길드 밖 사람은 받지 않는다', 둘받음 && 셋못받음, true);
  });
});
