import type { CaseBodyArgs } from '@platform/kit';

export type 앱 = CaseBodyArgs<unknown, unknown>['driver'];

export type 요소 = WebdriverIO.Element;

export const 앱꾸러미 = 'org.joinmastodon.android';
export const 서버 = 'mastodon.maxihan.com';

export function 앱id(이름: string): string {
  return `id=${앱꾸러미}:id/${이름}`;
}

export async function 멈춤기다림끄기(driver: 앱): Promise<void> {
  await driver.updateSettings({ waitForIdleTimeout: 0 });
}

export async function 뜰때까지(driver: 앱, 선택자: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .$(선택자)
    .waitForDisplayed({ timeout: 시간 })
    .then(
      () => true,
      () => false,
    );
}

export async function 사라질때까지(driver: 앱, 선택자: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .$(선택자)
    .waitForDisplayed({ timeout: 시간, reverse: true })
    .then(
      () => true,
      () => false,
    );
}

export async function 보이나(driver: 앱, 선택자: string): Promise<boolean> {
  const 요소 = await driver.$(선택자);
  return (await 요소.isExisting()) && (await 요소.isDisplayed());
}

export async function 글자들(driver: 앱, 선택자: string): Promise<string[]> {
  const 요소들 = await driver.$$(선택자);
  const 글 = [];
  for (const 요소 of 요소들) 글.push(await 요소.getText());
  return 글;
}

export async function 글자로고르기(driver: 앱, 선택자: string, 글자: string, 시간 = 10_000): Promise<요소> {
  let 찾은: 요소 | undefined;
  await driver
    .waitUntil(
      async () => {
        for (const 요소 of await driver.$$(선택자)) {
          if ((await 요소.getText()) === 글자) {
            찾은 = 요소;
            return true;
          }
        }
        return false;
      },
      { timeout: 시간, interval: 500 },
    )
    .catch(() => undefined);
  if (!찾은) throw new Error(`「${글자}」 줄을 ${선택자} 에서 찾지 못했다`);
  return 찾은;
}

export async function 글자가든요소(driver: 앱, 글자: string, 시간 = 15_000): Promise<요소> {
  const 선택자 = `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  await driver.$(선택자).waitForDisplayed({ timeout: 시간 });
  const [찾은] = await driver.$$(선택자);
  if (!찾은) throw new Error(`「${글자}」가 든 요소를 찾지 못했다`);
  return 찾은;
}

export async function 앱다시켜기(driver: 앱): Promise<void> {
  await driver.terminateApp(앱꾸러미);
  await driver.activateApp(앱꾸러미);
}

export async function 뒤로(driver: 앱): Promise<void> {
  await driver.back();
}

export async function 키보드완료(driver: 앱): Promise<void> {
  await driver.execute('mobile: performEditorAction', { action: 'done' });
}

export async function 위로밀기(driver: 앱, 번수 = 1): Promise<void> {
  for (let i = 0; i < 번수; i++) {
    await driver.execute('mobile: swipeGesture', { left: 100, top: 600, width: 880, height: 1200, direction: 'up', percent: 0.75 });
  }
}

export async function 아래로당기기(driver: 앱): Promise<void> {
  await driver.execute('mobile: swipeGesture', { left: 100, top: 500, width: 880, height: 1200, direction: 'down', percent: 0.8 });
}

export async function 길게누르기(driver: 앱, 선택자: string): Promise<void> {
  const 요소 = await driver.$(선택자);
  await 요소.waitForDisplayed({ timeout: 10_000 });
  await driver.execute('mobile: longClickGesture', { elementId: 요소.elementId, duration: 1200 });
}

export async function 클립보드(driver: 앱): Promise<string> {
  return Buffer.from(await driver.getClipboard('plaintext'), 'base64').toString('utf8');
}

export async function 클립보드에넣기(driver: 앱, 글: string): Promise<void> {
  await driver.setClipboard(Buffer.from(글, 'utf8').toString('base64'), 'plaintext');
}

function 화면글풀기(글: string): string {
  return 글
    .replace(/&#10;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function 문구식(문구: string): RegExp {
  const 조각 = 문구.split(/(<[^>]+>|\bn\b)/);
  const 식 = 조각
    .map((c) => (/^<[^>]+>$/.test(c) ? '.+?' : c === 'n' ? '\\d+' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(식);
}

export async function 문구가보이나(driver: 앱, 문구: string, 시간 = 10_000): Promise<boolean> {
  const 식 = 문구식(문구);
  return driver
    .waitUntil(async () => 식.test(화면글풀기(await driver.getPageSource())), { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 프로필열기(driver: 앱, 사용자명: string): Promise<void> {
  await driver.$(앱id('tab_search')).click();
  await driver.$(앱id('search_text')).click();
  const 칸 = await driver.$('android.widget.EditText');
  await 칸.waitForDisplayed({ timeout: 10_000 });
  await 칸.setValue(`@${사용자명}`);
  await (await 글자가든요소(driver, `@${사용자명}@${서버}`)).click();
  await driver.$(앱id('profile_action_btn')).waitForDisplayed({ timeout: 20_000 });
}
