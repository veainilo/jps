/**
 * 寻路算法性能比较测试
 */

// 导入所需的类
const { Grid, Heuristic, Util, Heap, Node } = require('./pathfinding-common.js');
const { JumpPointFinder } = require('./jps.js');
const { JPFMoveDiagonallyIfNoObstacles } = require('./jps-variants.js');
const { AStarFinder, DijkstraFinder, BreadthFirstFinder, BestFirstFinder } = require('./pathfinding-finders.js');

class AlgorithmTester {
    constructor() {
        this.algorithms = [
            { name: 'JPS', class: JumpPointFinder },
            { name: 'JPS (无障碍对角)', class: JPFMoveDiagonallyIfNoObstacles },
            // { name: 'A*', class: AStarFinder },
            // { name: 'Dijkstra', class: DijkstraFinder },
            // { name: 'BFS', class: BreadthFirstFinder },
            // { name: 'Best-First', class: BestFirstFinder }
        ];

        this.mapSizes = [
            { width: 100, height: 100 },
            { width: 200, height: 200 },
            { width: 400, height: 400 }
        ];

        this.obstacleDensities = [0.1, 0.2, 0.3, 0.4];
        this.testsPerConfig = 50;
    }

    // 生成随机地图
    generateMap(width, height, obstacleRatio) {
        const matrix = Array(height).fill().map(() => Array(width).fill(0));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (Math.random() < obstacleRatio) {
                    matrix[y][x] = 1;
                }
            }
        }
        // 确保起点和终点可用
        matrix[0][0] = 0;
        matrix[height-1][width-1] = 0;
        return new Grid(width, height, matrix);
    }

    // 验证路径
    validatePath(path, grid) {
        if (!path || path.length === 0) return false;
        
        const [startX, startY] = path[0];
        const [endX, endY] = path[path.length - 1];
        
        // 检查起点和终点
        if (!grid.isWalkableAt(startX, startY) || !grid.isWalkableAt(endX, endY)) {
            return false;
        }

        // 检查路径连续性
        for (let i = 0; i < path.length - 1; i++) {
            const [x1, y1] = path[i];
            const [x2, y2] = path[i + 1];
            
            const dx = Math.abs(x2 - x1);
            const dy = Math.abs(y2 - y1);
            
            // 检查移动是否有效（包括对角线）
            if (dx > 1 || dy > 1) {
                return false;
            }
            
            // 对于对角移动，检查两个相邻的格子
            if (dx === 1 && dy === 1) {
                if (!grid.isWalkableAt(x1, y2) || !grid.isWalkableAt(x2, y1)) {
                    return false;
                }
            }
            
            if (!grid.isWalkableAt(x2, y2)) {
                return false;
            }
        }
        
        return true;
    }

    // 运行单次测试
    runSingleTest(finder, grid) {
        // 重置访问节点集合
        finder.visitedNodes.clear();
        
        // 只测量 findPath 的执行时间
        const startTime = process.hrtime.bigint();
        const path = finder.findPath(0, 0, grid.width-1, grid.height-1, grid);
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒

        // 其他统计信息的计算放在计时之外
        const isValidPath = this.validatePath(path, grid);
        
        return {
            pathFound: path.length > 0,
            pathLength: path.length,
            duration: duration,
            nodesVisited: finder.visitedNodes.size,
            isValidPath: isValidPath
        };
    }

    // 运行完整测试套件
    async runTests() {
        console.log('开始算法性能比较测试...\n');
        const results = {};

        for (const size of this.mapSizes) {
            console.log(`\n地图大小: ${size.width}x${size.height}`);
            
            for (const density of this.obstacleDensities) {
                console.log(`\n障碍物密度: ${(density * 100).toFixed(1)}%`);
                
                const testResults = {};
                for (const algo of this.algorithms) {
                    testResults[algo.name] = {
                        totalTests: 0,
                        successfulTests: 0,
                        validPaths: 0,
                        totalTime: 0,
                        totalNodes: 0,
                        totalLength: 0,
                        maxTime: 0,
                        minTime: Infinity
                    };
                }

                // 运行多次测试
                for (let i = 0; i < this.testsPerConfig; i++) {
                    // 为每次测试生成一个地图，所有算法共用这个地图
                    const grid = this.generateMap(size.width, size.height, density);
                    
                    // 在同一个地图上测试所有算法
                    for (const algo of this.algorithms) {
                        const finder = new algo.class();
                        const result = this.runSingleTest(finder, grid);
                        
                        const stats = testResults[algo.name];
                        stats.totalTests++;
                        
                        if (result.pathFound) {
                            stats.successfulTests++;
                            if (result.isValidPath) {
                                stats.validPaths++;
                                stats.totalTime += result.duration;
                                stats.totalNodes += result.nodesVisited;
                                stats.totalLength += result.pathLength;
                                stats.maxTime = Math.max(stats.maxTime, result.duration);
                                stats.minTime = Math.min(stats.minTime, result.duration);
                            }
                        }
                    }

                    // 显示进度
                    if ((i + 1) % 10 === 0) {
                        console.log(`完成 ${i + 1}/${this.testsPerConfig} 次测试`);
                    }
                }

                // 计算和显示结果
                console.log('\n测试结果:');
                for (const algo of this.algorithms) {
                    const stats = testResults[algo.name];
                    const validTests = stats.validPaths;
                    
                    if (validTests > 0) {
                        console.log(`\n${algo.name}:`);
                        console.log(`成功率: ${(stats.successfulTests / stats.totalTests * 100).toFixed(1)}%`);
                        console.log(`有效路径率: ${(stats.validPaths / stats.totalTests * 100).toFixed(1)}%`);
                        console.log(`平均执行时间: ${(stats.totalTime / validTests).toFixed(2)}ms`);
                        console.log(`最短执行时间: ${stats.minTime.toFixed(2)}ms`);
                        console.log(`最长执行时间: ${stats.maxTime.toFixed(2)}ms`);
                        console.log(`平均访问节点数: ${Math.round(stats.totalNodes / validTests)}`);
                        console.log(`平均路径长度: ${(stats.totalLength / validTests).toFixed(1)}`);
                    } else {
                        console.log(`\n${algo.name}: 没有找到有效路径`);
                    }
                }

                // 存储结果
                const key = `${size.width}x${size.height}_${(density * 100).toFixed(0)}`;
                results[key] = testResults;
            }
        }

        return results;
    }
}

// 运行测试
console.log('正在初始化测试...');
const tester = new AlgorithmTester();
tester.runTests().then(() => {
    console.log('\n所有测试完成！');
}); 