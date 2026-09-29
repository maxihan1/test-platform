import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-041',
  name: '늦게 도착한 이벤트 띠가 배너와 탭 사이에 끼어 들어가고 X 를 누르면 닫힌다',
  precondition: ['비회원으로 홈에 들어와 있다', '공지 팝업과 만족도 설문을 닫았다', '이벤트 띠가 들어와 있다'],
  params: null,
  expected: z.object({
    message: z.string().describe('이벤트 띠 문구').default('🎉 가을 맞이 전 상품 무료 배송'),
    between: z.boolean().describe('띠가 배너와 탭 사이에 끼어 들어갈지 여부').default(true),
    countAfterClose: z.number().describe('X 를 누른 뒤 남을 이벤트 띠 수').default(0),
  }),
});

test(spec, async ({ page, expected }) => {
  const 띠 = page.getByRole('region', { name: '이벤트' });

  await test.step('홈을 열고 공지 팝업과 만족도 설문을 닫는다', async () => {
    await page.goto('/');
    const 공지 = page.getByRole('dialog', { name: '공지사항' });
    await 공지.waitFor();
    await 공지.getByRole('button', { name: '닫기' }).last().click();
    await 공지.waitFor({ state: 'detached' });
    const 설문 = page.getByRole('dialog', { name: '만족도 설문' });
    await 설문.waitFor({ timeout: 20000 });
    await 설문.getByRole('button', { name: '다음에' }).click();
    await 설문.waitFor({ state: 'detached' });
  });

  await test.step('이벤트 띠가 들어올 때까지 기다려 자리를 본다', async () => {
    await 띠.waitFor();
    const 배너칸 = await page.getByRole('region', { name: '배너' }).boundingBox();
    const 띠칸 = await 띠.boundingBox();
    const 탭칸 = await page.getByRole('tablist').boundingBox();
    const 사이 =
      배너칸 !== null && 띠칸 !== null && 탭칸 !== null &&
      배너칸.y + 배너칸.height <= 띠칸.y && 띠칸.y + 띠칸.height <= 탭칸.y;
    await verify(
      '이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 배너와 탭 사이에 끼어 들어가 탭을 아래로 밀어낸다',
      { 문구: (await 띠.innerText()).replace('×', '').trim(), 사이 },
      { 문구: expected.message, 사이: expected.between },
    );
  });

  await test.step('띠의 X 를 누른다', async () => {
    await 띠.getByRole('button', { name: '닫기' }).click();
    await verify('띠의 X 를 누르면 이벤트 띠가 사라진다', await 띠.count(), expected.countAfterClose);
  });
});
