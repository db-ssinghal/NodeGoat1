"use strict";

const TrivyScanWorker = require("./trivy.scan.worker");

/**
 * Scanner types enum
 */
const ScannerType = {
    TRIVY: "trivy",
    // GRYPE: "grype",
    // SNYK: "snyk",
};

/**
 * Factory for creating scanner workers
 */
class ScanWorkerFactory {
    constructor() {
        this.workers = new Map();

        // Register default workers
        this.register(ScannerType.TRIVY, new TrivyScanWorker());
    }

    /**
     * Register a scanner worker
     * @param {string} type - Scanner type
     * @param {BaseScanWorker} worker - Scanner worker instance
     */
    register(type, worker) {
        this.workers.set(type, worker);
    }

    /**
     * Get scanner worker by type
     * @param {string} type - Scanner type (default: trivy)
     * @returns {BaseScanWorker}
     */
    getWorker(type = ScannerType.TRIVY) {
        const worker = this.workers.get(type);
        if (!worker) {
            throw new Error(`Unknown scanner type: ${type}`);
        }
        return worker;
    }

    /**
     * Get all available scanner types
     * @returns {Array<string>}
     */
    getAvailableTypes() {
        return Array.from(this.workers.keys());
    }
}

// Singleton instance
const factory = new ScanWorkerFactory();

module.exports = {
    ScanWorkerFactory: factory,
    ScannerType,
    BaseScanWorker: require("./base.scan.worker"),
    TrivyScanWorker
};

