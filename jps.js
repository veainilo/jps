/**
 * JPS（Jump Point Search）算法实现
 */

const { Heuristic, Util, Heap } = require('./pathfinding-common.js');

class JumpPointFinder {
    constructor(opt = {}) {
        this.heuristic = opt.heuristic || Heuristic.octile;
        this.trackJumpRecursion = opt.trackJumpRecursion || false;
        this.visitedNodes = new Set();
    }

    findPath(startX, startY, endX, endY, grid) {
        this.openList = new Heap((nodeA, nodeB) => nodeA.f - nodeB.f);
        this.visitedNodes.clear();
        this.grid = grid;
        this.startNode = grid.getNodeAt(startX, startY);
        this.endNode = grid.getNodeAt(endX, endY);

        // 重置节点状态
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const node = grid.getNodeAt(x, y);
                node.g = 0;
                node.f = 0;
                node.h = 0;
                node.opened = false;
                node.closed = false;
                node.parent = null;
            }
        }

        this.startNode.g = 0;
        this.startNode.f = 0;
        this.openList.push(this.startNode);
        this.startNode.opened = true;

        while (!this.openList.empty()) {
            const node = this.openList.pop();
            node.closed = true;
            this.visitedNodes.add(node.x + ',' + node.y);

            if (node === this.endNode) {
                return Util.expandPath(Util.backtrace(this.endNode));
            }

            this._identifySuccessors(node);
        }

        return [];
    }

    _identifySuccessors(node) {
        const grid = this.grid;
        const heuristic = this.heuristic;
        const openList = this.openList;
        const endX = this.endNode.x;
        const endY = this.endNode.y;

        const neighbors = this._findNeighbors(node);
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = neighbors[i];
            const jumpPoint = this._jump(neighbor[0], neighbor[1], node.x, node.y);
            
            if (jumpPoint) {
                const [jx, jy] = jumpPoint;
                const jumpNode = grid.getNodeAt(jx, jy);

                if (jumpNode.closed) {
                    continue;
                }

                // 使用octile距离计算
                const d = Math.max(Math.abs(jx - node.x), Math.abs(jy - node.y));
                const ng = node.g + d;

                if (!jumpNode.opened || ng < jumpNode.g) {
                    jumpNode.g = ng;
                    jumpNode.h = jumpNode.h || heuristic(Math.abs(jx - endX), Math.abs(jy - endY));
                    jumpNode.f = jumpNode.g + jumpNode.h;
                    jumpNode.parent = node;

                    if (!jumpNode.opened) {
                        openList.push(jumpNode);
                        jumpNode.opened = true;
                    } else {
                        openList.updateItem(jumpNode);
                    }
                }
            }
        }
    }

    _findNeighbors(node) {
        const grid = this.grid;
        const x = node.x;
        const y = node.y;
        const parent = node.parent;
        const neighbors = [];

        if (parent) {
            const px = parent.x;
            const py = parent.y;
            const dx = (x - px) / Math.max(Math.abs(x - px), 1);
            const dy = (y - py) / Math.max(Math.abs(y - py), 1);

            if (dx !== 0 && dy !== 0) {
                const walkY = grid.isWalkableAt(x, y + dy);
                const walkX = grid.isWalkableAt(x + dx, y);

                if (walkY) neighbors.push([x, y + dy]);
                if (walkX) neighbors.push([x + dx, y]);

                if (walkX || walkY) {
                    if (grid.isWalkableAt(x + dx, y + dy)) {
                        neighbors.push([x + dx, y + dy]);
                    }
                }

                if (!grid.isWalkableAt(x - dx, y)) {
                    neighbors.push([x - dx, y + dy]);
                }
                if (!grid.isWalkableAt(x, y - dy)) {
                    neighbors.push([x + dx, y - dy]);
                }
            } else {
                if (dx !== 0) {
                    if (grid.isWalkableAt(x + dx, y)) {
                        neighbors.push([x + dx, y]);
                        if (!grid.isWalkableAt(x, y + 1)) neighbors.push([x + dx, y + 1]);
                        if (!grid.isWalkableAt(x, y - 1)) neighbors.push([x + dx, y - 1]);
                    }
                } else {
                    if (grid.isWalkableAt(x, y + dy)) {
                        neighbors.push([x, y + dy]);
                        if (!grid.isWalkableAt(x + 1, y)) neighbors.push([x + 1, y + dy]);
                        if (!grid.isWalkableAt(x - 1, y)) neighbors.push([x - 1, y + dy]);
                    }
                }
            }
        } else {
            const dirs = [
                [0, 1], [1, 0], [0, -1], [-1, 0],
                [1, 1], [1, -1], [-1, 1], [-1, -1]
            ];
            for (let i = 0; i < 8; ++i) {
                const dx = dirs[i][0];
                const dy = dirs[i][1];
                const nx = x + dx;
                const ny = y + dy;
                if (grid.isInside(nx, ny) && grid.isWalkableAt(nx, ny)) {
                    neighbors.push([nx, ny]);
                }
            }
        }

        return neighbors;
    }

    _jump(x, y, px, py) {
        const grid = this.grid;
        
        if (!grid.isInside(x, y) || !grid.isWalkableAt(x, y)) {
            return null;
        }

        if (x === this.endNode.x && y === this.endNode.y) {
            return [x, y];
        }

        const dx = x - px;
        const dy = y - py;

        if (dx !== 0 && dy !== 0) {
            if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
                (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
                return [x, y];
            }

            if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
                return [x, y];
            }
        } else {
            if (dx !== 0) {
                if ((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
                    (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
                    return [x, y];
                }
            } else {
                if ((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
                    (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
                    return [x, y];
                }
            }
        }

        return grid.isWalkableAt(x + dx, y + dy) ? this._jump(x + dx, y + dy, x, y) : null;
    }
}

// 导出模块
module.exports = { JumpPointFinder }; 