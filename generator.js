'use strict';
// Dimension of each grid square
const dim = 30;
// Room configuration (grid units)
const roomConfig = {
  minWidth: 30,
  minHeight: 30,
  variation: 50,
  expansion: 10
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
// Generate random point in a circle as described by [1]
function circlePoint (radius) {
  let t = 2 * Math.PI * Math.random();
  let u = Math.random() + Math.random();
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
  // Create blank map where 0 means no obstacle
  var map = [...Array(1500)].map(e => Array(1500).fill(0));
  var rectList = [];
  // Spam a bunch of rectangles
  for (let i = 0; i < limit; i++) {
    let point = circlePoint(radius);
    let width = roomConfig.minWidth + roomConfig.variation * Math.random() + roomConfig.expansion;
    let height = roomConfig.minHeight + roomConfig.variation * Math.random() + roomConfig.expansion;
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
}

genMap(50, 100, roomConfig, 10);
