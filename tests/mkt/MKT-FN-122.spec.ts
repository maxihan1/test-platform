import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의수읽기, 안정될때까지읽기 } from './helpers/home.helper.js';
import { 테스트글머리 } from './helpers/post.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-122',
  name: '문의 「등록」 을 빠르게 두 번 눌러도 내 문의 내역에는 하나만 늘어난다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의를 채우고 「등록」 을 빠르게 두 번 누른다', async () => {
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    const 전 = await 문의수읽기(page.request);
    await 문의.채우기({ 유형: '기타', 제목: `${테스트글머리} 두 번 누르기 ${Date.now().toString(36)}`, 내용: '등록을 빠르게 두 번 눌러 봅니다' });
    await 문의.등록버튼.dblclick();
    await 알림.글('문의가 등록되었습니다').waitFor();
    const 후 = await 안정될때까지읽기(() => 문의수읽기(page.request));
    await verify('문의 「등록」 을 빠르게 두 번 눌러도 내 문의 내역에는 하나만 늘어난다', { 늘어난수: 후 - 전 }, { 늘어난수: 1 });
  });
});
