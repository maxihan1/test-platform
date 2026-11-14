import { 메뉴 } from '../components/menu.component.js';
import { 토스트 } from '../components/toast.component.js';
import { 가입양식화면, type 양식칸 } from '../pages/signup-form.page.js';
import { 개인정보화면 } from '../pages/privacy.page.js';
import { 시작화면 } from '../pages/start.page.js';
import { 서버고르기화면 } from '../pages/server-chooser.page.js';
import { 서버규칙화면 } from '../pages/server-rules.page.js';
import { 이메일확인화면 } from '../pages/email-confirm.page.js';
import { 글자가든요소, 보이나, 서버, 앱id, 앱꾸러미, 키보드완료, 뜰때까지, type 앱 } from './app.helper.js';
import { 로그인경로서버고르기, 웹로그인승인 } from './login.helper.js';

const 크롬꾸러미 = 'com.android.chrome';
const 크롬첫화면넘기기 = 'id=com.android.chrome:id/signin_fre_dismiss_button';
const 크롬주소창 = 'id=com.android.chrome:id/url_bar';
const 웹이메일 = 'id=user_email';
const 웹암호 = 'id=user_password';
const 웹로그인틀 = 'id=new_user';
const 웹승인 = 'android=new UiSelector().className("android.webkit.WebView").childSelector(new UiSelector().className("android.widget.Button").instance(0))';
const 웹거부 = 'android=new UiSelector().className("android.webkit.WebView").childSelector(new UiSelector().className("android.widget.Button").instance(1))';
const 권한허용 = 'id=com.android.permissioncontroller:id/permission_allow_button';
const 공유창 = `${앱꾸러미}/.ExternalShareActivity`;

export interface 가입값 {
  이름: string;
  사용자명: string;
  이메일: string;
  암호: string;
  암호확인: string;
}

export function 사용자명만들기(길이?: number): string {
  const 이름 = `tc_signup${Date.now()}`;
  return 길이 === undefined ? 이름 : 이름.padEnd(길이, 'a').slice(0, 길이);
}

export function 가입값만들기(덮을: Partial<가입값> = {}): 가입값 {
  const 기준 = 사용자명만들기();
  const 암호 = 덮을.암호 ?? 'Mta!test1234';
  return {
    이름: 덮을.이름 ?? 'MTA 가입 시험',
    사용자명: 덮을.사용자명 ?? 기준,
    이메일: 덮을.이메일 ?? `${기준}@maxihan.com`,
    암호,
    암호확인: 덮을.암호확인 ?? 암호,
  };
}

export function 암호만들기(길이: number): string {
  return 'Mta1'.padEnd(길이, 'a');
}

export async function 가입양식채우기(양식: 가입양식화면, 값: 가입값): Promise<void> {
  const 칸들: 양식칸[] = ['이름', '사용자명', '이메일', '암호', '암호확인'];
  for (const 칸 of 칸들) await 양식.적기(칸, 값[칸]);
}

export async function 가입서버고르기(driver: 앱): Promise<void> {
  await new 시작화면(driver).누르기('다른서버선택');
  const 화면 = new 서버고르기화면(driver);
  await 화면.떴나();
  for (let 번 = 0; 번 < 3; 번++) {
    await 화면.서버적기(서버);
    if (await 화면.맨위카드가될때까지(서버, 6_000)) break;
  }
  await 화면.카드누르기(서버);
}

export async function 서버규칙까지(driver: 앱): Promise<boolean> {
  await 가입서버고르기(driver);
  await new 서버고르기화면(driver).다음누르기();
  return new 서버규칙화면(driver).떴나();
}

export async function 개인정보까지(driver: 앱): Promise<boolean> {
  if (!(await 서버규칙까지(driver))) return false;
  await new 서버규칙화면(driver).동의누르기();
  return new 개인정보화면(driver).떴나();
}

