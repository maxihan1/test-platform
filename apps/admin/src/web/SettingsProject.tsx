// 설정 화면의 프로젝트 하나 (SPEC 도메인/인증 §8.8). 탭 셋 — 기본 정보(이름 바꾸기 · 대표 애플리케이션 · 안에 든 애플리케이션 옮기기) · Issue Bunker 연결 · API 서버 이름. 새로 만드는 일은 마법사(SettingsWizard.tsx)가 한다
// 지우는 통로는 없다 — 애플리케이션을 모두 옮겨 비면 서버가 알아서 지운다

import { useState } from 'react';

import { api, type SettingsProject, type SettingsServiceRow } from './api.js';
import { BTS이름 } from './btsName.js';
import { 확인창 } from './ConfirmBox.js';
import { use말, use언어 } from './i18n.js';
import { 오류문장 } from './SettingsService.js';
import { SettingsBts } from './SettingsBts.js';
import { ApiServers } from './SettingsApiServers.js';
import { 구획 } from './SettingsServiceParts.js';
import { SettingsTabs } from './SettingsTabs.js';

export type 프로젝트탭 = 'basic' | 'bts' | 'api';

/** 탭은 주소 링크다 — 새로고침 · 뒤로 가기가 보던 탭을 지킨다 (도메인/인증 §8.8) */
const 주소꼬리: Record<프로젝트탭, string> = { basic: '', bts: '-bts', api: '-api' };
const 주소 = (프로젝트: number, 탭: 프로젝트탭) => `#/settings/project-${프로젝트}${주소꼬리[탭]}`;

/**
 * @param onDone 서버에 반영했다
 * @param onBts저장 Issue Bunker 연결을 저장했다 — 애플리케이션 목록(코드 저장소)만 다시 읽는다
 * @param 탭 주소가 고른 탭. 안 주면 기본 정보다
 */
