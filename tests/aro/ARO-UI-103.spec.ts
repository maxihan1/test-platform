import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호, 계정상세읽기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-103',
  name: '캐릭터 줄의 「재화」 칸이 「Gold <보유량>」 꼴로 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;
  let 캐릭터 = '';

  await test.step('운영자 계정으로 로그인하고 대상 계정의 캐릭터 이름을 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    계정 = await 계정번호(page, 시험계정);
    캐릭터 = (await 계정상세읽기(page, 계정)).characters[0]?.name ?? '';
  });

  await test.step('「유저 · 제재」에서 대상 계정의 캐릭터 줄을 확인한다', async () => {
    await 화면.상세열기(계정);
    await verify('캐릭터 줄이 보인다', await 화면.캐릭터칸(캐릭터, '이름').isVisible(), true, { blocker: true });
  });

  await test.step('qa_player2 캐릭터 줄의 「재화」 칸을 본다', async () => {
    const 재화 = (await 화면.캐릭터칸(캐릭터, '재화').innerText()).trim();
    await verify('캐릭터 줄의 「재화」 칸이 「Gold <보유량>」 꼴로 보인다', /^Gold \d+$/.test(재화), true);
  });
});
