<svelte:head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: #faf7f5;
      color: #2d2a26;
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; font-family: inherit; }
    input, select, textarea { font-family: inherit; }

    :global(.container) {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    :global(.card) {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      padding: 20px;
    }
    :global(.btn) {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s;
    }
    :global(.btn-primary) {
      background: linear-gradient(135deg, #e8a598 0%, #d48c7e 100%);
      color: #fff;
    }
    :global(.btn-primary:hover) {
      background: linear-gradient(135deg, #d48c7e 0%, #c47567 100%);
      transform: translateY(-1px);
    }
    :global(.btn-secondary) {
      background: #f5ebe6;
      color: #7a5c54;
    }
    :global(.btn-secondary:hover) { background: #eadfd8; }
    :global(.btn-danger) {
      background: #fde6e2;
      color: #c2513c;
    }
    :global(.btn-danger:hover) { background: #f9d3cc; }
    :global(.btn-ghost) {
      background: transparent;
      color: #7a5c54;
    }
    :global(.btn-ghost:hover) { background: #f5ebe6; }
    :global(.btn-sm) { padding: 4px 10px; font-size: 12px; }
    :global(.btn-link) {
      background: none;
      border: none;
      padding: 0;
      color: #c47567;
      text-decoration: underline;
      font-size: 13px;
    }
    :global(.form-group) {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    :global(.form-row) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    :global(.form-label) {
      font-size: 13px;
      font-weight: 500;
      color: #7a5c54;
    }
    :global(.form-input) {
      padding: 10px 12px;
      border: 1.5px solid #e8dcd4;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      transition: border-color 0.15s;
    }
    :global(.form-input:focus) {
      outline: none;
      border-color: #d48c7e;
    }
    :global(.form-select) {
      padding: 10px 12px;
      border: 1.5px solid #e8dcd4;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
    }
    :global(.form-select:focus) {
      outline: none;
      border-color: #d48c7e;
    }
    :global(.form-textarea) {
      padding: 10px 12px;
      border: 1.5px solid #e8dcd4;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      min-height: 80px;
      resize: vertical;
    }
    :global(.form-textarea:focus) {
      outline: none;
      border-color: #d48c7e;
    }
    :global(.tag) {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 500;
    }
    :global(.tag-gray) { background: #f2efec; color: #7a6f66; }
    :global(.tag-blue) { background: #e6effd; color: #2d63c5; }
    :global(.tag-green) { background: #e6f5ea; color: #2d8c4e; }
    :global(.tag-yellow) { background: #fdf5e2; color: #997404; }
    :global(.tag-red) { background: #fde6e2; color: #c2513c; }
    :global(.tag-purple) { background: #f2e9fa; color: #884fc2; }

    :global(.page-title) {
      font-size: 24px;
      font-weight: 600;
      color: #4a3630;
      margin-bottom: 20px;
    }
    :global(.section-title) {
      font-size: 16px;
      font-weight: 600;
      color: #4a3630;
      margin-bottom: 12px;
    }
    :global(.empty-state) {
      text-align: center;
      padding: 48px 24px;
      color: #a5968d;
    }
    :global(.text-muted) { color: #a5968d; }
    :global(.text-danger) { color: #c2513c; }
    :global(.text-success) { color: #2d8c4e; }
    :global(.text-sm) { font-size: 13px; }
    :global(.text-xs) { font-size: 12px; }
    :global(.mt-4) { margin-top: 16px; }
    :global(.mt-2) { margin-top: 8px; }
    :global(.mb-4) { margin-bottom: 16px; }
    :global(.mb-2) { margin-bottom: 8px; }
    :global(.flex) { display: flex; }
    :global(.flex-between) { display: flex; justify-content: space-between; align-items: center; }
    :global(.flex-end) { display: flex; justify-content: flex-end; }
    :global(.gap-2) { gap: 8px; }
    :global(.gap-3) { gap: 12px; }
    :global(.gap-4) { gap: 16px; }
    :global(.items-center) { align-items: center; }
    :global(.grid-3) { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    :global(.grid-4) { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    :global(.over-budget) {
      background: #fff5f3 !important;
      border-color: #f3bcb1 !important;
    }
    :global(.progress-bar) {
      height: 8px;
      background: #f2efec;
      border-radius: 4px;
      overflow: hidden;
    }
    :global(.progress-fill) {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    :global(.progress-normal) { background: linear-gradient(90deg, #e8a598, #d48c7e); }
    :global(.progress-danger) { background: linear-gradient(90deg, #f3a89a, #e86b56); }

    :global(.modal-backdrop) {
      position: fixed; inset: 0;
      background: rgba(45, 42, 38, 0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
      padding: 20px;
    }
    :global(.modal) {
      background: #fff;
      border-radius: 16px;
      padding: 28px;
      max-width: 560px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }
    :global(.modal-wide) { max-width: 720px; }
    :global(.modal-title) {
      font-size: 18px;
      font-weight: 600;
      color: #4a3630;
      margin-bottom: 20px;
    }
    :global(.modal-actions) {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f2efec;
    }

    :global(.table) {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    :global(.table th) {
      text-align: left;
      padding: 12px;
      background: #faf7f5;
      font-weight: 600;
      color: #7a5c54;
      border-bottom: 1.5px solid #e8dcd4;
    }
    :global(.table td) {
      padding: 12px;
      border-bottom: 1px solid #f2efec;
    }
    :global(.table tr:hover td) { background: #fdfbf9; }

    :global(.toast) {
      position: fixed;
      top: 20px; right: 20px;
      padding: 12px 20px;
      border-radius: 10px;
      background: #4a3630;
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 200;
      animation: slideIn 0.25s ease;
      font-size: 14px;
    }
    :global(.toast-error) { background: #c2513c; }
    :global(.toast-success) { background: #2d8c4e; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</svelte:head>

<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
</script>

<div class="app">
  <header class="app-header">
    <div class="header-inner">
      <a href="{base}/" class="brand">
        <span class="brand-icon">💒</span>
        <span class="brand-text">婚礼协作小站</span>
      </a>
      {#if $page.params.id}
        <nav class="nav-tabs">
          <a href="{base}/weddings/{$page.params.id}" class:is-active={$page.route.id === '/weddings/[id]'}>概览</a>
          <a href="{base}/weddings/{$page.params.id}/tasks" class:is-active={$page.route.id === '/weddings/[id]/tasks'}>任务看板</a>
          <a href="{base}/weddings/{$page.params.id}/guests" class:is-active={$page.route.id === '/weddings/[id]/guests'}>宾客管理</a>
          <a href="{base}/weddings/{$page.params.id}/suppliers" class:is-active={$page.route.id === '/weddings/[id]/suppliers'}>供应商</a>
          <a href="{base}/weddings/{$page.params.id}/budget" class:is-active={$page.route.id === '/weddings/[id]/budget'}>预算支出</a>
        </nav>
      {/if}
    </div>
  </header>

  <main>
    <slot />
  </main>
</div>

<style>
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .app-header {
    background: #fff;
    border-bottom: 1px solid #f2efec;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .header-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 40px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 17px;
    color: #4a3630;
  }
  .brand-icon { font-size: 24px; }
  .nav-tabs {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .nav-tabs a {
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #7a6f66;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .nav-tabs a:hover {
    background: #faf7f5;
    color: #4a3630;
  }
  .nav-tabs a.is-active {
    background: #f5ebe6;
    color: #c47567;
  }
  main { flex: 1; }
</style>
