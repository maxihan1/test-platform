import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-010',
  name: '알림신청 창에서 「자세히 보기」를 누르면 「개인정보처리방침」 창이 겹쳐 열리고 「닫기」·「확인」 버튼이 있다',
  precondition: ['알림신청 창이 열려 있다'],
  params: null,
  expected: z.object({
    dialogCount: z.number().describe('「자세히 보기」를 누른 뒤 열려 있는 창 수').default(2),
    title: z.string().describe('겹쳐 열린 창의 제목').default('개인정보처리방침'),
    buttons: z.string().describe('겹쳐 열린 창의 버튼 이름을 쉼표로 이은 것').default('닫기, 확인'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 창 = page.getByRole('dialog');

  await test.step('홈을 열고 공지 팝업을 닫는다', async () => {
    await page.goto('/');
    await 창.first().waitFor();
    while ((await 창.count()) > 0) {
      await 창.getByRole('button', { name: '닫기' }).first().click();
    }
    await page.getByRole('main').getByRole('button', { name: '교육과정 알림신청' }).waitFor();
  });

  await test.step('「교육과정 알림신청」을 눌러 알림신청 창을 연다', async () => {
    await page.getByRole('main').getByRole('button', { name: '교육과정 알림신청' }).click();
    await 창.getByRole('button', { name: '교육과정 알림신청 완료' }).waitFor();
    await verify('알림신청 창이 열려 있다', await 창.getByRole('button', { name: '교육과정 알림신청 완료' }).isVisible(), true, { blocker: true });
  });

  await test.step('첫 「자세히 보기」를 누른다', async () => {
    await 창.getByRole('button', { name: '자세히 보기' }).first().click();
    await 창.getByRole('button', { name: '확인', exact: true }).waitFor();
    await verify(
      '알림신청 창에서 「자세히 보기」를 누르면 「개인정보처리방침」 창이 겹쳐 열리고 「닫기」·「확인」 버튼이 있다',
      {
        dialogCount: await 창.count(),
        title: await 창.last().getByRole('heading').innerText(),
        buttons: (await 창.last().getByRole('button').allInnerTexts()).join(', '),
      },
      { dialogCount: expected.dialogCount, title: expected.title, buttons: expected.buttons },
    );
  });
});
