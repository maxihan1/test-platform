import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MDA-FN-001',
  name: '상품 하나를 장바구니에 담으면 장바구니 수가 1이 된다',
  platforms: ['android'],
  precondition: ['My Demo App 이 설치될 Android 폰이 연결돼 있다', '앱을 새로 연 상태라 장바구니가 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  await test.step('첫 상품을 연다', async () => {
    await driver.$('~store item').click();
    const opened = await driver.$('~product screen').waitForDisplayed().then(() => true, () => false);
    await verify('상품 화면이 열린다', opened, true);
  });

  await test.step('장바구니에 담는다', async () => {
    await driver.$('~Add To Cart button').click();
    const count = driver.$('~cart badge').$('android.widget.TextView');
    await count.waitForDisplayed();
    await verify('장바구니 수가 1이다', await count.getText(), '1');
  }, { capture: true });
});
