import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 태그뗀글 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-308',
  name: '앞뒤 공백을 붙인 100자 글을 보내면 공백을 자른 100자가 그대로 채팅 줄에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '일반 회원으로 로비에 들어와 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「전체」 탭에서 앞뒤에 공백을 붙인 100자 글을 보낸다', async () => {
    const 글 = `qa100${'a'.repeat(95)}`;
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 채팅.보내기(` ${글} `);
    await 채팅.글줄뜸('qa100');
    const 보인글 = 태그뗀글(await 채팅.글있는줄원문('qa100'));
    await verify('앞뒤 공백을 붙인 100자 글을 보내면 공백을 자른 100자가 그대로 채팅 줄에 보인다', 보인글, `[전체] ${나.아이디}: ${글}`);
  });
  await test.step('채팅 입력 칸에 101자를 넣는다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.글넣기('b'.repeat(101));
    await verify('100자까지만 들어간다', (await 채팅.입력칸값()).length, 100);
  });
});
