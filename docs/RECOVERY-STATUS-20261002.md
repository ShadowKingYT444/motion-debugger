# Motion Debugger recovery status

Status at 2026-10-02 18:30:54 UTC: **blocked checkpoint recovery; no fresh ablation launched**.

The authorized private repository was cloned independently at `63eff24c88dcbf42438230117834d8247e103367` on `release/v0.3`. CivicLens was left untouched. The recovery branch is `work/demo-evidence-recovery-20261002`.

## Recovered source and verified core

Candidate PR #3 source commit: `20fcba29f6a573a92124e4c516f8a1d7e646a1a6`.
[CI run 37047041289](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37047041289) completed successfully at 2026-10-02 18:30:47 UTC. Its API head SHA matches the candidate. All verification steps completed successfully, including real browser capture, temporal contracts, packed consumer installation, saved-study browser smoke, and actual recordings.

The candidate's core patch was cherry-picked as `beee6a175bae800673403fb8c34e6710795f9150`. The private remote recovery branch preserves the original candidate commit directly; the local cherry-pick is a reconstruction. A Git diff confirmed identical core, CLI, MCP, tests/v2, build script and lockfiles against the candidate. Previously successful full baseline checks were not rerun.

Source SHA256:
- `packages/core/analysis.ts`: `b19bdc7655659612638079ad402d52cac5b1c0f0e4a0cf889d0a372b8e29728b`
- `package-lock.json`: `db8b3354206ddfafc71e51348fbc6b7de09d595803dce8ae0df6cfd92c575f08`

Candidate source tree: `0fa704907ac4282d73b7cfbde17e1e02f0df27f2`.
Base source tree: `e136631abb2d051597f0e7dfeed77a6a22646643`.

CI artifact ID `11245606667` is reported under that run, with archive digest `sha256:8e84edda79678a4ad14820c7f6617c8fc0e4afa8c6ea11af9c5fcf1b80ffb83b` and expiration 2026-10-09. It was not downloaded or independently inspected here. Its artifact name includes another hash; that name is not treated as source provenance. Existing historical [README](../README.md), [AER recordings and results](../studies/aer/README.md), and [AER method](../studies/aer/METHOD.md) remain historical evidence only.

## Checkpoint blocker

Confirmed Library item: `libfile_17b403f3e8488191b555d7182518daff`, filename `Motion-Debugger-Checkpoint-6d421b9.bundle`, size **34,455,032 bytes**.

The supplied backing ID `backingfile_00000000ae3881f697cc629e911842dc` was rejected as mismatched. Resolving the confirmed Library identity returned authorized file ID `file_00000000ae3881f697cc629e911842dc`.

The current Library materialization helper was fetched into this executor. Its download failed, including one retry with reviewed network access. The consumer-local Library search/download helper also failed because its authenticated app request could not reach the network. The executor's alternate supported file-transfer tool rejected the file because it exceeds its 32 MiB limit (33,554,432 bytes). No download URL was guessed, and no parent/other-child paths were assumed.

**No readable bundle bytes exist in this executor.** Bundle integrity and hash cannot be asserted. The expected bundle branch `work/demo-evidence-63eff24` is absent from the private remote, so it cannot substitute for Library recovery. Expected bundle head remains unverified: `6d421b9ce805d3d92954430e104201b47e92777d`.

Consequently, `handoff/motion-checkpoint-evidence.tar.gz`, the checkpoint viewer changes, source commits, prompt hashes, common first-agent output, and frozen runtime were not recovered. The previously reported 11 viewer unit tests and browser pass, supplemental rapid-reopen failure, interrupted arms and unknown active budgets are inherited checkpoint notes, not newly verified results.

## Required clean experiment

Both arms must restart from the exact same recovered common first-agent output. Interrupted or partially repaired arms must not be continued.

Use at most two fresh source-editing repair agents, with requested model `gpt-6.1-sol`, reasoning effort high, STANDARD service, identical brief, elapsed-time budget, design guidance, browser tools, and UI editing authority. Both may improve aesthetics, 3D realism, layout and motion. The treatment adds only Motion Debugger workflow/tools/evidence. No cross-arm diagnoses or source inspection. Use a bounded DAG with at most two repair attempts per arm.

Freeze and hash the actual runtime before launching either arm. Predeclare identical held-out functional and motion checks plus actual desktop/mobile screenshots and timed recordings. Retain the 80 ms integrity threshold and all failures; do not manufacture frames or promise a treatment win.

The collaboration tool exposes the requested model and effort overrides but documents Priority service only and has no service-tier argument. STANDARD cannot be confirmed through that interface. No Fast request or extra agent thread was launched. Local Codex CLI exists, but its effective model/tier availability was not tested by launching a billable repair session.

Fresh arm budget used: **zero agent sessions; zero repair attempts**. Fresh arm budget allocation: not started. Prior active budgets: unknown. No common-source, frozen-runtime or new video hash is claimed.

## Next consumer action

Restore supported local access to the same checkpoint, or have the checkpoint owner supply verified smaller transfer parts (each at most 32 MiB) or push the exact checkpoint branch to this authorized private repository. Verify readable bytes and expected bundle head before extraction. Confirm a STANDARD-capable agent launch interface before both arms start.

Continue integration of the recovered viewer, tested core and new case in the private draft PR after recovery. Preserve historical AER unchanged and label it as not the requested ablation. No merge, public release, npm publication or deployment is authorized here.
