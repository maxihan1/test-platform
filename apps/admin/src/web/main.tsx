// 화면 전체의 진입점. 해시를 읽어 화면 하나를 고르고 상단 이동 줄을 그린다

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { CaseList } from './CaseList.js';
import { ItemDetail } from './ItemDetail.js';
import { route } from './route.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RunSetup } from './RunSetup.js';
import './styles.css';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Screen({ hash }: { hash: string }) {
  const current = route(hash);

  switch (current.name) {
    case 'cases':
      return <CaseList />;
    case 'setup':
      return <RunSetup tcId={current.tcId} />;
    case 'runs':
      return <RunList />;
    case 'run':
      return <RunResult runId={current.runId} />;
    case 'item':
      return <ItemDetail runId={current.runId} historyId={current.historyId} />;
    default:
      return (
        <div className="screen">
          <div className="empty">
            없는 주소입니다. <a href="#/cases">케이스 목록으로</a>
          </div>
        </div>
      );
  }
}

function App() {
  const hash = useHash();
  const current = route(hash);
  const here = (name: string) => (current.name === name ? { 'aria-current': 'page' as const } : {});

  return (
    <div className="wrap">
      <nav className="nav">
        <a href="#/cases" {...here('cases')}>
          케이스 목록
        </a>
        <a href="#/runs" {...here('runs')}>
          실행 기록
        </a>
      </nav>
      <Screen hash={hash} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
