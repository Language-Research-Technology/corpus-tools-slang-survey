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
  const researchParticipants = [];

  for (let item of corpus.crate.getGraph()) {
    const itemType = item['@type'];
    // Repository objects have type RepositoryObject
    if (itemType.includes('RepositoryObject')) {
      repositoryObjects.push(item);
    }
    // Research participants have type Person and @id starting with #A followed by 4 digits
    if (itemType.includes('Person') && /^#A\d\d\d\d/.test(item['@id'])) {
      researchParticipants.push(item);
    }
  }

  // ARCP IDs, conformsTo and hasPart for repository objects
  for (let item of repositoryObjects) {
    const curPath = item['@id'].replace('#', '');
    // Mint a new ARCP ID with the current path
    const colObj = collector.newObject();
    colObj.mintArcpId(curPath);
    // Get the root object in the new crate and update it
    const root = colObj.crate.root;
    // Set the conformsTo property
    root['conformsTo'] = { '@id': languageProfileURI('Object') };
    // Replace the old @id and conformsTo in the object with the new one
    item['@id'] = root['@id'];
    item['conformsTo'] = root['conformsTo'];
    item['hasPart'] = item['ldac:mainText']; // hasPart is identical to ldac:mainText
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

  await corpus.addToRepo();
}
main();