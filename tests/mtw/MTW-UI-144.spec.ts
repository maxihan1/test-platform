import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-144',
  name: '게시물 상세에 게시 일시 · 공개 범위와 부스트 · 마음에 들어함 · 인용 수가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 글 상세를 연다', async () => {
    const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
    await 상세.열기(글경로(글));
    const 일시 = await verify('게시 일시가 보인다', await 상세.게시일시.isVisible(), true);
    const 범위 = await verify('공개 범위가 보인다', await 상세.공개범위아이콘.isVisible(), true);
    const 부스트 = await verify('부스트 수가 보인다', await 상세.부스트수링크.isVisible(), true);
    const 마음 = await verify('마음에 들어함 수가 보인다', await 상세.마음수링크.isVisible(), true);
    const 인용 = await verify('인용 수가 보인다', await 상세.인용수링크.isVisible(), true);
    await verify('게시물 상세에 게시 일시 · 공개 범위와 부스트 · 마음에 들어함 · 인용 수가 보인다', 일시 && 범위 && 부스트 && 마음 && 인용, true);
  });
});
