import { defineCase, test, verify } from '@platform/kit';

import { 글경로 } from './helpers/api.helper.js';
import { 비회원글찾기API } from './helpers/status-api.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-436',
  name: '비회원이 공개 글 상세를 열면 본문이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 글상세화면(page);
  let 공개경로 = '';
  let 조용한경로 = '';

  await test.step('비회원으로 열 공개 글과 조용한 공개 글을 찾는다', async () => {
    await 한국어로(page);
    공개경로 = 글경로(await 비회원글찾기API(page, 'hana_photo', '4.7 의 인용'));
    조용한경로 = 글경로(await 비회원글찾기API(page, 'seoyeon_books', '조용한 공개로 올리는 독서 메모'));
    await verify('찾은 글의 주소가 있다', 공개경로.length > 0 && 조용한경로.length > 0, true, { blocker: true });
  });

  await test.step('비회원으로 hana_photo 공개 글 상세를 연다', async () => {
    await verify('비회원이 공개 글 상세를 열면 본문이 보인다', await 상세.열고본문기다리기(공개경로, '4.7 의 인용'), true);
  });

  await test.step('비회원으로 seoyeon_books 조용한 공개 글 상세를 연다', async () => {
    await verify('조용한 공개 글 상세도 비회원에게 본문이 보인다', await 상세.열고본문기다리기(조용한경로, '조용한 공개로 올리는 독서 메모'), true);
  });
});
