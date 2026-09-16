// --- COMMON MODELS ---
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type ReportType = "profile" | "short";

export interface UserReport {
	id: string;
	reportType: ReportType;
	reportedId: string;
	reason: string;
	status: ReportStatus;
	createdAt: string;
	updatedAt: string;
}

export interface ModeratorQueueReport {
	id: string;
	reportType: ReportType;
	reportedId: string;
	reason: string;
	status: ReportStatus;
	createdAt: string;
	reporterUsername: string;
	reporterDisplayName: string;
	reportedUserId: string;
}

export interface UserViolation {
	id: string;
	reportedType: ReportType;
	reportedId: string;
	reason: string;
	moderatorReason: string | null;
	createdAt: string;
}

export interface AccountModerationStatus {
	userId: string;
	reportTrustScore: number;
	bannedUntil: string | null;
	updatedAt: string;
}

// --- API RESPONSE TYPES ---

// 1. Submit Report
export type SubmitReportResponse =
	| {
			success: true;
			code: "REPORT_SUBMITTED";
			report: UserReport;
	  }
	| {
			success: false;
			code:
				| "INVALID_JSON"
				| "INVALID_REPORT_TYPE"
				| "MISSING_REPORTED_ID"
				| "MISSING_REASON"
				| "REASON_TOO_LONG"
				| "SHORT_NOT_FOUND"
				| "USER_NOT_FOUND"
				| "REPORT_SUBMISSION_FAILED";
	  };

// 2. Get My Reports
export type GetMyReportsResponse =
	| {
			success: true;
			code: "SUCCESS";
			reports: UserReport[];
	  }
	| {
			success: false;
			code: "FETCH_FAILED";
	  };

// 3. Get My Violations
export type GetMyViolationsResponse =
	| {
			success: true;
			code: "SUCCESS";
			violations: UserViolation[];
	  }
	| {
			success: false;
			code: "FETCH_FAILED";
	  };

// 4. Check Ban Status
export type GetBanStatusResponse =
	| {
			success: true;
			isBanned: boolean;
			bannedUntil: string | null;
	  }
	| {
			success: false;
			code: "FETCH_FAILED";
	  };

// 5. Get Moderator Reports Queue (Admin)
export type GetAdminReportsResponse =
	| {
			success: true;
			code: "SUCCESS";
			reports: ModeratorQueueReport[];
	  }
	| {
			success: false;
			code: "FORBIDDEN_INSUFFICIENT_PERMISSIONS" | "FETCH_FAILED";
	  };

// 6. Update Report Status (Admin)
export type UpdateReportStatusResponse =
	| {
			success: true;
			code: "REPORT_STATUS_UPDATED";
			report: UserReport;
	  }
	| {
			success: false;
			code:
				| "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
				| "INVALID_JSON"
				| "INVALID_STATUS"
				| "REPORT_NOT_FOUND"
				| "UPDATE_FAILED";
	  };

// 7. Create Violation (Admin)
export type CreateViolationResponse =
	| {
			success: true;
			code: "VIOLATION_CREATED";
			violation: UserViolation;
	  }
	| {
			success: false;
			code:
				| "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
				| "INVALID_JSON"
				| "MISSING_USER_ID"
				| "INVALID_REPORTED_TYPE"
				| "MISSING_REPORTED_ID"
				| "MISSING_REASON"
				| "REASON_TOO_LONG"
				| "INVALID_MODERATOR_REASON"
				| "MODERATOR_REASON_TOO_LONG"
				| "CREATION_FAILED";
	  };

// 8. Ban/Unban User (Admin)
export type BanUserResponse =
	| {
			success: true;
			code: "USER_BANNED" | "USER_UNBANNED";
			status: AccountModerationStatus;
	  }
	| {
			success: false;
			code:
				| "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
				| "INVALID_JSON"
				| "INVALID_DATE_FORMAT"
				| "UPDATE_FAILED";
	  };
