import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-282',
  name: '틀린 토큰이 든 암호 재설정 링크를 열면 「암호 리셋 토큰이 올바르지 못하거나 기간이 만료되었습니다. 다시 요청해주세요.」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    틀린토큰: z.string().min(1).describe('암호 재설정 링크에 넣을 토큰 — 서버가 발급하지 않은 아무 글자').default('tcwrongtoken0'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 암호재설정화면(page);

  await test.step('틀린 토큰이 든 암호 재설정 링크를 연다', async () => {
    await 한국어로(page);
    await 화면.틀린토큰으로열기(params.틀린토큰);
    await verify(
      '틀린 토큰이 든 암호 재설정 링크를 열면 「암호 리셋 토큰이 올바르지 못하거나 기간이 만료되었습니다. 다시 요청해주세요.」가 보인다',
      await 화면.결과안내.filter({ hasText: '암호 리셋 토큰이 올바르지 못하거나 기간이 만료되었습니다. 다시 요청해주세요.' }).isVisible(),
      true,
    );
  });
});
