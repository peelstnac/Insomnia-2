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
}
class Rectangle {
  constructor (anchor, width, height) {
    this.anchor = anchor;
    this.width = width;
    this.height = height;
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
function genMap (limit, radius, roomConfig) {
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
  // Keep track of the rectangles in adjacency list
  var inAdj = Array(limit).fill(1);
  var deg = Array(limit).fill(0);
  var adj = [...Array(limit)];
  // Map intersection relationships
  for (let i = 0; i < limit; i++) {
    
  }
}

module.exports = genMap();
