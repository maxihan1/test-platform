// 실패 지점이 Page Object 줄이 아니라 케이스 파일 줄을 가리키는지 고정한다
import { describe, expect, it } from 'vitest';
import { callerFile, callerLine } from './callsite.js';

function errWith(...frames: string[]): Error {
  const err = new Error('x');
  err.stack = ['Error: x', ...frames.map((f) => `    at ${f}`)].join('\n');
  return err;
}

describe('callsite', () => {
  it('Page Object 프레임보다 spec 프레임을 고른다', () => {
    const err = errWith(
      'LoginPage.submit (/tests/mkt/pages/login.page.ts:12:5)',
      '/tests/mkt/MKT-UI-001.spec.ts:30:7',
    );
    expect(callerLine(err)).toBe(30);
    expect(callerFile(err)).toBe('/tests/mkt/MKT-UI-001.spec.ts');
  });

  it('spec 프레임이 없으면 첫 프레임을 돌려준다', () => {
    const err = errWith(
      'LoginPage.submit (/tests/mkt/pages/login.page.ts:12:5)',
      'run (/app/helper.ts:4:1)',
    );
    expect(callerLine(err)).toBe(12);
    expect(callerFile(err)).toBe('/tests/mkt/pages/login.page.ts');
  });

  it('node_modules 프레임은 건너뛴다', () => {
    const err = errWith(
      'expect (/app/node_modules/playwright/lib/x.js:99:1)',
      'body (/tests/mkt/MKT-UI-002.spec.ts:8:3)',
    );
    expect(callerLine(err)).toBe(8);
    expect(callerFile(err)).toBe('/tests/mkt/MKT-UI-002.spec.ts');
  });

  it('러너 spec 프레임보다 케이스 폴더의 spec 프레임을 고른다', () => {
    const err = errWith(
      'run (/app/apps/runner/scenario/scenario.spec.ts:10:5)',
      '/tests/mkt/MKT-UI-001.spec.ts:30:7',
    );
    expect(callerLine(err)).toBe(30);
    expect(callerFile(err)).toBe('/tests/mkt/MKT-UI-001.spec.ts');
  });

  it('저장소 경로에 /tests/ 가 있어도 러너 spec 은 케이스로 고르지 않는다', () => {
    const err = errWith(
      'run (/home/qa/tests/test_platform/apps/runner/scenario/scenario.spec.ts:10:5)',
      '/home/qa/tests/test_platform/tests/mkt/MKT-UI-001.spec.ts:30:7',
    );
    expect(callerLine(err)).toBe(30);
  });

  it('케이스 폴더의 spec 프레임이 없으면 첫 프레임을 돌려준다', () => {
    const err = errWith(
      'run (/app/apps/runner/scenario/scenario.spec.ts:10:5)',
      'LoginPage.submit (/tests/mkt/pages/login.page.ts:12:5)',
    );
    expect(callerLine(err)).toBe(10);
    expect(callerFile(err)).toBe('/app/apps/runner/scenario/scenario.spec.ts');
  });
});
