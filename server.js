'use strict';
const Delaunator = require('delaunator');
const ParkMiller = require('park-miller');
const random = new ParkMiller(10);
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile('index.html');
});
app.get('/gen', (req, res) => {
  res.send(genMap(40, 80, roomConfig, 10));
});

app.listen(3000);

// Dimension of each grid square
const dim = 30;
// Room configuration (grid units)
const roomConfig = {
  minWidth: 50,
  minHeight: 50,
  variation: 50,
  expansion: 0,
  count: 10
};
class Point {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }

  normalize () {
    let dist = Math.sqrt(this.x * this.x + this.y * this.y);
    if (dist === 0) {
      return new Point(0, 0);
    }
    return new Point(this.x / dist, this.y / dist);
  }
}
class Rectangle {
  constructor (anchor, width, height) {
    this.anchor = anchor;
    this.width = width;
    this.height = height;
    // Newly added property, older calculations preserved
    this.center = new Point(this.anchor.x + this.width / 2, this.anchor.y + this.height / 2);
  }

  intersect (rect) {
    var thisCenter = new Point(this.anchor.x + this.width / 2, this.anchor.y + this.height / 2);
    var thatCenter = new Point(rect.anchor.x + rect.width / 2, rect.anchor.y + rect.height / 2);
    var threshold = [this.width / 2 + rect.width / 2, this.height / 2 + rect.height / 2];
    if (Math.abs(thisCenter.x - thatCenter.x) < threshold[0] &&
      Math.abs(thisCenter.y - thatCenter.y) < threshold[1]) {
      return true;
    } else {
      return false;
    }
  }
}
// Block data structure
class Block {
  constructor (tl, br) {
    this.tl = tl;
    this.br = br;
    this.center = new Point(Math.floor((tl.x + br.x) / 2), Math.floor((tl.y + br.y) / 2));
  }
}
// Tile map data structure
class Map {
  constructor (width, height) {
    this.width = width;
    this.height = height;
    this.arr = Array(this.width * this.height).fill(0);
    this.blockList = [];
  }

  at (x, y) {
    return this.arr[x + y * this.width];
  }

  update (x, y, value) {
    this.arr[x + y * this.width] = value;
  }