export function ProjectPanel({
  row,
  projects,
  services,
  onDone,
  onBts저장 = () => undefined,
  탭 = 'basic',
}: {
  row: SettingsProject;
  projects: SettingsProject[];
  services: SettingsServiceRow[];
  onDone: () => void;
  onBts저장?: () => void;
  탭?: 프로젝트탭;
}) {
  const t = use말();
  const 언어 = use언어();
  const [name, setName] = useState(row.name);
  const [대표, set대표] = useState(row.primaryServiceId ?? null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [옮길것, set옮길것] = useState<{ 앱: SettingsServiceRow; 곳: SettingsProject } | null>(null);
  const [저장묻기, set저장묻기] = useState(false);
  const 안의것 = services.filter((it) => it.projectId === row.id);

  async function 한다(일: () => Promise<unknown>) {
    set보내는중(true);
    setErr(null);
    try {
      await 일();
      onDone();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {row.name}
        <span className="set-sub">{t('애플리케이션 {수}개', { 수: 안의것.length })}</span>
      </h2>

      <SettingsTabs
        이름={t('프로젝트 설정')}
        아이디="pj"
        탭들={[
          { 값: 'basic', 이름: t('기본 정보') },
          { 값: 'bts', 이름: t('{bts} 연결', { bts: BTS이름 }) },
          { 값: 'api', 이름: t('API 서버') },
        ].map((it) => ({ ...it, href: 주소(row.id, it.값 as 프로젝트탭) }))}
        고른={탭}
        이동={(값) => {
          window.location.hash = 주소(row.id, 값 as 프로젝트탭);
        }}
      >
        {탭 === 'bts' ? (
          <SettingsBts row={row} services={services} onDone={onBts저장} />
        ) : 탭 === 'api' ? (
          <ApiServers key={row.id} 프로젝트={row.id} />
        ) : (
          <>
          <구획 제목={t('기본 정보')} 쓰임={t('프로젝트 하나에 애플리케이션 여럿이 들어갑니다. 권한은 프로젝트마다 줍니다')}>
            <div className="field">
              <label htmlFor="pf-name">{t('프로젝트 이름')}</label>
              <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('데모마켓')} />
            </div>
            <div className="field">
              <label htmlFor="pf-primary">{t('대표 애플리케이션')}</label>
              <select id="pf-primary" value={대표 ?? ''} onChange={(e) => set대표(e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">{t('선택 안 함')}</option>
                {/* 꺼진 애플리케이션은 목록에 안 뜨니 대표로 골라도 보이지 않는다 */}
                {안의것.filter((it) => it.isActive).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} · {it.prefix}
                  </option>
                ))}
              </select>
              <div className="hint">{t('목록 맨 위에 보이고 프로젝트를 처음 열 때 이 애플리케이션으로 엽니다')}</div>
            </div>
          </구획>

          {err === null ? null : <div className="err">{err}</div>}
          <div className="set-foot">
            <button
              className="btn"
              disabled={보내는중}
              onClick={() => {
                if (name.trim() === '') return;
                set저장묻기(true);
              }}
            >
              {t('저장')}
            </button>
          </div>
          {/* 이름 · 대표 저장도 서버를 바꾸므로 묻는다 (2026-11-26 사용자) */}
          {!저장묻기 ? null : (
            <확인창
              제목={t('{이름} 프로젝트 정보를 저장할까요?', { 이름: row.name })}
              확인={t('저장')}
              onClose={() => set저장묻기(false)}
              on확인={() => {
                set저장묻기(false);
                // 대표는 바꿨을 때만 보낸다 — 이름만 고쳤는데 열 때 읽은 값을 보내면 그사이 다른 사람이 바꾼 대표를 덮는다
                const 바뀐대표 = 대표 === (row.primaryServiceId ?? null) ? {} : { primaryServiceId: 대표 };
                void 한다(() => api.updateProject(row.id, { name: name.trim(), ...바뀐대표 }));
              }}
            >
              <p>{t('프로젝트 이름을 저장하고, 대표 애플리케이션을 변경했으면 그 값도 함께 저장합니다. 언제든 이 화면에서 다시 수정할 수 있습니다')}</p>
            </확인창>
          )}
          {name.trim() === '' ? <div className="hint set-why">{t('이름을 입력해 주세요')}</div> : null}

          <구획 제목={t('애플리케이션 옮기기')} 쓰임={t('옮기면 그 애플리케이션은 옮겨 간 프로젝트의 권한을 따릅니다. 모두 옮기면 빈 프로젝트는 저절로 사라집니다')}>
            {안의것.length === 0 ? <p className="hint">{t('아직 애플리케이션이 없습니다')}</p> : null}
            {안의것.map((it) => (
              <div key={it.id} className="set-row">
                <span className="set-name">{it.name}</span>
                <span className="set-sub">{it.prefix}</span>
                <label className="set-sub" htmlFor={`pf-move-${it.id}`}>
                  {t('옮길 프로젝트')}
                </label>
                <select
                  id={`pf-move-${it.id}`}
                  value={row.id}
                  disabled={보내는중}
                  onChange={(e) => {
                    const 곳 = projects.find((p) => p.id === Number(e.target.value));
                    if (곳 !== undefined && 곳.id !== row.id) set옮길것({ 앱: it, 곳 });
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </구획>
          </>
        )}
      </SettingsTabs>
      {옮길것 === null ? null : (
        <확인창
          제목={t('애플리케이션을 옮길까요?')}
          확인={t('옮기기')}
          onClose={() => set옮길것(null)}
          on확인={() => {
            set옮길것(null);
            void 한다(() => api.updateService(옮길것.앱.id, { projectId: 옮길것.곳.id }));
          }}
        >
          <p>{t('「{이름}」을 「{프로젝트}」 프로젝트로 옮깁니다. 볼 수 있는 사람이 「{프로젝트}」 권한대로 변경됩니다', { 이름: 옮길것.앱.name, 프로젝트: 옮길것.곳.name })}</p>
          {/* 마지막 하나면 서버가 빈 프로젝트를 지운다 — 같이 사라지는 것은 되살릴 길이 없다 (도메인/인증 §8.8) */}
          {안의것.length > 1 ? null : (
            <p>
              <b>{t('마지막 애플리케이션이라 「{프로젝트}」 프로젝트가 삭제됩니다. 아래 항목도 같이 삭제되고 복원할 수 없습니다', { 프로젝트: row.name })}</b>
              <br />
              {t('권한 배정 · 정기 실행 세트 · {bts} 연결과 기록 · 프로젝트 노트 · Scout 대화 · 모니터링 에이전트 · API 서버 이름', { bts: BTS이름 })}
              <br />
              {t('프로젝트 QA 리포트는 목록에서 사라집니다')}
            </p>
          )}
        </확인창>
      )}
    </div>
  );
}
