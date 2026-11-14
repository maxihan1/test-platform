import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-331',
  name: '「/users?id=999999」를 열면 화면에 「유저를 찾을 수 없습니다」 한 줄과 같은 글의 토스트가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    없는번호: z.number().int().min(1).describe('열어 볼 계정 번호 — 시험 서버에 없는 번호').default(999999),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('그 번호의 계정이 없는지 확인한다', async () => {
    await verify('그 번호의 계정이 없다', (await opsGet(page, `/users/${String(params.없는번호)}`)).status, 404, { blocker: true });
  });

  await test.step('「/users?id=999999」를 연다', async () => {
    await 화면.없는유저열기(params.없는번호);
    const 한줄 = await verify('화면에 「유저를 찾을 수 없습니다」 한 줄이 보인다', (await 화면.틀.본문오류.allInnerTexts()).join(', '), '유저를 찾을 수 없습니다');
    const 토스트 = await verify('같은 글의 토스트가 뜬다', await 화면.알림.뜰때까지('유저를 찾을 수 없습니다'), true);
    await verify('「/users?id=999999」를 열면 화면에 「유저를 찾을 수 없습니다」 한 줄과 같은 글의 토스트가 보인다', 한줄 && 토스트, true);
  });
});
