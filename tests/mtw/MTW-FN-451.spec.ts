import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 글상태API, 반응풀기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-451',
  name: '공개 글의 「부스트」를 누르면 그 글이 부스트된 상태로 바뀐다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 hana_photo 글 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
    글번호 = 글.id;
    await 반응풀기API(page, 글.id);
    await 상세.열기(글경로(글));
    await verify('글 상세에 부스트 아이콘이 보인다', await 상세.부스트.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 공개 글의 「부스트」를 누른다', async () => {
      const 응답 = 상세.부스트응답받기();
      await 상세.부스트.click();
      await 상세.펼침.항목(/^부스트$/).click();
      await 응답;
      await verify('공개 글의 「부스트」를 누르면 그 글이 부스트된 상태로 바뀐다', (await 글상태API(page, 글번호 ?? '')).reblogged, true);
    });

    await test.step('seoyeon_books 인용 불가 글의 부스트 메뉴를 연다', async () => {
      const 글 = await 글찾기API(page, 'seoyeon_books', '이 글은 인용할 수 없게 설정했어요.');
      await 상세.열기(글경로(글));
      await 상세.부스트.click();
      const 떴다 = await 상세.펼침.항목('인용을 비허용한 게시물').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('인용을 막은 글의 메뉴에는 「인용을 비허용한 게시물」이 보인다', 떴다, true);
    });
  } finally {
    if (글번호 !== undefined) await 반응풀기API(page, 글번호);
  }
});
