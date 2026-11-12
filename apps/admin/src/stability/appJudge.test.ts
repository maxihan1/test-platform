// 앱 logcat 에서 그 앱의 크래시 · ANR 만 고르고 같은 지문을 한 줄로 모으는지 보는 단위 테스트
import { describe, expect, it } from 'vitest';

import { 앱항목오류 } from './appJudge.js';

const 앱 = new Set(['org.joinmastodon.android']);
const 줄 = (pid: number, 수준: string, 태그: string, 글: string, tid = pid): string => `11-12 10:00:03.123  ${pid}  ${tid} ${수준} ${태그}: ${글}`;

const 크래시 = (pid: number, 프로세스 = 'org.joinmastodon.android', 메시지 = 'Attempt to invoke virtual method on a null object reference'): string[] => [
  줄(pid, 'E', 'AndroidRuntime', 'FATAL EXCEPTION: main'),
  줄(pid, 'E', 'AndroidRuntime', `Process: ${프로세스}, PID: ${pid}`),
  줄(pid, 'E', 'AndroidRuntime', `java.lang.NullPointerException: ${메시지}`),
  줄(pid, 'E', 'AndroidRuntime', '\tat android.view.View.performClick(View.java:7448)'),
  줄(pid, 'E', 'AndroidRuntime', '\tat org.joinmastodon.android.ui.ComposeFragment.onSend(ComposeFragment.java:120)'),
  줄(pid, 'E', 'AndroidRuntime', '\tat org.joinmastodon.android.ui.ComposeFragment$1.onClick(ComposeFragment.java:88)'),
];

describe('앱항목오류', () => {
  it('그 앱의 FATAL EXCEPTION 덩어리 하나를 크래시 한 번으로 세고, 이름은 예외 · 첫 앱 프레임이다', () => {
    const [오류, ...나머지] = 앱항목오류([줄(10, 'I', 'ActivityManager', 'Start proc'), ...크래시(4321)].join('\n'), 앱);
    expect(나머지).toEqual([]);
    expect(오류).toMatchObject({ hits: 1, 지문: { source: 'APP_CRASH', title: 'NullPointerException · ComposeFragment.onSend' } });
    expect(오류!.견본.split('\n')).toHaveLength(6);
  });

  it('메시지 값 · 줄 번호 · 익명 클래스 번호가 달라도 같은 크래시는 한 지문이고 횟수만 는다', () => {
    const 다른 = 크래시(5555, 'org.joinmastodon.android', 'index 7 out of bounds').map((l) => l.replace(':120)', ':121)').replace('$1', '$2'));
    const 오류 = 앱항목오류([...크래시(4321), ...다른].join('\n'), 앱);
    expect(오류.map((e) => e.hits)).toEqual([2]);
  });

  it('남의 앱 · 다른 패키지로 시작하는 이름의 크래시는 세지 않는다', () => {
    const 글 = [...크래시(100, 'com.android.systemui'), ...크래시(200, 'org.joinmastodon.android.beta')].join('\n');
    expect(앱항목오류(글, 앱)).toEqual([]);
  });

  it('하위 프로세스(패키지:하위) 크래시는 그 앱 것이다', () => {
    expect(앱항목오류(크래시(300, 'org.joinmastodon.android:push').join('\n'), 앱)).toHaveLength(1);
  });

  it('다른 프로세스 줄이 사이에 끼어도 덩어리를 pid 로 모은다', () => {
    const [a, b, c, ...뒤] = 크래시(4321);
    const 글 = [a, b, 줄(999, 'E', 'AndroidRuntime', 'java.lang.IllegalStateException: 남의 것'), c, ...뒤].join('\n');
    expect(앱항목오류(글, 앱)[0]?.지문.title).toBe('NullPointerException · ComposeFragment.onSend');
  });

  it('ANR 은 시스템 줄에서 앱 패키지 · 화면 · Reason 으로 세고 이름은 화면 짧은 이름이다', () => {
    const 글 = [
      줄(1000, 'E', 'ActivityManager', 'ANR in org.joinmastodon.android (org.joinmastodon.android/.MainActivity)', 1100),
      줄(1000, 'E', 'ActivityManager', 'PID: 4321', 1100),
      줄(1000, 'E', 'ActivityManager', 'Reason: Input dispatching timed out (Waited 5001ms for MotionEvent)', 1100),
      줄(1000, 'E', 'ActivityManager', 'ANR in com.android.systemui', 1100),
    ].join('\n');
    const [오류, ...나머지] = 앱항목오류(글, 앱);
    expect(나머지).toEqual([]);
    expect(오류).toMatchObject({ hits: 1, 지문: { source: 'APP_ANR', title: 'ANR · MainActivity', message: 'Input dispatching timed out (Waited *ms for MotionEvent)' } });
    expect(오류!.견본.split('\n')).toHaveLength(3);
  });

  it('일반 E 줄 · 네이티브 크래시는 세지 않고, 패키지를 모르면 아무것도 세지 않는다', () => {
    const 글 = [줄(4321, 'E', 'OkHttp', 'timeout'), 줄(4321, 'F', 'libc', 'Fatal signal 11 (SIGSEGV)'), ...크래시(4321)].join('\n');
    expect(앱항목오류(글, 앱)).toHaveLength(1);
    expect(앱항목오류(글, new Set())).toEqual([]);
  });
});
