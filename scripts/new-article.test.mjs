import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import matter from "gray-matter";

const run = promisify(execFile);
const script = fileURLToPath(new URL("./new-article.mjs", import.meta.url));

async function draftDirectory(t) {
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), "resume-new-article-test-")));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("long titles do not leave a hyphen at the slug truncation boundary", async (t) => {
  const directory = await draftDirectory(t);
  const title = "The Most Powerful Model on the Market Got Pulled by the Government in 3 Days. Is It Real, or a Hype Bubble?";
  const { stdout } = await run(process.execPath, [script, title], { cwd: directory });
  const target = stdout.trim();
  const { data } = matter(await readFile(target, "utf8"));

  assert.equal(data.slug, "the-most-powerful-model-on-the-market-got-pulled-by-the-government-in-3-days-is-it-real");
  assert.match(data.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(data.slug.length <= 88);
  assert.equal(target, path.join(directory, "content/articles", `${data.slug}.md`));
  assert.equal(data.canonicalUrl, `https://sergei-parfenov.com/blog/${data.slug}/`);
  assert.equal(data.title, title);
  assert.equal(data.published, false);
});

test("ordinary titles still create correctly named unpublished drafts", async (t) => {
  const directory = await draftDirectory(t);
  const title = "A Practical Guide to Reliable Agents";
  const { stdout } = await run(process.execPath, [script, title], { cwd: directory });
  const target = path.join(directory, "content/articles/a-practical-guide-to-reliable-agents.md");
  const { data, content } = matter(await readFile(target, "utf8"));

  assert.equal(stdout.trim(), target);
  assert.equal(data.slug, "a-practical-guide-to-reliable-agents");
  assert.equal(data.title, title);
  assert.equal(data.published, false);
  assert.equal(data.source, "local");
  assert.equal(data.canonicalUrl, "https://sergei-parfenov.com/blog/a-practical-guide-to-reliable-agents/");
  assert.ok(content.includes("Write the article here."));
});

test("creating a duplicate draft fails without overwriting existing work", async (t) => {
  const directory = await draftDirectory(t);
  const title = "Preserve My Draft";
  const { stdout } = await run(process.execPath, [script, title], { cwd: directory });
  const target = stdout.trim();
  const edited = `${await readFile(target, "utf8")}\nAn existing edit that must survive.\n`;
  await writeFile(target, edited, "utf8");

  await assert.rejects(run(process.execPath, [script, title], { cwd: directory }), (error) => {
    assert.equal(error.code, 1);
    assert.ok(error.stderr.includes(`Article already exists: ${target}`));
    return true;
  });
  assert.equal(await readFile(target, "utf8"), edited);
  assert.deepEqual(await readdir(path.dirname(target)), ["preserve-my-draft.md"]);
});
