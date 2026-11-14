import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiGet, 몸 } from './helpers/api.helper.js';
import { 리스트지우기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 리스트만들기화면 } from './pages/list-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-976',
  name: '리스트 이름을 비우고 「만들기」를 누르면 리스트가 만들어지지 않는다',
  techniques: ['오류 추정'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 리스트만들기화면(page);
  let 이전: string[] = [];

  try {
    await test.step('일반 회원으로 로그인하고 리스트 만들기 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      이전 = (await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'))).map((리스트) => 리스트.id);
      await 화면.열기();
      await verify('리스트 만들기 화면에 「만들기」 버튼이 보인다', await 화면.만들기.isVisible(), true, { blocker: true });
    });

    await test.step('리스트 만들기 화면에서 이름을 비우고 「만들기」를 누른다', async () => {
      await 화면.만들기누르기();
      await 화면.화면다시그려질때까지();
      const 지금 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'));
      await verify('리스트 이름을 비우고 「만들기」를 누르면 리스트가 만들어지지 않는다', 지금.length, 이전.length);
    });
  } finally {
    const 지금 = await 몸<{ id: string }[]>(await apiGet(page, '/api/v1/lists'));
    await 리스트지우기API(page, 지금.map((리스트) => 리스트.id).filter((번호) => !이전.includes(번호)));
  }
});
