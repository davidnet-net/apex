<script lang="ts">
  import { hashSHA256, Loader } from '@davidnet/svelte-ui';
  import { onMount } from 'svelte';

  async function getCanvasHash() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('davidnet_fingerprint', 2, 2);
      return canvas.toDataURL();
    } else return null;
  }

  async function getWebGLInfo() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return null;
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER)
    };
  }

  let data: any = null;
  let clientData: any = null;

  onMount(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const screenPixelRatio = window.devicePixelRatio;
    const colorDepth = window.screen.colorDepth;
    const pixelDepth = window.screen.pixelDepth;
    const userAgent = navigator.userAgent;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const canvasHash = await hashSHA256(String(await getCanvasHash()));
    const webGLHash = await hashSHA256(String(await getWebGLInfo()));

    clientData = {
      timezone,
      screenWidth,
      screenHeight,
      screenPixelRatio,
      colorDepth,
      pixelDepth,
      userAgent,
      hardwareConcurrency,
      canvasHash,
      webGLHash
    };

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      data = await res.json();
    } catch (err) {
      console.error('Scan failed:', err);
    }
  });
</script>

<style>
  .table {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }

  .table h2 {
    grid-column: 1 / -1;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: var(--token-color-text-primary);
  }

  .label {
    font-weight: bold;
    word-break: break-word;
  }

  .value {
    word-break: break-word;
    color: #add8e6;
  }

  @media (max-width: 600px) {
    .table {
      grid-template-columns: 1fr;
    }
    .label {
      color: #ffa07a;
    }
    .value {
      color: #90ee90;
      margin-bottom: 0.5rem;
    }
  }
</style>

{#if data}
  <div class="table">
    <h1>Davidnet Fingerprint</h1>
    <h2>Client Data</h2>
    {#each Object.entries(clientData) as [key, value]}
      <div class="label">{key}</div>
      <div class="value">{JSON.stringify(value)}</div>
    {/each}

    <h2>Server Result</h2>
    <div class="label">Server Hash</div>
    <div class="value">{data.serverhash}</div>

    <div class="label">IP Hash</div>
    <div class="value">{data.iphash}</div>

    <div class="label">Final Fingerprint</div>
    <div class="value">{data.finalFingerprint}</div>

    <h2>Visitor Info</h2>
    {#each Object.entries(data.visitor) as [key, value]}
      {#if key !== 'clientHashes'}
        <div class="label">{key}</div>
        <div class="value">{typeof value === 'string' && key === 'lastSeen' ? new Date(value).toLocaleString() : JSON.stringify(value)}</div>
      {/if}
    {/each}

    <h2>Client Hashes</h2>
    {#each Object.entries(data.clientHashes) as [key, value]}
      <div class="label">{key}</div>
      <div class="value">{value}</div>
    {/each}
  </div>
{:else}
  <Loader />
{/if}
