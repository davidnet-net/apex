<script lang="ts">
	import HelpViewer from "$lib/components/HelpViewer.svelte";
	import document from "$lib/help/delete_account.md?raw";
	const githubpath = "src/lib/help/delete_account.md";
	const docname = "About account deletion";
</script>

<HelpViewer {document} {githubpath} {docname} />