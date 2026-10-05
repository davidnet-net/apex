<script lang="ts">
	import { onMount } from "svelte";
	import { PUBLIC_BACKEND_URL } from "$env/static/public";
	import {
		authState,
		Button,
		Divider,
		Flex,
		formatIsoToPreferred,
		getFetch,
		Icon,
		Link,
		LinkButton,
		Modal,
		navigateBack,
		Skeleton,
		whenAuthReady,
		type iconType
	} from "@davidnet-net/svelte-ui";
	import { token } from "@davidnet-net/svelte-ui/tokens";
	import HorizontalCard from "$lib/components/HorizontalCard/HorizontalCard.svelte";
	import type { UserReport } from "$lib/moderationTypes";
	import * as m from "$lib/paraglide/messages.js";
	let myReports = $state<UserReport[]>([]);
	let loading = $state(true);
	let openReport = $state<UserReport | undefined>(undefined);

	$effect(() => {
		(async () => {
			await whenAuthReady();
			if (!authState.isLoggedIn && !authState.loading) {
				return;
			}

			loadData();
		})();
	});

	async function loadData() {
		if (!authState.isLoggedIn && !authState.loading) {
			return;
		}

		const res = await getFetch(
			PUBLIC_BACKEND_URL + "/support/moderation/reports/me",
			undefined,
			undefined,
			true
		);

		if (res && res.reports) {
			myReports = res.reports;
		} else if (Array.isArray(res)) {
			myReports = res;
		}

		loading = false;
	}

	onMount(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === "visible") {
				await loadData();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	});

	const statusIcons: Record<string, string> = {
		pending: "schedule",
		resolved: "check_circle",
		dismissed: "cancel"
	};
</script>

<Flex alignItems="center" marginTop="giant" direction="column">
	<Flex width="90%" marginTop="giant" direction="column" gap="small">
		<Flex justifyContent="spaceBetween" height="fit-content">
			<h2>{m.page_moderation_heading()}</h2>
			<Flex width="fit-content" height="fit-content" gap="small">
				<LinkButton href="/moderation">{m.page_moderation_link()}</LinkButton>
				<Button
					iconbefore="arrow_back"
					onclick={() => {
						navigateBack("/help");
					}}>
					{m.common_back()}
				</Button>
			</Flex>
		</Flex>
		<Flex gap="medium" height="fit-content" marginBottom="giant" flexWrap="wrap">
			{#if loading}
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
				<Skeleton height="4rem" width="18rem" />
			{:else if myReports.length === 0}
				<Flex
					direction="column"
					alignItems="center"
					justifyContent="center"
					width="100%"
					marginTop="medium">
					<Icon icon="inbox" size="giant" />
					<p style="color: {token.theme.color.text.secondary}">
						{m.page_reports_empty()}
					</p>
				</Flex>
			{:else}
				{#each myReports as report (report.id)}
					<HorizontalCard
						icon={(statusIcons[report.status] as iconType) || ("help" as iconType)}
						onclick={() => {
							openReport = report;
						}}
						title={m.page_reports_card_title({ type: report.reportType })}
						description={`${formatIsoToPreferred(report.updatedAt, true)}`} />
				{/each}
			{/if}
		</Flex>
	</Flex>
</Flex>

{#if openReport}
	<Modal
		title={m.page_reports_modal_title()}
		onclose={() => {
			openReport = undefined;
		}}>
		<Flex direction="column" gap="medium" width="100%">
			<!-- Status Badge Header -->
			<Flex alignItems="center" gap="small" height="fit-content">
				<Icon icon={(statusIcons[openReport.status] as iconType) || ("help" as iconType)} />
				<span>
					{m.page_reports_status_label({ status: openReport.status })}
				</span>
			</Flex>

			<!-- Report Details List -->
			<Flex height="fit-content" gap="small" direction="column">
				<p>
					<strong>{m.common_label_report_id()}</strong>
					<span>{openReport.id}</span>
				</p>
				<p>
					<strong>{m.common_label_type()}</strong>
					{openReport.reportType}
				</p>
				<p>
					<strong>{m.page_reports_target_content_id_label()}</strong>
					<span>{openReport.reportedId}</span>
				</p>
				<p>
					{#if openReport.status !== "resolved"}
						{#if openReport.reportType === "short"}
							<span>
								<strong>{m.page_reports_content_label()}</strong>
								<Link opennewtab href="https://social.davidnet.net/shorts/{openReport.reportedId}">
									{m.common_view_content_link()}
								</Link>.
							</span>
						{:else if openReport.reportType === "profile"}
							<span>
								<strong>{m.page_reports_content_label()}</strong>
								<Link
									opennewtab
									href="https://account.davidnet.net/profile/{openReport.reportedId}">
									{m.common_view_content_link()}
								</Link>.
							</span>
						{:else}
							<span>
								<strong>{m.page_reports_content_label()}</strong>
								{m.page_reports_no_direct_link()}
							</span>
						{/if}
					{:else}
						<span>
							<strong>{m.page_reports_content_label()}</strong>
							{m.page_reports_content_deleted()}
						</span>
					{/if}
				</p>
				<p>
					<strong>{m.common_label_submitted()}</strong>
					{formatIsoToPreferred(openReport.createdAt, true)}
				</p>
				<p>
					<strong>{m.page_reports_last_updated_label()}</strong>
					{formatIsoToPreferred(openReport.updatedAt, true)}
				</p>

				<Divider color="tertiary" />

				<p><strong>{m.page_reports_reason_label()}</strong></p>
				<div>
					{openReport.reason}
				</div>
			</Flex>
		</Flex>

		{#snippet actions()}
			<Button
				appearance="primary"
				onclick={() => {
					openReport = undefined;
				}}>
				{m.common_close()}
			</Button>
		{/snippet}
	</Modal>
{/if}
