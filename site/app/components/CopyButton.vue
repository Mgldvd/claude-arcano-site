<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: 'Copy',
  },
  small: {
    type: Boolean,
    default: false,
  },
})

const { copy } = useCopy()
</script>

<template>
  <button
    class="button"
    :class="{ 'button--small': small }"
    type="button"
    @click="copy(props.text)"
  >
    {{ label }}
  </button>
</template>
