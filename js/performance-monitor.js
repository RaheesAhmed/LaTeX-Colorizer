// Performance monitoring module
const PerformanceMonitor = {
  metrics: {
    renderTimes: [],
    memoryUsage: [],
    operationCounts: new Map(),
    lastUpdate: Date.now(),
    frameDeltas: [],
  },

  // Initialize monitoring
  init() {
    this.startMemoryTracking();
    this.startFrameTracking();
  },

  // Track render time
  trackRender(startTime) {
    const duration = performance.now() - startTime;
    this.metrics.renderTimes.push(duration);
    if (this.metrics.renderTimes.length > 100) {
      this.metrics.renderTimes.shift();
    }
  },

  // Track memory usage
  startMemoryTracking() {
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage.push({
          timestamp: Date.now(),
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
        });
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
      }, 1000);
    }
  },

  // Track frame times
  startFrameTracking() {
    let lastFrameTime = performance.now();
    const trackFrame = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      this.metrics.frameDeltas.push(delta);
      if (this.metrics.frameDeltas.length > 60) {
        this.metrics.frameDeltas.shift();
      }
      lastFrameTime = now;
      requestAnimationFrame(trackFrame);
    };
    requestAnimationFrame(trackFrame);
  },

  // Track operation count
  trackOperation(name) {
    const count = this.metrics.operationCounts.get(name) || 0;
    this.metrics.operationCounts.set(name, count + 1);
  },

  // Get performance report
  getReport() {
    const avgRenderTime =
      this.metrics.renderTimes.reduce((a, b) => a + b, 0) /
      (this.metrics.renderTimes.length || 1);

    const avgFrameTime =
      this.metrics.frameDeltas.reduce((a, b) => a + b, 0) /
      (this.metrics.frameDeltas.length || 1);

    const fps = 1000 / avgFrameTime;

    const memoryTrend =
      this.metrics.memoryUsage.length > 1
        ? (this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1].used -
            this.metrics.memoryUsage[0].used) /
          (this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
            .timestamp -
            this.metrics.memoryUsage[0].timestamp)
        : 0;

    return {
      averageRenderTime: avgRenderTime.toFixed(2) + "ms",
      fps: fps.toFixed(1),
      memoryTrend:
        memoryTrend > 0
          ? `+${(memoryTrend / 1024 / 1024).toFixed(2)}MB/s`
          : `${(memoryTrend / 1024 / 1024).toFixed(2)}MB/s`,
      operationCounts: Object.fromEntries(this.metrics.operationCounts),
      cacheStats: {
        formulaCache: performanceCache.formulaCache.size,
        colorCache: performanceCache.colorCache.size,
        renderQueue: performanceCache.renderQueue.size,
      },
    };
  },

  // Log performance report
  logReport() {
    console.table(this.getReport());
  },
};

// Export for use in content script
window.PerformanceMonitor = PerformanceMonitor;
