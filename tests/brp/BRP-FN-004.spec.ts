import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-004',
  name: '로비 제목을 읽으면 로비 왼쪽 위에 제목 「영웅을 선택하세요!」가 보인다',
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

  await test.step('로비 제목을 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 글 = await verify('로비 제목이 「영웅을 선택하세요!」다', await 로비.제목글(), '영웅을 선택하세요!');
    const 자리 = await 화면자리읽기(game, 로비화면.제목);
    const 왼쪽 = await verify('제목이 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
    const 위쪽 = await verify('제목이 화면 위쪽에 있다', 자리.세로 < 0.5, true);
    await verify('로비 제목을 읽으면 로비 왼쪽 위에 제목 「영웅을 선택하세요!」가 보인다', 글 && 왼쪽 && 위쪽, true);
  });
});
