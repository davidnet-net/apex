// --- COMMON MODELS ---
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type ReportType = "profile" | "short" | "game";

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

export interface BanEvent {
	id: string;
	action: "ban" | "unban";
	bannedUntil: string | null;
	violationId: string | null;
	reason: string | null;
	moderatorId: string;
	moderatorUsername: string;
	createdAt: string;
}

export interface UserIp {
	ip: string;
	countryCode: string | null;
	userAgent: string | null;
	lastSeenAt: string;
	createdAt: string;
	isBanned: boolean;
}

export interface IpLinkedUser {
	userId: string;
	username: string;
	displayName: string;
	avatarUrl: string | null;
	lastSeenAt: string;
	userAgent: string | null;
}

export interface BannedIp {
	ip: string;
	reason: string | null;
	createdAt: string;
	moderatorUsername: string;
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
			violationId: string | null;
	  }
	| {
			success: false;
			code:
				| "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
				| "INVALID_JSON"
				| "INVALID_DATE_FORMAT"
				| "VIOLATION_NOT_FOUND"
				| "MISSING_REASON_OR_VIOLATION"
				| "UPDATE_FAILED";
	  };

// 9. Edit Violation (Admin)
export type EditViolationResponse =
	| {
			success: true;
			code: "VIOLATION_UPDATED";
			violation: UserViolation;
	  }
	| {
			success: false;
			code:
				| "FORBIDDEN_INSUFFICIENT_PERMISSIONS"
				| "INVALID_JSON"
				| "NO_FIELDS_TO_UPDATE"
				| "MISSING_REASON"
				| "REASON_TOO_LONG"
				| "MODERATOR_REASON_TOO_LONG"
				| "VIOLATION_NOT_FOUND"
				| "UPDATE_FAILED";
	  };

// 10. Delete Violation (Admin)
export type DeleteViolationResponse =
	| { success: true; code: "VIOLATION_DELETED" }
	| {
			success: false;
			code: "FORBIDDEN_INSUFFICIENT_PERMISSIONS" | "VIOLATION_NOT_FOUND" | "DELETE_FAILED";
	  };

// 11. IP ban/unban (Admin)
export type BanIpResponse =
	| { success: true; code: "IP_BANNED"; bannedIp: BannedIp }
	| { success: false; code: "FORBIDDEN_INSUFFICIENT_PERMISSIONS" | "INVALID_IP" | "UPDATE_FAILED" };
