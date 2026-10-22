import type { CaseBodyArgs } from '@platform/kit';

export type 앱 = CaseBodyArgs<unknown, unknown>['driver'];

export const 앱꾸러미 = 'com.demomarket.app';

export const 기다림 = 15000;

export function 원(금액: number): string {
  return `${금액.toLocaleString('ko-KR')}원`;
}

export function 입력칸(이름: string): string {
  return `//android.widget.EditText[@resource-id="${이름}"]`;
}

export function 누름틀(이름: string): string {
  return `//android.view.View[@resource-id="${이름}"]`;
}

export async function 보일때까지(driver: 앱, 선택자: string, 시간 = 기다림): Promise<boolean> {
  return driver
    .$(선택자)
    .waitForDisplayed({ timeout: 시간 })
    .then(() => true, () => false);
}

export async function 사라질때까지(driver: 앱, 선택자: string, 시간 = 기다림): Promise<boolean> {
  return driver
    .$(선택자)
    .waitForDisplayed({ timeout: 시간, reverse: true })
    .then(() => true, () => false);
}

export async function 보이는가(driver: 앱, 선택자: string): Promise<boolean> {
  return driver.$(선택자).isDisplayed().catch(() => false);
}

export async function 눌리는가(driver: 앱, 이름: string): Promise<boolean> {
  return (await driver.$(누름틀(이름)).getAttribute('enabled')) === 'true';
}

export async function 켜졌나(driver: 앱, 선택자: string): Promise<boolean> {
  return (await driver.$(선택자).getAttribute('checked')) === 'true';
}

async function 화면한번밀기(driver: 앱, 방향: 'down' | 'up'): Promise<void> {
  const { width, height } = await driver.getWindowSize();
  await driver.execute('mobile: scrollGesture', {
    left: Math.round(width * 0.1),
    top: Math.round(height * 0.3),
    width: Math.round(width * 0.8),
    height: Math.round(height * 0.45),
    direction: 방향,
    percent: 0.8,
  });
}

export async function 밀어서찾기(driver: 앱, 선택자: string, 방향: 'down' | 'up' = 'down', 횟수 = 12): Promise<boolean> {
  for (let i = 0; i < 횟수; i += 1) {
    if (await 보이는가(driver, 선택자)) return true;
    await 화면한번밀기(driver, 방향);
  }
  return 보이는가(driver, 선택자);
}

export async function 맨위로(driver: 앱, 횟수 = 6): Promise<void> {
  for (let i = 0; i < 횟수; i += 1) await 화면한번밀기(driver, 'up');
}

export async function 한번밀기(driver: 앱): Promise<void> {
  await 화면한번밀기(driver, 'down');
}

export async function 가로로끝까지(driver: 앱, 틀선택자: string, 횟수 = 6): Promise<void> {
  const 틀 = await driver.$(틀선택자);
  for (let i = 0; i < 횟수; i += 1) {
    const 더있다 = await driver.execute('mobile: scrollGesture', { elementId: 틀.elementId, direction: 'right', percent: 0.9 });
    if (더있다 === false) return;
  }
}

export async function 글들(driver: 앱, 선택자: string): Promise<string[]> {
  const 요소들 = await driver.$$(선택자).getElements();
  const 모음: string[] = [];
  for (const 요소 of 요소들) 모음.push(await 요소.getText());
  return 모음;
}

export async function 화면글들(driver: 앱): Promise<string[]> {
  return 글들(driver, '//android.widget.TextView');
}

export async function 기기날짜(driver: 앱, 며칠뒤: number): Promise<Date> {
  const 오늘 = String(await driver.execute('mobile: getDeviceTime', { format: 'YYYY-MM-DD' }));
  const [연, 월, 일] = 오늘.split('-').map(Number);
  return new Date(Date.UTC(연, 월 - 1, 일 + 며칠뒤));
}

export function 칩날짜(날짜: Date): string {
  return `${String(날짜.getUTCMonth() + 1).padStart(2, '0')}-${String(날짜.getUTCDate()).padStart(2, '0')}`;
}

export async function 앱다시켜기(driver: 앱): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.activateApp(앱꾸러미);
}

export async function 앱이닫혔나(driver: 앱): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.getCurrentPackage()) !== 앱꾸러미, { timeout: 기다림 })
    .then(() => true, () => false);
}

export async function 빠르게두번누르기(driver: 앱, 선택자: string): Promise<void> {
  const 위치 = await driver.$(선택자).getLocation();
  const 크기 = await driver.$(선택자).getSize();
  const x = Math.round(위치.x + 크기.width / 2);
  const y = Math.round(위치.y + 크기.height / 2);
  await driver.performActions([
    {
      type: 'pointer',
      id: '손가락',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 40 },
        { type: 'pointerUp', button: 0 },
        { type: 'pause', duration: 60 },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 40 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ]);
  await driver.releaseActions();
}

export async function 서버주소로켜기(driver: 앱, 주소: string): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.execute('mobile: startActivity', {
    component: `${앱꾸러미}/.MainActivity`,
    extras: [['s', 'server', 주소]],
    wait: true,
  });
}
