import type { AppDriver } from '@platform/kit/app';

import { 가입양식까지, 새이름 } from './signup-flow.helper.js';
import { 가입양식화면 } from '../pages/signup.page.js';

export async function 가입해서이메일확인화면으로(driver: AppDriver): Promise<void> {
  await 가입양식까지(driver);
  const 양식 = new 가입양식화면(driver);
  const 이름 = 새이름();
  await 양식.채우기({ 이름: '가입 시험', 사용자명: 이름, 이메일: `${이름}@maxihan.com`, 암호: 'Signup-Test-1', 암호확인: 'Signup-Test-1' });
  await 양식.다음이켜질때까지();
  await 양식.다음누르기();
}
