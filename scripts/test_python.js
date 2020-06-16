/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
const {bash, execute, docker, resolve, getarg, python_image} = require("./script_utils.js");

let PYTHON = getarg("--python2") ? "python2" : getarg("--python38") ? "python3.8" : "python3.7";

const COVERAGE = getarg("--coverage");
const VERBOSE = getarg("--debug");
const IS_DOCKER = process.env.PSP_DOCKER;
const IMAGE = python_image(getarg("--manylinux2010") ? "manylinux2010" : getarg("--manylinux2014") ? "manylinux2014" : "", PYTHON);

let python_path;

if (IS_DOCKER) {
    python_path = "python/perspective";
} else {
    // When running locally, tests need to run in UTC and not the machine's
    // local timezone.
    process.env.TZ = "UTC";
    python_path = resolve`${__dirname}/../python/perspective`;
}

/**
 * Run `pytest` for client mode PerspectiveWidget, which need to be on a
 * separate runtime from the other Python tests.
 */
const pytest_client_mode = IS_DOCKER => {
    if (IS_DOCKER) {
        return bash`${docker(IMAGE)} bash -c "cd \
            python/perspective && TZ=UTC ${PYTHON} -m pytest \
            ${VERBOSE ? "-vv" : "-v"} --noconftest 
            perspective/tests/client"`;
    } else {
        return bash`cd ${python_path} && ${PYTHON} -m pytest \
            ${VERBOSE ? "-vv" : "-v"} --noconftest 
            perspective/tests/client`;
    }
};

/**
 * Run `pytest` for the `perspective-python` library.
 */
const pytest = IS_DOCKER => {
    if (IS_DOCKER) {
        return bash`${docker(IMAGE)} bash -c "cd \
            python/perspective && TZ=UTC ${PYTHON} -m pytest \
            ${VERBOSE ? "-vv" : "-v"} perspective \
            --ignore=perspective/tests/client \
            --cov=perspective"`;
    } else {
        return bash`cd ${python_path} && ${PYTHON} -m pytest \
            ${VERBOSE ? "-vv" : "-v"} perspective \
            --ignore=perspective/tests/client \
            ${COVERAGE ? "--cov=perspective" : ""}`;
    }
};

// Check that the `PYTHON` command is valid, else default to `python`.
try {
    execute`${PYTHON} --version`;
} catch (e) {
    PYTHON = "python";
}

try {
    execute(pytest_client_mode(IS_DOCKER));
    execute(pytest(IS_DOCKER));
} catch (e) {
    console.log(e.message);
    process.exit(1);
}
