import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-149',
  name: '빠른 부스트가 꺼진 채 부스트 아이콘을 누르면 「부스트」 · 「인용」 메뉴가 뜬다',
  precondition: ['일반 회원의 빠른 부스트가 꺼져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 글 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
    await 상세.열기(글경로(글));
    await verify('글 상세에 부스트 아이콘이 보인다', await 상세.부스트.isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 글의 부스트 아이콘을 누른다', async () => {
    await 상세.부스트.click();
    const 부스트 = await 상세.펼침.항목('부스트').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 인용 = await verify('「인용」 메뉴가 보인다', await 상세.펼침.항목('인용').isVisible(), true);
    await verify('「부스트」 메뉴가 보인다', 부스트, true);
    await verify('빠른 부스트가 꺼진 채 부스트 아이콘을 누르면 「부스트」 · 「인용」 메뉴가 뜬다', 부스트 && 인용, true);
  });
});
