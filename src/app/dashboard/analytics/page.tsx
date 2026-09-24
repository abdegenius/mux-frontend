"use client";

import { useState } from "react";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import {
	AnalyticsHeader,
	type DateRange,
} from "@/components/analytics/AnalyticsHeader";
import { AnalyticsLoadingSkeleton } from "@/components/analytics/AnalyticsLoadingSkeleton";
import { ApiKeyUsageChart } from "@/components/analytics/ApiKeyUsageChart";
import { MetricsCards } from "@/components/analytics/MetricsCards";
import { TopAssetsTable } from "@/components/analytics/TopAssetsTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useApiKeyUsage } from "@/hooks/useApiKeyUsage";

export default function AnalyticsPage() {
	const [range, setRange] = useState<DateRange>(() => {
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - 7);
		return {
			from: from.toISOString().slice(0, 10),
			to: to.toISOString().slice(0, 10),
		};
	});
	const { data, isLoading, isError, error, refetch } = useAnalytics();
	const {
		data: usageData,
		isLoading: isUsageLoading,
		isError: isUsageError,
		error: usageError,
		refetch: refetchUsage,
	} = useApiKeyUsage(range);

	if (isLoading) {
		return <AnalyticsLoadingSkeleton />;
	}

	if (isError || !data) {
		return (
			<ErrorState
				title="Failed to load analytics"
				description={error ?? "An unexpected error occurred. Please try again."}
				retry={{ onRetry: refetch }}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<AnalyticsHeader range={range} onRangeChange={setRange} />

			<MetricsCards metrics={data.metrics} />

			<div className="grid gap-6 lg:grid-cols-2">
				<AnalyticsChart
					title="Volume"
					description="Total transaction volume over the selected period"
					data={data.volumeData}
					formatValue={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
				/>
				<AnalyticsChart
					title="Transactions"
					description="Number of transactions over the selected period"
					data={data.transactionsData}
				/>
			</div>

			<ApiKeyUsageChart
				data={usageData}
				isLoading={isUsageLoading}
				isError={isUsageError}
				error={usageError}
				onRetry={refetchUsage}
			/>

			<TopAssetsTable assets={data.topAssets} />
		</div>
	);
}
