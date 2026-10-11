import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 테스트글머리 } from './helpers/post.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-127',
  name: '문의를 등록하면 폼 아래 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
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

  await test.step('유형 · 제목 · 내용을 채워 문의를 등록한다', async () => {
    const 제목 = `${테스트글머리} 등록 시험 ${Date.now().toString(36)}`;
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    await 문의.채우기({ 유형: '배송', 제목, 내용: '문의 등록 시험입니다' });
    await 문의.등록버튼.click();
    await 알림.글('문의가 등록되었습니다').waitFor();
    const 첫줄 = await 문의.내역첫줄();
    await verify(
      '문의를 등록하면 폼 아래 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다',
      { 폼아래: await 문의.내역이폼아래에있는가(), 맨위제목: 첫줄.제목, 상태: 첫줄.상태 },
      { 폼아래: true, 맨위제목: 제목, 상태: '답변 대기' },
    );
  });
});
