"use strict";

const { ScanModel, ScanStatus } = require("./scan.model");
const { ScanWorkerFactory, ScannerType, BaseScanWorker, TrivyScanWorker } = require("./workers");

module.exports = {
    // Model
    ScanModel,
    ScanStatus,

    // Service & Repository
    ScanService: require("./scan.service"),
    ScanRepository: require("./scan.repository"),

    // Workers
    ScanWorkerFactory,
    ScannerType,
    BaseScanWorker,
    TrivyScanWorker
};

