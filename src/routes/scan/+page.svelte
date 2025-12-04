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

  async function getAudioInfo() {
    const audio = new AudioContext();
    return audio.sampleRate;
  }

  let data: any = null;
  let clientData: any = null;

  function isDifferent(key: string) {
    if (!data?.visitor?.clientHashes || !data.clientHashes) return false;
    return data.visitor.clientHashes[key] !== data.clientHashes[key];
  }

  onMount(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const screenPixelRatio = window.devicePixelRatio;
    const colorDepth = window.screen.colorDepth;
    const pixelDepth = window.screen.pixelDepth;
    const userAgent = navigator.userAgent;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const fontsHash = await hashSHA256(JSON.stringify(Array.from(document.fonts).map(f => f.family)));
    const canvasHash = await hashSHA256(String(await getCanvasHash()));
    const webGLHash = await hashSHA256(String(await getWebGLInfo()));
    const audioHash = await hashSHA256(String(await getAudioInfo()));

    clientData = {
      timezone,
      screenWidth,
      screenHeight,
      screenPixelRatio,
      colorDepth,
      pixelDepth,
      userAgent,
      hardwareConcurrency,
      fontsHash,
      canvasHash,
      webGLHash,
      audioHash
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

{#if data}
  <div class="table">
    <h1>Davidnet Fingerprint</h1>

    <h2>Summary</h2>
    <div class="label">Visitor ID</div>
    <div class="value">{data.visitor.id}</div>

    <div class="label">Seen Before</div>
    <div class="value">{data.visitor.seenBefore ? "Yes" : "No"}</div>

    <div class="label">Last Seen</div>
    <div class="value">{new Date(data.visitor.lastSeen).toLocaleString()}</div>  

    <div class="label">Accuracy</div>
    <div class="value">{data.visitor.accuracy}%</div>  

    <h2>Client Hashes</h2>
    {#each Object.entries(data.clientHashes) as [key, value]}
      <div class="label">{key}</div>
      <div class="value" class:is-different={isDifferent(key)}>
        {value}
      </div>
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
  </div>
{:else}
  <Loader />
{/if}

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
  }

  .label {
    font-weight: bold;
    word-break: break-word;
    color: var(--token-color-text-discover);
  }

  .value {
    word-break: break-word;
    color: var(--token-color-text-primary);
  }

  .value.is-different {
    color: red;
    font-weight: bold;
  }

  @media (max-width: 600px) {
    .table {
      grid-template-columns: 1fr;
    }
    .value {
      margin-bottom: 0.5rem;
    }
  }
</style>
