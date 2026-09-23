#!/bin/sh
# 작성 에이전트 컨테이너 시작 — 비밀값 확인 · git·gh·claude 설정 · 부품 맞추기 · 에이전트 실행 (SPEC 공통/6 §9)
set -e

deny() { echo "[거부] $1" >&2; exit 1; }

# 호스트 uid 로 돌면 /etc/passwd 에 없는 사용자라 HOME 이 없다. 쓸 수 있는 자리를 만든다
export HOME=/tmp/author-home
mkdir -p "$HOME/.claude"
# 설정은 저장소 밖에서 한다 — git 은 --global 이어도 지금 폴더의 저장소를 먼저 찾고, 거기가 깨져 있으면 죽는다
cd /

# 구독 토큰인지 모양으로 본다 — API 키(sk-ant-api…)면 실비로 청구된다. 추가 비용 0 이 전제다
case "${CLAUDE_CODE_OAUTH_TOKEN:-}" in
  sk-ant-oat*) ;;
  *) deny "CLAUDE_CODE_OAUTH_TOKEN 이 구독 토큰(sk-ant-oat…)이 아니다. claude setup-token 으로 만든 값을 .env 에 넣어라 (docs/SETUP.md §8)" ;;
esac
[ -n "${GH_TOKEN:-}" ] || deny "GH_TOKEN 이 비어 있다. PR 열기·병합 권한 토큰을 .env 에 넣어라 (docs/SETUP.md §8)"
[ -n "${AUTHORING_AGENT_TOKEN:-}" ] || deny "AUTHORING_AGENT_TOKEN 이 비어 있다. 설정 > 계정 > 작성 계정 > 에이전트 토큰 [발급] 값을 .env 에 넣어라"

# 저장소 주인이 호스트 사용자라 git 이 「남의 폴더」라며 거부한다
git config --global --add safe.directory '*'
git config --global user.name "${AUTHORING_GIT_NAME:-test-platform authoring}"
git config --global user.email "${AUTHORING_GIT_EMAIL:-authoring@test-platform.invalid}"
# push 는 GH_TOKEN 으로 한다. 자식에게는 자식환경이 빈 credential.helper 와 가짜 토큰을 준다
gh auth setup-git
# 서버 저장소 원격이 ssh(git@github.com:…)여도 https 로 돌린다 — 컨테이너에는 ssh 키가 없다
git config --global url."https://github.com/".insteadOf "git@github.com:"
git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"

# 자식 세션이 관문을 돌리려면 셸이 열려 있어야 한다 — 선행검사가 사용자 설정 자리에서 이것을 본다
printf '{"permissions":{"allow":["Bash(*)"]}}\n' > "$HOME/.claude/settings.json"

# 맥에서 절대경로로 건 훅은 여기 없다 — 조용히 꺼지므로 알린다. 작성은 계속된다
hooks=$(git -C /repo config --get core.hooksPath || true)
case "$hooks" in
  /*) [ -d "$hooks" ] || echo "[알림] core.hooksPath($hooks) 가 컨테이너에 없어 pre-push 훅이 안 돈다. 상대경로 .claude/hooks 로 걸면 돈다" ;;
esac

# lock 이 바뀌었으면 부품을 다시 맞춘다 — 볼륨은 처음 한 번만 채워져 옛 판이 남는다 (2026-09-23 계획 검토)
new_sha=$(sha256sum /repo/package-lock.json | cut -d' ' -f1)
old_sha=$(cat /repo/node_modules/.lock-sha256 2>/dev/null || true)
if [ "$new_sha" != "$old_sha" ]; then
  echo "[작성] 부품을 맞춘다 (package-lock 이 바뀌었다) — 처음엔 1~2분 걸린다"
  (cd /repo && npm ci --no-audit --no-fund)
  echo "$new_sha" > /repo/node_modules/.lock-sha256
fi

cd /repo
exec npx tsx scripts/authoring-agent.ts
