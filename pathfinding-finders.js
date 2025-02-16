/**
 * 寻路算法集合
 */

// A*算法
class AStarFinder {
    constructor(opt = {}) {
        this.heuristic = opt.heuristic || window.Heuristic.octile;
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

        startNode.g = 0;
        startNode.f = 0;
        openList.add(startNode);
        startNode.opened = true;

        while (openList.size > 0) {
            let currentNode = this._getNodeWithLowestF(openList);
            
            if (currentNode === endNode) {
                return window.Util.backtrace(endNode);
            }

            openList.delete(currentNode);
            closedList.add(currentNode);
            currentNode.closed = true;
            this.visitedNodes.add(currentNode.x + ',' + currentNode.y);

            const neighbors = this._getNeighbors(currentNode, grid);

            for (const neighbor of neighbors) {
                if (closedList.has(neighbor)) {
                    continue;
                }

                const ng = currentNode.g + this._getDistance(currentNode, neighbor);

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

        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        
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

            if (!neighbor.walkable) {
                continue;
            }

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
        
        if (this.diagonalMovement) {
            return dx > dy ? Math.SQRT2 * dy + (dx - dy) : Math.SQRT2 * dx + (dy - dx);
        }
        
        return dx + dy;
    }
}

// Dijkstra算法（特殊的A*，不使用启发函数）
class DijkstraFinder extends AStarFinder {
    constructor(opt = {}) {
        super(opt);
        this.heuristic = () => 0;
    }
}

// 广度优先搜索
class BreadthFirstFinder {
    constructor(opt = {}) {
        this.diagonalMovement = opt.diagonalMovement !== false;
        this.visitedNodes = new Set();
    }

    findPath(startX, startY, endX, endY, grid) {
        const queue = [];
        const visited = new Set();
        this.visitedNodes.clear();

        const startNode = grid.getNodeAt(startX, startY);
        const endNode = grid.getNodeAt(endX, endY);

        queue.push(startNode);
        visited.add(startNode);
        this.visitedNodes.add(startX + ',' + startY);

        while (queue.length > 0) {
            const node = queue.shift();

            if (node === endNode) {
                return window.Util.backtrace(endNode);
            }

            const neighbors = this._getNeighbors(node, grid);

            for (const neighbor of neighbors) {
                const key = neighbor.x + ',' + neighbor.y;
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    this.visitedNodes.add(key);
                    neighbor.parent = node;
                    queue.push(neighbor);
                }
            }
        }

        return [];
    }

    _getNeighbors(node, grid) {
        const neighbors = [];
        const x = node.x;
        const y = node.y;

        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        
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

            if (!neighbor.walkable) {
                continue;
            }

            if (dx !== 0 && dy !== 0) {
                if (!grid.isWalkableAt(x, ny) || !grid.isWalkableAt(nx, y)) {
                    continue;
                }
            }

            neighbors.push(neighbor);
        }

        return neighbors;
    }
}

// Best-First搜索（贪婪最佳优先搜索）
class BestFirstFinder extends AStarFinder {
    constructor(opt = {}) {
        super(opt);
        const orig = this.heuristic;
        this.heuristic = (dx, dy) => orig(dx, dy) * 1000000;
        this.maxVisitedNodes = opt.maxVisitedNodes || 2500;
        this.maxSearchTime = opt.maxSearchTime || 2000;
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

        startNode.g = 0;
        startNode.f = 0;
        openList.add(startNode);
        startNode.opened = true;

        const startTime = performance.now();
        let bestNode = startNode;
        let bestHeuristic = this.heuristic(Math.abs(startX - endX), Math.abs(startY - endY));

        while (openList.size > 0) {
            if (this.visitedNodes.size >= this.maxVisitedNodes) {
                console.log('达到最大搜索节点限制');
                return [];
            }

            if (performance.now() - startTime > this.maxSearchTime) {
                console.log('达到最大搜索时间限制');
                return [];
            }

            let currentNode = this._getNodeWithLowestF(openList);
            
            const currentHeuristic = this.heuristic(
                Math.abs(currentNode.x - endX),
                Math.abs(currentNode.y - endY)
            );
            if (currentHeuristic < bestHeuristic) {
                bestNode = currentNode;
                bestHeuristic = currentHeuristic;
            }

            if (currentNode === endNode) {
                return window.Util.backtrace(endNode);
            }

            openList.delete(currentNode);
            closedList.add(currentNode);
            currentNode.closed = true;
            this.visitedNodes.add(currentNode.x + ',' + currentNode.y);

            const neighbors = this._getNeighbors(currentNode, grid);

            for (const neighbor of neighbors) {
                if (closedList.has(neighbor)) {
                    continue;
                }

                const ng = currentNode.g + this._getDistance(currentNode, neighbor);

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

        return [];
    }

    _getNodeWithLowestF(openList) {
        let lowestF = Infinity;
        let lowestH = Infinity;
        let result = null;
        
        for (const node of openList) {
            if (node.f < lowestF) {
                lowestF = node.f;
                lowestH = node.h;
                result = node;
            } 
            else if (node.f === lowestF && node.h < lowestH) {
                lowestH = node.h;
                result = node;
            }
        }
        
        return result;
    }
}

// 导出到window对象
window.AStarFinder = AStarFinder;
window.DijkstraFinder = DijkstraFinder;
window.BreadthFirstFinder = BreadthFirstFinder;
window.BestFirstFinder = BestFirstFinder; 