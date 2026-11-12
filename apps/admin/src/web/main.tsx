// 화면 전체의 진입점 — 스타일을 싣고 앱 뿌리를 붙인다 (앱 뿌리는 App.tsx)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { 앱뿌리 } from './App.js';
import { 고른밝기를건다 } from './theme.js';
import { 칩움직임을건다 } from './motion.js';
import './styles.css';
import './dashboard.css';
import './authoringStatus.css';
import './authoringList.css';
import './decide.css';
import './noticeBar.css';
import './projectPick.css';
import './wizard.css';
import './scenarioWizard.css';
import './scenarioWizardEnd.css';
import './trialLive.css';
import './trialRun.css';
import './trialRunning.css';
import './trialResult.css';
import './noticeDrawer.css';
import './drawer.css';
import './phone.css';
import './runWindow.css';
import './runLive.css';
import './runPrep.css';
import './prd.css';
import './listToc.css';
import './apidoc.css';
import './guide.css';
import './authoringNew.css';
import './bts.css';
import './itemTrace.css';
import './runEvidence.css';
import './runList.css';
import './caseList.css';
import './casePick.css';
import './compat.css';
import './compatResult.css';
import './compatRun.css';
import './perf.css';
import './perfPages.css';
import './perfDevices.css';
import './stability.css';
import './stabilityDetail.css';
import './perfRun.css';
import './scout.css';
import './scoutHud.css';
import './scoutAnswer.css';

고른밝기를건다();
칩움직임을건다();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <앱뿌리 />
  </StrictMode>,
);
