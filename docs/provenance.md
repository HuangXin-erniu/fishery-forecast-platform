# Provenance

## Source

The initial front end was published from the `t4_platform` subtree at commit:

```text
aee075f434fa63d99535c6ce14d734dbb7d3f76e
```

This repository has independent history. The source project's authoritative repository, real datasets, models, run outputs, AgentHub state, and P01/P02/P03 code are not part of this repository.

## Mapping

`source-manifest.json` records two hash sets:

- `source_files_sha256` — the original source paths and hashes at publication, for example `t4_platform/src/App.tsx`. These values are historical and are not rewritten by later refactors.
- `files_sha256` — the current repository paths and hashes at the time of the refactor. It covers every tracked file except `source-manifest.json` itself.

The repository was renamed to `fishery-forecast-platform` during this refactor. GitHub redirects the previous URL. Git history is preserved; the refactor does not rewrite or squash it.

The initial publication moved the front end from `t4_platform/` to the repository root and normalized the package name. This refactor adds the product name, bilingual README, English docs, Apache-2.0 license, CI, metadata, and a shallow component split; the mock behavior and tests are preserved.

## Exclusions

The following are intentionally not published:

- real fishery data, model weights, and run outputs;
- AgentHub state and internal workflow files;
- P01/P02/P03 source code;
- credentials and environment secrets;
- browser test output, build output, and `node_modules`.

## Verification

From a clean checkout, recompute SHA-256 for every tracked file except the manifest itself:

```sh
python3 - <<'PY'
import hashlib, json, subprocess
from pathlib import Path

manifest = json.loads(Path("source-manifest.json").read_text())
files = [
    p for p in subprocess.check_output(["git", "ls-files"], text=True).splitlines()
    if p != "source-manifest.json"
]
computed = {
    p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    for p in sorted(files)
}
assert computed == manifest["files_sha256"], "file hashes differ"
print(f"{len(computed)} files match source-manifest.json")
PY
```

On Linux/macOS, a manual check is also possible:

```sh
git ls-files -z | grep -zv '^source-manifest.json$' | xargs -0 shasum -a 256
```

The manifest excludes itself so it can be updated without a self-referential hash. If any tracked file changes after the manifest update, recompute `files_sha256` and commit the manifest again.

## Caveats

- The mock data is synthetic; provenance of the source code does not imply provenance of real fishery observations.
- `source_files_sha256` refers to an internal source commit; it is not a release tag or a public download URL.
- The UI is Chinese; the documentation is English, with a Chinese README.

## Related documents

- [Architecture](architecture.md)
- [Development](development.md)
- [README](../README.md)
