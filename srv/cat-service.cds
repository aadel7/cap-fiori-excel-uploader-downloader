using my.excel as my from '../db/schema';


service FileService @(requires: 'authenticated-user') {

  @restrict: [
    {
      grant: 'READ',
      to   : 'FileViewer'
    },
    {
      grant: [
        'READ',
        'WRITE'
      ],
      to   : 'FileUploader'
    }
  ]

  /** Main persistence entity */
  @readonly
  entity Files as
    projection on my.Files
    excluding {
      content
    }; // Don't expose content in list view for performance

  /** Download file content by ID */
  @restrict: [{
    grant: 'READ',
    to   : 'FileDownloader'
  }]
  function download(ID: UUID)        returns LargeBinary;

  /**
   * Upload a file into the Files table.
   * contentBase64 should be the raw file bytes encoded as base64 (no data URL prefix).
   */
  @restrict: [{
    grant: 'WRITE',
    to   : 'FileUploader'
  }]
  action   upload(fileName: String(255),
                  mimeType: String(100),
                  contentBase64: String,
                  note: String(500)) returns Files;
}
