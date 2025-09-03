#! /bin/bash
# MakeFile for creating slang survey
# Override BASE_DATA_DIR, REPO_OUT_DIR, BASE_TMP_DIR to point to the location of your dataset

BASE_DATA_DIR=/data
REPO_SCRATCH_DIR=scratch

REPO_OUT_DIR=./ocfl-repo
BASE_TMP_DIR=temp

REPO_NAME=LDaCA
NAMESPACE=default
CORPUS_NAME=default
DATA_DIR=${BASE_DATA_DIR}/override
TEMP_DIR=${BASE_TMP_DIR}
TEMPLATE_DIR=${BASE_DATA_DIR}
DEBUG=false

.DEFAULT_GOAL := repo

repo :
	node index.js -s ${NAMESPACE} \
		-t "${TEMPLATE_DIR}" \
		-c ${CORPUS_NAME} -n ${REPO_NAME} \
		-r "${REPO_OUT_DIR}" \
		-d "${DATA_DIR}" \
		-D ${DEBUG} \
		-x "${BASE_DATA_DIR}"/ro-crate-metadata-slang-survey.xlsx \
		-p "${TEMP_DIR}" -z "${REPO_SCRATCH_DIR}"


clean :
	rm -rf ${TEMP_DIR}