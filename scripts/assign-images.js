#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const postsFile = path.join(__dirname, '..', 'data', 'posts.json');
const imagesDir = path.join(__dirname, '..', 'assets', 'images');

function getImages() {
  const exts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  return fs.readdirSync(imagesDir).filter(f => exts.includes(path.extname(f).toLowerCase()));
}

function run() {
  if (!fs.existsSync(postsFile)) {
    console.error('posts.json not found at', postsFile);
    process.exit(1);
  }
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  const images = getImages();
  if (images.length === 0) {
    console.error('No images found in', imagesDir);
    process.exit(1);
  }

  const used = new Set();
  const imagesLower = images.map(i => i.toLowerCase());

  // First pass: keep valid existing assignments
  posts.forEach(p => {
    if (p.image && fs.existsSync(path.join(__dirname, '..', p.image))) {
      used.add(path.basename(p.image).toLowerCase());
    }
  });

  // Second pass: assign images where missing or file not found
  posts.forEach(p => {
    let img = p.image && path.basename(p.image) || '';
    if (img && fs.existsSync(path.join(__dirname, '..', p.image))) {
      // already valid
      return;
    }
    // Try to find image that contains the post id
    const id = p.id.toLowerCase();
    let found = images.find(i => i.toLowerCase().includes(id) && !used.has(i.toLowerCase()));
    if (!found) {
      // try title words
      const words = p.title.toLowerCase().split(/[^a-z0-9\-]+/).filter(Boolean);
      for (const w of words) {
        found = images.find(i => i.toLowerCase().includes(w) && !used.has(i.toLowerCase()));
        if (found) break;
      }
    }
    if (!found) {
      // pick first unused
      found = images.find(i => !used.has(i.toLowerCase()));
    }
    if (found) {
      used.add(found.toLowerCase());
      p.image = path.posix.join('assets', 'images', found);
      console.log(`Assigned ${found} → ${p.id}`);
    } else {
      console.warn(`No available image to assign for ${p.id}`);
    }
  });

  // Write back
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  console.log('Updated', postsFile);
}

run();
