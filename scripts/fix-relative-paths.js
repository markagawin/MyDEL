// Expo's classic (non-router) web export always injects a few absolute
// root-relative paths (favicon link, main script src, and static asset
// references baked into the JS bundle). That's fine when hosting at a
// domain root, but breaks under a subpath host like GitHub Pages
// (https://user.github.io/RepoName/). This rewrites those specific,
// known references to relative paths after every `expo export -p web`.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('href="/favicon.ico"', 'href="favicon.ico"');
html = html.replace(/src="\/(_expo\/[^"]+)"/, 'src="$1"');
fs.writeFileSync(indexPath, html);

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
for (const file of jsFiles) {
  const jsPath = path.join(jsDir, file);
  let js = fs.readFileSync(jsPath, 'utf8');
  const before = js;
  js = js.split('"/assets/').join('"assets/');
  if (js !== before) {
    fs.writeFileSync(jsPath, js);
  }
}

console.log('Rewrote absolute paths to relative for subpath hosting.');
