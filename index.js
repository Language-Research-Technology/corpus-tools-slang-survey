const { Collector, generateArcpId, Provenance } = require('oni-ocfl');
const roCrateExcel = require('ro-crate-excel');
const { languageProfileURI, Languages, Vocab } = require('language-data-commons-vocabs');

async function main() {
  const collector = await Collector.create(); 
  const corpus = collector.newObject(collector.templateCrateDir);

  const workbook = new roCrateExcel.Workbook();
  await workbook.loadExcel(collector.templateCrateDir + '/ro-crate-metadata-slang-survey.xlsx', false);

  corpus.mintArcpId();
  const arcpId = corpus.crate.root['@id'];

  corpus.crate = workbook.crate;

  // Apply metadata after assigning the crate
  corpus.crate.root['@id'] = arcpId;
  corpus.crate.addProfile(languageProfileURI("Collection"));
  const repositoryObjects = [];
  
  for (let item of corpus.crate.getGraph()) {
    const itemType = item['@type'];
    if (itemType.includes('RepositoryObject')) {
      repositoryObjects.push(item);
    }
    if (itemType.includes('Person')) {
      //TODO extract postcode, to use to match to location and polygon data
      // console.log(`PersonID: ${item['@id']}, CurrentLocation: ${item['arcp://name,custom/terms#currentLocation']}, ChildhoodLocation: ${item['arcp://name,custom/terms#childhoodLocation']}`)
    }
  }
  for (let item of repositoryObjects) {
    const curPath = item['@id'].replace('#', '');
    // Mint a new ARCP ID with the current path
    const colObj = collector.newObject();
    colObj.mintArcpId(curPath);
    // Get the root object in the new Crate and update it
    const root = colObj.crate.root;
    // Set the conformsTo property
    root['conformsTo'] = { '@id': languageProfileURI('Object') };
    // Replace the old @id and conformsTo in the object with the new one
    item['@id'] = root['@id'];
    item['conformsTo'] = root['conformsTo'];
    item['hasPart'] = item['ldac:indexableText']; // hasPart is identical to ldac:indexableText
  }

  await corpus.addToRepo();
}
main();