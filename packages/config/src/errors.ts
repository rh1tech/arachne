import { ArachneError } from "@arachne/core";

export class ConfigError extends ArachneError {
	override name = "ConfigError";
	readonly issues: readonly ConfigIssue[];

	constructor(issues: ConfigIssue[]) {
		super(formatIssues(issues));
		this.issues = issues;
	}
}

export interface ConfigIssue {
	path: string;
	message: string;
}

function formatIssues(issues: ConfigIssue[]): string {
	return issues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ");
}
