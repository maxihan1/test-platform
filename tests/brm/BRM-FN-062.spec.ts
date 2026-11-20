import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 걸린실패소진, 글이뜰때까지, 시작시도, 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 실패걸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-062',
  name: '캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림이 보인다',
  platforms: ['android'],
  precondition: ['다음 캐릭터 불러오기 요청 하나가 실패하도록 걸려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('일반 회원 기준 상태로 되돌리기 · 걸어 둔 실패 소진', async () => {
    await 계정되돌리기(admin, 나);
    await 걸린실패소진(admin, 나);
  });
  const 화면 = await 로그인화면준비(game, driver);
  await test.step('다음 캐릭터 불러오기 요청 하나를 실패하도록 건다', async () => {
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await 실패걸기(admin, '/api/getplayercharacters');
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    await 시작시도(화면, 나);
    await verify('캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림이 보인다', await 글이뜰때까지(game, '캐릭터 정보를 불러오지 못했습니다', 30_000), true);
  });
});
