<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/cookies.md?raw";
	const githubpath = "src/lib/legal/cookies.md";
	const docname = "Cookies";
</script>

<LegalViewer {document} {githubpath} {docname} />