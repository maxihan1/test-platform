// @vitest-environment jsdom
// 대상 서버 줄의 「앱 파일 경로」 칸 — 받은 값을 되돌려 보내고 새 줄은 빈 값을 명시한다 (도메인/인증 §7 · APP-F1-03)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { EnvEditor, 보낼모양, 줄로 } from './SettingsEnvs.js';

afterEach(cleanup);

describe('앱 파일 경로 칸', () => {
  it('받은 경로는 그대로 보내고, 새 줄은 null 을 명시하고, 받은 적 없는 옛 줄은 키를 안 보낸다', () => {
    const [받음, 옛줄] = 줄로([
      { env: 'qa', baseUrl: 'https://qa.example.com', appPath: '/apk/qa.apk' },
      { env: 'dev', baseUrl: 'https://dev.example.com' },
    ]);
    const 새줄 = { env: 'stage', baseUrl: 'https://stage.example.com', key: 'k', 원래키: null, 새비밀번호: '', 역할들: [], API인증들: [] };
    const 보냄 = 보낼모양([받음!, 옛줄!, 새줄]);
    expect([보냄[0]!.appPath, 'appPath' in 보냄[1]!, 보냄[2]!.appPath]).toEqual(['/apk/qa.apk', false, null]);
  });

  it('칸에 적으면 그 줄의 appPath 가 바뀐다', () => {
    const onChange = vi.fn();
    render(<EnvEditor envs={줄로([{ env: 'qa', baseUrl: 'https://qa.example.com' }])} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' }), { target: { value: '/apk/qa.apk' } });
    expect(onChange.mock.calls[0]![0][0].appPath).toBe('/apk/qa.apk');
  });

  it('Android 앱 애플리케이션만 패키지 이름도 받는다고 알린다 — 게임 · 웹은 지금 칸 그대로다', () => {
    const 줄들 = 줄로([{ env: 'qa', baseUrl: 'https://qa.example.com' }]);
    render(<EnvEditor envs={줄들} onChange={vi.fn()} 스토어앱 />);
    expect(screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' }).getAttribute('placeholder')).toBe('앱 파일 경로 또는 패키지 이름');
    expect(screen.getByText('APK 가 없으면 Device VISION 디바이스에 스토어로 설치해 둔 앱의 패키지 이름을 적습니다')).toBeTruthy();
    cleanup();
    render(<EnvEditor envs={줄들} onChange={vi.fn()} 어드민키 />);
    expect(screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' }).getAttribute('placeholder')).toBe('앱 파일 경로 (Android 앱 · 게임)');
    expect(screen.queryByText('APK 가 없으면 Device VISION 디바이스에 스토어로 설치해 둔 앱의 패키지 이름을 적습니다')).toBeNull();
  });
});
