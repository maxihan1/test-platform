import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-758',
  name: '캐릭터가 없는 계정의 상세 패널을 열면 「캐릭터가 없습니다」가 보인다',
  precondition: ['계정 상세 응답은 캐릭터가 빈 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;
  const 주소 = (번호: number): string => `**/api/ops/users/${String(번호)}`;

  try {
    await test.step('운영자 계정으로 로그인하고 계정 상세 응답을 캐릭터가 빈 가짜 응답으로 바꾼다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 시험계정);
      await page.context().route(주소(계정), async (route) => {
        await route.fulfill({
          status: 200,
          json: { id: 계정, userName: 시험계정, email: 'mock@example.invalid', suspended: false, chatMuted: false, characters: [], sanctions: [] },
        });
      });
    });

    await test.step('그 계정의 상세 패널을 연다', async () => {
      await 화면.상세열기(계정);
      await verify('캐릭터가 없는 계정의 상세 패널을 열면 「캐릭터가 없습니다」가 보인다', await 화면.캐릭터없음안내.isVisible(), true);
    });
  } finally {
    if (계정 > 0) await page.context().unroute(주소(계정));
  }
});
