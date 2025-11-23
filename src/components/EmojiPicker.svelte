<script>
  import { createEventDispatcher } from 'svelte';
  import { themeStore } from '../stores/theme';

  export let selectedEmoji = '';

  const dispatch = createEventDispatcher();
  let darkMode = false;
  let showPicker = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  const emojiCategories = {
    'People': ['😀', '😃', '😄', '😁', '😊', '🙂', '😎', '🤓', '🧐', '🤩', '😇', '🥳', '🤠', '👨', '👩', '🧑', '👦', '👧', '👶', '🧒', '👴', '👵', '🧓', '👨‍💻', '👩‍💻', '🧑‍💻'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐝', '🦋', '🐙', '🦑', '🦞'],
    'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥖', '🍰', '🎂', '🧁', '🍪', '🍩', '🍨'],
    'Objects': ['💎', '💰', '🔑', '🔒', '🔓', '🎁', '🎈', '🎉', '🎊', '🎯', '🎪', '🎨', '🎬', '🎮', '🎲', '🎯', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📹', '🎥'],
    'Symbols': ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯', '⭐', '🌟', '✨', '💫', '🔥', '⚡', '💧', '🌈', '☀️', '🌙', '⚙️', '🔧', '🔨', '⚔️', '🛡️']
  };

  function selectEmoji(emoji) {
    dispatch('select', { emoji });
    showPicker = false;
  }

  function togglePicker() {
    showPicker = !showPicker;
  }
</script>

<div class="emoji-picker-wrapper" class:dark={darkMode}>
  <div class="emoji-preview" on:click={togglePicker}>
    {#if selectedEmoji}
      <span class="selected-emoji">{selectedEmoji}</span>
    {:else}
      <span class="placeholder">Choose</span>
    {/if}
  </div>

  {#if showPicker}
    <div class="emoji-picker-panel">
      {#each Object.entries(emojiCategories) as [category, emojis]}
        <div class="emoji-category">
          <div class="category-name">{category}</div>
          <div class="emoji-grid">
            {#each emojis as emoji}
              <button
                type="button"
                class="emoji-button"
                class:selected={emoji === selectedEmoji}
                on:click={() => selectEmoji(emoji)}
              >
                {emoji}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .emoji-picker-wrapper {
    position: relative;
    width: 100%;
  }

  .emoji-preview {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 50px;
  }

  .emoji-picker-wrapper.dark .emoji-preview {
    background: #1e293b;
    border-color: #334155;
  }

  .emoji-preview:hover {
    border-color: #94a3b8;
    transform: scale(1.02);
  }

  .selected-emoji {
    font-size: 2rem;
  }

  .placeholder {
    color: #94a3b8;
    font-size: 0.9rem;
  }

  .emoji-picker-wrapper.dark .placeholder {
    color: #64748b;
  }

  .emoji-picker-panel {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 0.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
    z-index: 100;
    max-height: 400px;
    overflow-y: auto;
    animation: slideDown 0.2s ease-out;
  }

  .emoji-picker-wrapper.dark .emoji-picker-panel {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .emoji-category {
    margin-bottom: 1.5rem;
  }

  .emoji-category:last-child {
    margin-bottom: 0;
  }

  .category-name {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .emoji-picker-wrapper.dark .category-name {
    color: #94a3b8;
    border-bottom-color: #334155;
  }

  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    gap: 0.375rem;
  }

  .emoji-button {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.5rem;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
  }

  .emoji-button:hover {
    background: #f1f5f9;
    transform: scale(1.15);
  }

  .emoji-picker-wrapper.dark .emoji-button:hover {
    background: #334155;
  }

  .emoji-button.selected {
    background: var(--accent-primary-light, #dbeafe);
    border-color: var(--accent-primary, #3b82f6);
    transform: scale(1.1);
  }

  .emoji-picker-wrapper.dark .emoji-button.selected {
    background: rgba(59, 130, 246, 0.2);
  }

  /* Scrollbar styling */
  .emoji-picker-panel::-webkit-scrollbar {
    width: 8px;
  }

  .emoji-picker-panel::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  .emoji-picker-wrapper.dark .emoji-picker-panel::-webkit-scrollbar-track {
    background: #0f172a;
  }

  .emoji-picker-panel::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  .emoji-picker-wrapper.dark .emoji-picker-panel::-webkit-scrollbar-thumb {
    background: #475569;
  }

  .emoji-picker-panel::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
