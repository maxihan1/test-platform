import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-009',
  name: '알림신청 창에서 이메일과 휴대폰 번호만 채우면 「교육과정 알림신청 완료」가 눌리지 않고 필수 동의 둘을 체크하면 눌린다',
  precondition: ['알림신청 창이 열려 있다'],
  params: z.object({
    email: z.string().min(1).describe('입력해 볼 이메일 앞부분 (제출하지 않는다)').default('cdy-check'),
    phone: z.string().min(1).describe('입력해 볼 휴대폰 번호 (제출하지 않는다)').default('01000000000'),
  }),
  expected: z.object({
    disabledWithoutConsent: z.boolean().describe('필수 동의 없이 「교육과정 알림신청 완료」가 눌리지 않을지 여부').default(true),
    disabledWithConsent: z.boolean().describe('필수 동의 둘을 체크한 뒤 「교육과정 알림신청 완료」가 눌리지 않을지 여부').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 창 = page.getByRole('dialog');
  const 완료 = 창.getByRole('button', { name: '교육과정 알림신청 완료' });

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
    await 완료.waitFor();
    await verify('알림신청 창이 열려 있다', await 완료.isVisible(), true, { blocker: true });
  });

  await test.step('이메일과 휴대폰 번호만 채운다', async () => {
    await 창.getByPlaceholder('이메일을 입력해주세요.').fill(params.email);
    await 창.getByPlaceholder('010-0000-0000').fill(params.phone);
    await verify('필수 동의 없이 이메일과 휴대폰 번호만 채우면 「교육과정 알림신청 완료」가 눌리지 않는다', await 완료.isDisabled(), expected.disabledWithoutConsent);
  });

  await test.step('필수 동의 둘을 체크한다', async () => {
    await 창.getByText('(필수) 만 19세 이상입니다.').click();
    await 창.getByText('(필수) 개인정보 수집 · 이용 동의').click();
    await verify('필수 동의 둘을 체크하면 「교육과정 알림신청 완료」가 눌린다', await 완료.isDisabled(), expected.disabledWithConsent);
  });
});
