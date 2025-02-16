/**
 * JPS（Jump Point Search）算法实现
 */

// 启发式函数
const Heuristic = {
    manhattan: function(dx, dy) {
        return dx + dy;
    },

    euclidean: function(dx, dy) {
        return Math.sqrt(dx * dx + dy * dy);
    },

    octile: function(dx, dy) {
        const F = Math.SQRT2 - 1;
        return (dx < dy) ? F * dx + dy : F * dy + dx;
    },

    chebyshev: function(dx, dy) {
        return Math.max(dx, dy);
    }
};

// 工具函数
const Util = {
    backtrace: function(node) {
        const path = [[node.x, node.y]];
        while (node.parent) {
            node = node.parent;
            path.push([node.x, node.y]);
        }
        return path.reverse();
    },

    expandPath: function(path) {
        if (path.length < 2) {
            return path;
        }

        const expanded = [];
        for (let i = 0; i < path.length - 1; i++) {
            const coord0 = path[i];
            const coord1 = path[i + 1];

            const interpolated = this.interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
            interpolated.pop(); // 移除最后一个点（避免重复）
            expanded.push(...interpolated);
        }
        expanded.push(path[path.length - 1]);

        return expanded;
    },

    interpolate: function(x0, y0, x1, y1) {
        const abs = Math.abs;
        const line = [];
        let sx, sy, dx, dy, err, e2;

        dx = abs(x1 - x0);
        dy = abs(y1 - y0);

        sx = (x0 < x1) ? 1 : -1;
        sy = (y0 < y1) ? 1 : -1;

        err = dx - dy;

        while (true) {
            line.push([x0, y0]);

            if (x0 === x1 && y0 === y1) {
                break;
            }
            
            e2 = 2 * err;
            if (e2 > -dy) {
                err = err - dy;
                x0 = x0 + sx;
            }
            if (e2 < dx) {
                err = err + dx;
                y0 = y0 + sy;
            }
        }

        return line;
    }
};

// 最小堆实现
class Heap {
    constructor(compareFunction) {
        this.items = [];
        this.compareFunction = compareFunction;
    }

    push(item) {
        this.items.push(item);
        this._siftUp(this.items.length - 1);
    }

    pop() {
        if (this.empty()) return null;
        const item = this.items[0];
        const lastItem = this.items.pop();
        if (!this.empty()) {
            this.items[0] = lastItem;
            this._siftDown(0);
        }
        return item;
    }

    updateItem(item) {
        const index = this.items.indexOf(item);
        if (index === -1) return;
        this._siftUp(index);
        this._siftDown(index);
    }

    empty() {
        return this.items.length === 0;
    }

    _siftUp(index) {
        let parent = Math.floor((index - 1) / 2);
        while (index > 0 && this.compareFunction(this.items[index], this.items[parent]) < 0) {
            [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
            index = parent;
            parent = Math.floor((index - 1) / 2);
        }
    }

    _siftDown(index) {
        const length = this.items.length;
        while (true) {
            let minIndex = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (leftChild < length && this.compareFunction(this.items[leftChild], this.items[minIndex]) < 0) {
                minIndex = leftChild;
            }
            if (rightChild < length && this.compareFunction(this.items[rightChild], this.items[minIndex]) < 0) {
                minIndex = rightChild;
            }

            if (minIndex === index) break;

            [this.items[index], this.items[minIndex]] = [this.items[minIndex], this.items[index]];
            index = minIndex;
        }
    }
}

// 节点类
class Node {
    constructor(x, y, walkable) {
        this.x = x;
        this.y = y;
        this.walkable = walkable === undefined ? true : walkable;
        this.g = 0; // 从起点到当前节点的代价
        this.h = 0; // 从当前节点到终点的启发式估计代价
        this.f = 0; // 总代价 (g + h)
        this.parent = null;
        this.opened = false;
        this.closed = false;
    }
}

// 网格类
class Grid {
    constructor(width, height, matrix) {
        this.width = width;
        this.height = height;
        this.nodes = this._buildNodes(width, height, matrix);
    }

    _buildNodes(width, height, matrix) {
        const nodes = Array(height).fill().map(() => Array(width));
        for(let i = 0; i < height; i++) {
            for(let j = 0; j < width; j++) {
                nodes[i][j] = new Node(j, i);
                if(matrix && matrix[i][j]) {
                    nodes[i][j].walkable = false;
                }
            }
        }
        return nodes;
    }

    getNodeAt(x, y) {
        return this.nodes[y][x];
    }

    isWalkableAt(x, y) {
        return this.isInside(x, y) && this.nodes[y][x].walkable;
    }

    isInside(x, y) {
        return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
    }

    getNeighbors(node) {
        const x = node.x;
        const y = node.y;
        const neighbors = [];

        // 上下左右
        const s4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (let i = 0; i < 4; i++) {
            const nx = x + s4[i][0];
            const ny = y + s4[i][1];
            if (this.isInside(nx, ny) && this.isWalkableAt(nx, ny)) {
                neighbors.push(this.nodes[ny][nx]);
            }
        }

        return neighbors;
    }
}

// JPS算法实现
class JumpPointFinder {
    constructor(opt = {}) {
        this.heuristic = opt.heuristic || Heuristic.octile;
        this.trackJumpRecursion = opt.trackJumpRecursion || false;
        this.visitedNodes = new Set();
    }

    findPath(startX, startY, endX, endY, grid) {
        const openList = this.openList = new Heap((nodeA, nodeB) => nodeA.f - nodeB.f);
        const startNode = this.startNode = grid.getNodeAt(startX, startY);
        const endNode = this.endNode = grid.getNodeAt(endX, endY);
        this.grid = grid;
        this.visitedNodes.clear();

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

        startNode.g = 0;
        startNode.f = 0;
        openList.push(startNode);
        startNode.opened = true;

        while (!openList.empty()) {
            const node = openList.pop();
            node.closed = true;
            this.visitedNodes.add(node.x + ',' + node.y);

            if (node === endNode) {
                return Util.expandPath(Util.backtrace(endNode));
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
module.exports = {
    JumpPointFinder,
    Grid,
    Node,
    Heuristic,
    Util
}; 