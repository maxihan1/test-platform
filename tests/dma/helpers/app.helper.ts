import type { CaseBodyArgs } from '@platform/kit';

type 드라이버 = CaseBodyArgs<unknown, unknown>['driver'];

export const 앱꾸러미 = 'com.demomarket.app';

const 앞에떠있음 = 4;

export async function 서버주소로켜기(driver: 드라이버, 주소: string): Promise<void> {
  await driver.execute('mobile: startActivity', {
    intent: `${앱꾸러미}/.MainActivity`,
    extras: [['s', 'server', 주소]],
    stop: true,
  });
}

export async function 다시켜기(driver: 드라이버): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.activateApp(앱꾸러미);
}

export async function 앱켜기(driver: 드라이버): Promise<void> {
  await driver.activateApp(앱꾸러미);
}

export async function 기기뒤로가기(driver: 드라이버): Promise<void> {
  await driver.back();
}

export async function 앱이닫혔나(driver: 드라이버): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.queryAppState(앱꾸러미)) !== 앞에떠있음, { timeout: 10_000 })
    .then(
      () => true,
      () => false,
    );
}
