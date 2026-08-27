/**
 * useCursorGlow - 鼠标蓝色柔光 + Canvas 流星拖尾效果
 *
 * 1. 蓝色柔光：通过 CSS 自定义属性跟随鼠标（#cursor-glow）
 * 2. 流星拖尾：全屏 Canvas 绘制轨迹线，2 秒内透明度+线宽逐渐衰减至消失
 *    参考方案：HTML5 Canvas → 高性能、无 DOM 卡顿
 */
import { onMounted, onUnmounted } from 'vue'

export function useCursorGlow() {
  let cleanup = null

  onMounted(() => {
    const root = document.documentElement

    // ===== 1. 蓝色柔光追踪（CSS #cursor-glow 驱动） =====
    const glowHandler = (e) => {
      root.style.setProperty('--mouse-x', e.clientX + 'px')
      root.style.setProperty('--mouse-y', e.clientY + 'px')
    }
    window.addEventListener('mousemove', glowHandler, { passive: true })

    // ===== 2. Canvas 流星拖尾 =====
    const canvas = document.createElement('canvas')
    canvas.id = 'cursor-trail'
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;'
    document.body.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    const TAIL_COLOR = 'rgba(18, 144, 255, 1)'   // 拖尾主色（医疗蓝）
    const TAIL_WIDTH = 4                           // 起始线宽
    const POINT_LIFETIME = 2000                    // 2 秒消失
    let points = []                                // 轨迹点数组 {x, y, time}
    let animId = null

    // 2.1 初始化画布大小（考虑 DPR 防止 Retina 模糊）
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 2.2 记录鼠标轨迹
    const trailHandler = (e) => {
      points.push({ x: e.clientX, y: e.clientY, time: performance.now() })
    }
    window.addEventListener('mousemove', trailHandler, { passive: true })

    // 2.3 动画渲染循环
    function animate(timestamp) {
      // 过滤掉超过 2 秒的老点
      points = points.filter(p => timestamp - p.time < POINT_LIFETIME)

      // 清除画布（用实际宽高清除）
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      if (points.length > 1) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1]
          const curr = points[i]
          const age = timestamp - curr.time
          const life = 1 - age / POINT_LIFETIME  // 1→0 渐变

          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(curr.x, curr.y)
          // 透明度与线宽同时衰减 —— 2 秒内完美淡出
          ctx.strokeStyle = `rgba(18, 144, 255, ${Math.max(life, 0)})`
          ctx.lineWidth = TAIL_WIDTH * Math.max(life, 0)
          ctx.stroke()
        }
      }

      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    // ===== 清理 =====
    cleanup = () => {
      window.removeEventListener('mousemove', glowHandler)
      window.removeEventListener('mousemove', trailHandler)
      window.removeEventListener('resize', resizeCanvas)
      if (animId) cancelAnimationFrame(animId)
      points = []
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  })

  onUnmounted(() => {
    if (cleanup) cleanup()
  })
}
