import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 캐릭터의계정아이디 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-199',
  name: '캐릭터 이름으로 찾으면 그 캐릭터의 계정이 한 줄로 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    캐릭터이름: z.string().min(1).describe('찾을 캐릭터 이름 — 시험 서버에 있는 캐릭터').default('qa_player2'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정아이디 = '';

  await test.step('운영자 계정으로 로그인하고 그 캐릭터의 계정을 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    계정아이디 = await 캐릭터의계정아이디(page, params.캐릭터이름);
  });

  await test.step('「유저 · 제재」 화면을 열어 유저 표를 확인한다', async () => {
    await 화면.열기();
    await verify('유저 표가 보인다', await 화면.유저표.isVisible(), true, { blocker: true });
  });

  await test.step('유저 검색 칸에 캐릭터 이름 「qa_player2」를 적는다', async () => {
    await 화면.검색(params.캐릭터이름);
    const 보이는아이디 = (await 화면.아이디칸들.allInnerTexts()).map((x) => x.trim()).join(', ');
    await verify('캐릭터 이름으로 찾으면 그 캐릭터의 계정이 한 줄로 보인다', 보이는아이디, 계정아이디);
  });
});
