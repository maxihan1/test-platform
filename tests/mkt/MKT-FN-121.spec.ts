import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-121',
  name: '1:1 문의를 비운 채 「등록」 을 누르면 문의가 등록되지 않고 안내가 보인다',
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

  await test.step('1:1 문의 화면에서 아무것도 넣지 않고 「등록」 을 누른다', async () => {
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    const 전 = await 문의.내역줄들.count();
    await 문의.등록하고응답기다리기();
    await 알림.모두.first().waitFor();
    await verify(
      '1:1 문의를 비운 채 「등록」 을 누르면 문의가 등록되지 않고 안내가 보인다',
      { 늘어난수: (await 문의.내역줄들.count()) - 전, 안내: await 알림.모두.first().innerText() },
      { 늘어난수: 0, 안내: '문의 유형을 선택하세요' },
    );
  });
});
