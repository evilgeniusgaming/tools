/**
 * Determine what types of documents can be embedded in a type.
 * @param {string} type
 * @returns {string[]}
 */
export function collectionsForType(type) {
	return types[type]?.embedded ?? [];
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Determine what type belongs in the specified collection.
 * @param {string} collection
 * @returns {string}
 */
export function typeForCollection(collection) {
	return Object.entries(types).find(([, v]) => v.collection === collection)?.[0];
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Generate keys for the provided document and any embedded documents, storing in the
 * _key property.
 * @param {object} document - Document to process.
 * @param {string} type - Type of the document.
 */
export function generateKeys(document, type) {
	_generateKeys(document, type, { types: [], ids: [] });
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Recursive method used for key generation.
 * @param {object} document - Document to process.
 * @param {string} type - Type of the document.
 * @param {object} partials - Types & ids of the documents within which this is embedded.
 */
function _generateKeys(document, type, partials) {
	partials.types.push(types[type].collection);
	partials.ids.push(document._id);
	document._key = `!${partials.types.join(".")}!${partials.ids.join(".")}`;
	for ( const collection of collectionsForType(type) ) {
		const t = typeForCollection(collection);
		if ( !t || !document[collection]?.length ) continue;
		document[collection].forEach(d => _generateKeys(d, t, {
			types: [...partials.types], ids: [...partials.ids]
		}));
	}
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Foundry's built-in types with information needed to build keys.
 * @enum {{collection: string, embedded: [string[]]}}
 */
const types = {
	AmbientLight: {
		collection: "lights",
	},
	AmbientSound: {
		collection: "sounds"
	},
	ActiveEffect: {
		collection: "effects"
	},
	Actor: {
		collection: "actors",
		embedded: ["effects", "items"]
	},
	ActorDelta: {
		collection: "delta",
		embedded: ["effects", "items"]
	},
	Adventure: {
		collection: "adventures"
	},
	Cards: {
		collection: "cards",
		embedded: ["cards"]
	},
	Combat: {
		collection: "combats",
		embedded: ["combatants"]
	},
	Combatant: {
		collection: "combatants"
	},
	Drawing: {
		collection: "drawings"
	},
	Folder: {
		collection: "folders"
	},
	Item: {
		collection: "items",
		embedded: ["effects"]
	},
	JournalEntry: {
		collection: "journal",
		embedded: ["pages"]
	},
	JournalEntryPage: {
		collection: "pages"
	},
	Macro: {
		collection: "macros"
	},
	MeasuredTemplate: {
		collection: "templates"
	},
	Note: {
		collection: "notes"
	},
	Playlist: {
		collection: "playlists",
		embedded: ["sounds"]
	},
	PlaylistSound: {
		collection: "sounds"
	},
	RollTable: {
		colletion: "tables",
		embedded: ["results"]
	},
	Scene: {
		collection: "scenes",
		embedded: [
			"drawings", "lights", "notes", "sounds",
			"templates", "tiles", "tokens", "walls"
		]
	},
	TableResult: {
		collection: "results"
	},
	Tile: {
		collection: "tiles"
	},
	Token: {
		collection: "tokens",
		embedded: ["delta"]
	},
	Wall: {
		collection: "walls"
	}
};
