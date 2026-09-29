import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-027',
  name: '내가 쓴 글 상세에 「수정」 링크와 「삭제」 버튼이 보인다',
  precondition: ['내가 쓴 글이 있고 그 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    myPostPath: z.string().min(1).describe('그 회원이 쓴 게시글 상세 주소').default('/board/48'),
  }),
  expected: z.object({
    editVisible: z.boolean().describe('「수정」이 보일지 여부').default(true),
    deleteVisible: z.boolean().describe('「삭제」가 보일지 여부').default(true),
  }),
  unconfirmed: '기획서는 「수정」·「삭제」를 둘 다 버튼이라 적었는데 화면의 「수정」은 링크다 — 차이 D2 (작성 요청 5877)',
});

test(spec, async ({ page, params, expected }) => {
  await test.step('테스트 계정으로 로그인하고 내가 쓴 글 상세를 연다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    await page.goto(params.myPostPath);
    await page.getByRole('button', { name: /좋아요/ }).waitFor();
  });

  await test.step('상세 글의 작성자가 로그인한 회원인지 확인한다', async () => {
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    const 작성자 =(await page.getByText(/^작성자 /).innerText()).replace(/^작성자\s*/, '').trim();
    const 인사 = (await page.getByRole('banner').getByText(/님$/).innerText()).replace(/님$/, '').trim();
    await verify('상세 글의 작성자가 머리글 인사 문구의 이름과 같다', 작성자, 인사, { blocker: true });
  });

  await test.step('상세 본문 아래 단추 줄을 본다', async () => {
    const 단추줄 = page.locator('.post-actions');
    await verify(
      '내가 쓴 글 상세에 「수정」 링크와 「삭제」 버튼이 보인다',
      {
        수정: await 단추줄.getByRole('link', { name: '수정' }).isVisible(),
        삭제: await 단추줄.getByRole('button', { name: '삭제' }).isVisible(),
      },
      { 수정: expected.editVisible, 삭제: expected.deleteVisible },
    );
  });
});
