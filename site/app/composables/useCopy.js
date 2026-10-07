let timer

// Copies text to the clipboard and says so in the toast.
export function useCopy() {
  const message = useState('copy-message', () => '')

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      message.value = 'Copied'
    } catch {
      message.value = 'Select and copy by hand'
    }
    clearTimeout(timer)
    timer = setTimeout(() => {
      message.value = ''
    }, 1600)
  }

  return { message, copy }
}