  addBlock (block) {
    this.blockList.push(block);
    for (let i = block.tl.x; i <= block.br.x; i++) {
      for (let j = block.tl.y; j <= block.br.y; j++) {
        this.update(i, j, 1);
      }
    }
  }
}
// Generate random point in a circle as described by [1]
function circlePoint (radius) {
  let t = 2 * Math.PI * (random.integerInRange(0, 100) / 100);
  let u = (random.integerInRange(0, 100) / 100) + (random.integerInRange(0, 100) / 100);
  let r = null;
  if (u > 1) {
    r = 2 - u;
  } else {
    r = u;
  }
  // non-negative coordinates
  return new Point(radius * r * Math.cos(t) + radius, radius * r * Math.sin(t) + radius);
}
function genMap (limit, radius, roomConfig, increment) {
  if (limit < roomConfig.count) {
    throw Error('Limit < roomConfig.count');
  }
  // Create blank map where 0 means no obstacle
  // TODO: make sure no out of bounds
  var map = new Map(150, 150);
  var rectList = [];
  // Spam a bunch of rectangles
  for (let i = 0; i < limit; i++) {
    let point = circlePoint(radius);
    let width = roomConfig.minWidth + roomConfig.variation * (random.integerInRange(0, 100) / 100) + roomConfig.expansion;
    let height = roomConfig.minHeight + roomConfig.variation * (random.integerInRange(0, 100) / 100) + roomConfig.expansion;
    rectList.push(new Rectangle(point, width, height));
  }
  // Follow instructions of [2]
  // Create an undirected graph to represent intersections
  var deg = [...Array(limit)].map(e => [0, 0]);
  for (let i = 0; i < limit; i++) {
    deg[i][1] = i;
  }
  var adj = [...Array(limit)].map(e => []);
  // Map intersection relationships
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      let r1 = rectList[i];
      let r2 = rectList[j];
      if (r1.intersect(r2)) {
        deg[i][0]++;
        deg[j][0]++;
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  // While there are intersections
  var stack = [];
  while (true) {
    // Sort in reverse
    deg.sort();
    deg.reverse();
    if (deg[0][0] === -1) break;
    // Push most intersected on stack
    stack.unshift(deg[0][1]);
    // Remove this rectangle
    deg[0][0] = -1;
    for (let x in adj[deg[0][1]]) {
      if (deg[adj[deg[0][1]][x]][0] === -1) {
        continue;
      }
      deg[adj[deg[0][1]][x]][0]--;
    }
  }
  var iterList = [];
  while (stack.length !== 0) {
    let top = rectList[stack.shift()];
    iterList.push(top);
    let centroid = new Point(0, 0);
    for (let it in iterList) {
      centroid.x += (iterList[it].anchor.x + iterList[it].width / 2) / iterList.length;
      centroid.y += (iterList[it].anchor.y + iterList[it].height / 2) / iterList.length;
    }
    let dir = new Point(top.anchor.x + top.width / 2 - centroid.x, top.anchor.y + top.height / 2 - centroid.y);
    dir = dir.normalize();
    while (true) {
      top.anchor.x += dir.x * increment;
      top.anchor.y += dir.y * increment;
      let bc = true;
      for (let it = 0; it < iterList.length - 1; it++) {
        if (top.intersect(iterList[it])) {
          bc = false;
          break;
        }
      }
      if (bc) {
        break;
      }
    }
    // console.log(iterList);
    iterList[iterList.length - 1] = top;
  }
  var lx = 0;
  var ly = 0;
  for (let it in iterList) {
    if (iterList[it].anchor.x < lx) {
      lx = iterList[it].anchor.x;
    }
    if (iterList[it].anchor.y < ly) {
      ly = iterList[it].anchor.y;
    }
  }
  for (let it in iterList) {
    iterList[it].anchor.x -= lx;
    iterList[it].anchor.y -= ly;
  }
  rectList = iterList;
  var area = iterList.map((e, i) => [e.width * e.height, i]);
  area.sort();
  area.reverse();
  var points = [];
  for (let i = 0; i < roomConfig.count; i++) {
    let j = area[i][1];
    points.push([rectList[j].anchor.x, rectList[j].anchor.y]);
  }
  var delaunay = Delaunator.from(points).triangles;
  // MST
  var mst = [...Array(roomConfig.count)].map(e => []);
  (() => {
    class Edge {
      constructor () {
        this.w = 1000000000;
        this.to = -1;
      }
    }
    function dist (a, b) {
      return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
    }
    var adj = [...Array(roomConfig.count)].map(e => Array(roomConfig.count).fill(1000000000));
    for (let i = 0; i < delaunay.length; i += 3) {
      let a = delaunay[i];
      let b = delaunay[i + 1];
      let c = delaunay[i + 2];
      adj[a][b] = dist(points[a], points[b]);
      adj[a][c] = dist(points[a], points[c]);
      adj[b][a] = dist(points[b], points[a]);
      adj[b][c] = dist(points[b], points[c]);
      adj[c][a] = dist(points[c], points[a]);
      adj[c][b] = dist(points[c], points[b]);
    }
    var selected = Array(roomConfig.count).fill(false);
    var min_e = [];
    for (let i = 0; i < roomConfig.count; i++) {
      min_e.push(new Edge());
    }
    min_e[0].w = 0;
    for (let i = 0; i < roomConfig.count; i++) {
      let v = -1;
      for (let j = 0; j < roomConfig.count; j++) {
        if (!selected[j] && v === -1) {
          v = j;
          continue;
        }
        if (!selected[j] && min_e[j].w < min_e[v].w) {
          v = j;
        }
      }
      if (min_e[v].w === 1000000000) {
        throw Error('There is no MST');
      }
      selected[v] = true;
      if (min_e[v].to !== -1) {
        // For now, only one-directional to avoid repeats
        mst[v].push(min_e[v].to);
        // mst[min_e[v].to].push(v);
      }
      for (let to = 0; to < roomConfig.count; to++) {
        if (adj[v][to] < min_e[to].w) {
          min_e[to].w = adj[v][to];
          min_e[to].to = v;
        }
      }
    }
  })();
  // Make the hallways
  // Make all the rectangles into blocks
  var unusedBlocks = [];
  var added = Array(rectList.length).fill(false);
  for (let i in rectList) {
    let temp = rectList[i];
    let tl = new Point(Math.ceil(temp.anchor.x / dim), Math.ceil(temp.anchor.y / dim));
    let br = new Point(Math.floor((temp.anchor.x + temp.width) / dim), Math.floor((temp.anchor.y + temp.height) / dim));
    unusedBlocks.push(new Block(tl, br));
  }
  // Add the best blocks to the map
  for (let i = 0; i < roomConfig.count; i++) {
    map.addBlock(unusedBlocks[area[i][1]]);
    added[area[i][1]] = true;
  }
  function getSign (x) {
    if (x < 0) return -1;
    if (x > 0) return 1;
    return 0;
  }
  function blockOverlap (b1, b2) {
    if (b1.tl.x >= b2.br.x || b2.tl.x >= b1.br.x) {
      return false;
    }
    if (b1.tl.y <= b2.br.y || b2.tl.y <= b1.br.y) {
      return false;
    }
    return true;
  }
  // Use the MST
  for (let i = 0; i < roomConfig.count; i++) {
    let edges = mst[i];
    let b1 = unusedBlocks[i];
    for (let j in edges) {
      let b2 = unusedBlocks[area[edges[j]][1]];
      // Horizontal line
      if (getSign(b1.tl.y - b2.br.y) + getSign(b1.br.y - b2.tl.y) === 0 &&
      Math.min(Math.abs(b1.tl.y - b2.br.y), Math.abs(b1.br.y - b2.tl.y)) + 1 >= 3) {
        let tl = null;
        let br = null;
        let lx = null;
        let rx = null;
        let path = null;
        if (Math.abs(b1.tl.y - b2.br.y) < Math.abs(b1.br.y - b2.tl.y)) {
          if (b1.br.x < b2.tl.x) {
            lx = b1.br.x;
            rx = b2.tl.x;
          } else {
            lx = b2.br.x;
            rx = b1.tl.x;
          }
          // Note that there is actually no need to use Math.max and Math.min
          tl = new Point(lx + 1, Math.max(b1.tl.y, b2.br.y));
          br = new Point(rx - 1, Math.min(b1.tl.y, b2.br.y));
          path = new Block(tl, br);
        } else {
          if (b1.br.x < b2.tl.x) {
            lx = b1.br.x;
            rx = b2.tl.x;
          } else {
            lx = b2.br.x;
            rx = b1.tl.x;
          }
          tl = new Point(lx + 1, Math.max(b2.tl.y, b1.br.y));
          br = new Point(rx - 1, Math.min(b2.tl.y, b1.br.y));
          path = new Block(tl, br);
        }
        // Add the path to the map
        map.addBlock(path);
        // Check for intersections
        for (let i in unusedBlocks) {
          if (added[i]) continue;
          if (blockOverlap(path, unusedBlocks[i])) {
            added[i] = true;
            map.addBlock(unusedBlocks[i]);
          }
        }
      }
      // Combination of horizontal and vertical
    }
  }
}

genMap(20, 100, roomConfig, 10);
