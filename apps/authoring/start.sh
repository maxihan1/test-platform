#!/bin/sh
# 작성 에이전트 컨테이너 시작 — root 확인 · 비밀값 확인 · 에이전트·호스트 git 설정 · 부품 맞추기(호스트 uid) · 에이전트 실행 (SPEC 공통/6 §9)
set -e

deny() { echo "[거부] $1" >&2; exit 1; }

# git·gh 설정. 에이전트(root)의 집과 호스트 uid 의 집에 한 벌씩 — 서버 저장소에 쓰는 git 은 호스트 uid 로 돈다
git_setup() {
  # 저장소 주인이 다른 uid 라 git 이 「남의 폴더」라며 거부한다
  git config --global --add safe.directory '*'
  git config --global user.name "${AUTHORING_GIT_NAME:-test-platform authoring}"
  git config --global user.email "${AUTHORING_GIT_EMAIL:-authoring@test-platform.invalid}"
  # push·fetch 는 GH_TOKEN 으로 한다. 자식에게는 자식환경이 빈 credential.helper 와 가짜 토큰을 준다
  gh auth setup-git
  # 서버 저장소 원격이 ssh(git@github.com:…)여도 https 로 돌린다 — 컨테이너에는 ssh 키가 없다
  git config --global url."https://github.com/".insteadOf "git@github.com:"
  git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"
}

# 호스트 uid 로 다시 불린 경우 — 그 집에 설정만 하고 끝낸다
if [ "${1:-}" = git-setup ]; then
  cd /
  git_setup
  exit 0
fi

# **root 로 켠다** (2026-09-24) — 자식 claude 를 다른 uid 로 띄워야 /proc/<pid>/environ 으로 에이전트의 토큰을 못 읽는다
[ "$(id -u)" = 0 ] || deny "root 로 켜야 한다 — docker-compose.yml 의 author 에 user: 가 있으면 지워라 (docs/SETUP.md §8)"
case "${HOST_UID:-}" in ''|*[!0-9]*) deny "HOST_UID 가 숫자가 아니다 — 서버 저장소 주인의 id -u 를 .env 에 적어라" ;; esac
HOST_GID="${HOST_GID:-$HOST_UID}"
case "${AUTHORING_CHILD_UID:-}" in ''|*[!0-9]*) deny "AUTHORING_CHILD_UID 가 숫자가 아니다 — 비우면 자식이 root 로 돈다" ;; esac
as_host() { setpriv --reuid="$HOST_UID" --regid="$HOST_GID" --clear-groups env HOME="$HOST_HOME" "$@"; }

# 켤 때마다 비우고 시작한다 — 재시작하면 남은 .gitconfig 에 insteadOf 가 겹쳐 git config 가 죽고(set -e),
# 앞에서 남긴 설정이 다음으로 이어지지 않는다
export HOME=/tmp/author-home
export HOST_HOME=/tmp/author-host-home
rm -rf "$HOME" "$HOST_HOME"
mkdir -p "$HOME/.claude" "$HOST_HOME"
chmod 700 "$HOME"
chown "$HOST_UID:$HOST_GID" "$HOST_HOME"
chmod 700 "$HOST_HOME"
# 설정은 저장소 밖에서 한다 — git 은 --global 이어도 지금 폴더의 저장소를 먼저 찾고, 거기가 깨져 있으면 죽는다
cd /

# 구독 토큰인지 모양으로 본다 — API 키(sk-ant-api…)면 실비로 청구된다. 추가 비용 0 이 전제다
case "${CLAUDE_CODE_OAUTH_TOKEN:-}" in
  sk-ant-oat*) ;;
  *) deny "CLAUDE_CODE_OAUTH_TOKEN 이 구독 토큰(sk-ant-oat…)이 아니다. claude setup-token 으로 만든 값을 .env 에 넣어라 (docs/SETUP.md §8)" ;;
esac
[ -n "${GH_TOKEN:-}" ] || deny "GH_TOKEN 이 비어 있다. PR 열기·병합 권한 토큰을 .env 에 넣어라 (docs/SETUP.md §8)"
[ -n "${AUTHORING_AGENT_TOKEN:-}" ] || deny "AUTHORING_AGENT_TOKEN 이 비어 있다. 설정 > 계정 > 작성 계정 > 에이전트 토큰 [발급] 값을 .env 에 넣어라"

git_setup
as_host /usr/local/bin/authoring-start git-setup

# 선행검사가 사용자 설정 자리에서 셸이 열려 있는지 본다. 자식은 작업마다 새 집에 따로 받는다
printf '{"permissions":{"allow":["Bash(*)"]}}\n' > "$HOME/.claude/settings.json"

# 맥에서 절대경로로 건 훅은 여기 없다 — 조용히 꺼지므로 알린다. 작성은 계속된다
hooks=$(git -C /repo config --get core.hooksPath || true)
case "$hooks" in
  /*) [ -d "$hooks" ] || echo "[알림] core.hooksPath($hooks) 가 컨테이너에 없어 pre-push 훅이 안 돈다. 상대경로 .claude/hooks 로 걸면 돈다" ;;
esac

# 부품은 호스트 uid 소유 0755 — 자식 uid 가 부품에 못 쓴다(쓰면 다음에 켤 때 root 가 그 코드를 돌린다)
chown "$HOST_UID:$HOST_GID" /repo/node_modules
chmod 755 /repo/node_modules
# lock 이 바뀌었으면 부품을 다시 맞춘다 — 볼륨은 처음 한 번만 채워져 옛 판이 남는다 (2026-09-23 계획 검토)
new_sha=$(sha256sum /repo/package-lock.json | cut -d' ' -f1)
old_sha=$(cat /repo/node_modules/.lock-sha256 2>/dev/null || true)
if [ "$new_sha" != "$old_sha" ]; then
  echo "[작성] 부품을 맞춘다 (package-lock 이 바뀌었다) — 처음엔 1~2분 걸린다"
  as_host sh -c 'cd /repo && npm ci --no-audit --no-fund'
  as_host sh -c "echo $new_sha > /repo/node_modules/.lock-sha256"
fi

echo "[작성] Claude CLI $(claude --version 2>/dev/null || echo '없음') — 켜면 에이전트가 ${AUTHORING_CLAUDE_VERSION:-stable} 로 올린다(끄려면 AUTHORING_CLAUDE_AUTOUPDATE=0)"
mkdir -p /work
chmod 755 /work
cd /repo
exec npx tsx scripts/authoring-agent.ts
