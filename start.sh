#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backend_port="${BACKEND_PORT:-8000}"
frontend_port="${FRONTEND_PORT:-5173}"
python_bin="${PYTHON_BIN:-python3}"

supports_node() {
  "$1" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19)) ? 0 : 1)'
}

if ! command -v node >/dev/null 2>&1 || ! supports_node "$(command -v node)"; then
  compatible_node=""
  for candidate in "$HOME"/.nvm/versions/node/v*/bin/node; do
    if [[ -x "$candidate" ]] && supports_node "$candidate"; then
      compatible_node="$candidate"
    fi
  done
  if [[ -z "$compatible_node" ]]; then
    echo "Node.js 22.12+ (ou 20.19+) est requis." >&2
    exit 1
  fi
  export PATH="$(dirname "$compatible_node"):$PATH"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm est introuvable." >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  for port in "$backend_port" "$frontend_port"; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Le port $port est déjà utilisé. Arrêtez le serveur existant ou définissez BACKEND_PORT et FRONTEND_PORT." >&2
      exit 1
    fi
  done
fi

cd "$project_dir"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Configuration locale créée dans .env"
fi

if [[ ! -x .venv/bin/python ]]; then
  "$python_bin" -m venv .venv
fi
if [[ ! -x .venv/bin/uvicorn || ! -x .venv/bin/alembic ]]; then
  .venv/bin/python -m pip install -r backend/requirements.txt
fi
if [[ ! -d frontend/node_modules ]]; then
  (cd frontend && npm ci)
fi

(cd backend && ../.venv/bin/alembic upgrade head)

backend_pid=""
frontend_pid=""
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$backend_pid" ]]; then kill "$backend_pid" 2>/dev/null || true; fi
  if [[ -n "$frontend_pid" ]]; then kill "$frontend_pid" 2>/dev/null || true; fi
  if [[ -n "$backend_pid" ]]; then wait "$backend_pid" 2>/dev/null || true; fi
  if [[ -n "$frontend_pid" ]]; then wait "$frontend_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

(cd backend && ../.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port "$backend_port") &
backend_pid=$!
(cd frontend && BACKEND_PORT="$backend_port" node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$frontend_port" --strictPort) &
frontend_pid=$!

ready=false
for _ in {1..40}; do
  if ! kill -0 "$backend_pid" 2>/dev/null || ! kill -0 "$frontend_pid" 2>/dev/null; then
    echo "Un des serveurs s’est arrêté pendant le démarrage." >&2
    exit 1
  fi
  if curl -fsS "http://127.0.0.1:$backend_port/api/health" >/dev/null 2>&1 &&
     curl -fsS "http://127.0.0.1:$frontend_port/" >/dev/null 2>&1; then
    echo "Tempo est prêt : http://127.0.0.1:$frontend_port/"
    echo "Appuyez sur Ctrl+C pour arrêter les deux serveurs."
    ready=true
    break
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then
  echo "Les serveurs n’ont pas répondu dans le délai prévu." >&2
  exit 1
fi

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
echo "Un des serveurs s’est arrêté." >&2
exit 1
