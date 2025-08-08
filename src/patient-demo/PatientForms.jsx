import React, { useState } from "react";

const PatientForms = () => {
  const [formData, setFormData] = useState({
    apiKeyId: "",
    apiKeySecret: "",
    templateId: "",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1985-03-15",
    insuranceId: "INS123456",
    phoneNumber: "(555) 123-4567",
    address: "123 Main St, City, ST 12345",
  });

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");

  const JOYFILL_BASE_URL = "https://api-joy.joyfill.io";

  const makeJoyfillRequest = async (endpoint, options = {}) => {
    const AUTH_HEADER =
      "Basic " + btoa(`${formData.apiKeyId}:${formData.apiKeySecret}`);

    const headers = {
      "Content-Type": "application/json",
      Authorization: AUTH_HEADER,
      ...(options.headers || {}),
    };

    const response = await fetch(`${JOYFILL_BASE_URL}${endpoint}`, {
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

  const loadTemplates = async () => {
    if (!formData.apiKeyId || !formData.apiKeySecret) return;

    try {
      setDebugInfo("Loading templates...");
      const templateData = await makeJoyfillRequest(
        "/v1/templates?page=1&limit=50"
      );

      let templatesArray = Array.isArray(templateData.data)
        ? templateData.data
        : Array.isArray(templateData)
        ? templateData
        : [];

      setTemplates(templatesArray);
      setDebugInfo(`Loaded ${templatesArray.length} templates`);
    } catch (err) {
      setError(`Error loading templates: ${err.message}`);
      setDebugInfo("");
    }
  };

  const createPatientDocument = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDebugInfo("");

    try {
      // Step 1: Create document
      setDebugInfo("Creating document from template...");
      const doc = await makeJoyfillRequest("/v1/documents", {
        method: "POST",
        body: JSON.stringify({
          name: `Patient Forms - ${formData.firstName} ${formData.lastName}`,
          template: formData.templateId,
          stage: "published",
        }),
      });

      console.log("✅ Created doc:", doc);

      setDebugInfo("Updating document fields...");

      const patientFieldMapping = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        insuranceId: formData.insuranceId,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      };

      const docIdentifier = doc.identifier || doc._id;

      const updatePayload = {
        fields: doc.fields.map((field) => ({
          _id: field._id,
          identifier: field.identifier,
          value: patientFieldMapping[field.identifier] || field.value,
        })),
      };

      let updatedDoc;
      try {
        // Try PUT with identifier first
        await makeJoyfillRequest(`/v1/documents/${docIdentifier}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        setDebugInfo("Fetching updated document...");
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

          setDebugInfo("Fetching updated document...");
          updatedDoc = await makeJoyfillRequest(`/v1/documents/${doc._id}`);
        } catch {
          console.warn(
            "Both update methods failed. Proceeding with original document..."
          );

          updatedDoc = { ...doc };
          updatedDoc.fields = doc.fields.map((field) => ({
            ...field,
            value: patientFieldMapping[field.identifier] || field.value,
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

      // Step 3: Generate PDF
      if (!updatedDoc || !updatedDoc.joydoc) {
        throw new Error("Updated document missing JoyDoc format.");
      }

      setDebugInfo("Generating PDF export...");
      const pdfResult = await makeJoyfillRequest("/v1/documents/exports/pdf", {
        method: "POST",
        body: JSON.stringify({ document: updatedDoc.joydoc }),
      });

      if (pdfResult.download_url) {
        window.open(pdfResult.download_url, "_blank");
        setResult(updatedDoc);
        setDebugInfo("✅ Document created and PDF download initiated!");
      } else {
        throw new Error("PDF generation failed: No download URL returned");
      }
    } catch (err) {
      console.error("Error in createPatientDocument:", err);
      setError(err.message);

      if (err.message.includes("401")) {
        setError("❌ Authentication failed. Please check your API keys.");
      } else if (err.message.includes("404")) {
        setError("❌ Resource not found. Please check template ID.");
      } else if (err.message.includes("400")) {
        setError("❌ Bad request. Please check your request format.");
      } else if (
        err.message.includes("CORS") ||
        err.message.includes("fetch")
      ) {
        setError(
          "❌ CORS Error: Direct API calls blocked. You may need to use a proxy server."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Patient Forms Generator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-4">
          {/* API Credentials */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              API Credentials
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  API Key ID
                </label>
                <input
                  type="text"
                  value={formData.apiKeyId}
                  onChange={(e) =>
                    handleInputChange("apiKeyId", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your API Key ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  API Key Secret
                </label>
                <input
                  type="password"
                  value={formData.apiKeySecret}
                  onChange={(e) =>
                    handleInputChange("apiKeySecret", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your API Key Secret"
                />
              </div>
              <button
                onClick={loadTemplates}
                disabled={!formData.apiKeyId || !formData.apiKeySecret}
                className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300"
              >
                Load Templates
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              Template Selection
            </h2>
            {templates.length > 0 ? (
              <select
                value={formData.templateId}
                onChange={(e) =>
                  handleInputChange("templateId", e.target.value)
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template.identifier}>
                    {template.name} ({template.identifier})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.templateId}
                onChange={(e) =>
                  handleInputChange("templateId", e.target.value)
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter template identifier manually"
              />
            )}
          </div>

          {/* Patient Data */}
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              Patient Information
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Insurance ID
                </label>
                <input
                  type="text"
                  value={formData.insuranceId}
                  onChange={(e) =>
                    handleInputChange("insuranceId", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={createPatientDocument}
            disabled={
              loading ||
              !formData.templateId ||
              !formData.apiKeyId ||
              !formData.apiKeySecret
            }
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
              loading ||
              !formData.templateId ||
              !formData.apiKeyId ||
              !formData.apiKeySecret
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading
              ? "Generating Document..."
              : "Generate Patient Document & PDF"}
          </button>
        </div>

        {/* Right Column - Debug & Results */}
        <div className="space-y-4">
          {/* Debug Info */}
          {debugInfo && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-md">
              <h3 className="text-blue-800 font-semibold mb-2">Debug Info</h3>
              <p className="text-blue-700">{debugInfo}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-300 rounded-md">
              <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="p-4 bg-green-100 border border-green-300 rounded-md">
              <h3 className="text-green-800 font-semibold mb-2">✅ Success!</h3>
              <div className="text-green-700 space-y-1">
                <p>
                  <strong>Document:</strong> {result.name}
                </p>
                <p>
                  <strong>ID:</strong> {result.identifier}
                </p>
                <p>
                  <strong>Fields:</strong> {result.fields?.length || 0}
                </p>
              </div>
            </div>
          )}

          {/* Template Info */}
          {templates.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-md">
              <h3 className="font-semibold mb-2">Available Templates</h3>
              <div className="text-sm text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    className="p-2 bg-white rounded border"
                  >
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      ID: {template.identifier}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientForms;
