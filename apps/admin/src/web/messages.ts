// 영역별로 나눠 둔 영어 표 넷을 한 벌로 합친다 (SPEC §8 「다국어」)
// 나누는 이유는 둘이다 — 한 파일에 전부 넣으면 300줄을 넘고(CLAUDE.md §3),
// 옮기는 작업 넷이 같은 파일을 건드려 나란히 돌지 못한다

import { API문서말 } from './messages/apidoc.js';
import { 계정말 } from './messages/auth.js';
import { 작성말 } from './messages/authoring.js';
import { 작성할일말 } from './messages/authoringTodo.js';
import { 결정말 } from './messages/decide.js';
import { 빌드말 } from './messages/build.js';
import { 케이스말 } from './messages/cases.js';
import { BTS말 } from './messages/bts.js';
import { CI토큰말 } from './messages/ciToken.js';
import { 대시보드말 } from './messages/dashboard.js';
import { 고치기말 } from './messages/edit.js';
import { 오류영어 } from './messages/errors.js';
import { 가이드말 } from './messages/guide.js';
import { 성능말 } from './messages/perf.js';
import { 성능기기말 } from './messages/perfDevices.js';
import { 성능페이지말 } from './messages/perfPages.js';
import { 성능실행말 } from './messages/perfRun.js';
import { 기획서말 } from './messages/prd.js';
import { 실행말 } from './messages/runs.js';
import { 시나리오말 } from './messages/scenario.js';
import { 시나리오마법사말 } from './messages/scenarioWizard.js';
import { 설정말 } from './messages/settings.js';
import { 껍데기말 } from './messages/shell.js';
import { 마법사말 } from './messages/wizard.js';

/** 합치는 차례. 뒤 표가 같은 키를 덮으므로 겹친 키는 영어가 같아야 한다(messages.test.ts) */
export const 표들: Record<string, string>[] = [
  껍데기말,
  케이스말,
  작성말,
  작성할일말,
  결정말,
  고치기말,
  실행말,
  설정말,
  계정말,
  오류영어,
  시나리오말,
  시나리오마법사말,
  대시보드말,
  기획서말,
  가이드말,
  API문서말,
  성능말,
  성능실행말,
  성능페이지말,
  성능기기말,
  마법사말,
  빌드말,
  CI토큰말,
  BTS말,
];

export const 말: Record<string, string> = Object.assign({}, ...표들);
