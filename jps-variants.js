/**
 * JPS算法变体集合
 */

// 基础JPS类
class JumpPointFinderBase {
    constructor(opt = {}) {
        this.heuristic = opt.heuristic || window.Heuristic.octile;
        this.trackJumpRecursion = opt.trackJumpRecursion || false;
        this.visitedNodes = new Set();
    }

    findPath(startX, startY, endX, endY, grid) {
        const openList = this.openList = new window.Heap((nodeA, nodeB) => nodeA.f - nodeB.f);
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
                return window.Util.expandPath(window.Util.backtrace(endNode));
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

    // 这个方法将由子类实现
    _jump(x, y, px, py) {
        throw new Error('_jump方法必须由子类实现');
    }

    // 这个方法将由子类实现
    _findNeighbors(node) {
        throw new Error('_findNeighbors方法必须由子类实现');
    }
}

// 只在没有障碍物时才允许对角移动的JPS
class JPFMoveDiagonallyIfNoObstacles extends JumpPointFinderBase {
    _jump(x, y, px, py) {
        const grid = this.grid;
        
        if (!grid.isWalkableAt(x, y)) {
            return null;
        }

        if (this.trackJumpRecursion) {
            grid.getNodeAt(x, y).tested = true;
        }

        if (grid.getNodeAt(x, y) === this.endNode) {
            return [x, y];
        }

        const dx = x - px;
        const dy = y - py;

        // 对角移动
        if (dx !== 0 && dy !== 0) {
            // 检查水平和垂直方向的跳点
            if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
                return [x, y];
            }
        }
        // 水平/垂直移动
        else {
            if (dx !== 0) { // 水平移动
                if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
                    (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
                    return [x, y];
                }
            }
            else if (dy !== 0) { // 垂直移动
                if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
                    (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
                    return [x, y];
                }
            }
        }

        // 检查是否可以继续移动
        if (grid.isWalkableAt(x + dx, y) && grid.isWalkableAt(x, y + dy)) {
            return this._jump(x + dx, y + dy, x, y);
        } else {
            return null;
        }
    }

    _findNeighbors(node) {
        const parent = node.parent;
        const x = node.x;
        const y = node.y;
        const grid = this.grid;
        const neighbors = [];

        // 如果有父节点，进行剪枝
        if (parent) {
            const px = parent.x;
            const py = parent.y;
            const dx = (x - px) / Math.max(Math.abs(x - px), 1);
            const dy = (y - py) / Math.max(Math.abs(y - py), 1);

            // 对角移动
            if (dx !== 0 && dy !== 0) {
                // 检查垂直和水平移动是否可行
                const walkY = grid.isWalkableAt(x, y + dy);
                const walkX = grid.isWalkableAt(x + dx, y);

                // 添加可行的移动方向
                if (walkY) neighbors.push([x, y + dy]);
                if (walkX) neighbors.push([x + dx, y]);

                // 只有在两个方向都可行时才允许对角移动
                if (walkX && walkY && grid.isWalkableAt(x + dx, y + dy)) {
                    neighbors.push([x + dx, y + dy]);
                }
            }
            // 水平/垂直移动
            else {
                if (dx !== 0) { // 水平移动
                    const isNextWalkable = grid.isWalkableAt(x + dx, y);
                    const isTopWalkable = grid.isWalkableAt(x, y + 1);
                    const isBottomWalkable = grid.isWalkableAt(x, y - 1);

                    if (isNextWalkable) {
                        neighbors.push([x + dx, y]);
                        if (isTopWalkable) neighbors.push([x + dx, y + 1]);
                        if (isBottomWalkable) neighbors.push([x + dx, y - 1]);
                    }
                    if (isTopWalkable) neighbors.push([x, y + 1]);
                    if (isBottomWalkable) neighbors.push([x, y - 1]);
                }
                else if (dy !== 0) { // 垂直移动
                    const isNextWalkable = grid.isWalkableAt(x, y + dy);
                    const isRightWalkable = grid.isWalkableAt(x + 1, y);
                    const isLeftWalkable = grid.isWalkableAt(x - 1, y);

                    if (isNextWalkable) {
                        neighbors.push([x, y + dy]);
                        if (isRightWalkable) neighbors.push([x + 1, y + dy]);
                        if (isLeftWalkable) neighbors.push([x - 1, y + dy]);
                    }
                    if (isRightWalkable) neighbors.push([x + 1, y]);
                    if (isLeftWalkable) neighbors.push([x - 1, y]);
                }
            }
        }
        // 如果没有父节点，返回所有可行的邻居
        else {
            const dirs = [
                [0, 1], [1, 0], [0, -1], [-1, 0], // 基本方向
                [1, 1], [1, -1], [-1, 1], [-1, -1] // 对角方向
            ];

            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;

                if (!grid.isInside(nx, ny)) continue;

                // 对于对角移动，需要检查两个相邻的格子
                if (dx !== 0 && dy !== 0) {
                    if (grid.isWalkableAt(nx, ny) && 
                        grid.isWalkableAt(x, ny) && 
                        grid.isWalkableAt(nx, y)) {
                        neighbors.push([nx, ny]);
                    }
                }
                // 对于基本方向，只需要检查目标格子
                else if (grid.isWalkableAt(nx, ny)) {
                    neighbors.push([nx, ny]);
                }
            }
        }

        return neighbors;
    }
}

// 导出到window对象
window.JPFMoveDiagonallyIfNoObstacles = JPFMoveDiagonallyIfNoObstacles; 