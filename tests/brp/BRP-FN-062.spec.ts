import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 실패걸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-062',
  name: '캐릭터 불러오기에 실패하면 오류 알림 「캐릭터 정보를 불러오지 못했습니다」가 보인다',
  platforms: ['windows'],
  precondition: ['다음 캐릭터 불러오기 요청 한 번이 실패하게 걸어 두었다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('다음 캐릭터 불러오기 요청 한 번이 실패하게 건다', async () => {
    await 실패걸기(admin, '/api/getplayercharacters');
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    const 알림 = new 알림띠(game);
    await verify('캐릭터 불러오기에 실패하면 오류 알림 「캐릭터 정보를 불러오지 못했습니다」가 보인다', await 알림.뜰때까지('캐릭터 정보를 불러오지 못했습니다', 30_000), true);
  });
});
