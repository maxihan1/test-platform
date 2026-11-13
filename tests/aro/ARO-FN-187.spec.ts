import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정목록 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-187',
  name: '숫자 검색어 「2」를 적으면 계정 번호 2 인 qa_player2 줄이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    검색번호: z.number().int().min(1).describe('검색어로 적을 계정 번호 — 시험 서버에 있는 계정 번호').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 기대아이디 = '';

  await test.step('운영자 계정으로 로그인하고 그 번호의 계정 아이디를 읽어 둔다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    기대아이디 = (await 계정목록(page)).items.find((u) => u.id === params.검색번호)?.userName ?? '';
  });

  await test.step('「유저 · 제재」 화면을 열어 유저 표를 확인한다', async () => {
    await 화면.열기();
    await verify('검색할 번호의 계정이 있다', 기대아이디 !== '', true, { blocker: true });
  });

  await test.step('유저 검색 칸에 숫자 「2」를 적는다', async () => {
    await 화면.검색(String(params.검색번호));
    const 보이는아이디 = (await 화면.아이디칸들.allInnerTexts()).map((x) => x.trim());
    await verify('숫자 검색어 「2」를 적으면 계정 번호 2 인 qa_player2 줄이 보인다', 보이는아이디.includes(기대아이디), true);
  });
});
