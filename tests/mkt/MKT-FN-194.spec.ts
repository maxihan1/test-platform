import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { png만들기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-194',
  name: '미리보기의 X 를 누르면 그 미리보기가 사라진다',
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

  await test.step('회원으로 로그인하고 글쓰기 화면을 열어 이미지를 한 장 첨부한다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 쓰기.열기();
    await 쓰기.이미지붙이기([{ name: '한장.png', mimeType: 'image/png', buffer: png만들기() }]);
  });

  await test.step('로그인한 글쓰기 화면에 이미지 미리보기가 하나 있는지 확인한다', async () => {
    await 쓰기.머리글.로그인꼴일때까지();
    await 쓰기.미리보기들.first().waitFor();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('이미지 미리보기가 하나 보인다', await 쓰기.미리보기들.count(), 1, { blocker: true });
  });

  await test.step('이미지 미리보기의 X 를 누른다', async () => {
    await 쓰기.이미지빼기.click();
    await verify('미리보기의 X 를 누르면 그 미리보기가 사라진다', await 쓰기.미리보기들.count(), 0);
  });
});
