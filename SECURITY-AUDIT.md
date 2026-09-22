# Security Audit Report

**Project:** st-kimai-cli v2.0.1
**Date:** 2026-09-22
**Tooling:** cyclonedx-npm 6.0.1 + npm audit

---

## 1. SBOM

**File:** `bom.json`
**Format:** CycloneDX JSON v1.5
**Component count:** 34 components, 35 dependencies
**Main project component:** `pkg:npm/st-kimai-cli@2.0.1`

Direct declared dependencies (3):

| Package | Version | Purpose |
|---------|---------|---------|
| commander | ^12.0.0 | CLI argument parsing |
| ora | ^5.1.0 | Spinner/loading indicator |
| picocolors | ^1.1.1 | Terminal colors |

Dev dependencies (3):

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.0 | Type checking |
| vitest | ^4.1.7 | Unit testing |
| @types/node | ^20.19.41 | Node.js types |

---

## 2. npm Audit

```
Vulnerabilities: 0 total
  - Critical: 0
  - High:     0
  - Moderate: 0
  - Low:      0
  - Info:     0
```

**Dependency tree scanned:** 110 total packages (33 prod, 78 dev, 34 optional, 3 peer).

The dependency tree is clean. No security advisories apply to this project's dependencies.

---

## 3. Typosquat Check

Checked `package.json` and `package-lock.json` for known typosquat patterns:
`langgchain`, `langchaın`, `requessts`, `openaii`, `anthropicc`, `cross-envx`, `node-sassx`, `colorsx`, `fseventsx`

**Result:** No hits. No look-alike packages detected.

---

## 4. Recommended Actions

### Immediate — No Action Required

The dependency tree is clean. No vulnerabilities were found. No remediation is needed at this time.

### Ongoing Recommendations

1. **Pin dependency ranges** — The `package.json` uses caret ranges (`^`). For reproducible builds, consider pinning to exact versions in production or using a lockfile commit strategy.

2. **Monitor transitive dependencies** — The SBOM captures 35 total dependencies including transitive ones. Re-run `npm audit` and regenerate the SBOM after each `npm update` or dependency change.

3. **Regenerate SBOM on dependency changes** — Run cyclonedx-npm again whenever dependencies change:
   ```bash
   npx @cyclonedx/cyclonedx-npm --output-file bom.json --output-format JSON
   ```

4. **GitHub Advisory Database** — Subscribe to GitHub Advisories for `commander`, `ora`, and `picocolors` to get notified of new vulnerabilities.

---

## 5. Caveats & False Positive Notes

- **npm audit scope** — Only audited the installed tree in `node_modules/`. Does not cover `devDependencies` in CI contexts where `--production` is used.
- **Dev dependencies included in SBOM** — The SBOM reflects the full dev tree since cyclonedx-npm was run without `--omit=dev`. Strip dev components with `--omit=dev` if you need a production-only SBOM.
- **Optional dependencies** — 34 optional packages are present in the lockfile; none are used by this project.
- **Glob vulnerability warning** — `npm warn deprecated glob@10.5.0` appeared during SBOM generation. This is a transitive dependency of the `cyclonedx-npm` tool itself (not this project). The project's own lockfile was not affected.
- **No vulnerabilities does not mean no risk** — Zero advisories means the current dependency versions have no *known* CVEs. New advisories can be published at any time.
