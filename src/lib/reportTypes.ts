export type ReportStatus = "pending" | "resolved" | "dismissed";
export type ReportType = "profile" | "short";

export interface UserReport {
	id: string;
	reportType: ReportType;
	reportedId: string;
	reason: string;
	status: ReportStatus;
	createdAt: string; // ISO String representation of timestamp
	updatedAt: string; // ISO String representation of timestamp
}

export type GetMyReportsSuccessResponse = {
	success: true;
	code: "SUCCESS";
	reports: UserReport[];
};

export type GetMyReportsErrorResponse = {
	success: false;
	code: "FETCH_FAILED" | "UNAUTHORIZED";
};

export type GetMyReportsResponse = GetMyReportsSuccessResponse | GetMyReportsErrorResponse;
