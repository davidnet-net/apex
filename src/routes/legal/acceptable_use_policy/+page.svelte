<script lang="ts">
	import LegalViewer from "$lib/components/LegalViewer.svelte";
	import document from "$lib/legal/acceptable_use_policy.md?raw";
	const githubpath = "src/lib/legal/acceptable_use_policy.md";
	const docname = "Acceptable use policy";
</script>

<LegalViewer {document} {githubpath} {docname} />