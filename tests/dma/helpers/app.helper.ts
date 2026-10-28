import type { CaseBodyArgs } from '@platform/kit';

export type 앱 = CaseBodyArgs<unknown, unknown>['driver'];
export type 요소 = WebdriverIO.Element;

export const 앱꾸러미 = 'com.demomarket.app';

const 앞에서도는중 = 4;

export async function 앱다시켜기(driver: 앱): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.activateApp(앱꾸러미);
}

export async function 서버주소로켜기(driver: 앱, 주소: string): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.execute('mobile: startActivity', {
    component: `${앱꾸러미}/.MainActivity`,
    extras: [['s', 'server', 주소]],
  });
}

export async function 앱이앞에있나(driver: 앱): Promise<boolean> {
  return (await driver.queryAppState(앱꾸러미)) === 앞에서도는중;
}

export async function 앱이닫힐때까지(driver: 앱, timeout = 10000): Promise<void> {
  await driver
    .waitUntil(async () => !(await 앱이앞에있나(driver)), { timeout, interval: 300 })
    .catch(() => undefined);
}

export async function 기기오늘(driver: 앱): Promise<Date> {
  const 글 = String(await driver.execute('mobile: getDeviceTime', { format: 'YYYY-MM-DD' }));
  const [년, 월, 일] = 글.trim().split('-').map(Number);
  return new Date(년 ?? 1970, (월 ?? 1) - 1, 일 ?? 1);
}

export function 며칠뒤(기준: Date, 날수: number): Date {
  return new Date(기준.getFullYear(), 기준.getMonth(), 기준.getDate() + 날수);
}

export function 월일글(날: Date): string {
  return `${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
}

export function 금액(글: string): number {
  const 찾음 = /(-?[\d,]+)원/.exec(글);
  return 찾음 === null ? Number.NaN : Number((찾음[1] ?? '').replace(/,/g, ''));
}

export function 금액글(수: number): string {
  return `${수.toLocaleString('en-US')}원`;
}

export async function 글들(부모: 요소): Promise<string[]> {
  const 칸들 = await 부모.$$('android.widget.TextView');
  const 모음: string[] = [];
  for (const 칸 of 칸들) 모음.push(await 칸.getText());
  return 모음;
}

export async function 화면글들(driver: 앱): Promise<string[]> {
  return 글들(await driver.$('id=android:id/content').getElement());
}

export async function 켜졌나(칸: 요소): Promise<boolean> {
  return (await 칸.getAttribute('checked')) === 'true';
}

export async function 칸에적기(driver: 앱, 칸: 요소, 값: string): Promise<void> {
  await 칸.click();
  await 칸.clearValue();
  if (값 !== '') await 칸.setValue(값);
  await driver.hideKeyboard().catch(() => undefined);
}

export function 일요일아닌첫날(오늘: Date): Date {
  for (let 날수 = 2; 날수 <= 14; 날수 += 1) {
    const 날 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate() + 날수);
    if (날.getDay() !== 0) return 날;
  }
  throw new Error('2일 뒤부터 14일 뒤까지 일요일 아닌 날이 없다');
}

export function 첫일요일(오늘: Date): Date {
  for (let 날수 = 2; 날수 <= 14; 날수 += 1) {
    const 날 = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate() + 날수);
    if (날.getDay() === 0) return 날;
  }
  throw new Error('2일 뒤부터 14일 뒤까지 일요일이 없다');
}

export async function 서버값없이켜기(driver: 앱): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.execute('mobile: clearApp', { appId: 앱꾸러미 });
  await driver.activateApp(앱꾸러미);
}
