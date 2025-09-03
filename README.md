# corpus-tools-slang-survey

Corpus Tools for creating an OCFL repository for the Slang Survey Data Collection.

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

This will create an OCFL repo with metadata and files.
