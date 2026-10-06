import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-374',
  name: 'FAQ 검색에 맞는 것이 0건이면 「검색 결과가 없습니다」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 고객 = new 고객센터화면(page);

  await test.step('고객센터 화면을 연다', async () => {
    await 안내창끄기(page);
    await 고객.열기();
    await verify('비회원이다', await 고객.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('FAQ 검색칸에 맞는 것이 없는 「zzqqxx」를 적는다', async () => {
    await 고객.검색칸.fill('zzqqxx');
    await verify('FAQ 검색에 맞는 것이 0건이면 「검색 결과가 없습니다」가 보인다', await 고객.검색결과없음.isVisible(), true);
  });

  await test.step('FAQ 검색칸을 맞는 질문이 1건인 「임시 비밀번호」로 바꾼다', async () => {
    await 고객.검색칸.fill('임시 비밀번호');
    await verify(
      'FAQ 검색에 맞는 것이 1건이면 그 질문 하나가 보이고 「검색 결과가 없습니다」는 보이지 않는다',
      [await 고객.질문들.count(), await 고객.항목마다검색어가들었나('임시 비밀번호'), await 고객.검색결과없음.isVisible()],
      [1, true, false],
    );
  });
});
