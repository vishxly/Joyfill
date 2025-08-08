// AutomatedInvoiceForm.jsx
import React from "react";
import { useInvoiceForm } from "./useInvoiceForm.js";

export const AutomatedInvoiceForm = () => {
  const {
    formData,
    updateField,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    templatesLoading,
    isGenerating,
    message,
    handleSubmit,
  } = useInvoiceForm();

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "400px",
    margin: "0 auto",
    padding: "2rem",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  };

  const inputStyle = {
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: isGenerating ? "#ccc" : "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: isGenerating ? "not-allowed" : "pointer",
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
        Generate Invoice
      </h2>

      {message && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            backgroundColor: message.startsWith("✅") ? "#d4edda" : "#f8d7da",
            color: message.startsWith("✅") ? "#155724" : "#721c24",
            border: `1px solid ${
              message.startsWith("✅") ? "#c3e6cb" : "#f5c6cb"
            }`,
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      <div style={formStyle}>
        {/* Template Selector */}
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          required
          style={inputStyle}
        >
          <option value="">
            {templatesLoading ? "Loading templates..." : "Select Template"}
          </option>
          {templates.map((template) => (
            <option key={template._id} value={template.identifier}>
              {template.name}
            </option>
          ))}
        </select>

        {/* Form Fields */}
        <input
          type="text"
          placeholder="Customer Name"
          value={formData.customerName}
          onChange={(e) => updateField("customerName", e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Customer Email"
          value={formData.customerEmail}
          onChange={(e) => updateField("customerEmail", e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Total Amount"
          value={formData.total}
          onChange={(e) => updateField("total", e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating}
          style={buttonStyle}
        >
          {isGenerating ? "Generating..." : "Generate Invoice PDF"}
        </button>
      </div>
    </div>
  );
};

export default AutomatedInvoiceForm;
