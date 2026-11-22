import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색글떼기 } from './helpers/gm.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-495',
  name: '로비 접속 인원 글을 읽으면 로비에 접속 인원이 「명 접속 중」 꼴로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비 접속 인원 글을 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 글 = 색글떼기(await 로비.인원글읽기());
    await verify('로비 접속 인원 글을 읽으면 로비에 접속 인원이 「명 접속 중」 꼴로 보인다', 글.includes('명 접속 중'), true);
  });
});
