import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-007',
  name: '알림신청 창에 이메일 칸·휴대폰 번호 칸·체크박스 넷이 있고 「교육과정 알림신청 완료」 버튼이 눌리지 않는다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    emailVisible: z.boolean().describe('이메일 칸이 보일지 여부').default(true),
    phoneVisible: z.boolean().describe('휴대폰 번호 칸이 보일지 여부').default(true),
    checkboxCount: z.number().describe('체크박스 수').default(4),
    completeDisabled: z.boolean().describe('「교육과정 알림신청 완료」 버튼이 눌리지 않을지 여부').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('홈을 열고 공지 팝업을 닫는다', async () => {
    await page.goto('/');
    const 팝업 = page.getByRole('dialog');
    await 팝업.first().waitFor();
    while ((await 팝업.count()) > 0) {
      await 팝업.getByRole('button', { name: '닫기' }).first().click();
    }
    await page.getByRole('main').getByRole('button', { name: '교육과정 알림신청' }).waitFor();
  });

  await test.step('「교육과정 알림신청」을 누른다', async () => {
    await page.getByRole('main').getByRole('button', { name: '교육과정 알림신청' }).click();
    const 창 = page.getByRole('dialog');
    await 창.getByRole('button', { name: '교육과정 알림신청 완료' }).waitFor();
    await verify(
      '알림신청 창에 이메일 칸·휴대폰 번호 칸·체크박스 넷이 있고 「교육과정 알림신청 완료」 버튼이 눌리지 않는다',
      {
        emailVisible: await 창.getByPlaceholder('이메일을 입력해주세요.').isVisible(),
        phoneVisible: await 창.getByPlaceholder('010-0000-0000').isVisible(),
        checkboxCount: await 창.getByRole('checkbox').count(),
        completeDisabled: await 창.getByRole('button', { name: '교육과정 알림신청 완료' }).isDisabled(),
      },
      {
        emailVisible: expected.emailVisible,
        phoneVisible: expected.phoneVisible,
        checkboxCount: expected.checkboxCount,
        completeDisabled: expected.completeDisabled,
      },
    );
  });
});
