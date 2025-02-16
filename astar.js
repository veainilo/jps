const { Heuristic, Util } = require('./pathfinding-common.js');

/**
 * A* 寻路算法实现
 */

class AStarFinder {
    constructor(opt = {}) {
        this.heuristic = opt.heuristic || Heuristic.octile;
        this.diagonalMovement = opt.diagonalMovement !== false;
        this.weight = opt.weight || 1;
        this.visitedNodes = new Set();
    }

    findPath(startX, startY, endX, endY, grid) {
        const openList = new Set();
        const closedList = new Set();
        this.visitedNodes.clear();

        const startNode = grid.getNodeAt(startX, startY);
        const endNode = grid.getNodeAt(endX, endY);

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

        // 初始化起点
        startNode.g = 0;
        startNode.f = 0;
        openList.add(startNode);
        startNode.opened = true;

        while (openList.size > 0) {
            // 获取 f 值最小的节点
            let currentNode = this._getNodeWithLowestF(openList);
            
            // 如果找到终点，返回路径
            if (currentNode === endNode) {
                return Util.backtrace(endNode);
            }

            // 将当前节点从开放列表移到关闭列表
            openList.delete(currentNode);
            closedList.add(currentNode);
            currentNode.closed = true;
            this.visitedNodes.add(currentNode.x + ',' + currentNode.y);

            // 获取相邻节点
            const neighbors = this._getNeighbors(currentNode, grid);

            for (const neighbor of neighbors) {
                if (closedList.has(neighbor)) {
                    continue;
                }

                // 计算从起点经过当前节点到达相邻节点的代价
                const ng = currentNode.g + this._getDistance(currentNode, neighbor);

                // 如果节点不在开放列表中，或者找到了更好的路径
                if (!openList.has(neighbor) || ng < neighbor.g) {
                    neighbor.g = ng;
                    neighbor.h = neighbor.h || this.weight * this.heuristic(
                        Math.abs(neighbor.x - endX),
                        Math.abs(neighbor.y - endY)
                    );
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;

                    if (!openList.has(neighbor)) {
                        openList.add(neighbor);
                        neighbor.opened = true;
                    }
                }
            }
        }

        // 没有找到路径
        return [];
    }

    _getNodeWithLowestF(openList) {
        let lowestF = Infinity;
        let result = null;
        
        for (const node of openList) {
            if (node.f < lowestF) {
                lowestF = node.f;
                result = node;
            }
        }
        
        return result;
    }

    _getNeighbors(node, grid) {
        const neighbors = [];
        const x = node.x;
        const y = node.y;

        // 基本方向：上、右、下、左
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        
        // 如果允许对角移动，添加对角方向
        if (this.diagonalMovement) {
            dirs.push([-1, -1], [1, -1], [-1, 1], [1, 1]);
        }

        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;

            if (!grid.isInside(nx, ny)) {
                continue;
            }

            const neighbor = grid.getNodeAt(nx, ny);

            // 检查是否可行走
            if (!neighbor.walkable) {
                continue;
            }

            // 对于对角移动，检查两个相邻的格子是否可行走
            if (dx !== 0 && dy !== 0) {
                if (!grid.isWalkableAt(x, ny) || !grid.isWalkableAt(nx, y)) {
                    continue;
                }
            }

            neighbors.push(neighbor);
        }

        return neighbors;
    }

    _getDistance(nodeA, nodeB) {
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        
        // 如果允许对角移动，使用对角距离
        if (this.diagonalMovement) {
            return dx > dy ? Math.SQRT2 * dy + (dx - dy) : Math.SQRT2 * dx + (dy - dx);
        }
        
        // 如果不允许对角移动，使用曼哈顿距离
        return dx + dy;
    }
}

// 导出模块
module.exports = AStarFinder; 