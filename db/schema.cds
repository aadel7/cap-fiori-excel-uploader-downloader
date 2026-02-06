namespace my.excel;

using { cuid, managed } from '@sap/cds/common';

/**
 * Stores uploaded files (e.g., Excel) directly in the database.
 * Note: LOB storage in HANA can be large; consider size limits and retention policies.
 */
entity Files : cuid, managed {
  fileName     : String(255);
  mimeType     : String(100);
  fileSize     : Integer;

  /**
   * Raw file content (Excel bytes).
   * In HANA this maps to a large object type (BLOB).
   */
  content      : LargeBinary;

  /**
   * Optional checksum for integrity / deduplication (e.g., SHA-256 hex).
   */
  checksum     : String(64);

  /**
   * Optional free-text description.
   */
  note         : String(500);
}