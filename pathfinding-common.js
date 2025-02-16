/**
 * 寻路算法公共类和工具函数
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

// 导出到window对象
window.Heuristic = Heuristic;
window.Util = Util;
window.Heap = Heap;
window.Node = Node;
window.Grid = Grid; 