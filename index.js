const { Collector, generateArcpId, Provenance } = require('oni-ocfl');
// const { languageProfileURI, Languages, Vocab } = require('language-data-commons-vocabs');

async function main() {
  const collector = await Collector.create(); // Get all the paths etc from commandline
  // This is the main crate


  const corpus = collector.newObject(collector.dataDir);
  corpus.mintArcpId();
  const corpusCrate = corpus.crate;
  for (let item of corpusCrate.getGraph()) {
    const itemType = item['@type'];
    if (itemType.includes('Person')) {
      //TODO extract postcode, to use to match to location and polygon data
      console.log(`PersonID: ${item['@id']}, CurrentLocation: ${item['arcp://name,custom/terms#currentLocation']}, ChildhoodLocation: ${item['arcp://name,custom/terms#childhoodLocation']}`)
    }
  }
  await corpus.addToRepo();
}

main();