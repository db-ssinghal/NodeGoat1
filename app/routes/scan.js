"use strict";

const ScanService = require("../modules/scan/scan.service");

/**
 * Controller layer - handles HTTP requests/responses
 * Thin layer that delegates business logic to ScanService
 */
function ScanHandler(db) {
    const scanService = new ScanService(db);

    /**
     * POST /api/v1/scan
     * Accepts a GitHub repository URL and creates a new scan job
     */
    this.handleScanRequest = async (req, res) => {
        const { repoUrl } = req.body;

        // Validate input
        if (!repoUrl) {
            return res.status(400).json({
                error: "Missing required field: repoUrl"
            });
        }

        // Validate GitHub URL
        if (!scanService.isValidGithubUrl(repoUrl)) {
            return res.status(400).json({
                error: "Invalid GitHub repository URL"
            });
        }

        try {
            const result = await scanService.createScan(repoUrl);

            return res.status(202).json(result);

        } catch (err) {
            // Handle specific error codes
            if (err.code === "SCAN_IN_PROGRESS") {
                return res.status(409).json({
                    error: err.message,
                    scanId: err.existingScan.scanId,
                    status: err.existingScan.status
                });
            }

            console.error("[ScanHandler] Error creating scan:", err);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    };

    /**
     * GET /api/v1/scan/:scanId
     * Returns the status and results of a scan
     */
    this.getScanStatus = async (req, res) => {
        const { scanId } = req.params;

        try {
            const scan = await scanService.getScanById(scanId);

            if (!scan) {
                return res.status(404).json({
                    error: "Scan not found"
                });
            }

            return res.status(200).json(scan);

        } catch (err) {
            console.error("[ScanHandler] Error getting scan status:", err);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    };
}

module.exports = ScanHandler;
