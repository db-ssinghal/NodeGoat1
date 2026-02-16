"use strict";

/**
 * Abstract base class for security scanners
 * Defines the interface that all scanner implementations must follow
 */
class BaseScanWorker {
    constructor(name) {
        if (new.target === BaseScanWorker) {
            throw new Error("BaseScanWorker is abstract and cannot be instantiated directly");
        }
        this.name = name;
    }

    /**
     * Execute security scan on a repository
     * @param {string} scanId - Unique scan identifier
     * @param {string} repoUrl - Repository URL to scan
     * @returns {Promise<string>} - Path to the results file
     * @abstract
     */
    async executeScan(scanId, repoUrl) {
        throw new Error("Method executeScan() must be implemented");
    }

    /**
     * Process scan results using streams (memory efficient)
     * @param {string} resultsFilePath - Path to the scan results file
     * @returns {Promise<Array>} - Array of critical vulnerabilities
     * @abstract
     */
    async processResults(resultsFilePath) {
        throw new Error("Method processResults() must be implemented");
    }

    /**
     * Cleanup temporary files after scan
     * @param {string} filePath - Path to the file to delete
     * @returns {Promise<void>}
     * @abstract
     */
    async cleanup(filePath) {
        throw new Error("Method cleanup() must be implemented");
    }

    /**
     * Get scanner name
     * @returns {string}
     */
    getName() {
        return this.name;
    }
}

module.exports = BaseScanWorker;

