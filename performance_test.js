const { JumpPointFinder, Grid } = require('./jps');
const { AStarFinder } = require('./astar');

// 生成随机地图
function generateRandomMap(width, height, obstacleRatio) {
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
    return matrix;
}

// 验证路径是否有效
function validatePath(path, grid) {
    if (!path || path.length === 0) return false;
    
    // 检查起点和终点
    const [startX, startY] = path[0];
    const [endX, endY] = path[path.length - 1];
    if (!grid.isWalkableAt(startX, startY) || !grid.isWalkableAt(endX, endY)) {
        return false;
    }

    // 检查路径的每一步
    for (let i = 0; i < path.length - 1; i++) {
        const [x1, y1] = path[i];
        const [x2, y2] = path[i + 1];
        
        // 检查是否是有效的相邻点（包括对角线）
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        if (dx > 1 || dy > 1) {
            // 如果不是相邻点，检查中间的点是否都可行走
            const points = interpolatePath([x1, y1], [x2, y2]);
            for (const [x, y] of points) {
                if (!grid.isWalkableAt(x, y)) {
                    return false;
                }
            }
        } else if (!grid.isWalkableAt(x2, y2)) {
            return false;
        }
    }
    return true;
}

// 插值得到路径中的所有点
function interpolatePath(start, end) {
    const [x1, y1] = start;
    const [x2, y2] = end;
    const points = [];
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (x !== x2 || y !== y2) {
        points.push([x, y]);
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
    points.push([x2, y2]);
    return points;
}

// 运行单次测试
function runSingleTest(finder, grid, startX, startY, endX, endY) {
    const startTime = process.hrtime.bigint();
    const path = finder.findPath(startX, startY, endX, endY, grid);
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
    
    const isValidPath = validatePath(path, grid);
    
    return {
        pathFound: path.length > 0,
        pathLength: path.length,
        duration: duration,
        nodesVisited: finder.visitedNodes.size,
        isValidPath: isValidPath
    };
}

// 运行测试套件
function runTestSuite() {
    const mapSizes = [
        [50, 50],
        [100, 100],
        [200, 200]
    ];
    const obstacleRatios = [0.1, 0.2, 0.3];
    const testsPerConfig = 20; // 增加测试次数以获得更可靠的统计结果

    console.log('性能和准确性测试开始...\n');

    for (const [width, height] of mapSizes) {
        console.log(`地图大小: ${width}x${height}`);
        
        for (const ratio of obstacleRatios) {
            console.log(`\n障碍物密度: ${ratio * 100}%`);
            
            let jpsResults = [];
            let astarResults = [];
            let totalTests = 0;
            let bothFoundPath = 0;
            let pathLengthDiffs = [];

            for (let i = 0; i < testsPerConfig; i++) {
                const matrix = generateRandomMap(width, height, ratio);
                const grid = new Grid(width, height, matrix);
                
                const jps = new JumpPointFinder();
                const astar = new AStarFinder();

                const jpsResult = runSingleTest(jps, grid, 0, 0, width-1, height-1);
                const astarResult = runSingleTest(astar, grid, 0, 0, width-1, height-1);

                totalTests++;
                
                // 记录两种算法都找到路径的情况
                if (jpsResult.pathFound && astarResult.pathFound) {
                    bothFoundPath++;
                    pathLengthDiffs.push(Math.abs(jpsResult.pathLength - astarResult.pathLength));
                }

                if (jpsResult.pathFound && jpsResult.isValidPath) jpsResults.push(jpsResult);
                if (astarResult.pathFound && astarResult.isValidPath) astarResults.push(astarResult);
            }

            // 计算平均值和成功率
            if (jpsResults.length > 0) {
                const jpsAvg = {
                    duration: jpsResults.reduce((sum, r) => sum + r.duration, 0) / jpsResults.length,
                    pathLength: jpsResults.reduce((sum, r) => sum + r.pathLength, 0) / jpsResults.length,
                    nodesVisited: jpsResults.reduce((sum, r) => sum + r.nodesVisited, 0) / jpsResults.length
                };
                console.log('\nJPS 结果:');
                console.log(`成功率: ${(jpsResults.length / totalTests * 100).toFixed(1)}%`);
                console.log(`执行时间: ${jpsAvg.duration.toFixed(2)}ms`);
                console.log(`路径长度: ${jpsAvg.pathLength.toFixed(2)}`);
                console.log(`访问节点数: ${jpsAvg.nodesVisited.toFixed(0)}`);
            }

            if (astarResults.length > 0) {
                const astarAvg = {
                    duration: astarResults.reduce((sum, r) => sum + r.duration, 0) / astarResults.length,
                    pathLength: astarResults.reduce((sum, r) => sum + r.pathLength, 0) / astarResults.length,
                    nodesVisited: astarResults.reduce((sum, r) => sum + r.nodesVisited, 0) / astarResults.length
                };
                console.log('\nA* 结果:');
                console.log(`成功率: ${(astarResults.length / totalTests * 100).toFixed(1)}%`);
                console.log(`执行时间: ${astarAvg.duration.toFixed(2)}ms`);
                console.log(`路径长度: ${astarAvg.pathLength.toFixed(2)}`);
                console.log(`访问节点数: ${astarAvg.nodesVisited.toFixed(0)}`);
            }

            // 输出路径一致性统计
            if (pathLengthDiffs.length > 0) {
                const avgDiff = pathLengthDiffs.reduce((a, b) => a + b, 0) / pathLengthDiffs.length;
                console.log('\n路径一致性:');
                console.log(`两种算法都找到路径的比例: ${(bothFoundPath / totalTests * 100).toFixed(1)}%`);
                console.log(`平均路径长度差异: ${avgDiff.toFixed(2)}`);
            }
        }
        console.log('\n' + '-'.repeat(50) + '\n');
    }
}

// 运行测试
runTestSuite(); 