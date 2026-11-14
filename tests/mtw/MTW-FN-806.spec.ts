import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계API, 긴글, 메모바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-806',
  name: 'news_bot 개인 메모에 2,000자를 넣으면 저장된다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 대상id = '';

  try {
    await test.step('일반 회원으로 로그인하고 news_bot 프로필을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      대상id = (await 계정찾기API(page, 'news_bot')).id;
      await 메모바꾸기API(page, 대상id, '');
      await 프로필.열기('news_bot');
      await 프로필.버튼그려질때까지();
      await 프로필.메모열기();
      await verify('개인 메모 창에 메모 칸이 보인다', await 프로필.메모칸.isVisible(), true, { blocker: true });
    });

    await test.step('news_bot 프로필 개인 메모에 2,000자를 넣고 저장한다', async () => {
      await 프로필.메모칸.fill(긴글(2000));
      await 프로필.메모저장누르기();
      await verify('news_bot 개인 메모에 2,000자를 넣으면 저장된다', (await 관계API(page, 대상id)).note.length, 2000);
    });

    await test.step('news_bot 프로필 개인 메모에 2,001자를 넣고 저장한다', async () => {
      await 프로필.열기('news_bot');
      await 프로필.버튼그려질때까지();
      await 프로필.메모열기();
      await 프로필.메모칸.fill(긴글(2001));
      await 프로필.메모저장누르기();
      await verify('news_bot 개인 메모 2,001자는 저장되지 않는다', (await 관계API(page, 대상id)).note.length === 2001, false);
    });
  } finally {
    if (대상id !== '') await 메모바꾸기API(page, 대상id, '');
  }
});
