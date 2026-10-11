import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 테스트글머리 } from './helpers/post.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-123',
  name: '제목을 50자로 적어 등록하면 내 문의 내역 맨 위에 그 문의가 보인다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 고유 = Date.now().toString(36);

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('제목을 50자로 적어 문의를 등록한다', async () => {
    const 제목 = `${테스트글머리} 제목50 ${고유} `.padEnd(50, '가').slice(0, 50);
    await 문의.열기();
    await 문의.채우기({ 유형: '주문', 제목, 내용: '제목 50자 경계 시험 문의입니다' });
    await 문의.등록버튼.click();
    await 알림.글('문의가 등록되었습니다').waitFor();
    const 첫줄 = await 문의.내역첫줄();
    await verify(
      '제목을 50자로 적어 등록하면 내 문의 내역 맨 위에 그 문의가 보인다',
      { 맨위제목: 첫줄.제목, 길이: 첫줄.제목.length },
      { 맨위제목: 제목, 길이: 50 },
    );
  });

  await test.step('내용을 1000자로 적어 문의를 등록한다', async () => {
    const 제목 = `${테스트글머리} 내용1000 ${고유}`;
    await 문의.열기();
    await 문의.채우기({ 유형: '주문', 제목, 내용: '가'.repeat(1000) });
    const 입력길이 = (await 문의.내용칸.inputValue()).length;
    await 문의.등록버튼.click();
    await 알림.글('문의가 등록되었습니다').waitFor();
    const 첫줄 = await 문의.내역첫줄();
    await verify(
      '내용을 1000자로 적어 등록하면 내 문의 내역 맨 위에 그 문의가 보인다',
      { 맨위제목: 첫줄.제목, 입력길이 },
      { 맨위제목: 제목, 입력길이: 1000 },
    );
  });
});
