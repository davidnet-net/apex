<script lang="ts">
	import { BlockNote, Button, FlexWrapper, Icon, LinkButton, Space } from "@davidnet/svelte-ui";
	import { onDestroy } from "svelte";

	function scrollDown() {
		window.scrollBy({ top: window.innerHeight, left: 0, behavior: "smooth" });
	}

	let width = $state(window.innerWidth);
	const handleResize = () => {
		width = window.innerWidth;
	};
	window.addEventListener("resize", handleResize);
	onDestroy(() => {
		window.removeEventListener("resize", handleResize);
	});
</script>

<div style="min-height: 100vh">
	<FlexWrapper height="100%" width="100%">
		<h1 class="hero-title">Welcome to Davidnet</h1>
		<h1 class="hero-subtitle">Manage & collaborate Smarter. While protecting Your privacy.</h1>
		<Space height="var(--token-space-5)" />
		<LinkButton appearance="primary" href="https://home.davidnet.net">Get started</LinkButton>
		<Space height="var(--token-space-2)" />
		<Button iconbefore="arrow_downward" onClick={scrollDown}>Learn more</Button>
	</FlexWrapper>
</div>
<div style="min-height: 100vh">
	<FlexWrapper height="100%" width="100%" justifycontent="flex-start">
		<h1 style="text-align: center;">Our teamwork or solo tools</h1>
		<FlexWrapper alignitems="flex-start" width="80%">
			<FlexWrapper width="100%" gap="var(--token-space-3)" justifycontent={width > 600 ? "center" : "space-evenly"} direction="row" wrap="wrap">
				<a class="option" href="https://kanban.davidnet.net">
					<FlexWrapper width="100%" height="100%" gap="var(--token-space-2)">
						<Icon size="4rem" icon="view_kanban" />
						<p class="option-text">Kanban</p>
					</FlexWrapper>
				</a>
				<a class="option" href="https://files.davidnet.net">
					<FlexWrapper width="100%" height="100%" gap="var(--token-space-2)">
						<Icon size="4rem" icon="smb_share" />
						<p class="option-text">Files</p>
					</FlexWrapper>
				</a>
				<a class="option" href="https://chat.davidnet.net">
					<FlexWrapper width="100%" height="100%" gap="var(--token-space-2)">
						<Icon size="4rem" icon="chat" />
						<p class="option-text">Chat</p>
					</FlexWrapper>
				</a>
				<a class="option" href="https://whiteboard.davidnet.net">
					<FlexWrapper width="100%" height="100%" gap="var(--token-space-2)">
						<Icon size="4rem" icon="draw" />
						<p class="option-text">Whiteboard</p>
					</FlexWrapper>
				</a>
			</FlexWrapper>
			<Space height="var(--token-space-3)" />

			<FlexWrapper width="100%" justifycontent="center">
				<Space height="var(--token-space-3)" />
				<p style="text-align: center; color: var(--token-color-text-default-tertiary);">
					You need to have an Davidnet Account to access these tools.
				</p>
				<BlockNote appearance="error" title="Work in progress"
					>Some services or apps are still in work in progress and cannot be accessed.</BlockNote
				>
			</FlexWrapper>
		</FlexWrapper>
		<Space height="20vh" />
		<h2 style="text-align: center;">All privacy friendly</h2>
		<div style="text-align: center; line-height: 1.5; max-width: 75%;">
			At Davidnet, we prioritize your privacy. We collect as minimal data as possible to provide our tools and services. And we are starting to
			work on e2e encryption for all tools and services so your data stays confidential. There is no Big-Tech and there everthing is stored inside the EU.
		</div>
		<Space height="var(--token-space-3)" />
		<Button iconbefore="arrow_downward" onClick={scrollDown}>Explore more</Button>
	</FlexWrapper>
</div>

<style>
	.hero-title {
		font-size: 5rem;
		text-align: center;
		margin: 1rem;
		background: linear-gradient(135deg, #6b73ff, #000dff);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.hero-subtitle {
		font-size: 1.5rem;
		text-align: center;
		margin: 0;
	}

	.option {
		text-decoration: none;
		color: var(--token-color-text-default-normal);
		text-align: center;
		border-radius: 2rem;
		background-color: var(--token-color-surface-overlay-normal);
		padding: 0.25rem;
		transition:
			transform 0.4s ease,
			box-shadow 0.4s ease;
		height: 8rem;
		width: 8rem;
	}

	.option:hover {
		background-color: var(--token-color-surface-overlay-hover);
		transform: scale(1.01);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.option:active,
	.option:focus {
		background-color: var(--token-color-surface-overlay-pressed);
	}

	.option:focus {
		outline: 2px solid var(--token-color-focusring);
	}

	.option-text {
		line-height: 1.2;
		margin: 0px;
		font-size: larger;
	}
</style>
