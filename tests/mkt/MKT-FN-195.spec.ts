import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 기본본문 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자 } from './helpers/data.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-195',
  name: '「임시 저장」을 누르면 이 브라우저 저장소에 쓴 제목이 남는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 알림 = new 토스트(page);
  const 제목 = 고유글자('임시 저장 제목');

  await test.step('회원으로 로그인하고 글쓰기 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 쓰기.열기();
  });

  await test.step('회원으로 로그인해 글쓰기 화면이 열렸는지 확인한다', async () => {
    await 쓰기.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.글쓰기제목.isVisible(), true, { blocker: true });
  });

  await test.step('제목 · 본문을 적고 「임시 저장」을 누른다', async () => {
    await 쓰기.채우기({ 분류: '자유', 제목, 본문: 기본본문 });
    await 쓰기.임시저장.click();
    await 알림.아무거나뜰때까지();
    await verify('「임시 저장」을 누르면 이 브라우저 저장소에 쓴 제목이 남는다', await 쓰기.임시저장본제목읽기(), 제목);
  });
});
