import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 반응풀기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 좋아요화면 } from './pages/favourites.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-466',
  name: '글에 좋아요를 누르면 좋아요 화면에 그 글이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  const 좋아요목록 = new 좋아요화면(page);
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 hana_photo 글 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
    글번호 = 글.id;
    await 반응풀기API(page, 글.id);
    await 상세.열기(글경로(글));
    await verify('글 상세에 「좋아요」가 보인다', await 상세.좋아요.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 글의 「좋아요」를 누르고 좋아요 화면을 연다', async () => {
      const 응답 = 상세.좋아요응답받기();
      await 상세.좋아요.click();
      await 응답;
      await 상세.좋아요취소.waitFor();
      await 좋아요목록.열기();
      await verify('글에 좋아요를 누르면 좋아요 화면에 그 글이 보인다', await 좋아요목록.글('4.7 의 인용').first().waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
  } finally {
    if (글번호 !== undefined) await 반응풀기API(page, 글번호);
  }
});
