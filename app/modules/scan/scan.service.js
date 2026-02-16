"use strict";

const { v4: uuidv4 } = require("uuid");
const { ScanModel, ScanStatus } = require("./scan.model");
const ScanRepository = require("./scan.repository");
const { ScanWorkerFactory, ScannerType } = require("./workers");

/**
 * Service layer - business logic for scan operations
 */
class ScanService {
    constructor(db) {
        this.repository = new ScanRepository(db);
    }

    /**
     * Validate GitHub repository URL
     * @param {string} repoUrl - URL to validate
     * @returns {boolean} - Is valid
     */
    isValidGithubUrl(repoUrl) {
        const githubUrlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/;
        return githubUrlPattern.test(repoUrl);
    }

    /**
     * Create a new scan job
     * @param {string} repoUrl - GitHub repository URL
     * @param {string} scannerType - Scanner type (default: trivy)
     * @returns {Promise<Object>} - Created scan info
     * @throws {Error} - If validation fails or scan already exists
     */
    async createScan(repoUrl, scannerType = ScannerType.TRIVY) {
        // Check for existing active scan
        const existingScan = await this.repository.findActiveScanByRepoUrl(repoUrl);
        if (existingScan) {
            const error = new Error("A scan for this repository is already in progress");
            error.code = "SCAN_IN_PROGRESS";
            error.existingScan = {
                scanId: existingScan.scanId,
                status: existingScan.status
            };
            throw error;
        }

        // Create scan model
        const scan = new ScanModel({
            scanId: uuidv4(),
            repoUrl,
            status: ScanStatus.QUEUED,
            scanner: scannerType
        });
        await this.repository.create(scan);

        // Trigger background scan (non-blocking)
        this.runScanInBackground(scan.scanId, repoUrl, scannerType);

        return {
            scanId: scan.scanId,
            status: scan.status
        };
    }

    /**
     * Run the scan process in background
     * @param {string} scanId - Scan identifier
     * @param {string} repoUrl - Repository URL
     * @param {string} scannerType - Scanner type
     */
    async runScanInBackground(scanId, repoUrl, scannerType = ScannerType.TRIVY) {
        try {
            const worker = ScanWorkerFactory.getWorker(scannerType);

            console.log(`[ScanService] Starting ${worker.getName()} scan ${scanId} for ${repoUrl}`);

            // Update status to Scanning
            await this.repository.updateStatus(scanId, ScanStatus.SCANNING);

            // Execute scan
            const resultsFilePath = await worker.executeScan(scanId, repoUrl);

            console.log(`[ScanService] ${worker.getName()} completed for ${scanId}, processing results...`);

            // Process results using streams
            const criticalVulnerabilities = await worker.processResults(resultsFilePath);

            // Update with results
            await this.repository.updateStatus(scanId, ScanStatus.FINISHED, {
                criticalVulnerabilities
            });

            console.log(`[ScanService] Scan ${scanId} finished successfully`);

            // Cleanup
            await worker.cleanup(resultsFilePath);

        } catch (err) {
            console.error(`[ScanService] Scan ${scanId} failed:`, err);
            await this.repository.updateStatus(scanId, ScanStatus.FAILED, {
                error: err.message
            });
        }
    }

    /**
     * Get scan by ID
     * @param {string} scanId - Scan identifier
     * @returns {Promise<ScanModel|null>} - ScanModel instance or null
     */
    async getScanById(scanId) {
        return await this.repository.findByScanId(scanId);
    }

    /**
     * Get available scanner types
     * @returns {Array<string>}
     */
    getAvailableScanners() {
        return ScanWorkerFactory.getAvailableTypes();
    }
}

module.exports = ScanService;

