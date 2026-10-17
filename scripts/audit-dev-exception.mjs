#!/usr/bin/env node
/**
 * Temporary, narrowly scoped development-only npm audit exception.
 * GHSA-vfj7-8cjw-p6xm affects braces and its ESLint-only dependency chain.
 * Remove this exception as soon as a compatible upstream fix is available.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['audit', '--json', '--audit-level=high'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error('npm audit returned invalid JSON:', result.stderr || result.stdout);
  process.exit(1);
}
if (report.error) {
  console.error('npm audit could not complete:', JSON.stringify(report.error));
  process.exit(1);
}
const allowedPackages = new Set([
  'braces', 'micromatch', 'fast-glob',
  '@next/eslint-plugin-next', 'eslint-config-next',
]);
const advisory = 'GHSA-vfj7-8cjw-p6xm';
const vulnerabilities = report.vulnerabilities || {};
const failures = [];
let exceptions = 0;
for (const [name, finding] of Object.entries(vulnerabilities)) {
  if (!['high', 'critical'].includes(finding.severity)) continue;
  const sources = finding.via || [];
  const onlyAllowedSources = sources.length > 0 && sources.every(source => {
    if (typeof source === 'string') return allowedPackages.has(source);
    return source.url === 'https://github.com/advisories/' + advisory
      && source.name === 'braces';
  });
  if (allowedPackages.has(name) && finding.isDirect !== true
      && finding.isDev === true && onlyAllowedSources) {
    exceptions++;
    console.warn('Temporary dev-only exception:', name, advisory);
  } else {
    failures.push(name);
  }
}
if (failures.length) {
  console.error('Unapproved high/critical npm audit findings:', failures.join(', '));
  process.exit(1);
}
if (result.status !== 0 && exceptions === 0) {
  console.error('npm audit failed without a recognized exception.');
  process.exit(1);
}
console.log('Audit completed; temporary dev-only exceptions:', exceptions);
