// rebrand.js
// Usage: node rebrand.js
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TEXT_EXTS = new Set([
  ".md",".txt",".json",".js",".jsx",".ts",".tsx",".mjs",".cjs",".yml",".yaml",
  ".env",".env.local",".html",".css",".scss",".sass",".less",".svg",".toml",".ini",
  ".sh",".py",".babelrc",".eslintrc",".prettierrc",".tsconfig",".npmrc",".nvmrc",".mdx"
]);
const SKIP_DIRS = new Set(["node_modules",".next","out","build","dist",".git",".vercel"]);

const REPLACES = [
  // عبارات صريحة
  { pattern: /OnChain Clinic/gi, to: "OnChain Clinic" },
  // أسماء باكيج ومعرّفات
  { pattern: /onchain-clinic/g, to: "onchain-clinic" },
  { pattern: /onchain-clinic/g, to: "onchain-clinic" },
  { pattern: /onchain-clinic/g, to: "onchain-clinic" },
  { pattern: /onchain-clinic/g, to: "onchain-clinic" },
];

function isTextFile(p) { return TEXT_EXTS.has(path.extname(p).toLowerCase()); }
function shouldSkipDir(dir) { return SKIP_DIRS.has(path.basename(dir)); }

function walk(dir, files=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!shouldSkipDir(p)) walk(p, files);
    } else {
      files.push(p);
    }
  }
  return files;
}

function backupOnce() {
  const bk = path.join(ROOT, ".rebrand_backup");
  if (!fs.existsSync(bk)) fs.mkdirSync(bk);
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const dest = path.join(bk, `backup-${stamp}.zip`);
  console.log("Creating backup zip:", dest);
  const { execSync } = require("child_process");
  try {
    // يعمل على ويندوز/لينكس/ماك إذا فيه zip
    execSync(`zip -r "${dest}" "." -x "node_modules/*" ".next/*" "dist/*" "build/*" ".git/*"`, { stdio: "inherit" });
  } catch {
    console.warn("Skipping zip backup (zip not found).");
  }
}

function patchPackageJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  try {
    const data = JSON.parse(raw);
    let changed = false;
    if (typeof data.name === "string" && data.name !== "onchain-clinic") {
      data.name = "onchain-clinic"; changed = true;
    }
    for (const k of ["title","productName","appName"]) {
      if (typeof data[k] === "string") { data[k] = "OnChain Clinic"; changed = true; }
    }
    if (changed) {
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      console.log("Updated", p);
    }
  } catch { /* ignore */ }
}

function main() {
  backupOnce();

  const all = walk(ROOT);
  let total = 0, touched = 0;

  for (const f of all) {
    const rel = path.relative(ROOT, f);
    if (!isTextFile(f)) continue;

    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
    const orig = text;

    for (const rule of REPLACES) text = text.replace(rule.pattern, rule.to);

    if (path.basename(f) === "package.json") {
      // تصحيح package.json
      try {
        const data = JSON.parse(text);
        let changed = false;
        if (typeof data.name === "string" && data.name !== "onchain-clinic") {
          data.name = "onchain-clinic"; changed = true;
        }
        for (const k of ["title","productName","appName"]) {
          if (typeof data[k] === "string") { data[k] = "OnChain Clinic"; changed = true; }
        }
        if (changed) text = JSON.stringify(data, null, 2);
      } catch { /* ignore */ }
    }

    if (text !== orig) {
      fs.writeFileSync(f, text, "utf8");
      touched++;
      // عدّ تغييرات تقريبية
      const count = (orig.match(/OnChain Clinic/gi)||[]).length
                  + (orig.match(/onchain-clinic/g)||[]).length
                  + (orig.match(/onchain-clinic/g)||[]).length
                  + (orig.match(/onchain-clinic/g)||[]).length
                  + (orig.match(/onchain-clinic/g)||[]).length;
      total += count;
      console.log("Rewrote:", rel, "| approx changes:", count);
    }
  }

  // README إن لم يوجد
  const readme = path.join(ROOT, "README.md");
  if (!fs.existsSync(readme)) {
    const banner = [
      "# OnChain Clinic",
      "",
      "> This project was rebranded from **OnChain Clinic** to **OnChain Clinic**.",
      "If you find any leftover naming, please open an issue.",
      ""
    ].join("\n");
    fs.writeFileSync(readme, banner, "utf8");
    console.log("Created README.md banner");
  }

  // تحديث manifest/metadata الشائعة إن وُجدت
  for (const candidate of [
    "app/manifest.json","public/manifest.json","public/site.webmanifest","next.config.js",
    "app/layout.tsx","app/layout.jsx","src/app/layout.tsx","src/app/layout.jsx"
  ]) {
    const p = path.join(ROOT, candidate);
    if (fs.existsSync(p) && isTextFile(p)) {
      try {
        let t = fs.readFileSync(p, "utf8");
        const o = t;
        t = t.replace(/("name"\s*:\s*")([^"]+)(")/g, '$1OnChain Clinic$3')
             .replace(/("short_name"\s*:\s*")([^"]+)(")/g, '$1OnChain Clinic$3')
             .replace(/(<title>)([^<]+)(<\/title>)/gi, '$1OnChain Clinic$3');
        if (t !== o) { fs.writeFileSync(p, t, "utf8"); console.log("Updated meta:", candidate); }
      } catch {}
    }
  }

  console.log(`\nDone. Files touched: ${touched}, approx replacements: ${total}`);
}

main();