export async function 가입양식까지(driver: 앱): Promise<boolean> {
  if (!(await 개인정보까지(driver))) return false;
  await new 개인정보화면(driver).동의누르기();
  return new 가입양식화면(driver).떴나();
}

export async function 웹승인화면까지(driver: 앱, 아이디: string, 비밀번호: string): Promise<void> {
  let 넣었다 = false;
  await driver.waitUntil(
    async () => {
      if (await 보이나(driver, 크롬첫화면넘기기)) {
        await driver.$(크롬첫화면넘기기).click();
        return false;
      }
      const 로그인칸 = await 보이나(driver, 웹이메일);
      if (로그인칸 && !넣었다) {
        await driver.$(웹이메일).setValue(아이디);
        await driver.$(웹암호).setValue(비밀번호);
        await 키보드완료(driver);
        넣었다 = true;
        return false;
      }
      return !로그인칸 && !(await 보이나(driver, 웹로그인틀)) && (await 보이나(driver, 웹승인)) && (await 보이나(driver, 웹거부));
    },
    { timeout: 90_000, interval: 700, timeoutMsg: '90초 안에 서버 웹 로그인 승인 화면에 닿지 못했다' },
  );
}

export async function 웹거부누르기(driver: 앱): Promise<void> {
  await driver.$(웹거부).click();
}

export async function 서버웹화면떴나(driver: 앱, 시간 = 60_000): Promise<boolean> {
  return driver
    .waitUntil(
      async () => {
        if (await 보이나(driver, 크롬첫화면넘기기)) {
          await driver.$(크롬첫화면넘기기).click();
          return false;
        }
        return (await 보이나(driver, 웹이메일)) || (await 보이나(driver, 웹승인));
      },
      { timeout: 시간, interval: 700 },
    )
    .then(
      () => true,
      () => false,
    );
}

export async function 앞에뜬앱이될때까지(driver: 앱, 꾸러미: string, 시간 = 30_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.getCurrentPackage()) === 꾸러미, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 크롬이앞에떴나(driver: 앱, 시간 = 60_000): Promise<boolean> {
  return 앞에뜬앱이될때까지(driver, 크롬꾸러미, 시간);
}

export async function 크롬주소글(driver: 앱, 시간 = 30_000): Promise<string> {
  const 칸 = await driver.$(크롬주소창);
  const 떴다 = await 칸.waitForDisplayed({ timeout: 시간 }).then(
    () => true,
    () => false,
  );
  return 떴다 ? 칸.getText() : '';
}

export async function 이메일확인대기로그인(driver: 앱, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  if (!아이디 || !비밀번호) throw new Error('이메일 확인 대기 계정 값이 비어 있다 — 대상 서버 줄의 계정을 본다');
  await 로그인경로서버고르기(driver);
  await 웹로그인승인(driver, 아이디, 비밀번호);
  const 확인 = new 이메일확인화면(driver);
  await driver.waitUntil(
    async () => {
      if (await 보이나(driver, 권한허용)) {
        await driver.$(권한허용).click();
        return false;
      }
      return 확인.떴나(1_500);
    },
    { timeout: 90_000, interval: 500, timeoutMsg: '이메일 확인 화면이 90초 안에 뜨지 않았다' },
  );
}

export async function 권한창떴나(driver: 앱, 시간 = 10_000): Promise<boolean> {
  return 뜰때까지(driver, 권한허용, 시간);
}

export async function 알림탭목록떴나(driver: 앱, 시간 = 20_000): Promise<boolean> {
  return 뜰때까지(driver, 앱id('mark_all_read'), 시간);
}

async function 셸(driver: 앱, 인자들: string[]): Promise<void> {
  await driver.execute('mobile: shell', { command: 'am', args: 인자들 });
}

export async function 글공유보내기(driver: 앱, 본문: string, 제목?: string): Promise<void> {
  const 인자들 = ['start', '-n', 공유창, '-a', 'android.intent.action.SEND', '-t', 'text/plain'];
  if (제목) 인자들.push('--es', 'android.intent.extra.SUBJECT', 제목);
  인자들.push('--es', 'android.intent.extra.TEXT', 본문);
  await 셸(driver, 인자들);
}

