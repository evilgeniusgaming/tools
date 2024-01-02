/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data - Data for a single entry to clean.
 * @param {object} [options]
 * @param {string} [options.documentType] - Type of document being cleaned.
 * @param {boolean} [options.clearSourceId] - Should the core sourceId flag be deleted?
 * @param {boolean} [options.clearSorting] - Should the sort parameter be set to zero?
 * @param {number} [options.ownership=0] - Value to reset default ownership to.
 */
export function cleanPackEntry(data, { documentType, clearSourceId=false, clearSorting=false, ownership=0 }={}) {
	if ( data.ownership ) data.ownership = { default: ownership };
	if ( data._stats?.lastModifiedBy ) data._stats.lastModifiedBy = "everyday00heroes";

	// Remove empty entries in flags
	if ( !data.flags ) data.flags = {};
	Object.entries(data.flags).forEach(([key, contents]) => {
		if ( Object.keys(contents).length === 0 ) delete data.flags[key];
	});

	if ( clearSourceId ) delete data.flags?.core?.sourceId;
	delete data.flags?.importSource;
	delete data.flags?.exportSource;

	if ( data.system?.description?.value ) data.system.description.value = cleanString(data.system.description.value);
	if ( data.label ) data.label = cleanString(data.label);
	if ( data.name ) data.name = cleanString(data.name);
	if ( clearSorting ) data.sort = 0;

	if ( data.effects ) data.effects.forEach(i => cleanPackEntry(i, { documentType: "ActiveEffect" }));
	if ( data.items ) data.items.forEach(i => cleanPackEntry(i, { documentType: "Item" }));
	if ( data.pages ) data.pages.forEach(i => cleanPackEntry(i, { documentType: "JournalEntryPage", ownership: -1 }));
}

/**
 * Removes invisible whitespace characters.
 * @param {string} str - The string to be cleaned.
 * @returns {string} - The cleaned string.
 */
function cleanString(str) {
	return str.replace(/\u2060/gu, "");
}
