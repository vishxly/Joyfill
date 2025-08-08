// useInvoiceForm.js
import { useState, useEffect } from "react";
import { joyfillService } from "./joyfillService.js";

export const useInvoiceForm = () => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    total: "",
  });

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templatesArray = await joyfillService.fetchTemplates();
        setTemplates(templatesArray);
        setTemplatesLoading(false);
      } catch (err) {
        console.error("Error loading templates:", err);
        setMessage(`Error loading templates: ${err.message}`);
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const updateField = (field, value) => {
    const processedValue = field === "total" ? parseFloat(value) || 0 : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      setMessage("❌ Please select a template");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      const pdfResult = await joyfillService.generateInvoice(
        formData,
        selectedTemplate,
        templates,
        (progressMessage) => setMessage(progressMessage)
      );

      if (pdfResult.download_url) {
        window.open(pdfResult.download_url, "_blank");
        setMessage(
          "✅ Invoice generated successfully! PDF download initiated."
        );

        setFormData({ customerName: "", customerEmail: "", total: "" });
        setSelectedTemplate("");
      } else {
        throw new Error("PDF generation failed: No download URL returned");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setMessage(`❌ Failed to generate invoice: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    formData,
    updateField,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    templatesLoading,
    isGenerating,
    message,
    handleSubmit,
  };
};
