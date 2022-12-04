// @ts-check

import { promisify } from 'util';
import { exec as execBase } from 'child_process';
import { writeFile } from 'fs/promises';
import pkg from '../package.json' assert { type: 'json' };

const exec = promisify(execBase);

/**
 * Asynchronously yields commit hashes of the given file.
 * @param {string} filename
 */
async function* getCommitsForFile(filename) {
  let revision = 'HEAD';
  const maxCount = 4;
  for (;;) {
    const { stdout, stderr } = await exec(
      // https://git-scm.com/docs/git-log#Documentation/git-log.txt-emHem
      `git log --format=%H --max-count=${maxCount}` +
        ` --skip=${revision === 'HEAD' ? 0 : 1} ${revision} -- ${filename}`,
    );
    if (stderr) throw new Error(stderr);
    if (!stdout) break;
    const lines = stdout.trimEnd().split('\n');
    yield* lines;
    revision = lines.at(-1);
  }
}

/**
 * Reads content of a file at the specified commit.
 * @param {string} revision
 * @param {string} filename
 */
async function readFileAtCommit(revision, filename) {
  const { stdout, stderr } = await exec(`git show ${revision}:${filename}`);
  if (stderr) throw new Error(stderr);
  return stdout;
}

/**
 * Returns the commit hash of the last release.
 */
async function getLastReleaseCommit() {
  const currentVersion = JSON.parse(await readFileAtCommit('HEAD', 'package.json')).version;
  for await (const commit of getCommitsForFile('package.json')) {
    const version = JSON.parse(await readFileAtCommit(`${commit}~1`, 'package.json')).version;
    if (version != currentVersion) return commit;
  }
  return null;
}

/**
 *
 * @param {string} lastReleaseCommit
 */
async function* getChangelogEntriesSince(lastReleaseCommit) {
  const { stdout, stderr } = await exec(
    // https://git-scm.com/docs/git-log#Documentation/git-log.txt-emBem
    `git log ${lastReleaseCommit}..HEAD --first-parent --merges --format="<title>%s</title><description>%b</description>"`,
  );
  if (stderr) throw new Error(stderr);
  for (const [, title, description] of stdout.matchAll(
    /\<title\>(.*)\<\/title\>\<description\>(.*)\<\/description\>/g,
  )) {
    const pr = title.match(/#(\d+)/);
    yield {
      description,
      pr: pr?.[1],
    };
  }
}

async function formatChangelogEntries(changelogEntries) {
  let formatted = '';
  const baseUrl = pkg.repository.url.replace('.git', '');
  for await (const { description, pr } of changelogEntries) {
    formatted += `- ${description}` + (pr ? ` ([#${pr}](${baseUrl}/pull/${pr}))` : '') + '\n';
  }
  return formatted;
}

async function bumpVersion() {
  const { stdout } = await exec(`npm version patch --no-git-tag-version`);
  return stdout;
}

async function main() {
  const lastReleaseCommit = await getLastReleaseCommit();
  const changelogEntries = await getChangelogEntriesSince(lastReleaseCommit);
  const version = await bumpVersion();
  const newChangelog = (await readFileAtCommit('HEAD', 'CHANGES.md')).replace(
    `# CHANGES`,
    `# CHANGES\n\n## ${version}\n${await formatChangelogEntries(changelogEntries)}`,
  );
  writeFile('CHANGES.md', newChangelog);
}
main();
