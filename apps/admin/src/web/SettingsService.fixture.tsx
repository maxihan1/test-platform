// SettingsService 화면 검사들이 같이 쓰는 애플리케이션 줄 하나와 그리는 도우미

import { render } from '@testing-library/react';

import type { SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';

export const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSS',
  name: '설정 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  testsRepo: 'https://github.com/example/tests',
  testsDir: 'zss',
  isActive: true,
  caseCount: 3,
};

export function 그린다() {
  render(<ServicePanel row={서비스} onDone={() => {}} />);
}