export async function 사진공유보내기(driver: 앱, 사진주소: string): Promise<void> {
  await 셸(driver, ['start', '-n', 공유창, '-a', 'android.intent.action.SEND', '-t', 'image/*', '--eu', 'android.intent.extra.STREAM', 사진주소]);
}

export async function 공유주소보내기(driver: 앱, 주소: string): Promise<void> {
  await 셸(driver, ['start', '-n', 공유창, '-a', 'android.intent.action.VIEW', '-d', 주소]);
}

export async function 공유동작보내기(driver: 앱, 동작: string): Promise<void> {
  await 셸(driver, ['start', '-n', 공유창, '-a', 동작]);
}

export async function 앱주소열기(driver: 앱, 주소: string): Promise<void> {
  await driver.execute('mobile: deepLink', { url: 주소, package: 앱꾸러미 });
}

export async function 공유창이닫혔나(driver: 앱, 시간 = 15_000): Promise<boolean> {
  return driver
    .waitUntil(async () => !(await driver.getCurrentActivity()).includes('ExternalShare'), { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 요청권한들(driver: 앱): Promise<string[]> {
  const 출력 = String(await driver.execute('mobile: shell', { command: 'dumpsys', args: ['package', 앱꾸러미] }));
  const 시작 = 출력.indexOf('requested permissions:');
  if (시작 < 0) throw new Error('요청 권한 목록을 읽지 못했다 — dumpsys package 출력에 requested permissions 가 없다');
  const 권한: string[] = [];
  for (const 줄 of 출력.slice(시작).split('\n').slice(1)) {
    const 글 = 줄.trim();
    if (글 === '' || 글.endsWith(':')) break;
    권한.push(글.split(/[:\s]/)[0] ?? '');
  }
  return 권한;
}

export async function 스크롤해서찾았나(driver: 앱, 글: string, 시간 = 15_000): Promise<boolean> {
  return 글자가든요소(driver, 글, 시간).then(
    () => true,
    () => false,
  );
}

export async function 큐알스캔열기(driver: 앱): Promise<void> {
  await driver.$(앱id('tab_profile')).click();
  const 옵션 = await driver.$(앱id('options_btn'));
  await 옵션.waitForDisplayed({ timeout: 20_000 });
  await 옵션.click();
  await new 메뉴(driver).고르기('View QR code');
  const 스캔 = await driver.$('~QR 코드 스캔');
  await 스캔.waitForDisplayed({ timeout: 10_000 });
  await 스캔.click();
}

export async function 멘션누르기(driver: 앱, 멘션: string): Promise<void> {
  const 줄 = await 글자가든요소(driver, 멘션);
  const { x, y } = await 줄.getLocation();
  await driver.execute('mobile: clickGesture', { x: x + 70, y: y + 30 });
}

export async function 오류글끝누르기(driver: 앱, 오류글조각: string): Promise<void> {
  const 줄 = await 글자가든요소(driver, 오류글조각);
  const { x, y } = await 줄.getLocation();
  const { height } = await 줄.getSize();
  await driver.execute('mobile: clickGesture', { x: x + 60, y: y + height - 20 });
}

export async function 앱설치됐나(driver: 앱): Promise<boolean> {
  return driver.isAppInstalled(앱꾸러미);
}

export async function 토스트가사라질때까지(driver: 앱, 시간 = 10_000): Promise<boolean> {
  return driver
    .$(new 토스트(driver).상자)
    .waitForExist({ timeout: 시간, reverse: true })
    .then(
      () => true,
      () => false,
    );
}

export async function 프로필제목이뜰때까지(driver: 앱, 이름: string, 시간 = 20_000): Promise<boolean> {
  return 뜰때까지(driver, `android=new UiSelector().text(${JSON.stringify(이름)})`, 시간);
}
