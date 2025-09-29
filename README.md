# corpus-tools-slang-survey

Corpus Tools for creating an OCFL repository for the Slang Survey Data Collection.

This corpus tool also uses the [Postal Areas - 2021 - Shapefile](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files) data from the Australian Bureau of Statistics to map the postcodes of the collection's research participants. In order to create the geojson file required in the `data` folder for this, see the steps under Usage.

## Prerequisites

- [Node.js](https://nodejs.org/) (v22 or newer needed for oni-ocfl)
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Language-Research-Technology/corpus-tools-slang-survey.git
cd corpus-tools-slang-survey
npm install
```

## Usage

Head record data used to build the initial RO-Crate format:
- `data/ro-crate-metadata.json`

The corpus tool expects the following data in a `data` folder:
- `ro-crate-metadata-slang-survey.xlsx` containing the metadata in RO-Crate compatible format
- `CSV` folder with the 14 `.csv` files
- Original data for the Slang Survey
- `POA_2021_AUST_GDA2020.geojson`. Run the following to create this file:
  - Install GDAL: `brew install gdal`
  - Download `POA_2021_AUST_GDA2020.shp` from [Postal Areas - 2021 - Shapefile](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/digital-boundary-files)
  - Run `ogr2ogr POA_2021_AUST_GDA2020.geojson POA_2021_AUST_GDA2020.shp`

Create a file named `make_run.sh` containing the following data:

```
#!/usr/bin/env bash

make BASE_DATA_DIR=data \
 REPO_OUT_DIR=/opt/storage/oni/ocfl \
 REPO_SCRATCH_DIR=/opt/storage/oni/scratch-ocfl \
 BASE_TMP_DIR=temp \
 NAMESPACE=slang-survey \
 CORPUS_NAME=slang-survey \
 DATA_DIR=data \
```

Running this file using `bash make_run.sh` (or appropriate command) will generate an RO-Crate for the corpus.

### -r "${REPO_OUT_DIR}"
Specify the output directory `${REPO_OUT_DIR}`, which is the path to the OCFL repository or storage root.

### -d "${DATA_DIR}"
Specify the input directory `${DATA_DIR}`, which is the path to the RO-Crate directory containing the `ro-crate-metadata.json` file and the data files.

### -s "${NAMESPACE}"
`${NAMESPACE}` is a name for the top-level collection which must be unique to the repository. This is used to create an ARCP identifier `arcp://name,<namespace>` to make the `@id` of the Root Data Entity into a valid absolute IRI.

### --multiple

If `--multiple` is specified, a distributed crate will be created. The input crate will be split to output multiple crates. Each RepositoryObject and RepositoryCollection in the input crate will be put into its own OCFL storage object.

### --sf
Using `--sf` flag requires [Siegfried](https://github.com/richardlehane/siegfried) to be installed. It will run it and cache the output to `.siegfried.json`.
Delete file `.siegfried.json` to force it to rerun Siegfried.

### --vm
Using the `--vm "${MODEFILE}"` argument will enable validation against the mode file `${MODEFILE}` which can be a file path or a URL.

## Output
The directory `${REPO_OUT_DIR}` will be created, which will contain all the OCFL objects. If a distributed crate is created, the OCFL storage layout will look something like this:
```
- arcp://name,<${NAMESPACE}>
  - __object__
  - collection1
    - __object__
    - object1
    - object2
```

This will create an OCFL repo with metadata and files.
