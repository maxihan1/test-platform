// 설정 마법사 검사 두 파일이 나눠 쓰는 그리기 · 넘기기 도우미 (SettingsWizard.test.tsx · SettingsWizard.kinds.test.tsx)

import { vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { SettingsServiceRow } from './api.js';
import { SettingsWizard } from './SettingsWizard.js';

export const 프로젝트들 = [
  { id: 1, name: '데모마켓' },
  { id: 2, name: '사내 포털' },
];

export const 있는앱: SettingsServiceRow = {
  id: 5,
  prefix: 'MKW',
  name: '데모마켓 웹',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'mkw',
  isActive: true,
  caseCount: 0,
};

export function 그린다(덧: { 새프로젝트?: boolean; 기본프로젝트?: number; 고를수있나?: (번호: number) => boolean; 내프로젝트?: (번호: number) => boolean } = {}) {
  const 끝 = { on만듦: vi.fn(), on작성: vi.fn(), on설정: vi.fn() };
  render(
    <SettingsWizard
      새프로젝트={덧.새프로젝트 ?? false}
      projects={프로젝트들}
      services={[있는앱]}
      기본프로젝트={덧.기본프로젝트}
      나가는곳="#/settings/MKW"
      고를수있나={덧.고를수있나 ?? (() => true)}
      내프로젝트={덧.내프로젝트 ?? (() => true)}
      {...끝}
    />,
  );
  return 끝;
}

export const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));
export const 종류카드들 = () => within(screen.getByRole('group', { name: '종류' })).getAllByRole('button');
export const 종류를고른다 = (이름: string) => fireEvent.click(종류카드들().find((it) => it.querySelector('.wz-kind-h')?.textContent === 이름)!);
export const 까닭 = () => screen.getByRole('alert').textContent;
export const 단계들 = () => [...document.querySelectorAll('.wz-steps .wz-stepbtn')].map((it) => it.textContent);

export function 이름을채운다(접두사: string, 이름: string) {
  fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 접두사 } });
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: 이름 } });
}

export function 서버를더한다(키: string, 주소: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
  fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 키 } });
  fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 주소 } });
}

/** 프로젝트는 미리 골라 둔 것으로, 웹 애플리케이션 PAY 를 확인 단계까지 넘긴다 */
export function 확인까지(종류 = '웹') {
  다음();
  종류를고른다(종류);
  다음();
  이름을채운다('PAY', '결제');
  다음();
  다음();
  다음();
}
