import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-032',
  name: '알림 응답을 가짜로 주면 종 옆에 읽지 않은 수가 보이고 종을 눌러 목록을 열면 숫자가 사라진다',
  precondition: ['테스트 회원 계정이 있다', '알림 목록 응답은 가짜 응답(모킹)이다 — 읽지 않은 알림 1건'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    mockMessage: z.string().min(1).describe('가짜 알림 문구').default('내 글에 새 댓글이 달렸습니다'),
    mockPostId: z.number().int().positive().describe('가짜 알림이 가리킬 게시글 번호').default(44),
  }),
  expected: z.object({
    unreadCount: z.string().describe('종 옆에 보일 읽지 않은 알림 수').default('1'),
    countVisibleAfterOpen: z.boolean().describe('목록을 연 뒤 숫자가 보일지 여부').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 머리글 = page.getByRole('banner');
  const 종 = 머리글.getByRole('button', { name: '알림' });
  const 배지 = 종.getByText(/^\d+$/);
  let 읽음 = false;

  await test.step('알림 응답을 가짜로 걸고 로그인한다', async () => {
    await page.context().route('**/api/notifications', (route) =>
      route.fulfill({
        json: {
          items: [{ id: 1, postId: params.mockPostId, message: params.mockMessage, read: 읽음 }],
          unread: 읽음 ? 0 : 1,
        },
      }),
    );
    await page.context().route('**/api/notifications/read', (route) => {
      읽음 = true;
      return route.fulfill({ status: 204 });
    });
    await page.goto('/login?next=/board');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await 배지.waitFor();
    await verify('읽지 않은 알림이 있으면 종 옆에 그 수가 보인다', await 배지.innerText(), expected.unreadCount);
  });

  await test.step('종을 누른다', async () => {
    const 읽음요청 = page.waitForResponse('**/api/notifications/read');
    await 종.click();
    await 읽음요청;
    await verify(
      '종을 누르면 알림 목록이 펼쳐진다',
      (
        await 머리글
          .getByRole('link')
          .evaluateAll((els) => els.filter((a) => /^\/board\/\d+$/.test(a.getAttribute('href') ?? '')).map((a) => a.textContent))
      ).join(', '),
      params.mockMessage,
    );
    await verify('알림 목록을 열면 종 옆 숫자가 사라진다', await 배지.isVisible(), expected.countVisibleAfterOpen);
  });
});
