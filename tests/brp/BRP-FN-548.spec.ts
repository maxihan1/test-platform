import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-548',
  name: '길드가 없으면 「아직 길드가 없습니다」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('길드 없이 길드 창을 연다', async () => {
    const 창 = await 길드창.열기(game);
    const 없음안내 = await verify('「아직 길드가 없습니다」가 보인다', (await 창.안내글읽기()).includes('아직 길드가 없습니다'), true);
    const 다음줄안내 = await verify('「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다', (await 창.안내글읽기()).includes('길드를 만들거나 길드장의 초대를 받아 보세요'), true);
    await verify('길드가 없으면 「아직 길드가 없습니다」가 보인다', 없음안내, true);
    await verify('길드가 없을 때 그 다음 줄에 「길드를 만들거나 길드장의 초대를 받아 보세요」가 보인다', 다음줄안내, true);
  });
});
