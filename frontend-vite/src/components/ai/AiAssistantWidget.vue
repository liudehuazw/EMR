<template>
  <div class="ai-assistant">
    <!-- 浮动入口按钮 -->
    <button v-if="!open" class="fab" @click="open = true" title="AI 就诊助手">
      <AiAssistantIcon :size="26" />
    </button>

    <!-- 聊天面板 -->
    <div v-else class="panel">
      <!-- 头部 -->
      <div class="header">
        <div class="header-left">
          <div class="header-title"><AiAssistantIcon :size="15" /><span>AI 就诊助手</span></div>
          <div class="header-scope">{{ scopeLabel }}</div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" title="回到 AI 助手首页" @click="goHome">⌂</button>
          <button class="icon-btn" title="关闭" @click="open = false">✕</button>
        </div>
      </div>

      <!-- 消息区 -->
      <div ref="listEl" class="messages" @wheel.passive>
        <!-- 快捷提问（无历史时） -->
        <div v-if="messages.length === 0" class="welcome">
          <p class="welcome-text">你好，我是你的电子病历就诊助手。可以问我关于费用、检验指标、病历等方面的问题。</p>
          <button
            v-for="(s, i) in suggestions"
            :key="i"
            class="suggestion"
            @click="send(s)"
          >{{ s }}</button>
        </div>

        <template v-for="(m, i) in messages" :key="i">
          <!-- 用户消息 -->
          <div v-if="m.role === 'user'" class="bubble-row user">
            <div class="bubble bubble-user">{{ m.content }}</div>
          </div>

          <!-- 助手消息 -->
          <div v-else class="bubble-row ai">
            <div class="bubble bubble-ai">
              <!-- 工具状态 -->
              <div v-if="currentTool && m.streaming" class="tool-status">
                🔍 正在查询数据…
              </div>
              <!-- 流式正文 -->
              <div
                v-if="m.content"
                class="ai-text"
                :class="{ streaming: m.streaming }"
              >{{ m.content }}<span v-if="m.streaming" class="cursor">▍</span></div>
              <!-- 错误 -->
              <div v-if="m.error" class="ai-error">{{ m.error }}</div>
              <!-- 来源跳转 -->
              <div v-if="m.sources && m.sources.length" class="sources">
                <button
                  v-for="(s, si) in m.sources"
                  :key="si"
                  class="source-chip"
                  @click="goSource(s)"
                >🔗 {{ s.label }}<span class="source-name">{{ s.patientName }}</span></button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <textarea
          v-model="input"
          class="input"
          rows="1"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="send()"
          @keydown.enter.shift.prevent
        ></textarea>
        <button
          v-if="!busy"
          class="send-btn"
          :disabled="!input.trim()"
          @click="send()"
        >发送</button>
        <button v-else class="send-btn stop" @click="stop()">停止</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAiAssistant } from '@/composables/useAiAssistant';
import AiAssistantIcon from '@/components/ai/AiAssistantIcon.vue';

const router = useRouter();

// 解构组合式函数返回值：模板中顶层 ref 自动解包；脚本中需用 .value
const { open, busy, currentTool, messages, input, scopeLabel, suggestions, send, stop, reset } = useAiAssistant();
const listEl = ref(null);

// 新内容或流式变化时自动滚到底部（脚本内访问 ref 必须用 .value）
watch(
  () => messages.value.map((m) => m.content + (m.sources?.length || 0)).join('|'),
  async () => {
    await nextTick();
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
  }
);

function goSource(s) {
  if (s.module === 'patient') {
    router.push({ name: 'PatientDetail', params: { id: s.patientId } });
  } else {
    const map = { invoice: 'Invoice', lab: 'Lab', records: 'Records', imaging: 'Imaging' };
    const name = map[s.module];
    if (name) router.push({ name, query: { patientId: s.patientId } });
  }
}

function goHome() {
  // 回到 AI 助手首页：清空对话，重新显示欢迎语与快捷提问
  reset();
}
</script>

<style scoped>
.ai-assistant {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ===== 浮动按钮 ===== */
.fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 54px;
  height: 54px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f6ef7, #6a5cff);
  color: #fff;
  font-size: 24px;
  box-shadow: 0 6px 20px rgba(79, 110, 247, 0.45);
  cursor: pointer;
  z-index: 9990;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}
.fab:hover { transform: scale(1.08); }

/* ===== 面板 ===== */
.panel {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: min(600px, 76vh);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9990;
  border: 1px solid #eee;
}

/* ===== 头部 ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #4f6ef7, #6a5cff);
  color: #fff;
}
.header-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.header-scope { font-size: 11px; opacity: 0.85; margin-top: 2px; }
.close-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
}
.close-btn:hover { background: rgba(255, 255, 255, 0.3); }
.header-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  transition: background 0.15s;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.3); }

/* ===== 消息区 ===== */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f7f8fc;
}
.welcome { margin-top: 8px; }
.welcome-text { font-size: 13px; color: #666; line-height: 1.6; margin: 0 0 10px; }
.suggestion {
  display: block;
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  margin-bottom: 8px;
  border: 1px solid #e2e6f3;
  background: #fff;
  border-radius: 10px;
  color: #4f6ef7;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.suggestion:hover { background: #eef1fd; }

.bubble-row { display: flex; margin-bottom: 12px; }
.bubble-row.user { justify-content: flex-end; }
.bubble {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.bubble-user {
  background: linear-gradient(135deg, #4f6ef7, #6a5cff);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.bubble-ai {
  background: #fff;
  border: 1px solid #eef0f6;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.ai-text { color: #2b2f3a; }
.ai-text.streaming .cursor { color: #4f6ef7; animation: blink 0.9s infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.tool-status {
  color: #8a8fa3;
  font-size: 12px;
  padding-bottom: 4px;
}
.ai-error { color: #d03050; font-size: 13px; }

/* ===== 来源跳转 ===== */
.sources { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.source-chip {
  border: 1px solid #dbe2ff;
  background: #f4f6ff;
  color: #4f6ef7;
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s;
}
.source-chip:hover { background: #e6ebff; }
.source-name { opacity: 0.7; margin-left: 3px; }

/* ===== 输入区 ===== */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
  background: #fff;
}
.input {
  flex: 1;
  border: 1px solid #dde2ee;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 13.5px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  max-height: 96px;
}
.input:focus { border-color: #4f6ef7; }
.send-btn {
  border: none;
  background: linear-gradient(135deg, #4f6ef7, #6a5cff);
  color: #fff;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.send-btn.stop { background: #6b7280; }

@media (max-width: 576px) {
  .panel {
    right: 10px;
    bottom: 10px;
    left: 10px;
    width: auto;
    height: 72vh;
  }
  .fab { right: 16px; bottom: 16px; }
}
</style>
