<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <!-- 听诊器：耳塞 + Y 管 -->
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <!-- 导管 -->
    <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
    <!-- 胸件 -->
    <circle cx="20" cy="10" r="2" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 24 }
});
</script>
