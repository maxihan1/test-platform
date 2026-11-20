import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비제목글, 로비제목자리 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-004',
  name: '로비에 들어오면 왼쪽 위 제목에 「영웅을 선택하세요!」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비', 'zone:CharSelect'],
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
    await 로비로(game, driver, 나);
    const 보임 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('로비 화면이 보인다', 보임, true, { blocker: true });
  });
  await test.step('로비 왼쪽 위 제목을 확인한다', async () => {
    const 글 = await verify('제목이 「영웅을 선택하세요!」다', await 로비제목글(game), '영웅을 선택하세요!');
    const 자리 = await 로비제목자리(game);
    const 가로 = await verify('제목이 화면 왼쪽에 있다', 자리?.가로 ?? null, '왼쪽');
    const 세로 = await verify('제목이 화면 위쪽에 있다', 자리?.세로 ?? null, '위');
    await verify('로비에 들어오면 왼쪽 위 제목에 「영웅을 선택하세요!」가 보인다', 글 && 가로 && 세로, true);
  });
});
