# tmux workspace for supervising Claude Code sessions

A one-command tmux layout for working with many Claude Code background sessions at once: Kubernetes watch panes, the Claude agent view, and five session panes that keep themselves pointed at the sessions that matter.

Tested on macOS with tmux 3.x and Claude Code 2.1.3xx. It depends on `claude agents --json` and `claude attach`, which may change between versions.

## Layout

| Window | Panes |
|---|---|
| `k8s` | pods (refreshing), namespaces (refreshing), and a followed log stream for one workload |
| `claude` | top-left: the real `claude agents` view; top-right: a terminal; bottom row: five session panes |
| `tools` | `brew update && brew outdated`, and a terminal |

Each session pane has a border label `<session name> · <working | needs input | done>` and a thin strip underneath with `worktree · <name>` and the git branch. Switch windows with `Ctrl-b 1/2/3`.

## Install

```sh
mkdir -p ~/bin
cp niyama-tmux niyama-tmux-sync ~/bin/      # keep the two files together
chmod +x ~/bin/niyama-tmux ~/bin/niyama-tmux-sync
```

Add to `~/.zshrc` (and make sure `~/bin` is on `PATH`):

```sh
export PATH="$HOME/bin:$PATH"
alias nt=niyama-tmux
```

Run `nt` from any directory. Every pane starts in that directory, or in `$REPO` if set. Running it again attaches to the existing session. To rebuild after changing the scripts: `tmux kill-session -t niyama && nt`.

## How the session panes choose what to show

The five bottom panes behave as an LRU cache over your background sessions. A loop started with the workspace runs `niyama-tmux-sync` every 10 seconds (it stops when the tmux session ends):

1. **Recent activity** ranks first: the session is working now, or its last real user/assistant message is under 30 minutes old.
2. **Status** breaks ties between equally active sessions: needs input, then working, then finished.
3. **Recency** orders what is left.

A session you are not looking at is only replaced when a better-ranked session needs the slot. Rules that keep it from getting in your way:

- the pane you are focused on is never swapped, so a swap cannot land while you type;
- one session replaces another of the same rank only if it is at least 60 seconds fresher (no thrashing);
- a finished session you used in the last 30 minutes still gets a pane, so a quick question and reply is not missed;
- a stale session waiting for input stays eligible but ranks last, so it only fills a slot nothing else wants.

Activity is the timestamp of the last real message in the session transcript, not the file's modified time. Attaching a viewer appends bookkeeping lines to the transcript, and using the file time made a displayed session look fresh forever.

## Configuration

Environment variables when launching: `REPO` (pane working directory), `LOG_NS` and `LOG_SELECTOR` (what the k8s log pane follows; defaults `default` and `app=api`), `SYNC_SECS` (refresh interval, default 10), `NO_ATTACH=1` (build without attaching).

Constants at the top of `niyama-tmux-sync`: `MARGIN`, `ACTIVITY`.

To keep a session out of the panes, add its id prefix or part of its name to `~/.config/niyama-tmux/exclude`, one per line (`#` starts a comment). It is read every cycle, so no restart is needed. This is useful for the session you launch the workspace from, which is otherwise the most recently active one.

## Limits

- Selection uses what `claude agents --json` reports and transcript timestamps on disk. Sessions that never write a transcript are ranked by start time.
- A pane swap replaces the viewer, not the session. A half-typed message in an unfocused pane is lost.
- Opening a session from the agent view in the top-left pane can show it twice, because the sync may also attach it in a bottom pane.
