sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
],
function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("exceluplaoderdownloaderapp.controller.View1", {
        
        onInit: function () {
            // Create a JSON model for the files list
            const oModel = new JSONModel();
            this.getView().setModel(oModel);
            
            // Load files on init
            this.loadFiles();
        },

        /**
         * Load all files from the backend
         */
        loadFiles: function () {
            const oModel = this.getView().getModel();
            
            fetch("/odata/v4/file/Files?$orderby=createdAt desc")
                .then(res => res.json())
                .then(data => {
                    oModel.setData({ Files: data.value || [] });
                })
                .catch(err => {
                    MessageBox.error("Failed to load files: " + err.message);
                });
        },

        /**
         * Triggered when user selects a file
         */
        onFileChange: function (oEvent) {
            const oFileUploader = this.byId("fileUploader");
            const oUploadButton = this.byId("uploadButton");
            
            // Enable upload button only if a file is selected
            oUploadButton.setEnabled(oFileUploader.getValue() !== "");
        },

        /**
         * Upload the selected file
         */
        onUploadPress: function () {
            const oFileUploader = this.byId("fileUploader");
            const oNoteInput = this.byId("noteInput");
            const oStatusText = this.byId("uploadStatus");
            const oUploadButton = this.byId("uploadButton");
            
            const file = oFileUploader.oFileUpload.files[0];
            if (!file) {
                MessageBox.warning("Please select a file first.");
                return;
            }

            oUploadButton.setEnabled(false);
            oStatusText.setText("Uploading...");

            // Read file as base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data URL prefix
                
                const payload = {
                    fileName: file.name,
                    mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    contentBase64: base64,
                    note: oNoteInput.getValue() || ""
                };

                // Call the upload action
                fetch("/odata/v4/file/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error("Upload failed with status " + res.status);
                    return res.json();
                })
                .then(data => {
                    MessageToast.show(`File "${data.fileName}" uploaded successfully!`);
                    oStatusText.setText("✅ Upload successful!");
                    
                    // Clear inputs
                    oFileUploader.clear();
                    oNoteInput.setValue("");
                    
                    // Reload files list
                    this.loadFiles();
                })
                .catch(err => {
                    MessageBox.error("Upload failed: " + err.message);
                    oStatusText.setText("❌ Upload failed.");
                })
                .finally(() => {
                    oUploadButton.setEnabled(true);
                });
            };

            reader.onerror = () => {
                MessageBox.error("Failed to read file.");
                oUploadButton.setEnabled(true);
                oStatusText.setText("");
            };

            reader.readAsDataURL(file);
        },

        /**
         * Download a file by ID
         */
        onDownloadPress: function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oContext = oItem.getBindingContext();
            const oFile = oContext.getObject();
            
            if (!oFile || !oFile.ID) {
                MessageBox.error("File ID not found.");
                return;
            }

            MessageToast.show("Downloading " + oFile.fileName + "...");

            // Call the download function
            const url = `/odata/v4/file/download(ID=${oFile.ID})`;
            
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error("Download failed");
                    return res.blob();
                })
                .then(blob => {
                    // Create a download link and trigger it
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = oFile.fileName;
                    link.click();
                    window.URL.revokeObjectURL(link.href);
                    
                    MessageToast.show("Download complete!");
                })
                .catch(err => {
                    MessageBox.error("Download failed: " + err.message);
                });
        }
    });
});