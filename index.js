const { Collector, generateArcpId, Provenance } = require('oni-ocfl');
const roCrateExcel = require('ro-crate-excel');
const { languageProfileURI, Languages, Vocab } = require('language-data-commons-vocabs');
const escape = require('regexp.escape');
const fs = require('fs');
const { geojsonToWKT } = require("@terraformer/wkt");
const conformsTo = {
    RepositoryCollection: { '@id': 'https://w3id.org/ldac/profile#Collection' },
    RepositoryObject: { '@id': 'https://w3id.org/ldac/profile#Object' }
};

async function main() {
    const collector = await Collector.create();
    const corpus = collector.newObject(collector.templateCrateDir);

    const workbook = new roCrateExcel.Workbook();
    await workbook.loadExcel(collector.templateCrateDir + '/ro-crate-metadata-slang-survey.xlsx', false);

    corpus.mintArcpId();
    const arcpId = corpus.crate.root['@id'];
    const re = new RegExp(`^${escape(corpus.crate.root['@id'])}/*`);
    corpus.crate = workbook.crate;

    // Apply metadata after assigning the crate
    corpus.crate.root['@id'] = arcpId;
    corpus.crate.addProfile(languageProfileURI("Collection"));
    const promptCSVs = [];
    const researchParticipants = [];

    for (let item of corpus.crate.entities()) {
        const itemType = item['@type'];
        // Prompt CSV objects have type RepositoryObject and @id starting with #Item
        if (itemType.includes('RepositoryObject') && item['@id'].startsWith('#Item')) {
            promptCSVs.push(item);
        }
        // Research participants have type Person and @id starting with #A followed by 4 digits
        if (itemType.includes('Person') && /^#A\d\d\d\d/.test(item['@id'])) {
            researchParticipants.push(item);
        }
    }

    // Add ldac:mainText to files under prompt CSV objects
    for (let item of promptCSVs) {
        // Check if the item has 'hasPart'
        if (item.hasPart) {
            const mainTextArray = [];
            for (let part of item.hasPart) {
                const fileId = part['@id'];
                // Add this fileId to ldac:mainText
                mainTextArray.push({ "@id": fileId });
            }
            if (mainTextArray.length > 0) {
                item['ldac:mainText'] = mainTextArray;
            }
        }
    }

    // Add geo data to research participants based on their postcodes
    const geojson = JSON.parse(fs.readFileSync('./data/POA_2021_AUST_GDA2020.geojson', 'utf-8'));
    for (let participant of researchParticipants) {
        const currentLocation = participant['custom:currentLocation'];
        // Process currentLocation
        if (Array.isArray(currentLocation) && currentLocation.length > 0) {
            const participantPostcode = currentLocation[0];
            const { geometry } = geojson.features.find(f => f.properties.POA_CODE21 === participantPostcode) ?? { geometry: null }
            if (geometry) {
                participant['custom:currentLocationPostcode'] = { "@id": `#pl${participantPostcode}` };
                // Add Place and Geometry entities to the crate
                corpus.crate.addEntity({
                    "@id": `#pl${participantPostcode}`,
                    "@type": "Place",
                    "name": `Postcode ${participantPostcode}`,
                    "geo": { "@id": `#loc${participantPostcode}` }
                });
                corpus.crate.addEntity({
                    "@id": `#loc${participantPostcode}`,
                    "@type": "Geometry",
                    "name": `Geometry ${participantPostcode}`,
                    "geo:asWKT": geojsonToWKT(geometry)
                });
            } else {
                console.log(`No geometry found for current postcode '${participantPostcode}' for participant ${participant['@id']}`);
            }
        }
        // Process childhoodLocation
        const childhoodLocation = participant['custom:childhoodLocation'];
        if (Array.isArray(childhoodLocation) && childhoodLocation.length > 0) {
            const participantPostcode = childhoodLocation[0];
            const { geometry } = geojson.features.find(f => f.properties.POA_CODE21 === participantPostcode) ?? { geometry: null }
            if (geometry) {
                participant['custom:childhoodLocationPostcode'] = { "@id": `#pl${participantPostcode}` };
                // Add Place and Geometry entities to the crate if not already added
                if (!corpus.crate.getEntity({ "@id": `#pl${participantPostcode}` })) {
                    corpus.crate.addEntity({
                        "@id": `#pl${participantPostcode}`,
                        "@type": "Place",
                        "name": `Postcode ${participantPostcode}`,
                        "geo": { "@id": `#loc${participantPostcode}` }
                    });
                }
                if (!corpus.crate.getEntity({ "@id": `#loc${participantPostcode}` })) {
                    corpus.crate.addEntity({
                        "@id": `#loc${participantPostcode}`,
                        "@type": "Geometry",
                        "name": `Geometry ${participantPostcode}`,
                        "geo:asWKT": geojsonToWKT(geometry)
                    });
                }
            } else {
                console.log(`No geometry found for childhood postcode '${participantPostcode}' for participant ${participant['@id']}`);
            }
        }
    }
    // ARCP IDs for research participants
    for (let item of researchParticipants) {
        const curPath = item['@id'].replace('#', 'researchParticipant/');
        // Mint a new ARCP ID with the current path
        const colObj = collector.newObject();
        colObj.mintArcpId(curPath);
        // Get the root object in the new crate and update it
        const root = colObj.crate.root;
        item['@id'] = root['@id'];
    }

    // Output the modified crate for inspection
    fs.writeFileSync('ro-crate-metadata-out.json', JSON.stringify(corpus.crate, null, 2));

    if (collector.opts.multiple) {
        // For distributed crate, the original crate in `corpus` won't be saved,
        // it gets broken up into multiple objects and a new top level object is created,
        // which is a clone of the root data entity in the input crate.

        // Do a BFS traversal to ensure hierarchy is encoded in memberOf property and create a list of externalized entities
        // The choice of using BFS or DFS is arbitrary and will result in a different tree hierarchy if there is a cycle in the input graph
        // By using either a queue or a stack we can easily change from a BFS (queue) or a DFS (stack)
        // In contrast to using a recursion which limit us to only DFS because it is a stack based by nature
        /** A list of entities that need to be put into separate crates or ocfl objects @type {Map<string, object>} */
        const externalized = new Map();
        externalized.set(corpus.crate.root['@id'], corpus.crate.root);
        const queue = [corpus.crate.root]; // corpus.crate.root is the top level object, put it in the queue as the starting point
        let entity;
        while (entity = queue.shift()) {
            const members = [].concat(entity['pcdm:hasMember'] || [], entity['@reverse']?.['pcdm:memberOf'] || []);
            for (const member of members) {
                if (!externalized.has(member['@id'])) {
                    member['pcdm:memberOf'] = [entity, ...(member['pcdm:memberOf'] || [])];
                    externalized.set(member['@id'], member);
                    queue.push(member);
                }
            }
            corpus.crate.deleteProperty(entity, 'pcdm:hasMember');
        }
        let processedEntities = [];

        /** Recursively copy entity only if it is not externalized */
        function copyEntity(source, target) {
            processedEntities.push(source["@id"]);
            for (const propName in source) {

                if (propName === '@id') {
                    if (!target['@id']) target[propName] = source[propName];
                } else if (propName === 'hasPart' && source['@type'].includes('RepositoryCollection')) {
                    // remove hasPart from any RepositoryCollection
                } else {

                    target[propName] = source[propName].map(v => {
                        if (v['@id']) {
                            if (v['@id'].startsWith("#")) {
                                v["@id"] = `${corpus.crate.root["@id"]}/${propName.toLowerCase().replace(/.+:/, "")}/${v["@id"].replace("#", "")}`;
                            }
                            if (externalized.has(v['@id'])) {
                                // if the value is an externalized entity, make it into a reference instead
                                return { '@id': v['@id'] };
                            } else if (!processedEntities.includes(v["@id"])) {
                                return copyEntity(v, {});
                            } else {
                                return v; // object that is not an externalized entity
                            }
                        } else {
                            return v; // primitive value or non-@id object
                        }
                    });
                }
            }
            return target;
        }

        // create an ocfl object for each of the externalized entities
        for (const source of Array.from(externalized.values())) {
            const colObj = collector.newObject();
            const parent = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);
            // generate iri based on the parent-child hierarchy
            let curPath;
            let sourceId;
            if (parent) {
                if (!source['@id'].startsWith(corpus.crate.root['@id'] + '/')) {
                    const parentId = parent['@id'].replaceAll('#', '').replace(re, '');
                    sourceId = source['@id'].replaceAll('#', '');
                    curPath = parentId ? [parentId, sourceId] : sourceId;
                }
            }
            colObj.mintArcpId(curPath)
            const target = colObj.crate.root;

            console.log(`Processing object: ${target['@id']}`);

            // rename id in the source so that all the references is renamed too
            externalized.delete(source['@id']); // must change the key in the externalized map too
            externalized.set(target['@id'], source);
            source['@id'] = target['@id'];

            copyEntity(source, target);

            // ensure conformsTo
            for (const type of target['@type']) {
                if (conformsTo[type]) {
                    if (!target.conformsTo?.length) {
                        target.conformsTo = conformsTo[type];
                    }
                }
            }
            // add mandatory properties at the root level

            for (const propName of ['dct:rightsHolder', 'author', 'accountablePerson', 'publisher']) {
                target[propName] = source[propName] = target[propName] || parent?.[propName];
            }

            target['@type'].push('Dataset');
            //cleanup dodgy dates
            for (const propName of ["datePublished"]) {
                if (!target[propName][0].match(/^\d{4}/)) {
                    console.log("Fixing date");
                    let timestamp = Date.parse(target[propName][0]);
                    let aDate = new Date(timestamp).toLocaleDateString("en-AU");
                    let newDate = aDate.split("/")
                    newDate = `${newDate[2]}-${newDate[1]}-${newDate[0]}`;
                    target[propName] = [newDate];
                }
            }


            await colObj.addToRepo();
        }
    } else {
        // For single bundled crate, we just add everything to the repo
        await corpus.addToRepo();
    }
}
main();