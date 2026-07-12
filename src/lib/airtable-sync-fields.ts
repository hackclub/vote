/**
 * The values the Airtable sync writes for each team member of a submitted
 * project (payload built in src/lib/server/airtable.ts). The sync wizard maps
 * each of these to a field in the chosen Airtable table; the mapping is stored
 * on Event.airtableFieldMap. Events without a stored mapping fall back to
 * matching `defaultName` exactly.
 */
export interface SyncFieldDef {
	/** Stable key used in Event.airtableFieldMap. */
	key: string;
	/** Human label shown in the mapping UI. */
	label: string;
	/** Airtable field name used when no mapping is stored. */
	defaultName: string;
	/** Airtable field types this value can be written into (typecast on). */
	compatibleTypes: string[];
	note?: string;
}

const TEXT = ['singleLineText', 'multilineText'];

export const AIRTABLE_SYNC_FIELDS: SyncFieldDef[] = [
	{ key: 'firstName', label: 'First name', defaultName: 'First Name', compatibleTypes: TEXT },
	{ key: 'lastName', label: 'Last name', defaultName: 'Last Name', compatibleTypes: TEXT },
	{ key: 'email', label: 'Email', defaultName: 'Email', compatibleTypes: ['email'] },
	{ key: 'codeUrl', label: 'Code URL', defaultName: 'Code URL', compatibleTypes: ['url'] },
	{
		key: 'playableUrl',
		label: 'Playable URL',
		defaultName: 'Playable URL',
		compatibleTypes: ['url']
	},
	{ key: 'description', label: 'Description', defaultName: 'Description', compatibleTypes: TEXT },
	{
		key: 'hoursOverride',
		label: 'Hours override',
		defaultName: 'Optional - Override Hours Spent',
		compatibleTypes: ['number']
	},
	{
		key: 'hackatimeProjects',
		label: 'Hackatime projects',
		defaultName: 'Hackatime Projects',
		compatibleTypes: TEXT
	},
	{
		key: 'screenshot',
		label: 'Screenshot',
		defaultName: 'Screenshot',
		compatibleTypes: ['multipleAttachments'],
		note: 'needs an attachment field'
	}
];

/** App field key → target Airtable field. Unlisted keys are not synced. */
export type AirtableFieldMap = Record<string, { id: string; name: string }>;
