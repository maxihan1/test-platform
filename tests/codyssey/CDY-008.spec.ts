import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-008',
  name: '알림신청 창에서 「전체 동의하기」를 누르면 체크박스 넷이 모두 체크되고 한 번 더 누르면 모두 풀린다',
  precondition: ['알림신청 창이 열려 있다'],
  params: null,
  expected: z.object({
    checkedAfterFirst: z.number().describe('「전체 동의하기」를 한 번 누른 뒤 체크된 체크박스 수').default(4),
    checkedAfterSecond: z.number().describe('「전체 동의하기」를 두 번 누른 뒤 체크된 체크박스 수').default(0),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  const 창 = page.getByRole('dialog');
  const 체크된수 = () => 창.getByRole('checkbox').evaluateAll((칸) => 칸.filter((c) => (c as HTMLInputElement).checked).length);
  const 바뀔때까지 = async (전: number) => {
    for (let i = 0; i < 30 && (await 체크된수()) === 전; i++) await page.waitForTimeout(100);
  };

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

  await test.step('「전체 동의하기」를 누른다', async () => {
    await 창.getByText('전체 동의하기').click();
    await 바뀔때까지(0);
    await verify('「전체 동의하기」를 누르면 체크박스 넷이 모두 체크된다', await 체크된수(), expected.checkedAfterFirst);
  });

  await test.step('「전체 동의하기」를 한 번 더 누른다', async () => {
    await 창.getByText('전체 동의하기').click();
    await 바뀔때까지(4);
    await verify('「전체 동의하기」를 한 번 더 누르면 체크박스 넷이 모두 풀린다', await 체크된수(), expected.checkedAfterSecond);
  });
});
