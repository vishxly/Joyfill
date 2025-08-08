// joyfillService.js
const joyfillConfig = {
  API_KEY_ID: import.meta.env.VITE_JOYFILL_API_KEY_ID,
  API_KEY_SECRET: import.meta.env.VITE_JOYFILL_API_KEY_SECRET,
  BASE_URL: "https://api-joy.joyfill.io",
};

const getAuthHeader = () => {
  return (
    "Basic " +
    btoa(`${joyfillConfig.API_KEY_ID}:${joyfillConfig.API_KEY_SECRET}`)
  );
};

const makeJoyfillRequest = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    Authorization: getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${joyfillConfig.BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`API Error: ${response.status}`, responseText);
    throw new Error(`API call failed: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
};

export const joyfillService = {
  // Fetch templates
  async fetchTemplates(page = 1, limit = 10) {
    try {
      const templateData = await makeJoyfillRequest(
        `/v1/templates?page=${page}&limit=${limit}`
      );

      let templatesArray = Array.isArray(templateData.data)
        ? templateData.data
        : Array.isArray(templateData)
        ? templateData
        : [];

      return templatesArray;
    } catch (err) {
      console.error("Error loading templates:", err);
      throw new Error(`Error loading templates: ${err.message}`);
    }
  },

  // Complete invoice generation workflow
  async generateInvoice(formData, selectedTemplate, templates, onProgress) {
    try {
      // Find the selected template object
      const templateObj = templates.find(
        (t) => t.identifier === selectedTemplate
      );
      if (!templateObj) {
        throw new Error("Selected template not found");
      }

      // Step 1: Create document from template
      onProgress && onProgress("Creating document from template...");
      const doc = await makeJoyfillRequest("/v1/documents", {
        method: "POST",
        body: JSON.stringify({
          name: `Invoice - ${formData.customerName}`,
          template: selectedTemplate,
        }),
      });

      console.log("✅ Created doc:", doc);

      // Step 2: Update document fields
      onProgress && onProgress("Updating document fields...");

      const docIdentifier = doc.identifier || doc._id;
      console.log("Using document identifier:", docIdentifier);

      // Create comprehensive field mapping
      const fieldMapping = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        total: formData.total,
      };

      const updatePayload = {
        fields: doc.fields.map((field) => ({
          _id: field._id,
          identifier: field.identifier,
          value: fieldMapping[field.identifier] || field.value,
        })),
      };

      let updatedDoc;
      try {
        // Try PUT with identifier first
        await makeJoyfillRequest(`/v1/documents/${docIdentifier}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        onProgress && onProgress("Fetching updated document...");
        updatedDoc = await makeJoyfillRequest(`/v1/documents/${docIdentifier}`);
      } catch (updateError) {
        console.warn(
          "PUT with identifier failed, trying with _id:",
          updateError.message
        );

        try {
          await makeJoyfillRequest(`/v1/documents/${doc._id}`, {
            method: "PUT",
            body: JSON.stringify(updatePayload),
          });

          onProgress && onProgress("Fetching updated document...");
          updatedDoc = await makeJoyfillRequest(`/v1/documents/${doc._id}`);
        } catch {
          console.warn(
            "Both update methods failed. Proceeding with original document..."
          );

          updatedDoc = { ...doc };
          updatedDoc.fields = doc.fields.map((field) => ({
            ...field,
            value: fieldMapping[field.identifier] || field.value,
          }));

          // Create a simple JoyDoc structure
          updatedDoc.joydoc = {
            _id: doc._id,
            identifier: doc.identifier,
            name: doc.name,
            type: doc.type,
            stage: doc.stage,
            files: doc.files,
            fields: updatedDoc.fields,
            metadata: doc.metadata || {},
            createdOn: doc.createdOn,
            deleted: doc.deleted || false,
          };
        }
      }

      if (!updatedDoc || !updatedDoc.joydoc) {
        throw new Error("Updated document missing JoyDoc format.");
      }

      // Step 3: Generate PDF
      onProgress && onProgress("Generating PDF export...");
      const pdfResult = await makeJoyfillRequest("/v1/documents/exports/pdf", {
        method: "POST",
        body: JSON.stringify({ document: updatedDoc.joydoc }),
      });

      if (pdfResult.download_url) {
        return pdfResult;
      } else {
        throw new Error("PDF generation failed: No download URL returned");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      throw error;
    }
  },
};
