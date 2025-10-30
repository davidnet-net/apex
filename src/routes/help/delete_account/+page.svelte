<script lang="ts">
	import LegalViewer from "$lib/components/HelpViewer.svelte";
	import document from "$lib/help/delete_account.md?raw";
	const githubpath = "src/lib/help/delete_account.md";
	const docname = "About account deletion";
</script>

<LegalViewer {document} {githubpath} {docname} />